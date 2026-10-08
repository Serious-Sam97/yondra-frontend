// Vortex MK-IV stage effects. Same contract as the earlier ones: visual only,
// self-cleaning, never a click or a data change, user text only through
// textContent, and the motion-heavy ones bail out under reduced motion.
// Persistent marks on real elements use data-* attributes (React leaves
// attributes it doesn't own alone; it would overwrite a className).

import { prefersReducedMotion } from "@/components/vortex/vortexEffects";

export interface Pt {
  x: number;
  y: number;
}

function fx(): HTMLElement {
  let el = document.getElementById("vxa-fx");
  if (!el) {
    el = document.createElement("div");
    el.id = "vxa-fx";
    el.className = "vxa-fx";
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
  }
  return el;
}

export function onScreen(el: Element | null | undefined): el is HTMLElement {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return (
    r.width > 0 &&
    r.height > 0 &&
    r.top >= 0 &&
    r.left >= 0 &&
    r.bottom <= window.innerHeight &&
    r.right <= window.innerWidth
  );
}

function pick<T>(arr: T[]): T | undefined {
  return arr[Math.floor(Math.random() * arr.length)];
}

function node(
  cls: string,
  at: { left: number; top: number; width?: number; height?: number },
  text?: string,
): HTMLElement {
  const e = document.createElement("div");
  e.className = cls;
  e.style.left = `${at.left}px`;
  e.style.top = `${at.top}px`;
  if (at.width != null) e.style.width = `${at.width}px`;
  if (at.height != null) e.style.height = `${at.height}px`;
  if (text != null) e.textContent = text;
  fx().appendChild(e);
  return e;
}

/** Keep a centred (translateX(-50%)) label fully on screen. */
function keepOnScreen(e: HTMLElement) {
  const w = e.offsetWidth;
  const x = Number.parseFloat(e.style.left) || 0;
  const min = w / 2 + 8;
  const max = window.innerWidth - w / 2 - 8;
  e.style.left = `${Math.max(min, Math.min(max, x))}px`;
  const y = Number.parseFloat(e.style.top) || 0;
  e.style.top = `${Math.max(8, Math.min(window.innerHeight - 40, y))}px`;
}

function removeAfter(e: Element, ms: number) {
  setTimeout(() => e.remove(), ms);
}

/* ── body-adjacent bits ────────────────────────────────────────────────── */

/** A puff of glitter (his sneeze). */
export function glitter(at: Pt, n = 18) {
  if (prefersReducedMotion()) return;
  const colors = ["#ff8fd4", "#00e5d0", "#fff", "#ffb347"];
  for (let i = 0; i < n; i++) {
    const g = node("vxa-glitter", { left: at.x, top: at.y });
    g.style.background = colors[i % colors.length];
    const a = Math.PI * (0.9 + Math.random() * 1.2);
    const v = 40 + Math.random() * 80;
    g.animate(
      [
        { transform: "translate(0,0) scale(1)", opacity: 1 },
        {
          transform: `translate(${Math.cos(a) * v}px, ${Math.sin(a) * v + 30}px) scale(.3)`,
          opacity: 0,
        },
      ],
      { duration: 900 + Math.random() * 500, easing: "ease-out" },
    ).onfinish = () => g.remove();
    removeAfter(g, 2500);
  }
}

/** Floating text that rises and fades (hiccupped ticket keys, "*sniff*"). */
export function popText(at: Pt, text: string, cls = "") {
  const e = node(`vxa-poptext ${cls}`, { left: at.x, top: at.y }, text);
  keepOnScreen(e);
  removeAfter(e, 1500);
}

/** "olááá" shouted into an empty rack, echoing smaller and fainter. */
export function echo(rack: HTMLElement, word = "olááá") {
  const r = rack.getBoundingClientRect();
  [0, 1, 2, 3].forEach((i) => {
    setTimeout(() => {
      const e = node(
        "vxa-echo",
        {
          left: r.left + r.width / 2,
          top: r.top + r.height * (0.35 + i * 0.12),
        },
        word,
      );
      e.style.setProperty("--s", String(1 - i * 0.2));
      e.style.setProperty("--o", String(0.9 - i * 0.22));
      removeAfter(e, 1800);
    }, i * 420);
  });
}

