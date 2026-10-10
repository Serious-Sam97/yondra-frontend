"use client";

import { useId, useMemo, useRef, useState } from "react";
import { SvgArt } from "@/components/ui/SvgArt";
import type { VortexSoundName } from "@/components/vortex/vortexSound";
import { ALL_MOODS, type VortexMood, vortexSvg } from "@/lib/vortexArt";
import {
  animNames,
  animSpec,
  defineAnim,
  type Step,
} from "@/vortex/body/anims";
import { GESTURES, type GestureName } from "@/vortex/body/gestures";
import { useVortexBody } from "@/vortex/body/useBody";
import "./lab.css";

// S-05 · THE ANIMATION TIMELINE (internal). Keyframes on a ruler you can drag,
// a row editor for each beat, live preview on the real rig and body engine,
// and an export in the exact `defineAnim(...)` shape anims.ts uses.

const SOUNDS: VortexSoundName[] = [
  "hiss",
  "click",
  "rewind",
  "crunch",
  "tink",
  "whisper",
];
type Row = Omit<Step, "run" | "say"> & { say?: string; key: number };

let seq = 1;
const toRows = (steps: Step[]): Row[] =>
  steps.map(
    (s) =>
      ({
        ...s,
        say: Array.isArray(s.say) ? s.say[0] : s.say,
        run: undefined,
        key: seq++,
      }) as Row,
  );

function code(
  name: string,
  rows: Row[],
  priority: number,
  interruptible: boolean,
): string {
  const step = (r: Row) => {
    const o: Record<string, unknown> = { at: r.at };
    for (const k of [
      "mood",
      "gesture",
      "say",
      "sound",
      "squash",
      "kick",
      "dilate",
      "breath",
      "blink",
      "lying",
    ] as const)
      if (r[k] !== undefined && r[k] !== "" && r[k] !== null) o[k] = r[k];
    if (r.flash) o.flash = r.flash;
    const body = Object.entries(o)
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join(", ");
    return `  { ${body} }`;
  };
  const opts =
    priority !== 1 || !interruptible
      ? `, { priority: ${priority}${interruptible ? "" : ", interruptible: false"} }`
      : "";
  return `defineAnim("${name}", [\n${[...rows]
    .sort((a, b) => a.at - b.at)
    .map(step)
    .join(",\n")},\n]${opts});`;
}

