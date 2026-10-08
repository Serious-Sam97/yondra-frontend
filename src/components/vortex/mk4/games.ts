// Vortex MK-IV mini-games. Overlays only: nothing here changes a card. Each
// game cleans itself up and reports its result through a callback.

import { onScreen, type Pt } from "@/components/vortex/mk4/effects";
import { prefersReducedMotion } from "@/components/vortex/vortexEffects";

function overlay(cls: string): HTMLElement {
  const o = document.createElement("div");
  o.className = cls;
  document.body.appendChild(o);
  return o;
}

/* ── whack-a-ghost ────────────────────────────────────────────────────── */
// Ghosts rise out of overdue cards (or any card if none are late); click them
// before they sink. 20 seconds. Esc ends early.
export function whackAGhost(onEnd: (score: number) => void): () => void {
  const o = overlay("vxa-whack");
  const hud = document.createElement("div");
  hud.className = "hud";
  const score = document.createElement("b");
  const time = document.createElement("span");
  hud.append("WHACK-A-GHOST ", score, time);
  o.appendChild(hud);
  let points = 0;
  let left = 20;
  score.textContent = "0";
  time.textContent = " · 20s";

  const spots = (): Pt[] => {
    const late = Array.from(
      document.querySelectorAll<HTMLElement>(".mt-jx[data-vx-late]"),
    ).filter(onScreen);
    const any = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".mt-jx, .mt-dsp, .hf-box, .hf-pn",
      ),
    ).filter(onScreen);
    const from = late.length >= 2 ? late : any;
    if (from.length === 0)
      return [{ x: window.innerWidth / 2, y: window.innerHeight / 2 }];
    return from.map((e) => {
      const r = e.getBoundingClientRect();
      return {
        x: r.left + r.width * (0.2 + Math.random() * 0.6),
        y: r.top + r.height * 0.4,
      };
    });
  };

  const spawn = () => {
    const all = spots();
    const p = all[Math.floor(Math.random() * all.length)];
    const g = document.createElement("button");
    g.type = "button";
    g.className = "ghost";
    g.textContent = "👻";
    g.setAttribute("aria-label", "Whack the ghost");
    g.style.left = `${p.x - 22}px`;
    g.style.top = `${p.y - 22}px`;
    g.addEventListener("click", (e) => {
      e.stopPropagation();
      points++;
      score.textContent = String(points);
      g.classList.add("hit");
      g.disabled = true;
      setTimeout(() => g.remove(), 300);
    });
    o.appendChild(g);
    setTimeout(() => g.remove(), 1100);
  };

  const spawner = setInterval(spawn, 650);
  const clock = setInterval(() => {
    left--;
    time.textContent = ` · ${left}s`;
    if (left <= 0) end();
  }, 1000);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") end();
  };
  window.addEventListener("keydown", onKey);
  let done = false;
  function end() {
    if (done) return;
    done = true;
    clearInterval(spawner);
    clearInterval(clock);
    window.removeEventListener("keydown", onKey);
    o.classList.add("out");
    setTimeout(() => o.remove(), 400);
    onEnd(points);
  }
  spawn();
  return end;
}

/* ── card roulette ────────────────────────────────────────────────────── */
// A wheel of your open cards spins and lands on one. Returns the chosen card's
// id through onPick (the component offers to open it).
export function roulette(
  cards: { id: string; key: string; name: string }[],
  onPick: (c: { id: string; key: string; name: string }) => void,
): boolean {
  if (cards.length === 0) return false;
  const list = cards.slice(0, 10);
  const o = overlay("vxa-roulette");
  const wheel = document.createElement("div");
  wheel.className = "wheel";
  const n = list.length;
  list.forEach((c, i) => {
    const s = document.createElement("span");
    s.textContent = c.key || c.name.slice(0, 10);
    s.style.transform = `rotate(${(360 / n) * i}deg) translateY(-118px) rotate(${-(360 / n) * i}deg)`;
    wheel.appendChild(s);
  });
  const pointer = document.createElement("i");
  pointer.className = "ptr";
  o.append(wheel, pointer);
  const pickIndex = Math.floor(Math.random() * n);
  const turns = prefersReducedMotion() ? 0 : 4;
  const final = turns * 360 + (360 - (360 / n) * pickIndex);
  wheel.animate(
    [{ transform: "rotate(0deg)" }, { transform: `rotate(${final}deg)` }],
    {
      duration: prefersReducedMotion() ? 10 : 3600,
      easing: "cubic-bezier(.15,.7,.2,1)",
      fill: "forwards",
    },
  ).onfinish = () => {
    wheel.children[pickIndex]?.classList.add("win");
    setTimeout(() => {
      o.classList.add("out");
      setTimeout(() => o.remove(), 400);
      onPick(list[pickIndex]);
    }, 900);
  };
  o.addEventListener("click", () => o.remove());
  return true;
}

