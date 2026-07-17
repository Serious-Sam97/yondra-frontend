"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSystem } from "@/contexts/SystemContext";
import { useVortexChat, type VortexAction } from "@/hooks/useVortexChat";
import {
  archiveBoard,
  createBoard,
  createCard,
  createProject,
  createSection,
  fetchBoard,
  fetchProjects,
} from "@/lib/api";
import { fetchBoards, fetchUser } from "@/lib/auth";
import {
  greeting,
  isVortexMounted,
  mountVortexContext,
  quipForRoute,
  randomTip,
  setVortexEnabled,
  subscribeVortexSay,
  unmountVortexContext,
  useVortexEnabled,
  useVortexMounts,
  VORTEX_MAX_MOUNTS,
  type VortexMount,
  type VortexSpeech,
} from "@/lib/vortex";

/**
 * "Vortex" — Yondra's mascot assistant (ported from VortexOS): an original animated
 * portal sprite drawn entirely in SVG/CSS. He bobs in the corner, blinks, pipes up
 * with a speech bubble (greeting, route quips, idle tips, click-for-a-tip), and his
 * bubble opens a real workspace chat — ask about your boards and projects and the
 * answer streams back over your private channel. Dismissable via the × (persisted).
 */

const SHOW_MS = 9000; // how long a bubble stays up
const QUIP_COOLDOWN = 8000; // min gap between route-change quips
const IDLE_AFTER = 30000; // user considered idle after this
const IDLE_TIP_GAP = 75000; // min gap between unprompted idle tips
const IDLE_CHECK = 12000; // how often the idle check runs