/** Caution tape torn in half over a card (a jam just cleared). */
export function ribbonCut(card: HTMLElement) {
  const r = card.getBoundingClientRect();
  const y = r.top + r.height * 0.45;
  const half = (side: "l" | "r") => {
    const t = node(`vxa-ribbon ${side}`, {
      left: side === "l" ? r.left - 10 : r.left + r.width / 2,
      top: y,
      width: r.width / 2 + 10,
    });
    removeAfter(t, 1600);
  };
  half("l");
  half("r");
  const s = node(
    "vxa-snip",
    { left: r.left + r.width / 2 - 12, top: y - 14 },
    "✂",
  );
  removeAfter(s, 900);
}

/** A card shakes like something is pulling it (tug-of-war). */
export function tug(card: HTMLElement, ms = 2200) {
  if (prefersReducedMotion()) return;
  card.animate(
    [
      { transform: "translateX(0)" },
      { transform: "translateX(-5px) rotate(-.6deg)" },
      { transform: "translateX(2px)" },
      { transform: "translateX(-6px) rotate(-.8deg)" },
      { transform: "translateX(0)" },
    ],
    { duration: 550, iterations: Math.ceil(ms / 550) },
  );
}

/** Sweat drops off a crowded rack header. */
export function sweat(rack: HTMLElement) {
  if (prefersReducedMotion()) return;
  const r = rack.getBoundingClientRect();
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      const d = node("vxa-sweat", {
        left: r.left + 20 + Math.random() * (r.width - 40),
        top: r.top + 40,
      });
      removeAfter(d, 1200);
    }, i * 260);
  }
}

/** Birthday streamers across the top of the page. */
export function streamers(ms = 6000) {
  if (prefersReducedMotion()) return;
  const colors = ["#ff2d95", "#00e5d0", "#ffb347", "#7a2cff", "#b6d27a"];
  for (let i = 0; i < 36; i++) {
    const s = node("vxa-streamer", {
      left: Math.random() * window.innerWidth,
      top: -30,
    });
    s.style.background = colors[i % colors.length];
    s.animate(
      [
        { transform: "translateY(0) rotate(0deg)" },
        {
          transform: `translateY(${window.innerHeight + 60}px) rotate(${(Math.random() - 0.5) * 900}deg)`,
        },
      ],
      {
        duration: 2500 + Math.random() * 3000,
        delay: Math.random() * 1500,
        easing: "ease-in",
      },
    ).onfinish = () => s.remove();
  }
  setTimeout(() => {
    for (const s of document.querySelectorAll(".vxa-streamer")) s.remove();
  }, ms + 3000);
}

/** A tiny countdown floating over him (last hour of a sprint). */
export function countdownTag(at: Pt, text: string) {
  const e = node("vxa-countdown", { left: at.x, top: at.y }, text);
  keepOnScreen(e);
  removeAfter(e, 3000);
}

/** Tape-ink puddle where he landed; dries up. */
export function puddle(at: Pt) {
  const e = node("vxa-puddle", { left: at.x - 34, top: at.y - 8 });
  removeAfter(e, 6000);
}

/* ── page mischief (41–55) ─────────────────────────────────────────────── */

/** Swap two letters in one visible heading word for a moment. */
export function letterSwap(ms = 1300): boolean {
  const els = Array.from(
    document.querySelectorAll<HTMLElement>(
      ".mt-rack-t .nm, .mt-jx .tt, .hf-ph .tp, .hf-box .nm, .ydc-mlabel",
    ),
  ).filter(onScreen);
  const el = pick(els);
  const t = el?.firstChild;
  if (!t || t.nodeType !== Node.TEXT_NODE) return false;
  const was = t.nodeValue ?? "";
  const i = was.search(/[a-zA-Z]{2}/);
  if (i < 0) return false;
  const swapped = was.slice(0, i) + was[i + 1] + was[i] + was.slice(i + 2);
  t.nodeValue = swapped;
  setTimeout(() => {
    if (t.nodeValue === swapped) t.nodeValue = was;
  }, ms);
  return true;
}

