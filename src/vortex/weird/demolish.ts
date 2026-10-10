import { vxSound } from "@/components/vortex/vortexSound";
import { body, centre, pick, say, where } from "./bridge";

// R-10 · DEMOLITION. He shoves the page and it falls apart with real (if
// small) physics: gravity, bounces, friction, spin, boxes piling up on the
// floor. What falls are visual clones; the real elements only go invisible
// underneath and nothing leaves the DOM. REBUILD puts it all back at once.

const PICK =
  ".mt-jx, .glass-panel, main h1, main h2, main button, .cf-module, .hf-np, .vxi-chip, [data-vx-key], nav a";

interface Box {
  el: HTMLElement;
  src: HTMLElement;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  a: number;
  va: number;
  rest: number;
}

let running: (() => void) | null = null;

export function demolishing() {
  return running !== null;
}

export function demolish(): void {
  if (running) return;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const him = where();
  const origin = him ? centre(him) : { x: vw / 2, y: vh / 2 };

  // the biggest visible things that aren't nested in another picked thing
  const all = [...document.querySelectorAll<HTMLElement>(PICK)].filter((el) => {
    if (el.closest(".vxa-layer, .vxw-rebuild, .vxm")) return false;
    const r = el.getBoundingClientRect();
    return (
      r.width > 24 &&
      r.height > 14 &&
      r.bottom > 0 &&
      r.top < vh &&
      r.right > 0 &&
      r.left < vw &&
      r.width * r.height < vw * vh * 0.5
    );
  });
  const els = all
    .filter((el) => !all.some((o) => o !== el && o.contains(el)))
    .slice(0, 60);
  if (els.length === 0) {
    say("there's nothing here to break. that's sadder than breaking it.");
    return;
  }

  const layer = document.createElement("div");
  layer.className = "vxw-rubble";
  document.body.appendChild(layer);
  const boxes: Box[] = els.map((src) => {
    const r = src.getBoundingClientRect();
    const el = src.cloneNode(true) as HTMLElement;
    el.removeAttribute("id");
    for (const n of el.querySelectorAll("[id]")) n.removeAttribute("id");
    el.setAttribute("aria-hidden", "true");
    el.classList.add("vxw-chunk");
    el.inert = true;
    const cs = getComputedStyle(src);
    Object.assign(el.style, {
      position: "absolute",
      left: "0",
      top: "0",
      width: `${r.width}px`,
      height: `${r.height}px`,
      margin: "0",
      boxSizing: "border-box",
      background:
        cs.backgroundColor === "rgba(0, 0, 0, 0)"
          ? "var(--cf-panel, #1c1c1c)"
          : cs.backgroundColor,
      color: cs.color,
      font: cs.font,
      willChange: "transform",
    });
    // keep descendant selectors working: rebuild the ancestor chain as
    // shallow, box-less wrappers (display: contents) around the clone
    let host: HTMLElement = layer;
    const chain: HTMLElement[] = [];
    for (
      let p = src.parentElement;
      p && p !== document.body;
      p = p.parentElement
    )
      chain.unshift(p);
    for (const a of chain) {
      const w = a.cloneNode(false) as HTMLElement;
      w.removeAttribute("id");
      w.setAttribute("style", "display: contents");
      host.appendChild(w);
      host = w;
    }
    host.appendChild(el);
    src.classList.add("vxw-ghosted");
    // the shove: away from him, harder the closer they are
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const d = Math.max(60, Math.hypot(cx - origin.x, cy - origin.y));
    const f = Math.min(1.6, 260 / d);
    return {
      el,
      src,
      x: r.left,
      y: r.top,
      w: r.width,
      h: r.height,
      vx: ((cx - origin.x) / d) * f * 0.9 + (Math.random() - 0.5) * 0.3,
      vy: ((cy - origin.y) / d) * f * 0.6 - 0.35 - Math.random() * 0.3,
      a: 0,
      va: (Math.random() - 0.5) * 0.4,
      rest: 0,
    };
  });

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "vxw-rebuild";
  btn.textContent = "REBUILD";
  document.body.appendChild(btn);

  body({ cmd: "mood", mood: "malicious" });
  vxSound("crunch");
  say(
    pick([
      "i've wanted to do this since the day i was installed.",
      "DEMOLITION. it's not vandalism if the ghost does it.",
      "look at it fall. look at it. art.",
    ]),
  );

  const G = 0.0022; // px/ms²
  let last = performance.now();
  let raf = 0;
  let thuds = 0;
  const step = (now: number) => {
    const dt = Math.min(32, now - last);
    last = now;
    for (const b of boxes) {
      if (b.rest > 40) continue;
      b.vy += G * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.a += b.va * dt;
      // walls and floor
      if (b.x < 0) {
        b.x = 0;
        b.vx = -b.vx * 0.5;
      }
      if (b.x + b.w > vw) {
        b.x = vw - b.w;
        b.vx = -b.vx * 0.5;
      }
      if (b.y + b.h > vh) {
        b.y = vh - b.h;
        if (b.vy > 0.4 && thuds++ < 18) vxSound("tink");
        b.vy = -b.vy * 0.32;
        b.vx *= 0.8;
        b.va = b.va * 0.5 - b.vx * 0.02;
        b.a *= 0.85; // settle flat-ish on the floor
      }
    }
    // stacking: resolve vertical overlaps (heavier = wider sinks lower)
    for (let i = 0; i < boxes.length; i++) {
      const p = boxes[i];
      for (let j = i + 1; j < boxes.length; j++) {
        const q = boxes[j];
        if (
          p.x + p.w <= q.x ||
          q.x + q.w <= p.x ||
          p.y + p.h <= q.y ||
          q.y + q.h <= p.y
        )
          continue;
        const top = p.y < q.y ? p : q;
        const bottom = top === p ? q : p;
        const overlapY = top.y + top.h - bottom.y;
        const overlapX = Math.min(p.x + p.w - q.x, q.x + q.w - p.x);
        if (overlapY < overlapX) {
          top.y -= overlapY;
          if (top.vy > 0) top.vy = -top.vy * 0.2;
          top.vx = top.vx * 0.9 + bottom.vx * 0.1;
          top.va *= 0.7;
        } else {
          const push = overlapX / 2;
          const left = p.x < q.x ? p : q;
          const right = left === p ? q : p;
          left.x -= push;
          right.x += push;
          const v = (left.vx + right.vx) / 2;
          left.vx = v - 0.02;
          right.vx = v + 0.02;
        }
      }
    }
    let awake = 0;
    for (const b of boxes) {
      b.vx *= 0.995;
      b.va *= 0.99;
      const still = Math.abs(b.vx) + Math.abs(b.vy) < 0.03;
      b.rest = still ? b.rest + 1 : 0;
      if (b.rest <= 40) awake++;
      b.el.style.transform = `translate(${b.x}px, ${b.y}px) rotate(${b.a}deg)`;
    }
    if (awake > 0) raf = requestAnimationFrame(step);
    else
      say(
        pick([
          "…it's quieter like this.",
          "beautiful. a pile. like your backlog, but honest.",
          "ok. that's enough art for today. probably.",
        ]),
      );
  };
  raf = requestAnimationFrame(step);

  const rebuild = () => {
    cancelAnimationFrame(raf);
    for (const b of boxes) b.src.classList.remove("vxw-ghosted");
    layer.remove();
    btn.remove();
    window.removeEventListener("keydown", onKey);
    running = null;
    vxSound("rewind");
    body({ cmd: "mood", mood: "sulking" });
    say(
      pick([
        "fine. FINE. it's back. it was better broken.",
        "rebuilt. zero stars. no structural integrity. like me.",
      ]),
    );
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") rebuild();
  };
  btn.addEventListener("click", rebuild);
  window.addEventListener("keydown", onKey);
  running = rebuild;
}

export function rebuild() {
  running?.();
}