export default function AnimTimeline() {
  const uid = useId().replace(/[^a-z0-9]/gi, "");
  const [mood, setMood] = useState<VortexMood>("smug");
  const [line, setLine] = useState("");
  const [name, setName] = useState("my-anim");
  const [rows, setRows] = useState<Row[]>([
    { key: seq++, at: 0, mood: "curious" },
    { key: seq++, at: 600, gesture: "shrug", say: "well." },
    { key: seq++, at: 1600, mood: "rest" },
  ]);
  const [priority, setPriority] = useState(1);
  const [interruptible, setInterruptible] = useState(true);
  const spriteRef = useRef<HTMLDivElement>(null);
  const physRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<HTMLDivElement>(null);
  const ruler = useRef<HTMLDivElement>(null);
  const body = useVortexBody({
    active: true,
    calm: false,
    mood,
    spriteRef,
    physRef,
    fxHostRef: fxRef,
    setMood,
    restMood: () => "smug",
    say: setLine,
    isBusy: () => false,
  });
  const svg = useMemo(() => vortexSvg(mood, `tl${uid}`), [mood, uid]);
  const total = Math.max(2000, ...rows.map((r) => r.at + 600));

  const set = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const play = () => {
    defineAnim(
      "__timeline",
      rows.map(({ key: _k, ...r }) => r as Step),
      { priority: 9, interruptible: true },
    );
    void body.animator.play("__timeline");
  };
  const load = (n: string) => {
    const a = animSpec(n);
    if (!a) return;
    setName(n);
    setRows(toRows(a.steps));
    setPriority(a.priority);
    setInterruptible(a.interruptible);
  };
  const drag = (key: number) => (e: React.PointerEvent) => {
    const el = ruler.current;
    if (!el) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const at =
        Math.round(
          (Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * total) /
            50,
        ) * 50;
      set(key, { at });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const out = code(name, rows, priority, interruptible);

  return (
    <main className="vxlab">
      <header>
        <h1>animation timeline</h1>
        <p>
          dev only · S-05 · drag the keyframes, play on the real rig, copy the
          defineAnim
        </p>
      </header>
      <section className="vxlab-stage">
        <div className="vxlab-rig vxr-on">
          <div ref={spriteRef} className={`vxa-sprite vxa-mood-${mood}`}>
            <div className="vxa-fxhost" ref={fxRef}>
              <i className="vxr-shadow" aria-hidden />
              <div className="vxr-phys" ref={physRef}>
                <div className="vxa-face">
                  <SvgArt svg={svg} className="vxa-body" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <output className="vxlab-line">{line || " "}</output>
        <div className="vxlab-sliders">
          <button type="button" onClick={play}>
            ▶ play
          </button>
          <label>
            load
            <select value="" onChange={(e) => load(e.target.value)}>
              <option value="">an existing animation…</option>
              {animNames()
                .filter((n) => !n.startsWith("__"))
                .sort()
                .map((n) => (
                  <option key={n}>{n}</option>
                ))}
            </select>
          </label>
          <label>
            name{" "}
            <input
              value={name}
              onChange={(e) =>
                setName(e.target.value.replace(/[^a-z0-9-]/g, ""))
              }
            />
          </label>
          <label>
            priority{" "}
            <input
              type="number"
              min={0}
              max={9}
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={interruptible}
              onChange={(e) => setInterruptible(e.target.checked)}
            />{" "}
            interruptible
          </label>
        </div>
      </section>

      <section>
        <div className="vxtl-ruler" ref={ruler}>
          {Array.from(
            { length: Math.floor((total - 200) / 500) + 1 },
            (_, i) => (
              <span
                key={`t${i * 500}`}
                className="tick"
                style={{ left: `${((i * 500) / total) * 100}%` }}
              >
                {i * 500}
              </span>
            ),
          )}
          {rows.map((r) => (
            <button
              key={r.key}
              type="button"
              className="key"
              style={{ left: `${(r.at / total) * 100}%` }}
              onPointerDown={drag(r.key)}
              title={`${r.at}ms`}
              aria-label={`keyframe at ${r.at} ms`}
            >
              ◆<i>{r.gesture ?? r.mood ?? (r.say ? "“" : (r.sound ?? "•"))}</i>
            </button>
          ))}
        </div>
        <table className="vxtl-rows">
          <thead>
            <tr>
              <th>at</th>
              <th>mood</th>
              <th>gesture</th>
              <th>says</th>
              <th>sound</th>
              <th>squash</th>
              <th>kick</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {[...rows]
              .sort((a, b) => a.at - b.at)
              .map((r) => (
                <tr key={r.key}>
                  <td>
                    <input
                      type="number"
                      step={50}
                      min={0}
                      value={r.at}
                      onChange={(e) =>
                        set(r.key, { at: Number(e.target.value) })
                      }
                    />
                  </td>
                  <td>
                    <select
                      value={r.mood ?? ""}
                      onChange={(e) =>
                        set(r.key, {
                          mood: (e.target.value || undefined) as Row["mood"],
                        })
                      }
                    >
                      <option value="">—</option>
                      <option value="rest">rest</option>
                      {ALL_MOODS.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={r.gesture ?? ""}
                      onChange={(e) =>
                        set(r.key, {
                          gesture: (e.target.value || undefined) as
                            | GestureName
                            | undefined,
                        })
                      }
                    >
                      <option value="">—</option>
                      {GESTURES.map((g) => (
                        <option key={g}>{g}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      value={r.say ?? ""}
                      onChange={(e) =>
                        set(r.key, { say: e.target.value || undefined })
                      }
                    />
                  </td>
                  <td>
                    <select
                      value={r.sound ?? ""}
                      onChange={(e) =>
                        set(r.key, {
                          sound: (e.target.value || undefined) as
                            | VortexSoundName
                            | undefined,
                        })
                      }
                    >
                      <option value="">—</option>
                      {SOUNDS.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      step={0.05}
                      value={r.squash ?? ""}
                      onChange={(e) =>
                        set(r.key, {
                          squash:
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value),
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step={0.1}
                      value={r.kick ?? ""}
                      onChange={(e) =>
                        set(r.key, {
                          kick:
                            e.target.value === ""
                              ? undefined
                              : Number(e.target.value),
                        })
                      }
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      aria-label="delete keyframe"
                      onClick={() =>
                        setRows((rs) => rs.filter((x) => x.key !== r.key))
                      }
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        <button
          type="button"
          onClick={() =>
            setRows((rs) => [...rs, { key: seq++, at: total - 400 }])
          }
        >
          + keyframe
        </button>
      </section>
      <section>
        <h2>export</h2>
        <pre className="vxtl-code">{out}</pre>
        <button
          type="button"
          onClick={() => void navigator.clipboard?.writeText(out)}
        >
          copy defineAnim
        </button>
      </section>
    </main>
  );
}