/** A button blushes and ducks behind its neighbour. */
export function shyButton(): boolean {
  if (prefersReducedMotion()) return false;
  const btns = Array.from(
    document.querySelectorAll<HTMLElement>(
      ".mt-transport button, .ydc-mode, .hf-nav, .mt-chip",
    ),
  ).filter(onScreen);
  const b = pick(btns);
  if (!b) return false;
  b.animate(
    [
      { transform: "translateX(0)", filter: "none" },
      {
        transform: "translateX(-60%) scale(.8)",
        filter: "hue-rotate(-40deg) saturate(2)",
        offset: 0.3,
      },
      {
        transform: "translateX(-60%) scale(.8)",
        filter: "hue-rotate(-40deg) saturate(2)",
        offset: 0.75,
      },
      { transform: "translateX(0)", filter: "none" },
    ],
    { duration: 1800, easing: "ease-in-out" },
  );
  return true;
}

/** An emoji somewhere flips upside down and back. */
export function flipEmoji(): boolean {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>("button, span, i, b"),
  ).filter(
    (e) =>
      e.childElementCount === 0 &&
      /^\p{Extended_Pictographic}$/u.test((e.textContent ?? "").trim()) &&
      onScreen(e),
  );
  const e = pick(candidates);
  if (!e) return false;
  e.animate(
    [
      { transform: "rotate(0)" },
      { transform: "rotate(180deg)", offset: 0.4 },
      { transform: "rotate(180deg)", offset: 0.7 },
      { transform: "rotate(360deg)" },
    ],
    { duration: 1600 },
  );
  return true;
}

/** A card sticker peels at the corner and sticks back. */
export function stickerPeel(): boolean {
  const s = pick(
    Array.from(document.querySelectorAll<HTMLElement>(".mt-stk")).filter(
      onScreen,
    ),
  );
  if (!s) return false;
  s.animate(
    [
      { transform: "none", transformOrigin: "0 0" },
      {
        transform: "perspective(200px) rotateX(-35deg) rotateY(25deg)",
        transformOrigin: "0 0",
        offset: 0.25,
      },
      {
        transform: "perspective(200px) rotateX(-28deg) rotateY(18deg)",
        transformOrigin: "0 0",
        offset: 0.5,
      },
      {
        transform: "perspective(200px) rotateX(-38deg) rotateY(26deg)",
        transformOrigin: "0 0",
        offset: 0.7,
      },
      { transform: "none", transformOrigin: "0 0" },
    ],
    { duration: 2200, easing: "ease-in-out" },
  );
  return true;
}

/** A drop of ink runs down from the header and evaporates. */
export function inkDrip(): boolean {
  if (prefersReducedMotion()) return false;
  const h = document.querySelector<HTMLElement>(".ydc-rack, .hf-glass");
  if (!h) return false;
  const r = h.getBoundingClientRect();
  const d = node("vxa-drip", {
    left: r.left + 80 + Math.random() * (r.width - 160),
    top: r.bottom - 4,
  });
  removeAfter(d, 3200);
  return true;
}

/** A loading bar that loads nothing. */
export function fakeLoading(): boolean {
  const bar = node("vxa-fakeload", { left: 0, top: 0 });
  const label = document.createElement("span");
  label.textContent = "loading nothing…";
  bar.appendChild(label);
  removeAfter(bar, 3200);
  return true;
}

/** A ghost letter appears in an empty, unfocused field and fades. */
export function keyboardGhost(): boolean {
  const input = pick(
    Array.from(
      document.querySelectorAll<HTMLInputElement>(
        "input[type='text'], input:not([type]), textarea",
      ),
    ).filter(
      (i) => onScreen(i) && i.value === "" && document.activeElement !== i,
    ),
  );
  if (!input) return false;
  const r = input.getBoundingClientRect();
  const g = node(
    "vxa-ghostkey",
    {
      left: r.left + 14 + Math.random() * Math.min(120, r.width / 2),
      top: r.top + r.height / 2 - 10,
    },
    pick("vortexboo".split("")) ?? "v",
  );
  removeAfter(g, 1600);
  return true;
}

/** A fake scrollbar on the right edge wobbles like jelly. */
export function wobblyScrollbar(): boolean {
  if (
    prefersReducedMotion() ||
    document.documentElement.scrollHeight <= window.innerHeight
  )
    return false;
  const t =
    window.scrollY /
      (document.documentElement.scrollHeight - window.innerHeight) || 0;
  const h = Math.max(
    40,
    (window.innerHeight / document.documentElement.scrollHeight) *
      window.innerHeight,
  );
  const s = node("vxa-wobble", {
    left: window.innerWidth - 12,
    top: t * (window.innerHeight - h),
    height: h,
  });
  removeAfter(s, 1400);
  return true;
}

