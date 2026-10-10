// E-10 · the Done ceremony. When a card reaches Done he picks a ceremony by
// mood and luck: a wake with a candle, a viking funeral, a VFD diploma, a
// half-hearted confetti, or — rarely — he actually cries and denies it.
// Pure overlays next to the card; they remove themselves.

import "./ceremonies.css";

export type Ceremony = "wake" | "viking" | "diploma" | "confetti" | "cry";

export function pickCeremony(mood: string, roll = Math.random()): Ceremony {
  if (roll < 0.05) return "cry";
  if (mood === "mourning" || mood === "sulking") return "wake";
  if (roll < 0.3) return "viking";
  if (roll < 0.55) return "diploma";
  if (roll < 0.75) return "wake";
  return "confetti";
}

export const CEREMONY_LINE: Record<Ceremony, (key: string) => string> = {
  wake: (k) =>
    `we are gathered here for ${k}. it was assigned, it suffered, it's done. a minute of silence. …ok that's enough.`,
  viking: (k) =>
    `${k} goes to valhalla. *sets it on fire* *pushes it out to sea* rest, little rectangle.`,
  diploma: (k) =>
    `by the power vested in me by no one, ${k} is hereby DONE. here's a diploma. frame it.`,
  confetti: (k) =>
    `${k} is done. yay. *throws three pieces of confetti* that's all the confetti you get.`,
  cry: (k) =>
    `${k}… it's done. i'm not crying. it's tape. tape leaks. leave me alone.`,
};

export function playCeremony(c: Ceremony, rect: DOMRect, key: string): void {
  const el = document.createElement("div");
  el.className = `vxc vxc--${c}`;
  el.setAttribute("aria-hidden", "true");
  el.style.left = `${rect.left + rect.width / 2}px`;
  el.style.top = `${rect.top + Math.min(rect.height, 80) / 2}px`;
  if (c === "wake") el.innerHTML = `<i class="candle"><b></b></i>`;
  else if (c === "viking")
    el.innerHTML = `<i class="boat"></i><i class="fire"></i>`;
  else if (c === "diploma")
    el.innerHTML = `<div class="dip"><span>DIPLOMA</span><b>${key.replace(/[<>&]/g, "")}</b><span>· DONE ·</span></div>`;
  else if (c === "confetti") el.innerHTML = `<i></i><i></i><i></i>`;
  else el.innerHTML = `<i class="drop"></i><i class="drop"></i>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}
