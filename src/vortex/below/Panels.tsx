"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { vxSound } from "@/components/vortex/vortexSound";
import { apiFetch, restoreCard, updateCard } from "@/lib/api";
import { claimFragment, fetchFragments } from "@/vortex/mysteries/fragments";
import type { World } from "./BelowGame";

// I · the panels that open over a room: talking to NPCs (I-18), the graveyard
// (I-06/H-13: real archived cards, resurrect only with a signed contract), the
// metronome's tower (I-12: a timing game, postpone only with a contract), the
// gate at the end of the tape (K-26), the shortwave radio (K-24), the b-side's
// wall of unsaid things (I-14), the arcade door (M) and the quest log (I-17).

type Kind =
  | "graves"
  | "tower"
  | "talk"
  | "gate"
  | "shortwave"
  | "bside"
  | "arcade"
  | "library"
  | "purify"
  | "tv";

const NPC_NAME: Record<string, string> = {
  moth: "the archivist",
  locutora: "the host",
  splicer: "the splicer",
  metronome: "the metronome",
  wow: "wow & flutter",
  flutter: "flutter",
  twin: "the twin",
};

export function BelowPanel(props: {
  kind: Kind;
  npc?: string;
  world: World;
  room: string;
  onWorld: (w: World) => void;
  onSay: (t: string) => void;
  onClose: () => void;
}) {
  const { kind, onClose } = props;
  return (
    <div className="vxb-panel" role="dialog" aria-label={kind}>
      <div className="vxb-panel-in">
        <button
          type="button"
          className="vxb-panel-x"
          onClick={onClose}
          aria-label="Close"
        >
          ⏏
        </button>
        {kind === "talk" && <Talk npc={props.npc ?? "moth"} />}
        {kind === "graves" && <Graves onSay={props.onSay} />}
        {kind === "tower" && <Tower onSay={props.onSay} />}
        {kind === "gate" && <Gate />}
        {kind === "shortwave" && <Shortwave {...props} />}
        {kind === "bside" && <BSide />}
        {kind === "arcade" && <Arcade />}
        {kind === "library" && <Quests world={props.world} />}
        {kind === "purify" && <Purify {...props} />}
        {kind === "tv" && <BelowTV />}
      </div>
    </div>
  );
}

function Talk({ npc }: { npc: string }) {
  const [log, setLog] = useState<{ who: "you" | "them"; text: string }[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    const m = draft.trim();
    if (!m || busy) return;
    setDraft("");
    setLog((l) => [...l, { who: "you", text: m }]);
    setBusy(true);
    try {
      const r = await apiFetch<{ reply: string }>("/api/mascot/below/talk", {
        method: "POST",
        body: JSON.stringify({ npc, message: m }),
      });
      setLog((l) => [...l, { who: "them", text: r.reply }]);
    } catch {
      setLog((l) => [...l, { who: "them", text: "*static.*" }]);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="vxb-talk">
      <h3>{NPC_NAME[npc] ?? npc}</h3>
      <div className="log">
        {log.length === 0 && (
          <p className="hint">
            say something. they only talk so much each day.
          </p>
        )}
        {log.map((l, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: append-only
          <p key={i} className={l.who}>
            {l.text}
          </p>
        ))}
        {busy && <p className="them">…</p>}
      </div>
      <input
        value={draft}
        maxLength={400}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && void send()}
        placeholder="speak…"
        aria-label={`Talk to ${NPC_NAME[npc] ?? npc}`}
      />
    </div>
  );
}

