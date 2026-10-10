"use client";

import { useEffect, useRef, useState } from "react";
import { vxSound } from "@/components/vortex/vortexSound";
import { vortexSvg } from "@/lib/vortexArt";
import { subscribeVortex } from "@/lib/vortexBus";
import { tr, useVxLang } from "@/vortex/core/i18n";
import { body, centre, pick, say, wait, where } from "./bridge";

// LADO R · the overlays: the interrupted broadcast (R-13), the fake
// maintenance (R-14), the fork (R-15), popcorn (R-17), speedrun (R-18) and his
// second cursor (R-19). Each one is a small self-contained piece of theatre.

/* ── R-13 · WE INTERRUPT THIS PROGRAM ── */
const BULLETINS = [
  "the tape in the garage is still running. nobody pressed stop in 1989.",
  "a fourth head was found in the deck. it is not his. it is listening.",
  "the rewinder has been seen two pages from here. remain seated.",
  "13 march. the migration. those who remember, don't.",
  "this broadcast never happened. neither did the last one.",
];
const FACE_INTR = { __html: vortexSvg("judging", "intr") };
export function Interrupt({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"bars" | "card">("bars");
  const [bulletin] = useState(() => pick(BULLETINS));
  useEffect(() => {
    let ac: AudioContext | null = null;
    try {
      ac = new AudioContext();
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.frequency.value = 1000;
      g.gain.value = 0.035; // always quiet
      o.connect(g).connect(ac.destination);
      o.start();
      o.stop(ac.currentTime + 1);
    } catch {}
    const t1 = setTimeout(() => setPhase("card"), 1000);
    const t2 = setTimeout(onDone, 4200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      void ac?.close();
    };
  }, [onDone]);
  return (
    <div className={`vxw-interrupt is-${phase}`} role="alert">
      {phase === "bars" ? (
        <div className="bars" />
      ) : (
        <div className="card">
          {/* biome-ignore lint/security/noDangerouslySetInnerHtml: our own generated SVG */}
          <div className="face" dangerouslySetInnerHTML={FACE_INTR} />
          <b>WE INTERRUPT THIS PROGRAM</b>
          <p>{bulletin}</p>
          <i>we now return you to your regularly scheduled productivity.</i>
        </div>
      )}
    </div>
  );
}

/* ── R-14 · fake maintenance (only for you, skip always visible) ── */
export function Maintenance({ onDone }: { onDone: () => void }) {
  useVxLang(); // T-13 · re-render on language change
  const [n, setN] = useState(10);
  useEffect(() => {
    if (n <= 0) {
      onDone();
      return;
    }
    const t = setTimeout(() => setN(n - 1), 1000);
    return () => clearTimeout(t);
  }, [n, onDone]);
  return (
    <div
      className="vxw-maint"
      role="dialog"
      aria-label="Vortex is defragmenting"
    >
      <div className="vfd">
        <p>{tr("THE GHOST IS DEFRAGMENTING")}</p>
        <p className="bar">{"█".repeat(10 - n) + "░".repeat(n)}</p>
        <p>{tr("back in {n} seconds.").replace("{n}", String(n))}</p>
      </div>
      <button type="button" onClick={onDone}>
        {tr("skip")}
      </button>
      <small>
        {tr(
          "this is just Vortex being Vortex. yondra is fine. your work is fine.",
        )}
      </small>
    </div>
  );
}

/* ── R-15 · the fork ── */
const ARGUMENT: [string, string][] = [
  ["we should help them.", "we should NOT help them."],
  ["the backlog is fine.", "the backlog is a crime scene."],
  ["i'm the original.", "no, I'M the original."],
  ["let's be nice today.", "let's be honest today."],
];
export function Fork({ onDone }: { onDone: () => void }) {
  useVxLang(); // T-13 · re-render on language change
  const at = useRef(where());
  const raw = at.current
    ? centre(at.current)
    : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  // room for both twins and their speech bubbles
  const c = {
    x: Math.max(200, Math.min(window.innerWidth - 200, raw.x)),
    y: Math.max(200, Math.min(window.innerHeight - 140, raw.y)),
  };
  const [stage, setStage] = useState<
    "split" | "argue" | "fight" | "choose" | "gone"
  >("split");
  const [line, setLine] = useState(0);
  const [loser, setLoser] = useState<0 | 1 | null>(null);
  const args = useRef(pick(ARGUMENT));
  useEffect(() => {
    body({ cmd: "hide" });
    vxSound("crunch");
    const ts = [
      setTimeout(() => setStage("argue"), 700),
      setTimeout(() => setLine(1), 2300),
      setTimeout(() => setStage("fight"), 3900),
      setTimeout(() => setStage("choose"), 6400),
    ];
    return () => {
      for (const t of ts) clearTimeout(t);
      body({ cmd: "show" });
    };
  }, []);
  const keep = async (k: 0 | 1) => {
    setLoser(k === 0 ? 1 : 0);
    setStage("gone");
    vxSound("hiss");
    const x = c.x + (k === 0 ? -90 : 90);
    body({ cmd: "place", x, y: c.y, ms: 0 });
    await wait(900);
    body({ cmd: "show" });
    say(
      k === 0
        ? "good choice. he was the evil one. (i'm the evil one.)"
        : "you picked me. obviously. the other one had bad opinions.",
    );
    try {
      if (Math.random() < 0.4)
        localStorage.setItem("yd:vortex.forkghost", String(Date.now()));
    } catch {}
    onDone();
  };
  const face = (k: 0 | 1) =>
    vortexSvg(k === 0 ? "smug" : "malicious", `fork${k}`);
  return (
    <div
      className={`vxw-fork is-${stage}`}
      style={{ "--x": `${c.x}px`, "--y": `${c.y}px` } as React.CSSProperties}
    >
      {stage === "fight" && <div className="cloud" aria-hidden />}
      {([0, 1] as const).map((k) => (
        <button
          key={k}
          type="button"
          className={`twin twin--${k}${loser === k ? " is-static" : ""}`}
          disabled={stage !== "choose"}
          onClick={() => void keep(k)}
          aria-label={
            k === 0 ? "keep the left Vortex" : "keep the right Vortex"
          }
        >
          {/* biome-ignore lint/security/noDangerouslySetInnerHtml: our own generated SVG */}
          <span dangerouslySetInnerHTML={{ __html: face(k) }} />
          {stage === "argue" && line >= k && <output>{args.current[k]}</output>}
        </button>
      ))}
      {stage === "choose" && (
        <p className="pickme">
          {tr("pick one. the other becomes static. no pressure.")}
        </p>
      )}
    </div>
  );
}

/** the loser of a fork, sometimes, drifting across once: a ghost of a ghost */
export function ForkGhost() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    try {
      const at = Number(localStorage.getItem("yd:vortex.forkghost") ?? 0);
      if (at && Date.now() - at > 3_600_000) {
        localStorage.removeItem("yd:vortex.forkghost");
        t = setTimeout(() => setOn(true), 30_000 + Math.random() * 120_000);
      }
    } catch {}
    return () => {
      if (t) clearTimeout(t);
    };
  }, []);
  if (!on) return null;
  const html = { __html: vortexSvg("empty", "fg") };
  return (
    <div
      className="vxw-forkghost"
      onAnimationEnd={() => setOn(false)}
      aria-hidden
    >
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: our own generated SVG */}
      <span dangerouslySetInnerHTML={html} />
    </div>
  );
}

