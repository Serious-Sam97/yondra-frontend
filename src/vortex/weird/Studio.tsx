"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type VortexMood, vortexSvg } from "@/lib/vortexArt";
import { pick } from "./bridge";
import "./studio.css";
import { tr, useVxLang } from "@/vortex/core/i18n";

// R-12 · the studio: a 16-step, 8-note sequencer you compose on WITH him.
// You place notes; "let him improve it" mutates the pattern (he means well; he
// does not do well); REC saves the tape on this device and the share link
// carries the whole pattern in the URL hash (no server, no account data).

const STEPS = 16;
const ROWS = 8;
const SCALE = [0, 3, 5, 7, 10, 12, 15, 17]; // minor pentatonic, two octaves-ish
const ROOT = 220;
type Grid = boolean[][]; // [row][step]
const empty = (): Grid =>
  Array.from({ length: ROWS }, () => Array(STEPS).fill(false));

const encode = (g: Grid, bpm: number) =>
  btoa(
    String.fromCharCode(
      bpm,
      ...g.flatMap((row) =>
        [0, 8].map((o) =>
          row.slice(o, o + 8).reduce((b, on, i) => b | ((on ? 1 : 0) << i), 0),
        ),
      ),
    ),
  ).replace(/=+$/, "");
function decode(s: string): { g: Grid; bpm: number } | null {
  try {
    const raw = atob(s);
    if (raw.length !== 1 + ROWS * 2) return null;
    const bpm = raw.charCodeAt(0);
    const g = empty();
    for (let r = 0; r < ROWS; r++)
      for (let h = 0; h < 2; h++) {
        const b = raw.charCodeAt(1 + r * 2 + h);
        for (let i = 0; i < 8; i++) g[r][h * 8 + i] = !!(b & (1 << i));
      }
    return { g, bpm: Math.min(200, Math.max(60, bpm)) };
  } catch {
    return null;
  }
}

const IMPROVEMENTS: {
  line: string;
  mood: VortexMood;
  fn: (g: Grid) => Grid;
}[] = [
  {
    line: "i added notes. more notes = more music. that's maths.",
    mood: "smug",
    fn: (g) => g.map((row) => row.map((on) => on || Math.random() < 0.08)),
  },
  {
    line: "reversed it. everything sounds better backwards. ask the garage.",
    mood: "malicious",
    fn: (g) => g.map((row) => [...row].reverse()),
  },
  {
    line: "moved everything up. higher is happier. i'm told.",
    mood: "happy",
    fn: (g) => [...g.slice(1), g[0]],
  },
  {
    line: "removed the boring ones. it's minimalism now. you're welcome.",
    mood: "judging",
    fn: (g) => g.map((row) => row.map((on) => on && Math.random() < 0.6)),
  },
  {
    line: "syncopation. look it up. actually don't, just feel it.",
    mood: "ecstasy",
    fn: (g) => g.map((row) => [row[STEPS - 1], ...row.slice(0, -1)]),
  },
];

