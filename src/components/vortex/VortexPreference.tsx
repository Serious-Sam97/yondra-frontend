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
      </div>
    </section>
  );
}
