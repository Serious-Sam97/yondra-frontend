"use client";

import { vortexSvg } from "@/lib/vortexArt";
import "./social.css";

// P-07 · a static attack: teammates' ghosts burst onto your screen at once,
// dance, and vanish. Only when you have Head games on. Nothing is touched.
export function staticAttack(from: string[]) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const layer = document.createElement("div");
  layer.className = "vxp-attack";
  layer.setAttribute("aria-hidden", "true");
  const moods = [
    "malicious",
    "ecstasy",
    "hysterical",
    "smug",
    "possessed",
  ] as const;
  const n = Math.min(8, Math.max(3, from.length * 2));
  for (let i = 0; i < n; i++) {
    const g = document.createElement("div");
    g.className = "g";
    g.innerHTML = vortexSvg(moods[i % moods.length], `atk${i}`, "wave");
    g.style.left = `${8 + ((i * 83) % 84)}%`;
    g.style.top = `${15 + ((i * 47) % 65)}%`;
    g.style.animationDelay = `${(i % 4) * 0.12}s`;
    layer.appendChild(g);
  }
  const banner = document.createElement("b");
  banner.textContent = `STATIC ATTACK · ${from.join(" & ")}'s ghosts`;
  layer.appendChild(banner);
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), reduced ? 2500 : 6000);
}