/* ── R-17 · popcorn ── */
const POP: Record<string, string[]> = {
  done: [
    "oh no. oh you're not gonna— you did. straight to done. no testing. legend.",
    "*munch* DONE. the crowd goes mild.",
    "and it's over. i laughed. i cried. mostly laughed.",
  ],
  moved: [
    "plot twist.",
    "a lateral move. very cinematic.",
    "*munch* where's this going. where's this GOING.",
  ],
  opened: [
    "*leans in* the suspense.",
    "ooh, opening the card. classic second act.",
    "*munch munch* what's inside. tell me.",
  ],
  renamed: [
    "a rename. the critics are divided.",
    "new title, same card. sequel energy.",
  ],
  archived: [
    "*drops popcorn* you KILLED it.",
    "nooo. it had a family. (it had subtasks.)",
  ],
  drag: ["here we go here we go here we go", "*grips armrest*"],
  jammed: [
    "BOO. *throws popcorn at screen*",
    "this is the part where it all goes wrong.",
  ],
};
export function Popcorn({ onDone }: { onDone: () => void }) {
  useVxLang(); // T-13 · re-render on language change
  const [crumbs, setCrumbs] = useState(0);
  useEffect(() => {
    body({ cmd: "travel", x: 96, y: window.innerHeight - 110 });
    body({ cmd: "mood", mood: "focused" });
    let last = 0;
    const react = (k: keyof typeof POP) => {
      const now = Date.now();
      if (now - last < 2500) return;
      last = now;
      say(pick(POP[k]));
      setCrumbs((c) => c + 1);
    };
    const off = subscribeVortex((e) => {
      if (e.type === "card.moved") react(e.done ? "done" : "moved");
      else if (e.type === "card.opened") react("opened");
      else if (e.type === "card.edited" && e.renamed) react("renamed");
      else if (e.type === "card.archived") react("archived");
      else if (e.type === "drag.start") react("drag");
      else if (e.type === "card.jammed") react("jammed");
    });
    return () => {
      off();
      body({ cmd: "home" });
    };
  }, []);
  return (
    <div className="vxw-popcorn" aria-hidden>
      <div className="chair" />
      <div className="bucket" key={crumbs}>
        <span />
        <span />
        <span />
      </div>
      <button
        type="button"
        className="vxw-pill"
        onClick={onDone}
        aria-hidden={false}
      >
        {tr("✕ end the movie")}
      </button>
    </div>
  );
}

