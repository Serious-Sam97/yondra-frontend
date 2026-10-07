// Vortex's stage effects. Everything here is a visual overlay on a fixed layer
// (or a temporary class on a real element) that removes itself — Vortex never
// changes, moves or hides app data. Effects degrade to simple fades when the
// user prefers reduced motion.

const LAYER_ID = "vxa-fx";

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

function layer(): HTMLElement {
  let el = document.getElementById(LAYER_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = LAYER_ID;
    el.className = "vxa-fx";
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
  }
  return el;
}

/** A detached visual copy of a card (no ids or data hooks, not interactive). */
function ghostOf(card: HTMLElement): HTMLElement {
  const g = card.cloneNode(true) as HTMLElement;
  for (const el of [g, ...Array.from(g.querySelectorAll<HTMLElement>("*"))]) {
    el.removeAttribute("id");
    el.removeAttribute("tabindex");
    for (const a of Array.from(el.attributes))
      if (a.name.startsWith("data-")) el.removeAttribute(a.name);
  }
  g.classList.add("vxa-ghost");
  return g;
}

function place(el: HTMLElement, r: DOMRect) {
  el.style.left = `${r.left}px`;
  el.style.top = `${r.top}px`;
  el.style.width = `${r.width}px`;
}

export interface Point {
  x: number;
  y: number;
}

/** Little crumbs that pop out of his mouth after a bite. */
export function crumbs(at: Point, n = 7) {
  if (prefersReducedMotion()) return;
  const fx = layer();
  for (let i = 0; i < n; i++) {
    const c = document.createElement("i");
    c.className = "vxa-crumb";
    c.style.left = `${at.x}px`;
    c.style.top = `${at.y}px`;
    fx.appendChild(c);
    const dx = (Math.random() - 0.5) * 70;
    const dy = 20 + Math.random() * 50;
    c.animate(
      [
        { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
        {
          transform: `translate(${dx}px, ${dy}px) rotate(${dx * 6}deg)`,
          opacity: 0,
        },
      ],
      {
        duration: 800 + Math.random() * 500,
        easing: "cubic-bezier(.2,.6,.4,1)",
      },
    ).onfinish = () => c.remove();
  }
}

/**
 * Eat a card: a ghost copy flies into his mouth while the real card fades
 * back (it's still there, just sheepish). Returns a spit() that undoes it; it
 * also undoes itself after `restoreMs` so a card never stays dimmed.
 */
export function eatCard(
  card: HTMLElement,
  mouth: Point,
  restoreMs = 20000,
): { spit: () => void } {
  const fx = layer();
  const r = card.getBoundingClientRect();
  const reduced = prefersReducedMotion();
  card.classList.add("vxa-eaten");
  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    card.classList.remove("vxa-eaten");
    clearTimeout(timer);
  };
  const timer = setTimeout(restore, restoreMs);

  if (!reduced) {
    const g = ghostOf(card);
    place(g, r);
    fx.appendChild(g);
    const tx = mouth.x - (r.left + r.width / 2);
    const ty = mouth.y - (r.top + r.height / 2);
    g.animate(
      [
        { transform: "translate(0,0) scale(1) rotate(0deg)", opacity: 0.9 },
        {
          transform: `translate(${tx * 0.55}px, ${ty * 0.55 - 30}px) scale(.55) rotate(-14deg)`,
          opacity: 0.85,
          offset: 0.55,
        },
        {
          transform: `translate(${tx}px, ${ty}px) scale(.06) rotate(-38deg)`,
          opacity: 0.6,
        },
      ],
      { duration: 1050, easing: "cubic-bezier(.5,0,.75,0)", fill: "forwards" },
    ).onfinish = () => {
      g.remove();
      crumbs(mouth);
    };
  }

  return {
    spit: () => {
      if (restored) return;
      if (!reduced) {
        const back = ghostOf(card);
        const now = card.getBoundingClientRect();
        place(back, now);
        fx.appendChild(back);
        const tx = mouth.x - (now.left + now.width / 2);
        const ty = mouth.y - (now.top + now.height / 2);
        back.animate(
          [
            {
              transform: `translate(${tx}px, ${ty}px) scale(.06) rotate(30deg)`,
              opacity: 0.7,
            },
            {
              transform: "translate(0,-14px) scale(1.04) rotate(-2deg)",
              opacity: 0.95,
              offset: 0.7,
            },
            { transform: "translate(0,0) scale(1) rotate(0deg)", opacity: 0 },
          ],
          { duration: 700, easing: "cubic-bezier(.2,.8,.3,1)" },
        ).onfinish = () => back.remove();
        setTimeout(restore, 480);
      } else restore();
    },
  };
}

