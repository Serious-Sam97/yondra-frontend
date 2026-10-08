"use client";

import { useMemo } from "react";
import { ModuleHead, StatusLcd, Toggle } from "@/components/ui/ConsoleModule";
import { SvgArt } from "@/components/ui/SvgArt";
import {
  setVortexEnabled,
  setVortexHeadGames,
  setVortexIntensity,
  setVortexSound,
  useVortexEnabled,
  useVortexHeadGames,
  useVortexIntensity,
  useVortexSound,
  type VortexIntensity,
} from "@/lib/vortex";
import { vortexSvg } from "@/lib/vortexArt";
import {
  ACHIEVEMENTS,
  type Costume,
  liveStreak,
  setBirthday,
  updateProgress,
  useProgress,
} from "@/components/vortex/mk4/progress";

/** Streak, achievements, wardrobe and birthday — all local to this device. */
function VortexTrophies({ disabled }: { disabled: boolean }) {
  const p = useProgress();
  const streak = liveStreak(p);
  const wardrobe: (Costume | "auto")[] = ["auto", "none", ...p.costumes];
  return (
    <div
      className="flex flex-col gap-3 pt-3"
      style={{
        borderTop: "1px dashed var(--cf-edge)",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div className="flex items-center gap-4 flex-wrap cf-mono text-xs">
        <span style={{ color: "var(--cf-text)" }}>
          Tape streak <b style={{ color: "var(--cf-phosphor)" }}>{streak}d</b>
        </span>
        <span style={{ color: "var(--cf-text-dim)" }}>
          compliment jar {p.compliments}
        </span>
        <label className="flex items-center gap-2 ml-auto">
          <span style={{ color: "var(--cf-text-dim)" }}>Birthday</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="MM-DD"
            defaultValue={p.birthday ?? ""}
            maxLength={5}
            disabled={disabled}
            className="glass-input"
            style={{ width: 76, padding: "3px 8px" }}
            onBlur={(e) => {
              const v = e.target.value.trim();
              const m = /^(\d{2})-(\d{2})$/.exec(v);
              if (!v) setBirthday(null);
              else if (m && Number(m[1]) <= 12 && Number(m[2]) <= 31)
                setBirthday(v);
            }}
            aria-label="Your birthday (month-day), kept on this device"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(ACHIEVEMENTS).map(([id, a]) => {
          const got = !!p.achievements[id];
          return (
            <span
              key={id}
              title={a.hint}
              className="cf-mono text-[10px] uppercase tracking-[0.14em] rounded-full px-2.5 py-1"
              style={{
                border: `1px solid ${got ? "var(--cf-phosphor)" : "var(--cf-edge)"}`,
                color: got ? "var(--cf-text)" : "var(--cf-text-dim)",
                background: got ? "rgba(154,166,126,0.14)" : "transparent",
              }}
            >
              {got ? "★ " : "☆ "}
              {a.label}
            </span>
          );
        })}
      </div>
      <div className="flex items-center gap-2 flex-wrap cf-mono text-xs">
        <span style={{ color: "var(--cf-text-dim)" }}>Wardrobe</span>
        {wardrobe.map((c) => (
          <button
            key={c}
            type="button"
            disabled={disabled}
            aria-pressed={p.costume === c}
            onClick={() => updateProgress((q) => ({ ...q, costume: c }))}
            className="btn-physical rounded-md px-2 py-0.5"
            style={{
              border: `1px solid ${p.costume === c ? "var(--cf-phosphor)" : "var(--cf-edge)"}`,
              color:
                p.costume === c ? "var(--cf-text)" : "var(--cf-text-muted)",
            }}
          >
            {c === "auto" ? "seasonal" : c}
          </button>
        ))}
      </div>
    </div>
  );
}

const LEVELS: { key: VortexIntensity; label: string; hint: string }[] = [
  { key: "polite", label: "Polite", hint: "reactions & tips only" },
  { key: "mischief", label: "Mischief", hint: "rituals + the odd prank" },
  { key: "unhinged", label: "Unhinged", hint: "everything, often" },
];

/**
 * Profile console module for Vortex: the on/off switch that pairs with the × on
 * the sprite, how much chaos he's allowed (intensity) and a kill switch for the
 * head games that mess with the page. All stored on this device and applied
 * everywhere instantly.
 */
export default function VortexPreference() {
  const enabled = useVortexEnabled();
  const intensity = useVortexIntensity();
  const headGames = useVortexHeadGames();
  const sound = useVortexSound();
  const face = useMemo(
    () =>
      vortexSvg(
        intensity === "unhinged"
          ? "possessed"
          : intensity === "polite"
            ? "happy"
            : "smug",
        "pref",
        "none",
      ),
    [intensity],
  );

  return (
    <section className="glass-panel">
      <ModuleHead label="Companion" sub="vortex mk-ii">
        <StatusLcd
          text={enabled ? intensity.toUpperCase() : "HIDDEN"}
          tone={enabled ? "phosphor" : "amber"}
        />
      </ModuleHead>
      <div className="p-5 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <SvgArt
            svg={face}
            aria-hidden
            style={{
              width: 64,
              height: 64,
              flexShrink: 0,
              opacity: enabled ? 1 : 0.45,
            }}
          />
          <div className="flex-1 min-w-0">
            <p
              className="cf-label mb-1"
              style={{ color: "var(--cf-phosphor)" }}
            >
              Vortex
            </p>
            <p
              className="text-sm cf-mono"
              style={{ color: "var(--cf-text-muted)" }}
            >
              The ghost in your tape machine — reacts to your boards, eats
              overdue cards, chats about your work. Never changes anything on
              his own. Stored on this device.
            </p>
          </div>
          <Toggle
            on={enabled}
            onChange={() => setVortexEnabled(!enabled)}
            label="Show Vortex, the assistant"
          />
        </div>

        <fieldset
          aria-label="Vortex intensity"
          className="grid grid-cols-3 gap-2 border-0 p-0 m-0 min-w-0"
          style={{ opacity: enabled ? 1 : 0.5 }}
        >
          {LEVELS.map((l) => {
            const on = l.key === intensity;
            return (
              <button
                key={l.key}
                type="button"
                aria-pressed={on}
                disabled={!enabled}
                onClick={() => setVortexIntensity(l.key)}
                className="btn-physical cf-mono text-left rounded-lg px-3 py-2"
                style={{
                  border: `1.5px solid ${on ? "var(--cf-phosphor)" : "var(--cf-edge)"}`,
                  background: on ? "rgba(154,166,126,0.14)" : "transparent",
                  color: on ? "var(--cf-text)" : "var(--cf-text-muted)",
                }}
              >
                <span className="block text-xs tracking-[0.18em] uppercase">
                  {l.label}
                </span>
                <span
                  className="block text-[10px] mt-0.5"
                  style={{ color: "var(--cf-text-dim)" }}
                >
                  {l.hint}
                </span>
              </button>
            );
          })}
        </fieldset>

        <div
          className="flex items-center gap-4"
          style={{ opacity: enabled && intensity !== "polite" ? 1 : 0.5 }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm cf-mono" style={{ color: "var(--cf-text)" }}>
              Head games
            </p>
            <p
              className="text-xs cf-mono"
              style={{ color: "var(--cf-text-dim)" }}
            >
              Tilting pages, ghost cursors, eyes in the dark, the lying clock.
              Harmless and gone in seconds — off if you'd rather not.
            </p>
          </div>
          <Toggle
            on={headGames}
            onChange={() => setVortexHeadGames(!headGames)}
            label="Let Vortex play head games"
          />
        </div>
        <div
          className="flex items-center gap-4"
          style={{ opacity: enabled ? 1 : 0.5 }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm cf-mono" style={{ color: "var(--cf-text)" }}>
              Tape noises
            </p>
            <p
              className="text-xs cf-mono"
              style={{ color: "var(--cf-text-dim)" }}
            >
              Hiss when he flies, a deck click when he lands, a rewind for a
              finished card, whispers when possessed. Quiet by default.
            </p>
          </div>
          <Toggle
            on={sound}
            onChange={() => setVortexSound(!sound)}
            label="Let Vortex make tape noises"
          />
        </div>

        <VortexTrophies disabled={!enabled} />
      </div>
    </section>
  );
}
