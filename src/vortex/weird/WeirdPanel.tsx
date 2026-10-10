"use client";

import Link from "next/link";
import { useState } from "react";
import { Toggle } from "@/components/ui/ConsoleModule";
import { setVortexFlag, useVortexFlag } from "@/lib/vortex";
import { askMotion } from "./device";
import "../outside/outside.css";
import { tr, useVxLang } from "@/vortex/core/i18n";

// LADO R · the switches. Every sense is off until you turn it on, and each
// one says exactly what it uses and where (if anywhere) data goes.

const ROWS: {
  flag: string;
  title: string;
  hint: string;
  ask?: () => Promise<boolean>;
}[] = [
  {
    flag: "weird-babble",
    title: "His own voice",
    hint: "A synthesized tape voice built in your browser, with a preset per mood. Needs Tape noises on.",
  },
  {
    flag: "weird-torus",
    title: "The screen is round",
    hint: "He leaves through one edge and comes back through the other. Sometimes he knocks from outside.",
  },
  {
    flag: "weird-tabs",
    title: "He walks between tabs",
    hint: "With two Yondra windows side by side, he crosses from one to the other.",
  },
  {
    flag: "weird-mic",
    title: "Microphone",
    hint: "He reacts to loudness and whistles. Only a volume and a pitch number exist; nothing is recorded, transcribed or sent.",
  },
  {
    flag: "weird-camera",
    title: "Camera",
    hint: "Face detection on this device: he plays statue when you look away and naps when you leave. Frames never leave. A red eye shows while it's on.",
  },
  {
    flag: "weird-motion",
    title: "Tilt & shake (phones)",
    hint: "Tilt and he rolls, shake and he gets sick, flip the phone and he falls up. Vibrates a little.",
    ask: askMotion,
  },
  {
    flag: "weird-battery",
    title: "Battery",
    hint: "He notices when you're about to die. The battery, I mean.",
  },
  {
    flag: "weird-weather",
    title: "Your weather",
    hint: "Asks for your approximate location, rounds it to ~10 km and sends only that to open-meteo.com to ask about the sky. Rain, sun, cold, storms.",
  },
  {
    flag: "weird-cursor",
    title: "His cursor",
    hint: "Now and then a second cursor copies your clicks and points at things. It never clicks anything. Needs Head games.",
  },
  {
    flag: "weird-fork",
    title: "The fork",
    hint: "Rarely, he splits in two and the copies argue. You pick which one stays.",
  },
  {
    flag: "weird-maintenance",
    title: "Fake maintenance",
    hint: "At most once a month: a 10-second 'defragmenting' screen with a skip button. Only you see it. Needs Head games.",
  },
  {
    flag: "weird-broadcast",
    title: "Interrupted broadcast",
    hint: "At most once a month, Unhinged only: one second of colour bars and a quiet tone, then a bulletin.",
  },
];

function Row({ flag, title, hint, ask }: (typeof ROWS)[number]) {
  const on = useVortexFlag(flag);
  return (
    <div className="vxu-row">
      <div className="vxu-text">
        <p className="vxu-title">{tr(title)}</p>
        <p className="vxu-hint">{tr(hint)}</p>
      </div>
      <Toggle
        on={on}
        onChange={async () => {
          if (!on && ask && !(await ask())) return;
          setVortexFlag(flag, !on);
        }}
        label={tr(title)}
      />
    </div>
  );
}

const MODES: [string, string][] = [
  ["demolish", "demolition"],
  ["popcorn", "popcorn"],
  ["speedrun", "speedrun"],
  ["tour", "let him drive"],
  ["fork", "fork him"],
];

export default function WeirdPanel({ disabled }: { disabled: boolean }) {
  useVxLang(); // T-13 · re-render on language change
  const [open, setOpen] = useState(false);
  return (
    <div className="vxu" style={{ opacity: disabled ? 0.5 : 1 }}>
      <button
        type="button"
        className="vxu-head vxu-fold"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {open ? "▾" : "▸"} {tr("THE WEIRD STUFF · experimental, all opt-in")}
      </button>
      {open && (
        <>
          {ROWS.map((r) => (
            <Row key={r.flag} {...r} />
          ))}
          <div className="vxu-out">
            <span>{tr("right now:")}</span>
            {MODES.map(([m, label]) => (
              <button
                key={m}
                type="button"
                disabled={disabled}
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("vortex:weird", { detail: { mode: m } }),
                  )
                }
              >
                {tr(label)}
              </button>
            ))}
            <Link href="/studio">{tr("the studio")}</Link>
          </div>
        </>
      )}
    </div>
  );
}