/** "zzz" over a crew avatar who isn't on the board right now. */
export function sleepyAvatar(awakeNames: string[]): boolean {
  const avatars = Array.from(
    document.querySelectorAll<HTMLElement>(".mt-crew .mt-av"),
  ).filter(
    (a) =>
      onScreen(a) &&
      !awakeNames.some((n) =>
        (a.textContent ?? "")
          .trim()
          .startsWith(n.trim().charAt(0).toUpperCase()),
      ),
  );
  const a = pick(avatars);
  if (!a) return false;
  const r = a.getBoundingClientRect();
  const z = node("vxa-zzz", { left: r.right - 6, top: r.top - 10 }, "z z z");
  removeAfter(z, 4000);
  return true;
}

/** A dozen tiny Vortexes scurry across the bottom of the screen. */
export function tinyCrowd(svg: string): boolean {
  if (prefersReducedMotion()) return false;
  for (let i = 0; i < 12; i++) {
    const t = node("vxa-tiny", {
      left: -40,
      top: window.innerHeight - 34 - (i % 3) * 10,
    });
    t.innerHTML = svg; // generated SVG (numbers + constants only)
    t.animate(
      [
        { transform: "translateX(0)" },
        { transform: `translateX(${window.innerWidth + 80}px)` },
      ],
      { duration: 1800 + Math.random() * 900, delay: i * 90, easing: "linear" },
    ).onfinish = () => t.remove();
    removeAfter(t, 4500);
  }
  return true;
}

/** The header flickers like a bad bulb. Returns its rect so he can slap it. */
export function flickerHeader(): DOMRect | null {
  const h = document.querySelector<HTMLElement>(".ydc-rack, .hf-glass");
  if (!h) return null;
  h.animate(
    [
      { filter: "brightness(1)" },
      { filter: "brightness(.35)", offset: 0.1 },
      { filter: "brightness(1)", offset: 0.18 },
      { filter: "brightness(.5)", offset: 0.3 },
      { filter: "brightness(1)", offset: 0.4 },
      { filter: "brightness(.3)", offset: 0.62 },
      { filter: "brightness(1)" },
    ],
    { duration: 1500 },
  );
  return h.getBoundingClientRect();
}

/** The whole page takes one slow breath. */
export function pageBreath(): boolean {
  if (prefersReducedMotion()) return false;
  document.documentElement.animate(
    [
      { transform: "scale(1)" },
      { transform: "scale(1.008)" },
      { transform: "scale(1)" },
    ],
    { duration: 2600, easing: "ease-in-out" },
  );
  return true;
}

/** A VU meter (board) or the master VU needle (dashboard) runs backwards. */
export function vuBackwards(): boolean {
  const vu = pick(
    Array.from(
      document.querySelectorAll<HTMLElement>(".mt-vu .bar, .hf-mix .vu"),
    ).filter(onScreen),
  );
  if (!vu) return false;
  vu.animate(
    [
      { transform: "scaleX(1)" },
      { transform: "scaleX(-1)", offset: 0.2 },
      { transform: "scaleX(-1)", offset: 0.8 },
      { transform: "scaleX(1)" },
    ],
    { duration: 1600 },
  );
  return true;
}

/** A paper plane with a tip written on it crosses the screen. */
export function paperPlane(tip: string): boolean {
  if (prefersReducedMotion()) return false;
  const p = node("vxa-plane", {
    left: -60,
    top: window.innerHeight * (0.25 + Math.random() * 0.3),
  });
  const b = document.createElement("span");
  b.textContent = tip;
  p.append("✈", b);
  p.animate(
    [
      { transform: "translate(0,0) rotate(6deg)" },
      {
        transform: `translate(${window.innerWidth * 0.5}px, -40px) rotate(-4deg)`,
        offset: 0.5,
      },
      {
        transform: `translate(${window.innerWidth + 300}px, 30px) rotate(8deg)`,
      },
    ],
    { duration: 7000, easing: "ease-in-out" },
  ).onfinish = () => p.remove();
  removeAfter(p, 8000);
  return true;
}

/* ── dark stuff (71–82) ────────────────────────────────────────────────── */

/** A candle where an archived card used to be. */
export function candle(rect: DOMRect, ms = 30_000) {
  const c = node("vxa-candle", {
    left: rect.left + rect.width / 2 - 9,
    top: rect.top + 10,
  });
  removeAfter(c, ms);
}

