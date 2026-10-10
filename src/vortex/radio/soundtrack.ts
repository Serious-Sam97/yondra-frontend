"use client";

import { getVortexFlag } from "@/lib/vortex";
import { subscribeVortex } from "@/lib/vortexBus";
import { getStation } from "./station";
import { radio, songFromSeed } from "./synth";

// O-15 · SOUNDTRACK MODE (opt-in): a low ambient bed while you work that
// reacts to the board — a tense cluster when a card jams, a resolving chord
// when something goes to Done. Never plays over the radio.

let stop: (() => void) | null = null;

export function startSoundtrack() {
  if (stop || !getVortexFlag("soundtrack")) return;
  if (!getStation().on) {
    radio.setVolume(0.25);
    void radio.play(
      songFromSeed(Math.floor(Date.now() / 86_400_000), "ambient"),
      0.6,
    );
  }
  const off = subscribeVortex((e) => {
    if (e.type === "card.moved" && e.done) radio.chord("resolve");
    if (e.type === "card.jammed") radio.chord("tense");
  });
  stop = () => {
    off();
    if (!getStation().on) radio.stop();
    radio.setVolume(0.6);
    stop = null;
  };
}

export function stopSoundtrack() {
  stop?.();
}