const VortexAssistant: React.FC = () => {
  const enabled = useVortexEnabled();
  const { isLogged } = useSystem();
  const pathname = usePathname() ?? "";
  const router = useRouter();

  const [user, setUser] = useState<{ id: number; name: string } | null>(null);
  const [speech, setSpeech] = useState<VortexSpeech | null>(null);
  const [popN, setPopN] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [draft, setDraft] = useState("");
  // peek: pointer/focus is on him — slides him out of the border
  const [peek, setPeek] = useState(false);
  // mount picker (inside the chat panel)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerItems, setPickerItems] = useState<VortexMount[] | null>(null);
  // proposed-action confirm cards, keyed by transcript index
  const [acted, setActed] = useState<
    Record<number, "working" | "done" | "dismissed" | "error">
  >({});

  const lastQuip = useRef(0);
  const lastSpoke = useRef(0);
  const lastActivity = useRef(Date.now());
  const greeted = useRef(false);
  const firstRoute = useRef(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatOpenRef = useRef(false);
  chatOpenRef.current = chatOpen;
  const logRef = useRef<HTMLDivElement>(null);
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mounts = useVortexMounts();
  const chat = useVortexChat(user?.id, enabled && isLogged, mounts);

  const active = enabled && isLogged;

  // The board the user is looking at right now (for the one-click mount chip).
  const boardMatch = pathname.match(/^\/boards\/(\d+)(?:\/|$)/);
  const currentBoardId = boardMatch ? Number(boardMatch[1]) : null;

  /* who am I — needed for the private chat channel */
  useEffect(() => {
    if (!isLogged) {
      setUser(null);
      return;
    }
    fetchUser()
      .then((u) => setUser(u))
      .catch(() => setUser(null));
  }, [isLogged]);

  const speak = useCallback((s: VortexSpeech) => {
    if (chatOpenRef.current) return; // never talk over an open chat
    lastSpoke.current = Date.now();
    setSpeech(s);
    setPopN((n) => n + 1);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setSpeech(null), SHOW_MS);
  }, []);

  /* one-time greeting per mount */
  useEffect(() => {
    if (!active || greeted.current) return;
    greeted.current = true;
    // No cancelling cleanup: StrictMode's double-invoke would clear the timer
    // and the ref guard would block rescheduling.
    setTimeout(() => speak({ text: greeting() }), 2200);
  }, [active, speak]);

  /* contextual quip when the route changes (skip the landing route) */
  useEffect(() => {
    if (!active) return;
    if (firstRoute.current) {
      firstRoute.current = false;
      return;
    }
    const now = Date.now();
    if (now - lastQuip.current < QUIP_COOLDOWN) return;
    const line = quipForRoute(pathname);
    if (line) {
      lastQuip.current = now;
      speak({ text: line });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, active, speak]);

  /* track user activity for idle tips */
  useEffect(() => {
    if (!active) return;
    const bump = () => {
      lastActivity.current = Date.now();
    };
    const evs: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "wheel",
    ];
    for (const e of evs) window.addEventListener(e, bump, { passive: true });
    const iv = setInterval(() => {
      const now = Date.now();
      const idle = now - lastActivity.current > IDLE_AFTER;
      const quiet = now - lastSpoke.current > IDLE_TIP_GAP;
      if (idle && quiet && !document.hidden) speak({ text: randomTip() });
    }, IDLE_CHECK);
    return () => {
      for (const e of evs) window.removeEventListener(e, bump);
      clearInterval(iv);
    };
  }, [active, speak]);

  /* external say() channel */
  useEffect(() => {
    if (!active) return;
    return subscribeVortexSay((s) => speak(s));
  }, [active, speak]);

  /* keep the chat log pinned to the newest message */
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new content
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.messages, chat.streamingText, chatOpen]);

  const openChat = () => {
    setSpeech(null);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setChatOpen(true);
  };

  /* border dock — he tucks into the left edge (a small sliver stays visible)
     so he never sits over the page. He slides out while hovered/focused, while
     speaking, or while the chat is open; the mouseleave linger keeps him from
     flapping when the cursor grazes past. */
  const holdPeek = () => {
    if (peekTimer.current) clearTimeout(peekTimer.current);
    setPeek(true);
  };
  const releasePeek = () => {
    if (peekTimer.current) clearTimeout(peekTimer.current);
    peekTimer.current = setTimeout(() => setPeek(false), 700);
  };
  const docked = !peek && !speech && !chatOpen;

  const sendDraft = () => {
    if (draft.trim() === "" || chat.streaming) return;
    chat.send(draft);
    setDraft("");
  };

  /* mount picker — load projects + boards once per open (cheap list calls) */
  useEffect(() => {
    if (!pickerOpen || pickerItems !== null) return;
    Promise.all([fetchProjects(), fetchBoards()])
      .then(([projects, boards]) => {
        const items: VortexMount[] = [
          ...[...projects.owned, ...projects.member].map((p) => ({
            type: "project" as const,
            id: p.id,
            name: p.name,
          })),
          ...[...boards.owned, ...boards.shared].map((b) => ({
            type: "board" as const,
            id: b.id,
            name: b.name,
          })),
        ];
        // De-dup (a co-owned project can appear in both lists).
        const seen = new Set<string>();
        setPickerItems(
          items.filter((i) => {
            const k = `${i.type}:${i.id}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          }),
        );
      })
      .catch(() => setPickerItems([]));
  }, [pickerOpen, pickerItems]);

  const visiblePickerItems = (pickerItems ?? []).filter((i) =>
    i.name.toLowerCase().includes(pickerQuery.trim().toLowerCase()),
  );

  /* execute a proposed action the user confirmed — via the same authorized REST
     endpoints the regular UI uses; Vortex itself never writes anything. */
  const runAction = async (i: number, action: VortexAction) => {
    setActed((s) => ({ ...s, [i]: "working" }));
    try {
      if (action.kind === "create_project") {
        const project = await createProject({
          name: action.name,
          description: action.description ?? null,
        });
        let firstBoardId: number | null = null;
        for (const b of action.boards) {
          const nb = await createBoard({
            name: b.name,
            description: "",
            project_id: project.id,
            type: b.type,
          });
          firstBoardId ??= nb.id;
        }
        setActed((s) => ({ ...s, [i]: "done" }));
        router.push(
          firstBoardId !== null ? `/boards/${firstBoardId}` : "/projects",
        );
      } else if (action.kind === "create_board") {
        const nb = await createBoard({
          name: action.name,
          description: "",
          project_id: action.project_id ?? null,
          type: action.type,
        });
        setActed((s) => ({ ...s, [i]: "done" }));
        router.push(`/boards/${nb.id}`);
      } else if (action.kind === "create_card") {
        // Resolve the column by name (the model only knows column names, not ids).
        const board = await fetchBoard(action.board_id);
        const wanted = action.column?.trim().toLowerCase();
        const section =
          (wanted &&
            board.sections?.find(
              (s) => s.name.trim().toLowerCase() === wanted,
            )) ||
          board.sections?.[0];
        if (!section) throw new Error("board has no columns");
        const card = await createCard(action.board_id, {
          section_id: section.id,
          name: action.name,
          description: action.description ?? "",
        });
        setActed((s) => ({ ...s, [i]: "done" }));
        router.push(`/boards/${action.board_id}?card=${card.id}`);
      } else if (action.kind === "add_column") {
        await createSection(action.board_id, action.name);
        setActed((s) => ({ ...s, [i]: "done" }));
        router.push(`/boards/${action.board_id}`);
      } else {
        await archiveBoard(action.board_id);
        setActed((s) => ({ ...s, [i]: "done" }));
        router.push("/projects");
      }
    } catch {
      setActed((s) => ({ ...s, [i]: "error" }));
    }
  };

  const describeAction = (action: VortexAction): string => {
    const boardLabel = (a: { board_id: number; board_name?: string }) =>
      a.board_name ? `“${a.board_name}”` : `#${a.board_id}`;
    switch (action.kind) {
      case "create_project":
        return `Create project “${action.name}”${
          action.boards.length > 0
            ? ` with ${action.boards
                .map((b) => `“${b.name}” (${b.type})`)
                .join(", ")}`
            : ""
        }`;
      case "create_board":
        return `Create board “${action.name}” (${action.type})${
          action.project_id !== undefined
            ? ` in project #${action.project_id}`
            : ""
        }`;
      case "create_card":
        return `Create card “${action.name}” on board ${boardLabel(action)}${
          action.column ? ` in “${action.column}”` : ""
        }`;
      case "add_column":
        return `Add column “${action.name}” to board ${boardLabel(action)}`;
      case "archive_board":
        return `Archive board ${boardLabel(action)}`;
    }
  };

  /* one-click mount for the board currently on screen */
  const mountCurrentBoard = async () => {
    if (currentBoardId === null) return;
    try {
      const { owned, shared } = await fetchBoards();
      const b = [...owned, ...shared].find((x) => x.id === currentBoardId);
      if (b) mountVortexContext({ type: "board", id: b.id, name: b.name });
    } catch {
      // list call failed — the picker still works as a fallback
    }
  };

  if (!active) return null;

  return (
    <div className="vxa-layer">
      {speech && !chatOpen && (
        <output className="vxa-bubble">
          <div className="vxa-name">Vortex</div>
          <div>{speech.text}</div>
          <div className="vxa-actions">
            {speech.action ? (
              <button
                type="button"
                className="vxa-btn"
                onClick={() => {
                  speech.action?.run();
                  setSpeech(null);
                }}
              >
                {speech.action.label}
              </button>
            ) : (
              <button type="button" className="vxa-btn" onClick={openChat}>
                Ask me
              </button>
            )}
            <button
              type="button"
              className="vxa-link"
              onClick={() => setSpeech(null)}
            >
              Dismiss
            </button>
          </div>
        </output>
      )}

      {chatOpen && (
        <div className="vxa-chat" role="dialog" aria-label="Chat with Vortex">
          <div className="vxa-chat-head">
            <span className="vxa-name" style={{ marginBottom: 0 }}>
              Vortex
            </span>
            <span className="vxa-chat-sub">
              {mounts.length === 0
                ? "your workspace guide"
                : `focused: ${mounts.map((m) => m.name).join(", ")}`}
            </span>
            <button
              type="button"
              className="vxa-chat-close"
              title="Close chat"
              onClick={() => setChatOpen(false)}
            >
              ×
            </button>
          </div>

          {/* mount bar — cartridge chips for the contexts he's grounded on */}
          <div className="vxa-mounts">
            {mounts.map((m) => (
              <span
                key={`${m.type}:${m.id}`}
                className="vxa-mchip"
                title={
                  m.type === "board" ? "Board (deep)" : "Project (all boards)"
                }
              >
                <span aria-hidden className="vxa-mchip-kind">
                  {m.type === "board" ? "▦" : "◫"}
                </span>
                <span className="vxa-mchip-name">{m.name}</span>
                <button
                  type="button"
                  className="vxa-mchip-x"
                  title={`Eject ${m.name}`}
                  onClick={() => unmountVortexContext(m.type, m.id)}
                >
                  ×
                </button>
              </span>
            ))}
            {currentBoardId !== null &&
              !isVortexMounted("board", currentBoardId) &&
              mounts.length < VORTEX_MAX_MOUNTS && (
                <button
                  type="button"
                  className="vxa-mchip vxa-mchip--ghost"
                  title="Mount the board you're looking at"
                  onClick={mountCurrentBoard}
                >
                  + this board
                </button>
              )}
            {mounts.length < VORTEX_MAX_MOUNTS && (
              <button
                type="button"
                className="vxa-mchip vxa-mchip--ghost"
                aria-expanded={pickerOpen}
                onClick={() => setPickerOpen((v) => !v)}
              >
                {pickerOpen ? "− close" : "+ mount"}
              </button>
            )}
          </div>

          {/* picker — searchable projects & boards, click to mount/eject */}
          {pickerOpen && (
            <div className="vxa-picker">
              <input
                className="vxa-chat-input"
                placeholder="Search projects & boards…"
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
              />
              <div className="vxa-picker-list">
                {pickerItems === null && (
                  <div className="vxa-picker-empty">Loading…</div>
                )}
                {pickerItems !== null && visiblePickerItems.length === 0 && (
                  <div className="vxa-picker-empty">Nothing matches.</div>
                )}
                {visiblePickerItems.map((item) => {
                  const mounted = isVortexMounted(item.type, item.id);
                  return (
                    <button
                      key={`${item.type}:${item.id}`}
                      type="button"
                      className={`vxa-picker-item${mounted ? " vxa-picker-item--on" : ""}`}
                      onClick={() =>
                        mounted
                          ? unmountVortexContext(item.type, item.id)
                          : mountVortexContext(item)
                      }
                    >
                      <span aria-hidden className="vxa-mchip-kind">
                        {item.type === "board" ? "▦" : "◫"}
                      </span>
                      <span className="vxa-mchip-name">{item.name}</span>
                      <span className="vxa-picker-item-state">
                        {mounted ? "eject" : "mount"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="vxa-chat-log" ref={logRef}>
            {chat.messages.length === 0 && !chat.streaming && (
              <div className="vxa-msg vxa-msg--vortex">
                {mounts.length === 0
                  ? "Ask me about your boards and projects — try “what's overdue?” Mount a board or project above to focus me on it."
                  : `I'm focused on ${mounts.map((m) => m.name).join(" and ")} — ask away!`}
              </div>
            )}
            {chat.messages.map((m, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: append-only transcript
              <div key={i} className="contents">
                <div
                  className={`vxa-msg ${m.role === "user" ? "vxa-msg--you" : "vxa-msg--vortex"}`}
                >
                  {m.content}
                </div>
                {m.role === "assistant" && m.action && (
                  <div className="vxa-action">
                    <div className="vxa-action-desc">
                      {describeAction(m.action)}
                    </div>
                    {(acted[i] === undefined || acted[i] === "error") && (
                      <div className="vxa-actions" style={{ marginTop: 6 }}>
                        <button
                          type="button"
                          className="vxa-btn"
                          onClick={() => runAction(i, m.action as VortexAction)}
                        >
                          {acted[i] === "error" ? "Retry" : "Do it"}
                        </button>
                        <button
                          type="button"
                          className="vxa-link"
                          onClick={() =>
                            setActed((s) => ({ ...s, [i]: "dismissed" }))
                          }
                        >
                          Dismiss
                        </button>
                        {acted[i] === "error" && (
                          <span className="vxa-chat-error">
                            That didn't work — try again.
                          </span>
                        )}
                      </div>
                    )}
                    {acted[i] === "working" && (
                      <div className="vxa-action-state">creating…</div>
                    )}
                    {acted[i] === "done" && (
                      <div className="vxa-action-state">✓ created</div>
                    )}
                    {acted[i] === "dismissed" && (
                      <div className="vxa-action-state">dismissed</div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {chat.streaming && (
              <div className="vxa-msg vxa-msg--vortex">
                {chat.streamingText === "" ? (
                  <span className="vxa-thinking">…</span>
                ) : (
                  // hide the machine-readable ACTION tail while it streams in
                  chat.streamingText.split("ACTION:")[0]
                )}
              </div>
            )}
            {chat.error && <div className="vxa-chat-error">{chat.error}</div>}
          </div>
          <div className="vxa-chat-inrow">
            <input
              className="vxa-chat-input"
              value={draft}
              placeholder="Ask Vortex…"
              maxLength={4000}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendDraft();
                if (e.key === "Escape") setChatOpen(false);
              }}
            />
            <button
              type="button"
              className="vxa-btn"
              disabled={chat.streaming || draft.trim() === ""}
              onClick={sendDraft}
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* wrapper div + sibling buttons: the face and the hide dot are both real
          <button>s, and buttons can't nest. The outer .vxa-dock carries the
          tuck-into-the-border transform; the bob animation transforms
          .vxa-sprite, so the two never fight over one element's transform. */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: hover/focus peek region only — the real controls are the buttons inside */}
      <div
        className={`vxa-dock${docked ? " vxa-dock--in" : ""}`}
        onMouseEnter={holdPeek}
        onMouseLeave={releasePeek}
        onFocus={holdPeek}
        onBlur={releasePeek}
      >
        <div className="vxa-sprite">
          <button
            type="button"
            className="vxa-hide"
            title="Hide Vortex"
            onClick={() => setVortexEnabled(false)}
          >
            ×
          </button>
          <div className="vxa-glow" />
          <button
            type="button"
            className="vxa-face vxa-pop"
            key={popN}
            title={chatOpen ? "Close the chat" : "Vortex — click for a tip"}
            onClick={() => {
              if (chatOpen) setChatOpen(false);
              else speak({ text: randomTip() });
            }}
          >
            <svg
              viewBox="0 0 100 100"
              style={{ display: "block", width: "100%", height: "100%" }}
            >
              <title>Vortex</title>
              <defs>
                <radialGradient id="vxa-body" cx="42%" cy="36%" r="70%">
                  <stop offset="0%" stopColor="#ff8fd4" />
                  <stop offset="45%" stopColor="#ff2d95" />
                  <stop offset="100%" stopColor="#3a0a6b" />
                </radialGradient>
                <linearGradient id="vxa-rim" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ff2d95" />
                  <stop offset="100%" stopColor="#00e5d0" />
                </linearGradient>
              </defs>

              {/* body */}
              <circle
                cx="50"
                cy="50"
                r="33"
                fill="url(#vxa-body)"
                stroke="url(#vxa-rim)"
                strokeWidth="3"
              />
              {/* inner swirl — the vortex motif */}
              <path
                className="vxa-swirl"
                d="M50 30 A20 20 0 1 1 30 50"
                fill="none"
                stroke="#ffffff"
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.55"
              />
              {/* eyes */}
              <g className="vxa-eyes">
                <ellipse cx="40" cy="46" rx="7" ry="9" fill="#fff" />
                <ellipse cx="60" cy="46" rx="7" ry="9" fill="#fff" />
                <circle cx="41.5" cy="47" r="3.4" fill="#1a0033" />
                <circle cx="61.5" cy="47" r="3.4" fill="#1a0033" />
                <circle cx="43" cy="45" r="1.1" fill="#fff" />
                <circle cx="63" cy="45" r="1.1" fill="#fff" />
              </g>
              {/* smile */}
              <path
                d="M42 62 Q50 69 58 62"
                fill="none"
                stroke="#fff"
                strokeWidth="2.6"
                strokeLinecap="round"
                opacity="0.85"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VortexAssistant;