interface Grave {
  id: number;
  board_id: number;
  name: string;
  born: string | null;
  died: string;
  epitaph: string;
}
function Graves({ onSay }: { onSay: (t: string) => void }) {
  const [graves, setGraves] = useState<Grave[] | null>(null);
  const [contract, setContract] = useState<Grave | null>(null);
  const [flowers, setFlowers] = useState<Set<number>>(() => new Set());
  useEffect(() => {
    apiFetch<Grave[]>("/api/mascot/below/graveyard")
      .then(setGraves)
      .catch(() => setGraves([]));
  }, []);
  if (!graves) return <p className="hint">walking between the stones…</p>;
  return (
    <div className="vxb-graves">
      <h3>the graveyard · {graves.length} stones</h3>
      {graves.length === 0 && (
        <p className="hint">no graves. you never archived anything. hoarder.</p>
      )}
      <div className="stones">
        {graves.map((g) => (
          <article key={g.id} className="stone">
            <b>{g.name}</b>
            <span className="dates">
              {g.born ?? "?"} — {g.died}
            </span>
            <i>{g.epitaph}</i>
            <div className="row">
              <button
                type="button"
                onClick={() => {
                  setFlowers((s) => new Set(s).add(g.id));
                  vxSound("tink");
                }}
              >
                {flowers.has(g.id) ? "✿ left a flower" : "leave a flower"}
              </button>
              <button type="button" onClick={() => setContract(g)}>
                resurrect…
              </button>
            </div>
          </article>
        ))}
      </div>
      {contract && (
        <div className="vxb-contract">
          <p>contract of resurrection · the undersigned brings back</p>
          <b>“{contract.name}”</b>
          <p className="fine">
            it returns to its board, unarchived. nothing else moves. the dead
            don't always come back the same.
          </p>
          <div className="row">
            <button
              type="button"
              className="sign"
              onClick={async () => {
                try {
                  await restoreCard(contract.board_id, contract.id);
                  setGraves((l) =>
                    (l ?? []).filter((x) => x.id !== contract.id),
                  );
                  onSay(
                    `"${contract.name}" climbs out of the ground. it's back on its board. it smells like soil.`,
                  );
                  vxSound("rewind");
                } catch {
                  onSay("the ground won't open. (you can't edit that board.)");
                }
                setContract(null);
              }}
            >
              sign
            </button>
            <button type="button" onClick={() => setContract(null)}>
              leave it buried
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface Late {
  id: number;
  board_id: number;
  name: string;
  due: string;
  days: number;
}
function Tower({ onSay }: { onSay: (t: string) => void }) {
  const [late, setLate] = useState<Late[] | null>(null);
  const [target, setTarget] = useState<Late | null>(null);
  const [angle, setAngle] = useState(0);
  const [freed, setFreed] = useState<Late | null>(null);
  const raf = useRef(0);
  useEffect(() => {
    apiFetch<Late[]>("/api/mascot/below/tower")
      .then(setLate)
      .catch(() => setLate([]));
  }, []);
  useEffect(() => {
    if (!target) return;
    const start = performance.now();
    const frame = (now: number) => {
      setAngle(Math.sin((now - start) / 420) * 60);
      raf.current = requestAnimationFrame(frame);
    };
    raf.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf.current);
  }, [target]);
  if (!late) return <p className="hint">climbing the tower…</p>;
  return (
    <div className="vxb-tower">
      <h3>
        the gears ·{" "}
        {late.length === 1
          ? "1 late card stuck"
          : `${late.length} late cards stuck`}
      </h3>
      {late.length === 0 && (
        <p className="hint">
          nothing in the gears. the metronome is starving. good.
        </p>
      )}
      {!target && !freed && (
        <ul>
          {late.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => setTarget(c)}>
                {c.name} <em>{c.days}d late</em>
              </button>
            </li>
          ))}
        </ul>
      )}
      {target && (
        <div className="swing">
          <p>pull "{target.name}" out when the pendulum is in the middle.</p>
          <div
            className="pendulum"
            style={{ transform: `rotate(${angle}deg)` }}
          />
          <button
            type="button"
            className="pull"
            onClick={() => {
              if (Math.abs(angle) < 12) {
                setFreed(target);
                vxSound("click");
                onSay("you yank it out of the gears. it's shaking.");
              } else {
                onSay("TICK. too early. TOCK. too late. try again.");
                vxSound("tink");
              }
              setTarget(Math.abs(angle) < 12 ? null : target);
            }}
          >
            pull now
          </button>
        </div>
      )}
      {freed && (
        <div className="vxb-contract">
          <p>
            contract of postponement · the undersigned moves the due date of
          </p>
          <b>“{freed.name}”</b>
          <p className="fine">
            to tomorrow. the due date really moves. nothing else does.
          </p>
          <div className="row">
            <button
              type="button"
              className="sign"
              onClick={async () => {
                const d = new Date();
                d.setDate(d.getDate() + 1);
                try {
                  await updateCard(freed.board_id, freed.id, {
                    due_date: d.toISOString().slice(0, 10),
                  });
                  setLate((l) => (l ?? []).filter((x) => x.id !== freed.id));
                  onSay(`"${freed.name}" has one more day. so do you.`);
                } catch {
                  onSay(
                    "the metronome won't let go. (you can't edit that card.)",
                  );
                }
                setFreed(null);
              }}
            >
              sign
            </button>
            <button type="button" onClick={() => setFreed(null)}>
              let it stay late
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const LOCKS = [
  { id: "F57", hint: "the word, the symbols and the morse" },
  { id: "F58", hint: "the stone and the tea" },
  { id: "F59", hint: "the child" },
  { id: "F60", hint: "the export and the demo" },
  { id: "F61", hint: "the fourth head" },
  { id: "F62", hint: "his name" },
];
function Gate() {
  const [open, setOpen] = useState<string[]>([]);
  const [msg, setMsg] = useState(
    "six locks of braided tape. each wants something you found.",
  );
  const [through, setThrough] = useState(false);
  // locks you already turned stay turned
  useEffect(() => {
    fetchFragments()
      .then((f) => {
        const ids = new Set(f.owned.map((o) => o.id));
        setOpen(LOCKS.filter((l) => ids.has(l.id)).map((l) => l.id));
      })
      .catch(() => {});
  }, []);
  const tryLock = async (id: string) => {
    if (open.includes(id)) return;
    const f = await claimFragment(id);
    if (f) {
      setOpen((o) => [...o, id]);
      setMsg(f.text);
    } else setMsg("the lock doesn't turn. not yet.");
  };
  return (
    <div className="vxb-gate">
      <h3>
        the gate at the end of the tape · {open.length}/{LOCKS.length}
      </h3>
      <div className="locks">
        {LOCKS.map((l) => (
          <button
            key={l.id}
            type="button"
            className={open.includes(l.id) ? "is-open" : ""}
            onClick={() => void tryLock(l.id)}
            title={l.hint}
          >
            <span>{open.includes(l.id) ? "◯" : "●"}</span>
            {l.hint}
          </button>
        ))}
      </div>
      <p className="msg">{msg}</p>
      <button
        type="button"
        className="through"
        onClick={async () => {
          const f = await claimFragment("F63");
          if (f) setThrough(true);
          else setMsg("the threads won't part. the locks first.");
        }}
      >
        walk past the threads
      </button>
      {through && (
        <Link className="sidec" href="/side-c">
          ▾ side c
        </Link>
      )}
    </div>
  );
}

function Shortwave(props: {
  world: World;
  onWorld: (w: World) => void;
  onSay: (t: string) => void;
}) {
  const [lines, setLines] = useState<string[]>([]);
  const [freq, setFreq] = useState(88);
  const tune = async () => {
    vxSound("hiss");
    try {
      const r = await apiFetch<{
        say: string;
        granted?: string[];
        world: World;
      }>("/api/mascot/below/act", {
        method: "POST",
        body: JSON.stringify({
          room: "garagem",
          spot: "shortwave",
          verb: "use",
        }),
      });
      props.onWorld(r.world);
      setLines((l) => [...l, r.say]);
      if (r.granted?.length) {
        const all = await apiFetch<{ owned: { id: string; text: string }[] }>(
          "/api/mascot/fragments",
        );
        for (const id of r.granted) {
          const f = all.owned.find((x) => x.id === id);
          if (f) setLines((l) => [...l, f.text]);
        }
      }
    } catch {
      setLines((l) => [...l, "static."]);
    }
  };
  if (!props.world.flags.shortwave)
    return (
      <div className="vxb-shortwave">
        <h3>plans for a shortwave radio</h3>
        <p className="hint">
          valve · antenna · coil · crystal · dial. someone else's handwriting.
          use the bench when you have all five.
        </p>
      </div>
    );
  return (
    <div className="vxb-shortwave">
      <h3>shortwave · tuning side c</h3>
      <input
        type="range"
        min={88}
        max={108}
        step={0.1}
        value={freq}
        onChange={(e) => setFreq(Number(e.target.value))}
        aria-label="frequency"
      />
      <div className="freq">{freq.toFixed(1)} MHz</div>
      <button type="button" onClick={() => void tune()}>
        listen
      </button>
      <div className="log">
        {lines.map((l, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: append-only
          <p key={i}>{l}</p>
        ))}
      </div>
    </div>
  );
}

function BSide() {
  const [lines, setLines] = useState<string[]>([]);
  useEffect(() => {
    try {
      setLines(JSON.parse(sessionStorage.getItem("yd:vortex.bside") ?? "[]"));
    } catch {}
  }, []);
  return (
    <div className="vxb-bside">
      <h3>the wall of unsaid things (today)</h3>
      {lines.length === 0 ? (
        <p className="hint">
          empty. you haven't deleted anything today. or you're careful.
        </p>
      ) : (
        lines.map((l, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: append-only
          <p key={i} className="mirror">
            {l}
          </p>
        ))
      )}
      <p className="hint">
        only on this device. gone when you close the tab. like most things.
      </p>
    </div>
  );
}

// H-29 · THE PURIFICATION: three rare things on the altar, then pass the
// magnet along his tape without brushing a memory (an "operation" game).
// Every memory you touch costs one more thing he forgets. The server checks
// the items and pays the price; the touches are your conscience.
const RARE = [
  "fita-dourada",
  "bilhete-1987",
  "olho-de-vidro",
  "palavra-esquecida",
  "cristal",
  "chave-de-fenda",
];
const TAPE: [number, number][] = [
  [30, 150],
  [110, 150],
  [150, 70],
  [230, 70],
  [260, 220],
  [340, 230],
  [370, 90],
  [450, 80],
  [480, 200],
  [560, 210],
  [600, 150],
  [670, 150],
];
const MEMS = [
  { x: 150, y: 30, t: "tea" },
  { x: 185, y: 165, t: "the chair" },
  { x: 310, y: 280, t: "your name" },
  { x: 410, y: 40, t: "the 13th" },
  { x: 545, y: 140, t: "her voice" },
  { x: 610, y: 250, t: "a garage" },
];
const HALF = 24;
function segDist(
  p: [number, number],
  a: [number, number],
  b: [number, number],
) {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy),
    ),
  );
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}
function Purify(props: {
  world: World;
  onWorld: (w: World) => void;
  onSay: (t: string) => void;
}) {
  const own = RARE.filter((r) => props.world.inventory.includes(r));
  const [pick, setPick] = useState<string[]>([]);
  const [phase, setPhase] = useState<"pick" | "game" | "done">("pick");
  const [touches, setTouches] = useState(0);
  const [hit, setHit] = useState<number | null>(null);
  const [mag, setMag] = useState<[number, number] | null>(null);
  const [far, setFar] = useState(0);
  const [msg, setMsg] = useState(
    "three rare things on the altar. then the magnet. slowly. he's watching.",
  );
  const [busy, setBusy] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const armed = useRef(false);
  const touching = useRef(false);

  const finish = async (n: number) => {
    setBusy(true);
    try {
      const r = await apiFetch<{
        ok: boolean;
        say: string;
        forgot: { kind: string; what: string }[];
        world: World;
      }>("/api/mascot/below/purify", {
        method: "POST",
        body: JSON.stringify({ items: pick, touches: n }),
      });
      props.onWorld(r.world);
      setPhase("done");
      const lost = r.forgot
        .map((f) => (f.kind === "memory" ? `"${f.what}"` : f.what))
        .join(", ");
      setMsg(`${r.say} (he forgot: ${lost || "something he won't name"}.)`);
      props.onSay(r.say);
      vxSound("tink");
    } catch (e) {
      let reason = "the altar refuses.";
      try {
        reason = JSON.parse((e as { body: string }).body).say ?? reason;
      } catch {}
      setMsg(reason);
      setPhase("pick");
    } finally {
      setBusy(false);
    }
  };

  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m || phase !== "game") return;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    const p: [number, number] = [pt.x, pt.y];
    setMag(p);
    if (!armed.current) {
      if (Math.hypot(p[0] - TAPE[0][0], p[1] - TAPE[0][1]) < HALF) {
        armed.current = true;
        setMsg("go. don't touch the walls. those are his.");
      }
      return;
    }
    let best = Infinity;
    let seg = 0;
    for (let i = 0; i < TAPE.length - 1; i++) {
      const d = segDist(p, TAPE[i], TAPE[i + 1]);
      if (d < best) {
        best = d;
        seg = i;
      }
    }
    if (best > HALF) {
      if (!touching.current) {
        touching.current = true;
        const n = touches + 1;
        setTouches(n);
        vxSound("crunch");
        let near = 0;
        MEMS.forEach((mm, i) => {
          if (
            Math.hypot(mm.x - p[0], mm.y - p[1]) <
            Math.hypot(MEMS[near].x - p[0], MEMS[near].y - p[1])
          )
            near = i;
        });
        setHit(near);
        setTimeout(() => setHit(null), 600);
        if (n >= 6) {
          armed.current = false;
          setPhase("pick");
          setTouches(0);
          setFar(0);
          setMsg(
            "the tape screams. you stop. (nothing was taken. try again, steadier.)",
          );
          return;
        }
        setMsg(`you brushed "${MEMS[near].t}". it flickered. ${n}/6`);
      }
    } else {
      touching.current = false;
      setFar((f) => Math.max(f, seg));
      if (
        seg === TAPE.length - 2 &&
        Math.hypot(
          p[0] - TAPE[TAPE.length - 1][0],
          p[1] - TAPE[TAPE.length - 1][1],
        ) < HALF
      ) {
        armed.current = false;
        void finish(touches);
      }
    }
  };

  return (
    <div className="vxb-purify">
      <h3>the purification</h3>
      {phase === "pick" && (
        <>
          <div className="items">
            {own.length === 0 && (
              <span className="none">
                you have nothing rare. the altar yawns.
              </span>
            )}
            {own.map((it) => (
              <button
                key={it}
                type="button"
                className={pick.includes(it) ? "is-on" : ""}
                onClick={() =>
                  setPick((p) =>
                    p.includes(it)
                      ? p.filter((x) => x !== it)
                      : p.length < 3
                        ? [...p, it]
                        : p,
                  )
                }
              >
                {it.replace(/-/g, " ")}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="go"
            disabled={pick.length !== 3 || busy}
            onClick={() => {
              setPhase("game");
              setTouches(0);
              setFar(0);
              armed.current = false;
              setMsg("put the magnet on the start of his tape (the left end).");
            }}
          >
            lay them on the altar
          </button>
        </>
      )}
      {phase === "game" && (
        <>
          <svg
            ref={svgRef}
            viewBox="0 0 700 300"
            className="board"
            onPointerMove={move}
            onPointerLeave={() => {
              touching.current = false;
            }}
            role="img"
            aria-label="his tape, a winding channel between his memories"
          >
            <polyline
              points={TAPE.map((p) => p.join(",")).join(" ")}
              fill="none"
              stroke="#3a2a14"
              strokeWidth={HALF * 2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <polyline
              points={TAPE.map((p) => p.join(",")).join(" ")}
              fill="none"
              stroke="#5a3418"
              strokeWidth={10}
              strokeLinejoin="round"
              strokeDasharray="3 5"
            />
            <polyline
              points={TAPE.slice(0, far + 2)
                .map((p) => p.join(","))
                .join(" ")}
              fill="none"
              stroke="#cfe3e2"
              strokeOpacity={0.35}
              strokeWidth={10}
              strokeLinejoin="round"
            />
            {MEMS.map((m, i) => (
              <text
                key={m.t}
                x={m.x}
                y={m.y}
                className={`mem${hit === i ? " is-hit" : ""}`}
                textAnchor="middle"
              >
                {m.t}
              </text>
            ))}
            <circle
              cx={TAPE[0][0]}
              cy={TAPE[0][1]}
              r={HALF - 4}
              className="start"
            />
            <circle
              cx={TAPE[TAPE.length - 1][0]}
              cy={TAPE[TAPE.length - 1][1]}
              r={HALF - 4}
              className="end"
            />
            {mag && (
              <g
                transform={`translate(${mag[0]} ${mag[1]})`}
                className="magnet"
              >
                <path
                  d="M-10 -12 v14 a10 10 0 0 0 20 0 v-14"
                  fill="none"
                  stroke="#b5533c"
                  strokeWidth="7"
                />
                <rect x="-13.5" y="-16" width="7" height="6" fill="#d8d0c0" />
                <rect x="6.5" y="-16" width="7" height="6" fill="#d8d0c0" />
              </g>
            )}
          </svg>
          <button
            type="button"
            className="shaky"
            onClick={() => void finish(2)}
            disabled={busy}
          >
            my hands aren&apos;t steady — just do it (he forgets more)
          </button>
        </>
      )}
      <p className="msg">{msg}</p>
    </div>
  );
}

// O-13 · BELOW TV: four channels of pixel programmes and one that isn't.
const CHANNELS: { n: number; name: string; art: string; lines: string[] }[] = [
  {
    n: 2,
    name: "BELOW SHOPPING",
    art: `<rect x="40" y="40" width="80" height="60" rx="6" fill="#c8962e"/><rect x="52" y="52" width="56" height="26" rx="3" fill="#2a1f17"/><circle cx="68" cy="65" r="8" fill="#f3e4bd"/><circle cx="92" cy="65" r="8" fill="#f3e4bd"/><text x="80" y="94" text-anchor="middle" font-family="monospace" font-size="9" fill="#2a1f17">ONLY 3 TOKENS</text><g class="spark"><path d="M140 30 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4z" fill="#ffd27a"/></g>`,
    lines: [
      "NEW! tape glue. fixes everything except your deadlines.",
      "tired of your backlog? try THE VOID™. it eats cards so you don't have to.",
      "the archivist's dictionary of words nobody uses. now with 'synergy'.",
      "call now. the line is dead. that's part of the charm.",
    ],
  },
  {
    n: 4,
    name: "THE ARCHIVIST TEACHES",
    art: `<rect x="20" y="20" width="120" height="70" fill="#2f4a3a"/><text x="30" y="44" font-family="monospace" font-size="9" fill="#f3e4bd">LESSON 4:</text><text x="30" y="60" font-family="monospace" font-size="9" fill="#f3e4bd">"leverage"</text><text x="30" y="76" font-family="monospace" font-size="8" fill="#f3e4bd" opacity=".7">(extinct, 2031)</text><ellipse cx="160" cy="80" rx="22" ry="30" fill="#6b5a40"/><circle cx="152" cy="62" r="5" fill="#f3e4bd"/><circle cx="168" cy="62" r="5" fill="#f3e4bd"/>`,
    lines: [
      "today, dear viewers: words nobody uses anymore. 'leverage'. let us mourn.",
      "a card that is 'almost done' has never, in recorded history, been done.",
      "please do not breathe on the logs.",
    ],
  },
  {
    n: 7,
    name: "WOW & THE BULB",
    art: `<ellipse cx="60" cy="80" rx="18" ry="34" fill="#6b5a40"/><rect x="48" y="38" width="24" height="18" rx="4" fill="#c8962e"/><g class="flicker"><circle cx="130" cy="58" r="20" fill="#ffd27a"/><rect x="122" y="76" width="16" height="12" fill="#8a7a5c"/></g><path d="M86 62 q14 -14 26 0" stroke="#d97f8a" stroke-width="3" fill="none"/>`,
    lines: [
      "WOW: heeeey… i love you, bulb.",
      "THE BULB: *flicker*",
      "WOW: is that a yes? that's a yes. FLUTTER, IT'S A YES.",
      "THE BULB: *flicker flicker*",
      "next week: the bulb's mother disapproves.",
    ],
  },
  {
    n: 9,
    name: "WEATHER WITH THE COIL",
    art: `<circle cx="50" cy="50" r="18" fill="#ffd27a"/><path d="M90 60 q10 -20 30 -10 q20 -10 28 10 q16 4 6 18 h-62 q-14 -6 -2 -18" fill="#cfc3a8"/><g class="rain">${Array.from({ length: 6 }, (_, i) => `<line x1="${96 + i * 9}" y1="84" x2="${92 + i * 9}" y2="96" stroke="#8fe3e3" stroke-width="2"/>`).join("")}</g><path d="M30 100 q10 -8 20 0 t20 0 t20 0" stroke="#b5533c" stroke-width="3" fill="none"/>`,
    lines: [
      "static in the morning, clearing by lunch. 40% chance of rewind.",
      "humid in the basement. the bulb will flicker. bring a lighter.",
      "fog over the graveyard. do not follow the lights. they're not lights.",
    ],
  },
  {
    n: 13,
    name: "—",
    art: `<rect width="200" height="120" fill="#111"/>${Array.from({ length: 160 }, (_, i) => `<rect x="${(i * 37) % 200}" y="${(i * 53) % 120}" width="3" height="2" fill="#ddd" opacity="${((i * 7) % 10) / 10}"/>`).join("")}<text x="100" y="64" text-anchor="middle" font-family="monospace" font-size="10" fill="#f3e4bd" opacity=".6" class="ghost">i see you</text>`,
    lines: ["", "…", "", "turn it off.", ""],
  },
];
function BelowTV() {
  const [ch, setCh] = useState(0);
  const [line, setLine] = useState(0);
  const c = CHANNELS[ch];
  // biome-ignore lint/correctness/useExhaustiveDependencies: restart the captions on every channel change
  useEffect(() => {
    setLine(0);
    const iv = setInterval(() => setLine((l) => l + 1), 3200);
    return () => clearInterval(iv);
  }, [ch]);
  return (
    <div className="vxb-tvset">
      <h3>below tv</h3>
      <div className={`screen ch${c.n}`}>
        <SvgArtTV
          svg={`<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">${c.art}</svg>`}
        />
        <span className="chan">
          CH {c.n} · {c.name}
        </span>
        <span className="cap">{c.lines[line % c.lines.length]}</span>
      </div>
      <div className="knobs">
        {CHANNELS.map((x, i) => (
          <button
            key={x.n}
            type="button"
            className={i === ch ? "is-on" : ""}
            onClick={() => {
              vxSound("click");
              setCh(i);
            }}
          >
            {x.n}
          </button>
        ))}
      </div>
    </div>
  );
}
function SvgArtTV({ svg }: { svg: string }) {
  // our own markup only (numbers + fixed strings above)
  // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted generated SVG
  return <div className="art" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function Arcade() {
  return (
    <div className="vxb-arcadedoor">
      <h3>wow & flutter's arcade</h3>
      <p>
        the machines glow. tokens clink. the high-score table has one name
        nobody beat since 1989.
      </p>
      <Link href="/arcade" className="go">
        ▸ play
      </Link>
    </div>
  );
}

function Quests({ world }: { world: World }) {
  return (
    <div className="vxb-quests">
      <h3>the quest tape</h3>
      <ol>
        {world.quests.map((q) => (
          <li key={q.id} className={q.step === "done" ? "is-done" : ""}>
            <b>{q.title}</b>
            <span>{q.step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
