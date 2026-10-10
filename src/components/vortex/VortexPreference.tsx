"use client";

import { useMemo } from "react";
import { ModuleHead, StatusLcd } from "@/components/ui/ConsoleModule";
import { SvgArt } from "@/components/ui/SvgArt";
import {
  ACHIEVEMENTS,
  type Costume,
  liveStreak,
  setBirthday,
  updateProgress,
  useProgress,
} from "@/components/vortex/mk4/progress";
import { useVortexIntensity } from "@/lib/vortex";
import { vortexSvg } from "@/lib/vortexArt";
import Rack from "@/vortex/core/Rack";
import CreatorPanel from "@/vortex/creator/CreatorPanel";
import OutsidePanel from "@/vortex/outside/OutsidePanel";
import WeirdPanel from "@/vortex/weird/WeirdPanel";

/** Streak, achievements, wardrobe and birthday — all local to this device. */
function VortexTrophies() {
  const p = useProgress();
  const streak = liveStreak(p);
  const wardrobe: (Costume | "auto")[] = ["auto", "none", ...p.costumes];
  return (
    <div
      className="flex flex-col gap-3 pt-3"
      style={{
        borderTop: "1px dashed var(--cf-edge)",
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

/**
 * Profile console module for Vortex (always on while logged in): who he is,
 * then the effects rack (T-01) with every switch, then the deeper panels
 * (outside, weird, creator) and his trophies.
 */
export default function VortexPreference() {
  const intensity = useVortexIntensity();
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
        <StatusLcd text={intensity.toUpperCase()} tone="phosphor" />
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
        </div>

        <Rack />

        <OutsidePanel />

        <WeirdPanel />

        <CreatorPanel />

        <VortexTrophies />
      </div>
    </section>
  );
}
