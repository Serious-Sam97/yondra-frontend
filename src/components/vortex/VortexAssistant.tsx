"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSystem } from "@/contexts/SystemContext";
import { useVortexChat } from "@/hooks/useVortexChat";
import { fetchUser } from "@/lib/auth";
import {
  greeting,
  quipForRoute,
  randomTip,
  setVortexEnabled,
  subscribeVortexSay,
  useVortexEnabled,
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

  const [user, setUser] = useState<{ id: number; name: string } | null>(null);
  const [speech, setSpeech] = useState<VortexSpeech | null>(null);
  const [popN, setPopN] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const lastQuip = useRef(0);
  const lastSpoke = useRef(0);
  const lastActivity = useRef(Date.now());
  const greeted = useRef(false);
  const firstRoute = useRef(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatOpenRef = useRef(false);
  chatOpenRef.current = chatOpen;
  const logRef = useRef<HTMLDivElement>(null);

  const chat = useVortexChat(user?.id, enabled && isLogged);

  const active = enabled && isLogged;

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

  const sendDraft = () => {
    if (draft.trim() === "" || chat.streaming) return;
    chat.send(draft);
    setDraft("");
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
            <span className="vxa-chat-sub">your workspace guide</span>
            <button
              type="button"
              className="vxa-chat-close"
              title="Close chat"
              onClick={() => setChatOpen(false)}
            >
              ×
            </button>
          </div>
          <div className="vxa-chat-log" ref={logRef}>
            {chat.messages.length === 0 && !chat.streaming && (
              <div className="vxa-msg vxa-msg--vortex">
                Ask me about your boards and projects — try “what's overdue?”
              </div>
            )}
            {chat.messages.map((m, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: append-only transcript
                key={i}
                className={`vxa-msg ${m.role === "user" ? "vxa-msg--you" : "vxa-msg--vortex"}`}
              >
                {m.content}
              </div>
            ))}
            {chat.streaming && (
              <div className="vxa-msg vxa-msg--vortex">
                {chat.streamingText === "" ? (
                  <span className="vxa-thinking">…</span>
                ) : (
                  chat.streamingText
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
          <button>s, and buttons can't nest. */}
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
  );
};

export default VortexAssistant;
