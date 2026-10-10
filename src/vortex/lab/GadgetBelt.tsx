"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { SvgArt } from "@/components/ui/SvgArt";
import { type ApiError, apiFetch, createCard, fetchDashboard } from "@/lib/api";
import { vortexSvg } from "@/lib/vortexArt";
import {
  cloner,
  compass,
  ego,
  geiger,
  gravity,
  LOST_KEY,
  magnet,
  nightVision,
  notePage,
  recorder,
  shrinker,
  teleport,
  telescope,
  timeMachine,
  translator,
  xray,
} from "./gadgets";

// LADO D · THE GADGET BELT: what's on the bench (and how long it has left),
// what's ready on the shelf (each a toggle or a button), the blueprints on the
// corkboard — two of them in someone else's handwriting he refuses to build.
// Opens from its own button once anything is ready, from the garage bench
// below, or with window.dispatchEvent(new CustomEvent("vortex:lab")).

interface Lab {
  building: {
    id: string;
    name: string;
    progress: number;
    ready_at: string;
  } | null;
  ready: { id: string; name: string; line: string }[];
  blueprints: {
    id: string;
    name: string;
    locked?: boolean;
    forbidden?: boolean;
  }[];
  last: { type: "ready" | "exploded"; id: string } | null;
}

type Stop = () => void;

