"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { SvgArt } from "@/components/ui/SvgArt";
import { apiFetch } from "@/lib/api";
import {
  ALL_MOODS,
  type VortexMood,
  type VortexScar,
  vortexSvg,
} from "@/lib/vortexArt";
import { animNames } from "@/vortex/body/anims";
import { GESTURES, gesture } from "@/vortex/body/gestures";
import { useVortexBody } from "@/vortex/body/useBody";
import {
  flush,
  loadSoul,
  type SoulView,
  setSoulForDev,
  useSoul,
} from "@/vortex/core/soul";
import "./lab.css";

/** C-25 · soul controls: poke his server-side state directly (local env only). */
function SoulPanel() {
  const soul = useSoul();
  const send = async (body: Record<string, unknown>) => {
    try {
      const v = await apiFetch<SoulView>("/api/mascot/dev/soul", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setSoulForDev(v);
    } catch {
      // not local / logged out
    }
  };
  if (!soul)
    return (
      <button type="button" onClick={() => void loadSoul()}>
        load soul
      </button>
    );
  return (
    <div className="vxlab-soul">
      <p>
        mood <b>{soul.mood}</b> — {soul.cause}
      </p>
      {Object.entries(soul.needs).map(([k, v]) => (
        <label key={k}>
          {k} {v}
          <input
            type="range"
            min={0}
            max={100}
            defaultValue={v}
            onMouseUp={(e) =>
              void send({
                needs: { [k]: Number((e.target as HTMLInputElement).value) },
              })
            }
          />
        </label>
      ))}
      <label>
        relation {soul.relation}
        <input
          type="range"
          min={-100}
          max={100}
          defaultValue={soul.relation}
          onMouseUp={(e) =>
            void send({
              relation: Number((e.target as HTMLInputElement).value),
            })
          }
        />
      </label>
      <label>
        corruption {soul.corruption} (stage {soul.stage})
        <input
          type="range"
          min={0}
          max={100}
          defaultValue={soul.corruption}
          onMouseUp={(e) =>
            void send({
              corruption: Number((e.target as HTMLInputElement).value),
            })
          }
        />
      </label>
      <div className="vxlab-chips">
        {[3, 12, 30, 200].map((h) => (
          <button
            key={h}
            type="button"
            onClick={() =>
              void send({ away_hours: h }).then(() => location.reload())
            }
          >
            away {h}h
          </button>
        ))}
        <button
          type="button"
          onClick={() => void send({ flags: { sick: !soul.sick } })}
        >
          sick: {String(soul.sick)}
        </button>
        <button
          type="button"
          onClick={() =>
            void send({ flags: { diary_unlocked: !soul.diary_unlocked } })
          }
        >
          diary: {soul.diary_unlocked ? "unlocked" : "locked"}
        </button>
        <button type="button" onClick={() => void flush()}>
          flush events
        </button>
        <button type="button" onClick={() => void send({ reset: true })}>
          reset soul
        </button>
      </div>
    </div>
  );
}

/**
 * C-25 · the Vortex lab. A big copy of his rig with the real body engine and
 * animator, a button for every face / gesture / animation, the dark slider,
 * scars and tears — so 400 phases can be checked by eye. Dev only.
 */
/** N-20 · the balance panel: earn/spend flows (30 days) and item spread. */
function EconPanel() {
  const [d, setD] = useState<{
    flows: {
      currency: string;
      reason: string;
      earned: number;
      spent: number;
      n: number;
    }[];
    souls: number;
    items_top: Record<string, number>;
    items_rare: Record<string, number>;
  } | null>(null);
  useEffect(() => {
    apiFetch<NonNullable<typeof d>>("/api/mascot/dev/econ")
      .then(setD)
      .catch(() => {});
  }, []);
  if (!d) return <p>economy panel: unavailable (needs VORTEX_DEV).</p>;
  return (
    <div className="vxlab-econ">
      <p>
        {d.souls} souls · flows in the last 30 days (earned / spent / entries)
      </p>
      <table>
        <tbody>
          {d.flows.map((f) => (
            <tr key={`${f.currency}${f.reason}`}>
              <td>{f.currency}</td>
              <td>{f.reason}</td>
              <td>+{f.earned}</td>
              <td>−{f.spent}</td>
              <td>{f.n}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        most owned:{" "}
        {Object.entries(d.items_top)
          .map(([k, n]) => `${k}×${n}`)
          .join(", ") || "—"}
      </p>
      <p>
        rarest:{" "}
        {Object.entries(d.items_rare)
          .map(([k, n]) => `${k}×${n}`)
          .join(", ") || "—"}
      </p>
    </div>
  );
}

export default function VortexLab() {
  const uid = useId().replace(/[^a-z0-9]/gi, "");
  const [mood, setMood] = useState<VortexMood>("smug");
  const [dark, setDark] = useState(0);
  const [tears, setTears] = useState(false);
  const [scars, setScars] = useState<VortexScar[]>([]);
  const [line, setLine] = useState("");
  const spriteRef = useRef<HTMLDivElement>(null);
  const physRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<HTMLDivElement>(null);
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
  const svg = useMemo(
    () => vortexSvg(mood, `lab${uid}`, undefined, { dark, tears, scars }),
    [mood, uid, dark, tears, scars],
  );

  return (
    <main className="vxlab">
      <header>
        <h1>vortex lab</h1>
        <p>
          dev only · C-25 · every face, gesture and animation of the MK-V rig
        </p>
        <nav className="vxlab-tools">
          <a href="/dev/vortex/content">content editor</a>
          <a href="/dev/vortex/anim">animation timeline</a>
          <a href="/dev/vortex/sim">soul simulator</a>
          <a href="/dev/vortex/art">scene generator</a>
        </nav>
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
          <label>
            dark {dark.toFixed(2)}
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={dark}
              onChange={(e) => setDark(Number(e.target.value))}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={tears}
              onChange={(e) => setTears(e.target.checked)}
            />{" "}
            tears
          </label>
          {(["splice", "burn", "label", "crack", "stitch"] as VortexScar[]).map(
            (s) => (
              <label key={s}>
                <input
                  type="checkbox"
                  checked={scars.includes(s)}
                  onChange={(e) =>
                    setScars((l) =>
                      e.target.checked ? [...l, s] : l.filter((x) => x !== s),
                    )
                  }
                />{" "}
                {s}
              </label>
            ),
          )}
          <button type="button" onClick={() => body.body.current?.blink(true)}>
            blink
          </button>
          <button type="button" onClick={() => body.body.current?.dance(120)}>
            dance 120
          </button>
          <button type="button" onClick={() => body.body.current?.dance(null)}>
            stop
          </button>
        </div>
      </section>
      <section>
        <h2>soul (server)</h2>
        <SoulPanel />
      </section>
      <section>
        <h2>faces ({ALL_MOODS.length})</h2>
        <div className="vxlab-grid">
          {ALL_MOODS.map((m) => (
            <button
              key={m}
              type="button"
              className={m === mood ? "is-on" : ""}
              onClick={() => setMood(m)}
            >
              <SvgArt svg={vortexSvg(m, `t${m}${uid}`)} className="thumb" />
              {m}
            </button>
          ))}
        </div>
      </section>
      <section>
        <h2>gestures</h2>
        <div className="vxlab-chips">
          {GESTURES.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() =>
                physRef.current && void gesture(physRef.current, g)
              }
            >
              {g}
            </button>
          ))}
        </div>
        <h2>animations</h2>
        <div className="vxlab-chips">
          {animNames().map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => void body.animator.play(a)}
            >
              {a}
            </button>
          ))}
        </div>
      </section>
      <section className="vxlab-sec">
        <h2>economy · balance (N-20)</h2>
        <EconPanel />
      </section>
    </main>
  );
}
