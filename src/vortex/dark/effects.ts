// H · the dark effects. Atmosphere before jump-scares: things that might have
// happened. All overlays, all temporary, all respecting reduced motion and the
// 3-flashes-a-second rule. Real data is never touched.

import { prefersReducedMotion } from "@/components/vortex/vortexEffects";
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
const pick = <T>(l: readonly T[]): T | undefined =>
  l[Math.floor(Math.random() * l.length)];

/* H-06 · the page melts like stretched tape for two seconds */
export async function melt(): Promise<void> {
  const root = document.documentElement;
  if (prefersReducedMotion()) {
    root.classList.add("vxh-sepia");
    await wait(1000);
    root.classList.remove("vxh-sepia");
    return;
  }
  let svg = document.getElementById("vxh-melt-defs");
  if (!svg) {
    svg = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    ) as unknown as HTMLElement;
    svg.id = "vxh-melt-defs";
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("style", "position:absolute;width:0;height:0");
    svg.innerHTML = `<filter id="vxh-melt"><feTurbulence id="vxh-turb" type="fractalNoise" baseFrequency="0.002 0.06" numOctaves="2" seed="13"/><feDisplacementMap id="vxh-disp" in="SourceGraphic" scale="0" xChannelSelector="R" yChannelSelector="G"/></filter>`;
    document.body.appendChild(svg);
  }
  const disp = document.getElementById("vxh-disp");
  root.classList.add("vxh-melting");
  const start = performance.now();
  await new Promise<void>((res) => {
    const frame = (now: number) => {
      const t = (now - start) / 2000;
      const k = t < 0.5 ? t * 2 : (1 - t) * 2;
      disp?.setAttribute("scale", String(Math.max(0, k * 38)));
      if (t >= 1) return res();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  root.classList.remove("vxh-melting");
}

/* H-07 · the fake crash: an amber VFD hardware fault, 4s, any key closes it */
export function fakeCrash(): Promise<void> {
  return new Promise((resolve) => {
    const el = document.createElement("div");
    el.className = "vxh-crash";
    el.setAttribute("role", "alert");
    el.innerHTML = `<div class="box">
<p class="t">▓▓ TAPE TRANSPORT FAULT ▓▓</p>
<p>ERR 0313 · CAPSTAN STALLED</p>
<p>SOUL INTEGRITY: <b>37%</b></p>
<p>RECOVERING… <span class="bar"><i></i></span></p>
<p class="k">(this is him. nothing is broken. press any key.)</p></div>`;
    document.body.appendChild(el);
    const done = () => {
      el.classList.add("is-out");
      setTimeout(() => el.remove(), 350);
      removeEventListener("keydown", done);
      el.removeEventListener("click", done);
      resolve();
    };
    addEventListener("keydown", done, { once: true });
    el.addEventListener("click", done, { once: true });
    setTimeout(done, 4000);
  });
}

/* H-08 · whispers: a word surfaces on a card you hover slowly */
const WHISPERS = [
  "wait",
  "don't",
  "he's lying",
  "0313",
  "she's close",
  "remember",
  "rewind",
  "behind you",
];
export function startWhispers(stage: () => number): () => void {
  let over: HTMLElement | null = null;
  let since = 0;
  let last = 0;
  const move = (e: PointerEvent) => {
    const card = (e.target as Element)?.closest?.(
      ".mt-jx",
    ) as HTMLElement | null;
    if (card !== over) {
      over = card;
      since = Date.now();
      return;
    }
    if (
      !card ||
      stage() < 2 ||
      Date.now() - since < 1600 ||
      Date.now() - last < 90_000
    )
      return;
    if (Math.hypot(e.movementX, e.movementY) > 3 || Math.random() > 0.2) return;
    last = Date.now();
    const r = card.getBoundingClientRect();
    const w = document.createElement("span");
    w.className = "vxh-whisper";
    w.textContent = pick(WHISPERS) ?? "wait";
    w.style.left = `${r.left + 12 + Math.random() * Math.max(0, r.width - 90)}px`;
    w.style.top = `${r.top + r.height * 0.55}px`;
    document.body.appendChild(w);
    setTimeout(() => w.remove(), 2600);
  };
  addEventListener("pointermove", move, { passive: true });
  return () => removeEventListener("pointermove", move);
}

/* H-09 · the dead hour: 03:13–03:26 local, the whole app dims and grains */
export function isDeadHour(d = new Date()): boolean {
  return d.getHours() === 3 && d.getMinutes() >= 13 && d.getMinutes() < 26;
}
export function deadHourTick() {
  document.documentElement.classList.toggle("vxh-deadhour", isDeadHour());
}

/* H-18 · something changed while you looked away, for two seconds */
export async function whileNotLooking(): Promise<string | null> {
  const cards = [...document.querySelectorAll<HTMLElement>(".mt-jx")].filter(
    onScreen,
  );
  const racks = [
    ...document.querySelectorAll<HTMLElement>("[data-vx-rack] .mt-rack-t .nm"),
  ].filter(onScreen);
  const kind = pick(["hue", "mirror", "extra"] as const);
  if (kind === "hue" && cards.length) {
    const c = pick(cards) as HTMLElement;
    c.classList.add("vxh-wrongcolor");
    await wait(2000);
    c.classList.remove("vxh-wrongcolor");
    return "hue";
  }
  if (kind === "mirror" && racks.length) {
    const t = pick(racks) as HTMLElement;
    t.classList.add("vxh-mirrored");
    await wait(2000);
    t.classList.remove("vxh-mirrored");
    return "mirror";
  }
  const rack = pick(
    [...document.querySelectorAll<HTMLElement>("[data-vx-rack]")].filter(
      onScreen,
    ),
  );
  const src = rack?.querySelector<HTMLElement>(".mt-jx");
  if (!rack || !src) return null;
  const r = src.getBoundingClientRect();
  const ghost = src.cloneNode(true) as HTMLElement;
  ghost.classList.add("vxh-extra");
  ghost.removeAttribute("data-card-id");
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${r.left}px`,
    top: `${r.bottom + 8}px`,
    width: `${r.width}px`,
  });
  document.body.appendChild(ghost);
  await wait(2000);
  ghost.remove();
  return "extra";
}

/* H-19 · eyes open in the walls and close when you look */
export function wallEyes(): () => void {
  const eyes: HTMLElement[] = [];
  const spots = [
    ...document.querySelectorAll<HTMLElement>(
      ".ydc-rack, .hf-pn, [data-vx-rack], .pr",
    ),
  ]
    .filter(onScreen)
    .slice(0, 4);
  for (const s of spots) {
    const r = s.getBoundingClientRect();
    const e = document.createElement("i");
    e.className = "vxh-walleye";
    e.style.left = `${r.right - 18 - Math.random() * 30}px`;
    e.style.top = `${r.top + 6 + Math.random() * 20}px`;
    document.body.appendChild(e);
    eyes.push(e);
  }
  const move = (ev: PointerEvent) => {
    for (const e of eyes) {
      const r = e.getBoundingClientRect();
      e.classList.toggle(
        "is-shut",
        Math.hypot(ev.clientX - r.left, ev.clientY - r.top) < 140,
      );
    }
  };
  addEventListener("pointermove", move, { passive: true });
  const off = () => {
    removeEventListener("pointermove", move);
    for (const e of eyes) e.remove();
  };
  setTimeout(off, 25_000);
  return off;
}

/* H-20 · the app breathes with him (a vignette, never the layout) */
export function setBreathing(level: number) {
  let v = document.getElementById("vxh-breath");
  if (level <= 0) {
    v?.remove();
    return;
  }
  if (!v) {
    v = document.createElement("div");
    v.id = "vxh-breath";
    v.setAttribute("aria-hidden", "true");
    document.body.appendChild(v);
  }
  v.style.setProperty("--k", String(Math.min(1, level)));
}

/* H-21 · print-through: text from side c bleeds into a card */
export async function printThrough(): Promise<boolean> {
  const card = pick(
    [...document.querySelectorAll<HTMLElement>(".mt-jx")].filter(onScreen),
  );
  if (!card) return false;
  const r = card.getBoundingClientRect();
  const t = document.createElement("span");
  t.className = "vxh-printthrough";
  t.textContent = "make it remember me";
  t.style.left = `${r.left + 14}px`;
  t.style.top = `${r.bottom - 26}px`;
  document.body.appendChild(t);
  await wait(6000);
  t.remove();
  return true;
}

/* H-22 · the moon (approximate synodic month from a known new moon) */
export function moonPhase(d = new Date()): number {
  const known = Date.UTC(2000, 0, 6, 18, 14);
  const days = (d.getTime() - known) / 86_400_000;
  return (((days % 29.530588) + 29.530588) % 29.530588) / 29.530588; // 0 new, 0.5 full
}
export function isFullMoon(d = new Date()): boolean {
  const p = moonPhase(d);
  return p > 0.47 && p < 0.53;
}

/* H-23 · the night of the rewind (oct 31): reel pumpkins on the racks */
export function isHalloween(d = new Date()): boolean {
  return d.getMonth() === 9 && d.getDate() === 31;
}
export function halloweenDecor(on: boolean) {
  document.documentElement.classList.toggle("vxh-halloween", on);
}

/* H-24 · the overwritten: a grey user dragging a card forever, for 3 seconds */
export async function overwritten(): Promise<boolean> {
  const empty = [...document.querySelectorAll<HTMLElement>("[data-vx-rack]")]
    .filter(onScreen)
    .find((r) => r.querySelectorAll(".mt-jx").length === 0);
  const host =
    empty ??
    pick(
      [...document.querySelectorAll<HTMLElement>("[data-vx-rack]")].filter(
        onScreen,
      ),
    );
  if (!host) return false;
  const r = host.getBoundingClientRect();
  const g = document.createElement("div");
  g.className = "vxh-overwritten";
  g.setAttribute("aria-hidden", "true");
  g.innerHTML = `<i class="who"></i><i class="card"></i>`;
  g.style.left = `${r.left + r.width / 2 - 40}px`;
  g.style.top = `${r.top + 70}px`;
  document.body.appendChild(g);
  await wait(3200);
  g.remove();
  return true;
}
