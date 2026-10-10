// H-03 · THE REWINDER, in pieces — she is never seen whole:
//   1. a sound: the high squeal of a tape rewinding fast, far away;
//   2. a pencil, sitting in the layout like it belongs there; look at it and it's gone;
//   3. the shadow of a hand made of tape passing behind the page;
//   4. a card rewinds itself (its title erases backwards, then comes back);
//   5. THE HAND (H-04) comes out of the edge of the screen for him.
// Everything here is an overlay that removes itself. Data is never touched.

import { prefersReducedMotion } from "@/components/vortex/vortexEffects";
import { getVortexSound } from "@/lib/vortex";
import "./dark.css";

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const onScreen = (el: Element) => {
  const r = el.getBoundingClientRect();
  return (
    r.width > 0 &&
    r.top >= 70 &&
    r.bottom <= innerHeight &&
    r.left >= 0 &&
    r.right <= innerWidth
  );
};

let ctx: AudioContext | null = null;
/** 1 · the squeal of a fast rewind (only with Tape noises on; quiet on purpose). */
export function squeal(seconds = 1.6) {
  if (!getVortexSound()) return;
  const C =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!C) return;
  ctx ??= new C();
  const ac = ctx;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(900, t);
  osc.frequency.exponentialRampToValueAtTime(3800, t + seconds);
  const band = ac.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 2400;
  band.Q.value = 3;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.025, t + 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  osc.connect(band).connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + seconds + 0.05);
}

const PENCIL = `<svg viewBox="0 0 120 16" xmlns="http://www.w3.org/2000/svg"><path d="M2 8 L18 2 L18 14 Z" fill="#e9c9a0"/><path d="M2 8 L7 6 L7 10 Z" fill="#2a1f17"/><rect x="18" y="2" width="84" height="12" fill="#c8962e"/><rect x="18" y="6" width="84" height="1.2" fill="#a87a1e"/><rect x="102" y="2" width="6" height="12" fill="#b9ab8e"/><rect x="108" y="2" width="10" height="12" rx="2" fill="#d97f8a"/></svg>`;

/** 2 · a pencil in the layout. Hover it and it's gone. */
export function pencilInLayout(): boolean {
  const host = [
    ...document.querySelectorAll<HTMLElement>(
      ".mt-jx, .mt-rack-t, .hf-ph, .pr-spine, main h1, main h2",
    ),
  ].filter(onScreen);
  const el = host[Math.floor(Math.random() * host.length)];
  if (!el) return false;
  const r = el.getBoundingClientRect();
  const p = document.createElement("div");
  p.className = "vxh-pencil";
  p.innerHTML = PENCIL;
  p.setAttribute("aria-hidden", "true");
  p.style.left = `${r.left + r.width * 0.55}px`;
  p.style.top = `${r.top + Math.min(r.height - 10, 18)}px`;
  p.addEventListener("pointerenter", () => {
    p.classList.add("is-gone");
    setTimeout(() => p.remove(), 120);
  });
  document.body.appendChild(p);
  setTimeout(() => p.remove(), 45_000);
  return true;
}

/** 3 · the shadow of a hand made of tape crossing behind the page. */
export function handShadow() {
  const s = document.createElement("div");
  s.className = "vxh-handshadow";
  s.setAttribute("aria-hidden", "true");
  document.body.appendChild(s);
  setTimeout(() => s.remove(), 4200);
}

/**
 * 4 · one card rewinds: its title erases backwards, then comes back. Done on
 * an overlay copy (the real React-managed node is only hidden for a moment).
 */
export async function rewindCard(): Promise<boolean> {
  const cards = [
    ...document.querySelectorAll<HTMLElement>(".mt-jx .tt"),
  ].filter(onScreen);
  const tt = cards[Math.floor(Math.random() * cards.length)];
  if (!tt) return false;
  const original = tt.textContent ?? "";
  const r = tt.getBoundingClientRect();
  const cs = getComputedStyle(tt);
  const ghost = document.createElement("div");
  ghost.className = "vxh-rewinding";
  ghost.setAttribute("aria-hidden", "true");
  Object.assign(ghost.style, {
    left: `${r.left}px`,
    top: `${r.top}px`,
    width: `${r.width}px`,
    font: cs.font,
    color: cs.color,
    lineHeight: cs.lineHeight,
  });
  ghost.textContent = original;
  document.body.appendChild(ghost);
  tt.style.visibility = "hidden";
  squeal(0.9);
  for (
    let i = original.length;
    i >= 0;
    i -= Math.max(1, Math.ceil(original.length / 18))
  ) {
    ghost.textContent = original.slice(0, i);
    await wait(28);
  }
  await wait(380);
  ghost.remove();
  tt.style.visibility = "";
  return true;
}

/**
 * 5 · THE HAND (H-04). A hand of tangled brown tape comes in from an edge and
 * sweeps toward `target()` (his body). Resolves "hid" if `hidden()` turns true
 * before it closes, "grabbed" otherwise. During the chase the user can drag him
 * into a card, his nest, or the answering machine.
 */
export async function theHand(opts: {
  target: () => DOMRect | null;
  hidden: () => boolean;
  ms?: number;
}): Promise<"hid" | "grabbed"> {
  const reduced = prefersReducedMotion();
  const hand = document.createElement("div");
  hand.className = `vxh-hand${reduced ? " is-reduced" : ""}`;
  hand.setAttribute("aria-hidden", "true");
  hand.innerHTML = `<svg viewBox="0 0 220 120" xmlns="http://www.w3.org/2000/svg">
<path d="M0 70 C40 60 70 80 100 66 C120 58 130 50 150 52" stroke="#5a3418" stroke-width="22" fill="none" stroke-linecap="round"/>
<path d="M0 70 C40 60 70 80 100 66 C120 58 130 50 150 52" stroke="#3f2410" stroke-width="22" fill="none" stroke-dasharray="6 9" stroke-linecap="round"/>
<g stroke="#5a3418" stroke-width="9" stroke-linecap="round" fill="none">
<path d="M150 52 C170 40 185 30 205 26"/><path d="M152 54 C175 50 192 48 214 50"/><path d="M150 58 C172 62 188 70 206 80"/><path d="M146 62 C160 76 168 88 176 104"/><path d="M148 46 C160 30 166 18 170 4"/>
</g></svg>`;
  document.body.appendChild(hand);
  squeal(2.4);
  const total = opts.ms ?? 8000;
  const start = performance.now();
  const fromLeft = Math.random() < 0.5;
  hand.classList.toggle("from-left", fromLeft);
  return new Promise((resolve) => {
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / total);
      const r = opts.target();
      if (opts.hidden()) {
        hand.classList.add("is-leaving");
        setTimeout(() => hand.remove(), 700);
        return resolve("hid");
      }
      if (r) {
        const tx = fromLeft
          ? -260 + (r.left + r.width / 2) * t
          : innerWidth + 40 - (innerWidth - r.left - r.width / 2 + 220) * t;
        const ty = r.top + r.height / 2 - 60 + Math.sin(now / 300) * 12;
        hand.style.transform = `translate(${tx}px, ${ty}px) ${fromLeft ? "" : "scaleX(-1)"}`;
      }
      if (t >= 1) {
        hand.classList.add("is-grabbing");
        setTimeout(() => hand.remove(), 900);
        return resolve("grabbed");
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}