export default function Studio() {
  useVxLang(); // T-13 · re-render on language change
  const [grid, setGrid] = useState<Grid>(empty);
  const [bpm, setBpm] = useState(110);
  const [step, setStep] = useState(-1);
  const [line, setLine] = useState("put some notes down. i'll fix them.");
  const [mood, setMood] = useState<VortexMood>("curious");
  const [tapes, setTapes] = useState<{ name: string; code: string }[]>([]);
  const ac = useRef<AudioContext | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const gridRef = useRef(grid);
  gridRef.current = grid;

  useEffect(() => {
    const h = new URLSearchParams(window.location.hash.slice(1)).get("t");
    const d = h ? decode(h) : null;
    if (d) {
      setGrid(d.g);
      setBpm(d.bpm);
      setLine("someone sent you a tape. it's… brave.");
    }
    try {
      setTapes(JSON.parse(localStorage.getItem("yd:vortex.studio") ?? "[]"));
    } catch {}
  }, []);

  const note = useCallback((row: number, when: number) => {
    const a = ac.current;
    if (!a) return;
    const f = ROOT * 2 ** (SCALE[ROWS - 1 - row] / 12);
    const o = a.createOscillator();
    o.type = "square";
    o.frequency.value = f;
    o.detune.value = (Math.random() - 0.5) * 14; // tape wobble
    const lp = a.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2200;
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(0.09, when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.22);
    o.connect(lp).connect(g).connect(a.destination);
    o.start(when);
    o.stop(when + 0.25);
  }, []);

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setStep(-1);
  };
  const play = () => {
    if (timer.current) return stop();
    ac.current ??= new AudioContext();
    void ac.current.resume();
    let s = 0;
    const tick = () => {
      const a = ac.current;
      if (!a) return;
      for (let r = 0; r < ROWS; r++)
        if (gridRef.current[r][s]) note(r, a.currentTime + 0.02);
      setStep(s);
      s = (s + 1) % STEPS;
    };
    tick();
    timer.current = setInterval(tick, 60_000 / bpm / 4);
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: stop the clock on unmount only
  useEffect(() => () => stop(), []);
  // tempo changes restart the clock
  // biome-ignore lint/correctness/useExhaustiveDependencies: restart only on bpm
  useEffect(() => {
    if (timer.current) {
      stop();
      play();
    }
  }, [bpm]);

  const improve = () => {
    const imp = pick(IMPROVEMENTS);
    setGrid((g) => imp.fn(g));
    setLine(imp.line);
    setMood(imp.mood);
    if (Math.random() < 0.3) setBpm((b) => Math.min(200, b + 20));
  };
  const record = () => {
    const code = encode(grid, bpm);
    const name = `tape ${tapes.length + 1} · ${new Date().toLocaleDateString()}`;
    const next = [{ name, code }, ...tapes].slice(0, 12);
    setTapes(next);
    try {
      localStorage.setItem("yd:vortex.studio", JSON.stringify(next));
    } catch {}
    window.history.replaceState(null, "", `#t=${code}`);
    setLine("recorded. on a real tape. well. a fake real tape.");
  };
  const share = () => {
    const url = `${window.location.origin}/studio#t=${encode(grid, bpm)}`;
    void navigator.clipboard
      ?.writeText(url)
      .then(() =>
        setLine("link copied. send it to someone you want to confuse."),
      );
  };

  const face = { __html: vortexSvg(mood, "studio") };
  return (
    <div className="vxs">
      <header className="vxs-head">
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: our own generated SVG */}
        <div className="vxs-face" dangerouslySetInnerHTML={face} />
        <div>
          <h1>{tr("THE STUDIO")}</h1>
          <p className="vxs-line">“{line}”</p>
        </div>
      </header>
      <fieldset className="vxs-grid" aria-label="sequencer">
        {grid.map((row, r) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-size grid
          <div key={r} className="vxs-row">
            {row.map((on, s) => (
              <button
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed-size grid
                key={s}
                type="button"
                aria-pressed={on}
                aria-label={`note ${ROWS - r}, step ${s + 1}`}
                className={`${on ? "is-on" : ""}${s === step ? " is-now" : ""}${s % 4 === 0 ? " is-beat" : ""}`}
                onClick={() =>
                  setGrid((g) =>
                    g.map((rr, i) =>
                      i === r ? rr.map((v, j) => (j === s ? !v : v)) : rr,
                    ),
                  )
                }
              />
            ))}
          </div>
        ))}
      </fieldset>
      <div className="vxs-deck">
        <button type="button" onClick={play}>
          {tr(step >= 0 ? "■ STOP" : "▶ PLAY")}
        </button>
        <label>
          BPM
          <input
            type="range"
            min={60}
            max={200}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
          />
          <b>{bpm}</b>
        </label>
        <button type="button" onClick={improve}>
          {tr("let him improve it")}
        </button>
        <button type="button" className="rec" onClick={record}>
          {tr("● REC")}
        </button>
        <button type="button" onClick={share}>
          {tr("share link")}
        </button>
        <button
          type="button"
          onClick={() => {
            setGrid(empty());
            setLine("a clean tape. the scariest kind.");
          }}
        >
          {tr("erase")}
        </button>
      </div>
      {tapes.length > 0 && (
        <ul className="vxs-tapes">
          {tapes.map((t) => (
            <li key={t.code + t.name}>
              <button
                type="button"
                onClick={() => {
                  const d = decode(t.code);
                  if (d) {
                    setGrid(d.g);
                    setBpm(d.bpm);
                  }
                }}
              >
                ⏏ {t.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