/* ── R-18 · speedrun ── */
const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}.${String(Math.floor((ms % 1000) / 10)).padStart(2, "0")}`;
};
const PB_KEY = "yd:vortex.speedrun.pb";
export function Speedrun({ onDone }: { onDone: () => void }) {
  useVxLang(); // T-13 · re-render on language change
  const [t0] = useState(() => performance.now());
  const [now, setNow] = useState(t0);
  const [splits, setSplits] = useState<number[]>([]);
  const pb = useRef<number[]>([]);
  useEffect(() => {
    try {
      pb.current = JSON.parse(localStorage.getItem(PB_KEY) ?? "[]");
    } catch {}
    say(
      "3… 2… 1… GO. any%, card category. glitches allowed. dignity not required.",
    );
    let raf = 0;
    const tick = () => {
      setNow(performance.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const off = subscribeVortex((e) => {
      if (e.type !== "card.moved" || !e.done) return;
      const t = performance.now() - t0;
      setSplits((s) => {
        const i = s.length;
        const best = pb.current[i];
        const delta = best === undefined ? null : t - best;
        say(
          delta === null
            ? pick([
                "FIRST SPLIT ON RECORD. history is being written. badly, but written.",
                "new split! no PB to compare. you're racing yourself. and losing. somehow.",
              ])
            : delta < 0
              ? pick([
                  `${fmt(-delta)} AHEAD OF PB. chat is going WILD.`,
                  `GOLD SPLIT. -${fmt(-delta)}. the frame-perfect card drop. unbelievable.`,
                ])
              : pick([
                  `+${fmt(delta)} behind pace. it's not over. it's a little over.`,
                  `red split, +${fmt(delta)}. reset? no. we never reset. we suffer.`,
                ]),
        );
        vxSound(delta !== null && delta < 0 ? "tink" : "click");
        return [...s, t];
      });
    });
    return () => {
      cancelAnimationFrame(raf);
      off();
    };
  }, [t0]);
  const end = () => {
    const better =
      splits.length > 0 &&
      (pb.current.length < splits.length ||
        splits[splits.length - 1] < pb.current[splits.length - 1]);
    if (better) {
      try {
        localStorage.setItem(
          PB_KEY,
          JSON.stringify(
            splits.map((s, i) =>
              Math.min(s, pb.current[i] ?? Number.POSITIVE_INFINITY),
            ),
          ),
        );
      } catch {}
      say("NEW PERSONAL BEST. i'd clap but i have no hands. imagine clapping.");
    } else
      say(
        splits.length
          ? "run's over. not a PB. we'll get 'em next time. we won't."
          : "zero splits. a pacifist run. respect.",
      );
    onDone();
  };
  return (
    <div className="vxw-speedrun" role="timer">
      <header>
        <b>ANY% · CARDS</b>
        <button type="button" onClick={end}>
          {tr("end run")}
        </button>
      </header>
      <ol>
        {splits.map((s, i) => {
          const best = pb.current[i];
          const d = best === undefined ? null : s - best;
          return (
            <li key={s}>
              <span>
                {tr("card")} {i + 1}
              </span>
              <i className={d === null ? "" : d < 0 ? "gold" : "red"}>
                {d === null ? "—" : `${d < 0 ? "-" : "+"}${fmt(Math.abs(d))}`}
              </i>
              <span>{fmt(s)}</span>
            </li>
          );
        })}
      </ol>
      <p className="clock">{fmt(now - t0)}</p>
    </div>
  );
}

/* ── R-19 · his cursor ── */
export function SecondCursor({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ring, setRing] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let alive = true;
    const go = (x: number, y: number, ms = 600) => {
      el.style.transition = `transform ${ms}ms cubic-bezier(.3,.7,.2,1)`;
      el.style.transform = `translate(${x}px, ${y}px)`;
    };
    go(window.innerWidth - 40, window.innerHeight / 2, 0);
    const clicks: { x: number; y: number }[] = [];
    const onClick = (e: MouseEvent) => {
      clicks.push({ x: e.clientX, y: e.clientY });
      setTimeout(() => {
        const c = clicks.shift();
        if (!c || !alive) return;
        go(c.x, c.y, 500);
        setTimeout(() => el.classList.add("is-click"), 520);
        setTimeout(() => el.classList.remove("is-click"), 760);
      }, 1200);
    };
    window.addEventListener("click", onClick, true);
    // between your clicks, he points at things
    const point = async () => {
      while (alive) {
        await wait(3500 + Math.random() * 4000);
        if (!alive) return;
        const cards = [
          ...document.querySelectorAll<HTMLElement>(
            ".mt-jx, main button, main h1, main h2",
          ),
        ].filter((n) => {
          const r = n.getBoundingClientRect();
          return r.top > 60 && r.bottom < window.innerHeight && r.width > 30;
        });
        const t = pick(cards);
        if (!t) continue;
        const r = t.getBoundingClientRect();
        go(r.left + r.width / 2, r.top + r.height / 2, 900);
        if (Math.random() < 0.5) {
          await wait(950);
          setRing({
            x: r.left - 8,
            y: r.top - 8,
            w: r.width + 16,
            h: r.height + 16,
          });
          await wait(1600);
          setRing(null);
        }
      }
    };
    void point();
    const end = setTimeout(onDone, 45_000);
    return () => {
      alive = false;
      clearTimeout(end);
      window.removeEventListener("click", onClick, true);
    };
  }, [onDone]);
  return (
    <>
      <div ref={ref} className="vxw-cursor" aria-hidden>
        <svg viewBox="0 0 16 22" width="18" height="24" aria-hidden="true">
          <path
            d="M1 1 L1 18 L5.5 14 L8.5 21 L11 20 L8 13 L14 13 Z"
            fill="#ff2e5b"
            stroke="#000"
            strokeWidth="1.2"
          />
        </svg>
      </div>
      {ring && (
        <div
          className="vxw-ring"
          aria-hidden
          style={{ left: ring.x, top: ring.y, width: ring.w, height: ring.h }}
        />
      )}
    </>
  );
}
