"use client";

import { startWhispers } from "@/vortex/dark/effects";
import { curses, getCase } from "./econ";

// N-13 · cursed things misbehave while they sit in the case: a sticky tape
// trail behind your cursor, cards that whisper more, the twin dropping by.
// Take them to the ERASE altar below and it all stops.

export function startCurses(showTwin: () => void): () => void {
  let stopWhispers: (() => void) | null = null;
  let twinTimer: ReturnType<typeof setInterval> | null = null;
  let last = 0;
  const onMove = (e: PointerEvent) => {
    const now = Date.now();
    if (now - last < 45) return;
    last = now;
    const bit = document.createElement("i");
    bit.className = "vxi-tape-bit";
    bit.style.left = `${e.clientX}px`;
    bit.style.top = `${e.clientY}px`;
    bit.style.rotate = `${Math.random() * 80 - 40}deg`;
    document.body.appendChild(bit);
    setTimeout(() => bit.remove(), 900);
  };
  let trailOn = false;

  const apply = () => {
    const c = getCase() ? curses() : [];
    const trail =
      c.includes("trail") &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (trail && !trailOn)
      window.addEventListener("pointermove", onMove, { passive: true });
    if (!trail && trailOn) window.removeEventListener("pointermove", onMove);
    trailOn = trail;
    if (c.includes("whispers") && !stopWhispers)
      stopWhispers = startWhispers(() => 3);
    if (!c.includes("whispers") && stopWhispers) {
      stopWhispers();
      stopWhispers = null;
    }
    if (c.includes("twin") && !twinTimer)
      twinTimer = setInterval(() => {
        if (Math.random() < 0.25) showTwin();
      }, 300_000);
    if (!c.includes("twin") && twinTimer) {
      clearInterval(twinTimer);
      twinTimer = null;
    }
  };
  apply();
  const iv = setInterval(apply, 20_000);
  return () => {
    clearInterval(iv);
    window.removeEventListener("pointermove", onMove);
    stopWhispers?.();
    if (twinTimer) clearInterval(twinTimer);
  };
}