/** Caution tape across a jammed card; gone after `ms` or on the first scroll. */
export function cautionTape(card: HTMLElement, label: string, ms = 6500) {
  const fx = layer();
  const r = card.getBoundingClientRect();
  const tapes = [
    { y: r.height * 0.42, rot: -9, text: `JAM · DO NOT CROSS · JAM` },
    { y: r.height * 0.6, rot: 7, text: label },
  ].map(({ y, rot, text }) => {
    const t = document.createElement("div");
    t.className = "vxa-tape";
    t.style.left = `${r.left - 12}px`;
    t.style.top = `${r.top + y}px`;
    t.style.width = `${r.width + 24}px`;
    t.style.setProperty("--rot", `${rot}deg`);
    const s = document.createElement("span");
    s.textContent = text; // textContent: the reason is user text
    t.appendChild(s);
    fx.appendChild(t);
    return t;
  });
  const clear = () => {
    for (const t of tapes) t.remove();
    window.removeEventListener("scroll", clear, true);
  };
  window.addEventListener("scroll", clear, true);
  setTimeout(clear, ms);
}

/** Magnetic-tape confetti for a finished card (black for a signed contract). */
export function tapeConfetti(
  at: Point,
  n = 26,
  colors = ["#ff2d95", "#00e5d0", "#ffffff", "#ffb347", "#7a2cff"],
) {
  if (prefersReducedMotion()) return;
  const fx = layer();
  for (let i = 0; i < n; i++) {
    const c = document.createElement("i");
    c.className = "vxa-confetti";
    c.style.left = `${at.x}px`;
    c.style.top = `${at.y}px`;
    c.style.background = colors[i % colors.length];
    fx.appendChild(c);
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
    const v = 70 + Math.random() * 90;
    const dx = Math.cos(a) * v;
    const dy = Math.sin(a) * v - 40;
    c.animate(
      [
        { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
        {
          transform: `translate(${dx}px, ${dy}px) rotate(${dx * 4}deg)`,
          opacity: 1,
          offset: 0.55,
        },
        {
          transform: `translate(${dx * 1.15}px, ${dy + 120}px) rotate(${dx * 7}deg)`,
          opacity: 0,
        },
      ],
      {
        duration: 1300 + Math.random() * 500,
        easing: "cubic-bezier(.15,.7,.4,1)",
      },
    ).onfinish = () => c.remove();
  }
}

/** Temporary class on a real element (e.g. a stomped VU meter). */
export function flashClass(el: Element, cls: string, ms = 1400) {
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}

/**
 * A short ribbon of magnetic tape trailing behind him while he flies. Samples
 * his position every frame for `ms` and drops little curls that fade out.
 */
export function tapeTrail(sprite: HTMLElement, ms: number) {
  if (prefersReducedMotion() || ms <= 0) return;
  const fx = layer();
  const end = performance.now() + ms;
  let last = 0;
  const tick = (t: number) => {
    if (t > end || !sprite.isConnected) return;
    if (t - last > 34) {
      last = t;
      const r = sprite.getBoundingClientRect();
      const c = document.createElement("i");
      c.className = "vxa-trail";
      c.style.left = `${r.left + r.width / 2}px`;
      c.style.top = `${r.top + r.height * 0.62}px`;
      c.style.setProperty("--rot", `${Math.round(Math.random() * 180)}deg`);
      fx.appendChild(c);
      setTimeout(() => c.remove(), 650);
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/** A swirling portal ring at a point (he dives in or pops out of it). */
export function portalRing(at: Point, ms = 900) {
  const fx = layer();
  const p = document.createElement("i");
  p.className = "vxa-portal";
  p.style.left = `${at.x}px`;
  p.style.top = `${at.y}px`;
  fx.appendChild(p);
  setTimeout(() => p.remove(), ms);
}