/* ── sprint tarot ─────────────────────────────────────────────────────── */
export function tarotCard(
  card: { name: string; glyph: string; meaning: string },
  onClose: () => void,
) {
  const o = overlay("vxa-tarot");
  const c = document.createElement("div");
  c.className = "card";
  const g = document.createElement("b");
  g.textContent = card.glyph;
  const t = document.createElement("h4");
  t.textContent = card.name;
  const m = document.createElement("p");
  m.textContent = card.meaning;
  c.append(g, t, m);
  o.appendChild(c);
  const close = () => {
    o.classList.add("out");
    setTimeout(() => o.remove(), 400);
    onClose();
  };
  o.addEventListener("click", close);
  setTimeout(() => o.isConnected && close(), 9000);
}

/* ── golden spine in Done ─────────────────────────────────────────────── */
// A glint sits on one Done spine; clicking it bursts gold. The spine itself is
// never touched (clicking a spine opens the card), so the glint is its own button.
export function goldenSpine(onFound: (at: Pt) => void): (() => void) | null {
  const spines = Array.from(
    document.querySelectorAll<HTMLElement>(".mt-dsp"),
  ).filter(onScreen);
  const s = spines[Math.floor(Math.random() * spines.length)];
  if (!s) return null;
  const r = s.getBoundingClientRect();
  const b = document.createElement("button");
  b.type = "button";
  b.className = "vxa-gold";
  b.setAttribute("aria-label", "A golden tape");
  b.style.left = `${r.left}px`;
  b.style.top = `${r.top}px`;
  b.style.width = `${r.width}px`;
  b.style.height = `${r.height}px`;
  document.body.appendChild(b);
  const cleanup = () => b.remove();
  b.addEventListener("click", () => {
    cleanup();
    onFound({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  });
  const off = () => cleanup();
  window.addEventListener("scroll", off, { once: true, capture: true });
  setTimeout(cleanup, 45_000);
  return cleanup;
}

/* ── tape of the month ────────────────────────────────────────────────── */
// The Done spine with the longest create→done time gets a ribbon for a while.
export function tapeOfTheMonth(): { key: string; days: number } | null {
  const spines = Array.from(
    document.querySelectorAll<HTMLElement>(".mt-dsp[data-vx-cycle]"),
  );
  let best: HTMLElement | null = null;
  for (const s of spines)
    if (!best || Number(s.dataset.vxCycle) > Number(best.dataset.vxCycle))
      best = s;
  if (!best) return null;
  best.setAttribute("data-vx-award", "1");
  setTimeout(() => best?.removeAttribute("data-vx-award"), 60_000);
  return {
    key: best.dataset.vxKey ?? "a tape",
    days: Number(best.dataset.vxCycle),
  };
}

/* ── hide and seek: peek over the top edge of a panel ─────────────────── */
// Returns where his centre should go so that only his top half (eyes) shows
// above the edge — CSS clips the bottom half while hiding (.vxa-hiding).
export function hidingSpot(sprite: number): Pt {
  const hosts = Array.from(
    document.querySelectorAll<HTMLElement>(".mt-rack, .hf-pn, .hf-box, .mt-jx"),
  ).filter(onScreen);
  const h = hosts[Math.floor(Math.random() * hosts.length)];
  if (!h)
    return { x: window.innerWidth / 2, y: window.innerHeight - sprite * 0.1 };
  const r = h.getBoundingClientRect();
  return {
    x: Math.max(
      sprite / 2,
      Math.min(
        window.innerWidth - sprite / 2,
        r.left + r.width * (0.25 + Math.random() * 0.5),
      ),
    ),
    // centre a little below the edge → the eyes sit just above it
    y: r.top + sprite * 0.12,
  };
}