export default function GadgetBelt() {
  const router = useRouter();
  const [lab, setLab] = useState<Lab | null>(null);
  const [open, setOpen] = useState(false);
  const [on, setOn] = useState<Record<string, boolean>>({});
  const stops = useRef<Record<string, Stop>>({});
  const [days, setDays] = useState(7);
  const [panel, setPanel] = useState<null | "excuses" | "distiller">(null);

  const path = usePathname();
  // D-17 · the teleporter needs to know where you've been
  useEffect(() => {
    notePage(path);
  }, [path]);
  // D-13 · the lost clone turns up somewhere, now and then
  const [lost, setLost] = useState<{ x: number; y: number } | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-roll on every navigation
  useEffect(() => {
    try {
      if (localStorage.getItem(LOST_KEY) && Math.random() < 0.35)
        setLost({ x: 5 + Math.random() * 85, y: 20 + Math.random() * 65 });
      else setLost(null);
    } catch {}
  }, [path]);
  // D-02 · when something comes off the bench, he brings it (or it blew up)
  // biome-ignore lint/correctness/useExhaustiveDependencies: only when the last bench event changes
  useEffect(() => {
    const last = lab?.last;
    if (!last) return;
    const key = `yd:vortex.lab-seen.${last.type}.${last.id}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {}
    const g = lab?.ready.find((x) => x.id === last.id);
    window.dispatchEvent(
      new CustomEvent("vortex:say", {
        detail:
          last.type === "exploded"
            ? {
                text: "…don't. don't say anything. it exploded. my eyebrows. i don't have eyebrows. i'm sulking now.",
                mood: "sulking",
              }
            : {
                text: `behold. i made a thing: ${g?.name ?? last.id}. you're welcome. it might explode. (${g?.line ?? ""})`,
                mood: "smug",
              },
      }),
    );
    if (
      last.type === "exploded" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      document.documentElement.classList.add("vxd-boom");
      setTimeout(
        () => document.documentElement.classList.remove("vxd-boom"),
        900,
      );
    }
  }, [lab?.last?.id, lab?.last?.type]);

  const load = useCallback(() => {
    if (!localStorage.getItem("token")) return;
    apiFetch<Lab>("/api/mascot/lab")
      .then(setLab)
      .catch(() => {});
  }, []);
  useEffect(() => {
    load();
    const onOpen = () => {
      setOpen(true);
      load();
    };
    window.addEventListener("vortex:lab", onOpen);
    return () => {
      window.removeEventListener("vortex:lab", onOpen);
      for (const s of Object.values(stops.current)) s();
    };
  }, [load]);

  const toggle = async (id: string) => {
    if (on[id]) {
      stops.current[id]?.();
      delete stops.current[id];
      setOn((o) => ({ ...o, [id]: false }));
      return;
    }
    const run: Record<string, () => Stop | Promise<Stop>> = {
      gravity,
      telescope,
      geiger,
      shrinker,
      magnet,
      translator,
      xray,
      nightvision: nightVision,
      cloner,
      compass,
      ego,
    };
    const fn = run[id];
    if (!fn) return;
    stops.current[id] = await fn();
    setOn((o) => ({ ...o, [id]: true }));
  };

  const lostClone = lost && (
    <button
      type="button"
      className="vxd-lost"
      style={{ left: `${lost.x}%`, top: `${lost.y}%` }}
      onClick={() => {
        try {
          localStorage.removeItem(LOST_KEY);
        } catch {}
        setLost(null);
        window.dispatchEvent(
          new CustomEvent("vortex:say", {
            detail: {
              text: "you found him. he was in there the whole time, eating your cards. he's back in me now. we don't talk about it.",
              mood: "happy",
            },
          }),
        );
      }}
      aria-label="a tiny lost vortex"
    >
      <SvgArt svg={vortexSvg("sideeye", "lost", "none")} />
    </button>
  );

  if (!lab || (!lab.ready.length && !open)) return lostClone || null;
  const has = (id: string) => lab.ready.some((g) => g.id === id);
  const TOGGLES = [
    "gravity",
    "telescope",
    "geiger",
    "shrinker",
    "magnet",
    "translator",
    "xray",
    "nightvision",
    "cloner",
    "compass",
    "ego",
  ];

  return (
    <>
      {lostClone}
      <button
        type="button"
        className="vxd-belt-btn"
        onClick={() => setOpen(!open)}
      >
        ⚙ gadgets{lab.ready.length ? ` · ${lab.ready.length}` : ""}
      </button>
      {open && (
        <section className="vxd-belt" aria-label="his gadget belt">
          <div className="bench">
            <h4>on the bench</h4>
            {lab.building ? (
              <>
                <span>{lab.building.name}</span>
                <div className="bar">
                  <i
                    style={{
                      width: `${Math.round(lab.building.progress * 100)}%`,
                    }}
                  />
                </div>
                <small>
                  ready around{" "}
                  {new Date(lab.building.ready_at).toLocaleString([], {
                    weekday: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  · bring parts from the counter to speed it up
                </small>
                <div className="row">
                  {["part-capacitor", "part-vu-needle", "part-erase-coil"].map(
                    (p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={async () => {
                          try {
                            const r = await apiFetch<{ lab: Lab }>(
                              "/api/mascot/lab/accelerate",
                              {
                                method: "POST",
                                body: JSON.stringify({ item: p }),
                              },
                            );
                            setLab(r.lab);
                          } catch {}
                        }}
                      >
                        + {p.replace("part-", "").replace("-", " ")}
                      </button>
                    ),
                  )}
                </div>
              </>
            ) : (
              <span>
                the bench is empty. he&apos;s thinking. that&apos;s worse.
              </span>
            )}
          </div>

          {lab.ready.length > 0 && (
            <>
              <h4>on the shelf</h4>
              <div className="tools">
                {lab.ready
                  .filter((g) => TOGGLES.includes(g.id))
                  .map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      className={on[g.id] ? "is-on" : ""}
                      onClick={() => void toggle(g.id)}
                      title={g.line}
                    >
                      {on[g.id] ? "■ " : "▶ "}
                      {g.name}
                    </button>
                  ))}
                {has("recorder") && (
                  <button
                    type="button"
                    onClick={() => void recorder()}
                    title="saves a still of this moment"
                  >
                    ● record this moment
                  </button>
                )}
                {has("teleporter") && (
                  <button
                    type="button"
                    onClick={() => teleport((h) => router.push(h))}
                  >
                    ◎ teleport
                  </button>
                )}
                {has("excuses") && (
                  <button
                    type="button"
                    onClick={() =>
                      setPanel(panel === "excuses" ? null : "excuses")
                    }
                  >
                    ⚙ excuse generator
                  </button>
                )}
                {has("distiller") && (
                  <button
                    type="button"
                    onClick={() =>
                      setPanel(panel === "distiller" ? null : "distiller")
                    }
                  >
                    ⚗ meeting distiller
                  </button>
                )}
                {has("shortwave") && (
                  <button
                    type="button"
                    onClick={() => router.push("/below/estudio")}
                  >
                    📻 shortwave (below)
                  </button>
                )}
              </div>
              {has("timemachine") && (
                <div className="row">
                  <span>⏪ time machine:</span>
                  <input
                    type="range"
                    min={1}
                    max={60}
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    aria-label="days back"
                  />
                  <span>{days}d</span>
                  <button
                    type="button"
                    onClick={async () => {
                      stops.current.timemachine?.();
                      stops.current.timemachine = await timeMachine(days);
                    }}
                  >
                    rewind
                  </button>
                </div>
              )}
              {panel === "excuses" && <Excuses />}
              {panel === "distiller" && <Distiller />}
            </>
          )}

          <button
            type="button"
            className="deck"
            onClick={() => window.dispatchEvent(new CustomEvent("vortex:deck"))}
          >
            ◎ the tape-to-tape deck (other dimensions)
          </button>

          <h4>corkboard</h4>
          <div className="blue">
            {lab.blueprints.map((b) => (
              <span
                key={b.id}
                className={b.forbidden ? "forbidden" : ""}
                title={
                  b.forbidden
                    ? "someone else's handwriting"
                    : b.locked
                      ? "needs something from the other side first"
                      : "a future project"
                }
              >
                {b.name}
                {b.locked ? " 🔒" : ""}
              </span>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

/** D-10 · three grades of excuse for one of your late cards. */
function Excuses() {
  const [late, setLate] = useState<{ id: number; name: string }[]>([]);
  const [pick, setPick] = useState<number | null>(null);
  const [out, setOut] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    fetchDashboard()
      .then((d) => {
        const l = d.deck
          .filter((c) => c.due_date && new Date(c.due_date) < new Date())
          .map((c) => ({ id: c.id, name: c.name }));
        const list = l.length
          ? l
          : d.deck.map((c) => ({ id: c.id, name: c.name }));
        setLate(list);
        setPick(list[0]?.id ?? null);
      })
      .catch(() => {});
  }, []);
  return (
    <div className="out">
      <div className="row">
        <select
          value={pick ?? ""}
          onChange={(e) => setPick(Number(e.target.value))}
          aria-label="card"
        >
          {late.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name.slice(0, 40)}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!pick}
          onClick={async () => {
            setOut(null);
            const r = await apiFetch<Record<string, string>>(
              "/api/mascot/lab/excuses",
              { method: "POST", body: JSON.stringify({ card: pick }) },
            ).catch(() => null);
            setOut(r);
          }}
        >
          crank it
        </button>
      </div>
      {out &&
        (["plausible", "creative", "cosmic"] as const).map((k) => (
          <p key={k}>
            <span className="k">{k.toUpperCase()}</span>
            <br />
            {out[k]}{" "}
            <button
              type="button"
              onClick={() => void navigator.clipboard?.writeText(out[k])}
            >
              copy
            </button>
          </p>
        ))}
    </div>
  );
}

/** D-18 · paste a meeting; get three proposed cards (you sign each) and the truth. */
function Distiller() {
  const [text, setText] = useState("");
  const [res, setRes] = useState<{
    cards: { name: string; description?: string }[];
    jab: string;
  } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const boardId = Number(
    window.location.pathname.match(/^\/boards\/(\d+)/)?.[1] ?? 0,
  );
  const firstRack = Number(
    document.querySelector<HTMLElement>(".mt-rack[data-vx-rack]")?.dataset
      .vxRack ?? 0,
  );
  return (
    <div className="out">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="paste the meeting notes, the thread, the chaos…"
        aria-label="meeting notes"
      />
      <button
        type="button"
        disabled={text.trim().length < 20}
        onClick={async () => {
          setRes(null);
          try {
            setRes(
              await apiFetch("/api/mascot/lab/distill", {
                method: "POST",
                body: JSON.stringify({ text }),
              }),
            );
          } catch (e) {
            try {
              setMsg(JSON.parse((e as ApiError).body).message);
            } catch {
              setMsg("the distiller clogged.");
            }
          }
        }}
      >
        distill
      </button>
      {res && (
        <>
          <p>“{res.jab}”</p>
          {res.cards.map((c) => (
            <p key={c.name}>
              <span className="k">PROPOSED CARD</span>
              <br />
              {c.name}{" "}
              {boardId && firstRack ? (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await createCard(boardId, {
                        section_id: firstRack,
                        name: c.name,
                        description: c.description ?? "",
                      });
                      setMsg(
                        `signed and filed: "${c.name}" in the first column.`,
                      );
                    } catch {
                      setMsg("couldn't file it here.");
                    }
                  }}
                >
                  sign · file it on this board
                </button>
              ) : (
                <em> (open a board to file it)</em>
              )}
            </p>
          ))}
        </>
      )}
      {msg && <p>{msg}</p>}
    </div>
  );
}