/** A fake "someone was here" line over the dashboard's recording log. */
export function logWhisper(): boolean {
  const log = document.querySelector<HTMLElement>(".hf-log .ents");
  if (!onScreen(log)) return false;
  const r = log.getBoundingClientRect();
  const l = node(
    "vxa-logwhisper",
    { left: r.left + 12, top: r.top + 8, width: r.width - 24 },
    "??:??  ● someone was here",
  );
  removeAfter(l, 3800);
  return true;
}

/** A small hand comes out from under a card, waves, goes back. */
export function handUnder(): boolean {
  const card = pick(
    Array.from(document.querySelectorAll<HTMLElement>(".mt-jx")).filter(
      onScreen,
    ),
  );
  if (!card) return false;
  const r = card.getBoundingClientRect();
  const h = node(
    "vxa-hand",
    { left: r.left + r.width * (0.2 + Math.random() * 0.6), top: r.bottom - 6 },
    "🖐",
  );
  removeAfter(h, 2400);
  return true;
}

/** Pixel crows on top of the Done shelf (night only). Returns a cleanup. */
export function crows(): (() => void) | null {
  const done = document.querySelector<HTMLElement>("[data-vx-done] .mt-rack-h");
  if (!onScreen(done)) return null;
  const r = done.getBoundingClientRect();
  const birds = [0.18, 0.46, 0.8].map((f, i) => {
    const b = node(
      "vxa-crow",
      { left: r.left + r.width * f, top: r.top - 14 },
      "🐦‍⬛",
    );
    b.style.animationDelay = `${i * 0.7}s`;
    return b;
  });
  return () => {
    for (const b of birds) {
      b.classList.add("fly");
      removeAfter(b, 900);
    }
  };
}

/** His evil reflection in the board's glass header. Returns a cleanup. */
export function reflection(svg: string, ms = 6000): boolean {
  const glass = document.querySelector<HTMLElement>(".mt-head, .hf-glass");
  if (!onScreen(glass)) return false;
  const r = glass.getBoundingClientRect();
  const e = node("vxa-reflection", {
    left: r.right - 120,
    top: r.top + 6,
    width: 70,
    height: 70,
  });
  e.innerHTML = svg; // generated SVG
  removeAfter(e, ms);
  return true;
}

/** Ouija planchette in the basement, gliding to each letter of a word. */
export function ouija(word: string) {
  const room = document.querySelector<HTMLElement>(".vxa-basement");
  if (!room) return;
  const board = document.createElement("div");
  board.className = "vxa-ouija";
  const letters = document.createElement("div");
  letters.className = "abc";
  const spans = new Map<string, HTMLElement>();
  for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-") {
    const sp = document.createElement("span");
    sp.textContent = ch;
    letters.appendChild(sp);
    spans.set(ch, sp);
  }
  const out = document.createElement("b");
  const pl = document.createElement("i");
  board.append(letters, pl, out);
  room.appendChild(board);
  word
    .toUpperCase()
    .split("")
    .forEach((ch, i) => {
      setTimeout(
        () => {
          if (!board.isConnected) return;
          const target = spans.get(ch);
          if (target) {
            const b = board.getBoundingClientRect();
            const r = target.getBoundingClientRect();
            // the planchette's window sits over the letter
            pl.style.left = `${r.left - b.left + r.width / 2}px`;
            pl.style.top = `${r.top - b.top + r.height / 2}px`;
            target.classList.add("lit");
            setTimeout(() => target.classList.remove("lit"), 700);
          }
          out.textContent = (out.textContent ?? "") + ch;
        },
        900 + i * 900,
      );
    });
}

/* ── haunting marks driven by data attributes ─────────────────────────── */

/** Fog at the bottom of racks where nothing moved for `days`. Returns cleanup. */
export function fogRacks(days = 30): () => void {
  const marked: HTMLElement[] = [];
  for (const rack of document.querySelectorAll<HTMLElement>("[data-vx-rack]")) {
    const cards = Array.from(
      rack.querySelectorAll<HTMLElement>("[data-vx-touched]"),
    );
    if (
      cards.length &&
      cards.every((c) => Number(c.dataset.vxTouched) >= days)
    ) {
      rack.setAttribute("data-vx-fog", "1");
      marked.push(rack);
    }
  }
  return () => {
    for (const r of marked) r.removeAttribute("data-vx-fog");
  };
}
