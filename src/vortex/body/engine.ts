// B · THE BODY ENGINE — one requestAnimationFrame loop, outside React, that
// makes him feel alive (design/vortex-mk5/lados/B-corpo.md):
//   B-03 spring physics: squash & stretch along his velocity (volume kept),
//        a squash-bounce when he lands, a swirl that spins with speed and keeps
//        spinning after he stops, eyes that lag behind the body like jelly;
//   B-04 living eyes: asynchronous blinks (sometimes one eye late, sometimes
//        twice), micro-saccades, pupils that dilate with interest and shrink
//        with fear, the left-eye tremble when he lies;
//   B-06 procedural idle: layered sines with random phases — never the same
//        loop twice;
//   B-07 breathing that speeds up with fear and stops when possessed.
// Everything is written as CSS variables / one transform; React never
// re-renders per frame. It pauses when the tab is hidden and, with reduced
// motion, keeps only the blinks.

export interface BodyEngine {
  /** 1 = normal; >1 interested, <1 scared (B-04) */
  dilate(target: number): void;
  /** breathing speed multiplier; 0 stops it (possessed) (B-07) */
  breath(rate: number): void;
  /** the lying tell: the left eye trembles (B-04 / C-17) */
  lying(on: boolean): void;
  /** extra swirl spin, e.g. from a scared jolt (decays) */
  kick(spin: number): void;
  /** a vertical squash impulse (positive = flatten) */
  squash(amount: number): void;
  /** force a blink now */
  blink(double?: boolean): void;
  /** B-14 · body size multiplier (clamped 0.6–1.4) */
  size(target: number): void;
  /** B-23 · bob to a beat (null stops dancing) */
  dance(bpm: number | null): void;
  stop(): void;
}

interface Spring {
  x: number;
  v: number;
}
const step = (s: Spring, target: number, k: number, c: number, dt: number) => {
  const a = -k * (s.x - target) - c * s.v;
  s.v += a * dt;
  s.x += s.v * dt;
};

export function startBody(opts: {
  /** element whose box is his body on screen (velocity is read from it) */
  sprite: HTMLElement;
  /** element that receives the physics transform (wraps the face) */
  phys: HTMLElement;
  /** element that receives the CSS variables (the constant-class fx host) */
  vars: HTMLElement;
  reduced: boolean;
  /** B-10 · called (throttled) while he moves fast, with his centre */
  onFast?: (x: number, y: number, vx: number, vy: number) => void;
}): BodyEngine {
  const { sprite, phys, vars, reduced, onFast } = opts;
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);
  const phase = [rnd(0, 6.28), rnd(0, 6.28), rnd(0, 6.28), rnd(0, 6.28)];

  let raf = 0;
  let last = performance.now();
  let prev: { x: number; y: number } | null = null;
  let vx = 0;
  let vy = 0;
  let prevSpeed = 0;
  const stretch: Spring = { x: 0, v: 0 };
  const sq: Spring = { x: 0, v: 0 };
  const ex: Spring = { x: 0, v: 0 };
  const ey: Spring = { x: 0, v: 0 };
  const dil: Spring = { x: 1, v: 0 };
  const sacx: Spring = { x: 0, v: 0 };
  const sacy: Spring = { x: 0, v: 0 };
  let dilTarget = 1;
  let sacTarget = { x: 0, y: 0 };
  let nextSac = 0;
  let swirl = 0;
  let spin = 0; // follow-through spin, deg/ms, decays
  let breathRate = 1;
  let breathPhase = 0;
  let isLying = false;
  let angle = 0;
  const size: Spring = { x: 1, v: 0 };
  let sizeTarget = 1;
  const lean: Spring = { x: 0, v: 0 };
  let bpm: number | null = null;
  let lastSpark = 0;

  // blinks: per-eye timelines
  type Blink = { start: number; dur: number };
  let blinkL: Blink | null = null;
  let blinkR: Blink | null = null;
  let nextBlink = performance.now() + rnd(1200, 3500);
  const scheduleBlink = (now: number, double = false) => {
    const async = Math.random() < 0.18;
    blinkL = { start: now, dur: 190 };
    blinkR = { start: now + (async ? rnd(70, 140) : 0), dur: 190 };
    if (double || Math.random() < 0.12) {
      const again = now + 260;
      setTimeout(() => {
        blinkL = { start: again, dur: 170 };
        blinkR = { start: again + (async ? 60 : 0), dur: 170 };
      }, 230);
    }
    nextBlink = now + rnd(2000, 6000);
  };
  const lidValue = (b: Blink | null, now: number): number => {
    if (!b) return 0;
    const t = (now - b.start) / b.dur;
    if (t < 0 || t > 1) return 0;
    // fast close, tiny hold, slower open
    if (t < 0.32) return t / 0.32;
    if (t < 0.45) return 1;
    return 1 - (t - 0.45) / 0.55;
  };

  // T-03 · cheap idle: skip unchanged CSS variables, read his position (a
  // forced layout) every frame only while he moves, and run the at-rest sway
  // at 30 fps. Under 2 ms of main-thread work per idle frame.
  const written = new Map<string, string>();
  // the busiest variables go straight onto the few elements that read them,
  // so a change restyles those nodes instead of his whole SVG subtree
  const LOCAL: Record<string, string> = {
    "--vx-swirl": ".vxa-swirl",
    "--vx-shs": ".vxr-shadow",
    "--vx-sho": ".vxr-shadow",
    "--vx-lean": ".vxa-costume",
  };
  const found = new Map<string, Element[]>();
  const targets = (sel: string) => {
    let list = found.get(sel);
    if (!list || list.length === 0 || !list[0].isConnected) {
      list = [...vars.querySelectorAll(sel)];
      found.set(sel, list);
      // fresh nodes (React re-rendered the art): rewrite their values
      for (const k of Object.keys(LOCAL))
        if (LOCAL[k] === sel) written.delete(k);
    }
    return list;
  };
  const put = (k: string, v: string) => {
    const sel = LOCAL[k];
    const els = sel ? targets(sel) : null;
    if (written.get(k) === v) return;
    written.set(k, v);
    if (els) for (const el of els) (el as HTMLElement).style.setProperty(k, v);
    else vars.style.setProperty(k, v);
  };
  let tick = 0;
  let restFor = 0;
  let lastTransform = "";
  let lastRead = performance.now();

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(48, now - last);
    last = now;
    if (document.hidden) return;
    tick++;

    /* blinks run even with reduced motion (they aren't motion sickness) */
    if (now >= nextBlink) scheduleBlink(now);
    const bl = lidValue(blinkL, now);
    const br = lidValue(blinkR, now);
    put("--vx-bl", bl.toFixed(3));
    put("--vx-br", br.toFixed(3));
    if (reduced) return;

    const resting = restFor > 500;
    // at rest, half the frames are skipped entirely (the sway is slow)
    if (resting && tick % 2 === 1 && bpm === null && !isLying) return;
    const s = (resting && bpm === null && !isLying ? dt * 2 : dt) / 1000;
    const readNow = !resting || tick % 6 === 0;
    const r = readNow ? sprite.getBoundingClientRect() : null;
    const cx = r ? r.left + r.width / 2 : (prev?.x ?? 0);
    const cy = r ? r.top + r.height / 2 : (prev?.y ?? 0);
    if (prev && r && r.width > 0) {
      const since = Math.max(1, now - lastRead);
      const nvx = (cx - prev.x) / since;
      const nvy = (cy - prev.y) / since;
      // smooth the velocity a little (layout jitter)
      vx = vx * 0.6 + nvx * 0.4;
      vy = vy * 0.6 + nvy * 0.4;
    }
    if (r) {
      prev = { x: cx, y: cy };
      lastRead = now;
    }
    if (!readNow) {
      vx *= 0.6;
      vy *= 0.6;
    }
    const speed = Math.hypot(vx, vy);
    restFor =
      speed < 0.02 && Math.abs(stretch.x) < 0.005 && Math.abs(sq.x) < 0.01
        ? restFor + dt
        : 0;
    if (speed > 0.05) angle = Math.atan2(vy, vx);

    /* B-03 · stretch with speed; squash-bounce when he lands */
    step(stretch, Math.min(0.32, speed * 0.24), 260, 22, s);
    if (prevSpeed > 0.45 && speed < 0.06) sq.v += 3.2 + prevSpeed * 2;
    prevSpeed = speed;
    step(sq, 0, 320, 11, s);

    /* B-03 · eyes lag behind the body */
    step(ex, Math.max(-3, Math.min(3, -vx * 2.2)), 180, 16, s);
    step(ey, Math.max(-3, Math.min(3, -vy * 2.2)), 180, 16, s);

    /* B-04 · micro-saccades and dilation */
    // real micro-saccades are jumps, not glides (the pupils' 0.12 s CSS
    // transition turns each into a flick) — and still eyes cost nothing
    if (now > nextSac) {
      sacTarget = { x: rnd(-0.7, 0.7), y: rnd(-0.5, 0.5) };
      nextSac = now + rnd(300, 850);
      sacx.x = sacTarget.x;
      sacy.x = sacTarget.y;
    }
    step(dil, dilTarget, 60, 12, s);

    /* B-03 · swirl spins with speed, then coasts (follow-through) */
    spin = spin * 0.985 + speed * 0.04;
    swirl = (swirl + dt * (360 / 7000 + spin)) % 360;

    /* B-10 · static sparks behind him when he's fast */
    if (onFast && speed > 0.55 && now - lastSpark > 45) {
      lastSpark = now;
      onFast(cx, cy, vx, vy);
    }
    /* B-14 · size, B-19 · costume lean */
    step(size, sizeTarget, 120, 14, s);
    step(lean, Math.max(-14, Math.min(14, -vx * 14)), 70, 6, s);

    /* B-06 · procedural idle, B-07 · breathing */
    const t = now;
    const fy =
      3.4 * Math.sin(t * 0.00105 + phase[0]) +
      1.6 * Math.sin(t * 0.0023 + phase[1]) +
      0.7 * Math.sin(t * 0.0051 + phase[2]);
    const rot = 2.1 * Math.sin(t * 0.00071 + phase[3]) + vx * 6;
    breathPhase += (dt * (breathRate * (2 * Math.PI))) / 3600;
    const breath = breathRate === 0 ? 0 : 0.016 * Math.sin(breathPhase);
    // B-23 · dancing: a bounce on the beat
    const beat = bpm ? Math.abs(Math.sin((t / 60000) * bpm * Math.PI)) * -7 : 0;

    /* compose: stretch along the travel angle, keep the area ~constant */
    const a = 1 + stretch.x;
    const b = 1 / a;
    const c = Math.cos(angle);
    const sn = Math.sin(angle);
    let m11 = a * c * c + b * sn * sn;
    let m12 = (a - b) * c * sn;
    let m21 = m12;
    let m22 = a * sn * sn + b * c * c;
    // vertical squash + breath on top
    const sx = (1 + sq.x * 0.5 + breath) * size.x;
    const sy = (1 - sq.x + breath * 0.4) * size.x;
    m11 *= sx;
    m12 *= sx;
    m21 *= sy;
    m22 *= sy;
    const tf = `translate3d(0, ${(fy + beat).toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg) matrix(${m11.toFixed(4)}, ${m21.toFixed(4)}, ${m12.toFixed(4)}, ${m22.toFixed(4)}, 0, 0)`;
    if (tf !== lastTransform) {
      lastTransform = tf;
      phys.style.transform = tf;
    }

    const set = put;
    set("--vx-ex", `${ex.x.toFixed(2)}px`);
    set("--vx-ey", `${ey.x.toFixed(2)}px`);
    set("--vx-sacx", `${sacx.x.toFixed(2)}px`);
    set("--vx-sacy", `${sacy.x.toFixed(2)}px`);
    set("--vx-dil", dil.x.toFixed(3));
    // at rest the swirl turns in 5° steps (each change repaints his whole SVG)
    set(
      "--vx-swirl",
      `${(restFor > 500 ? Math.round(swirl / 5) * 5 : swirl).toFixed(1)}deg`,
    );
    set("--vx-lean", `${lean.x.toFixed(2)}deg`);
    // B-11 · the shadow: smaller and darker when he's low and slow
    set(
      "--vx-shs",
      (0.92 + fy * -0.02 + Math.min(0.6, speed * 0.5)).toFixed(3),
    );
    set("--vx-sho", Math.max(0.15, 0.62 - fy * 0.02 - speed * 0.4).toFixed(3));
    set(
      "--vx-trem",
      isLying ? `${(Math.sin(t * 0.09) * 0.7).toFixed(2)}px` : "0px",
    );
  };
  raf = requestAnimationFrame(frame);

  return {
    dilate: (target) => {
      dilTarget = Math.max(0.4, Math.min(1.7, target));
    },
    breath: (rate) => {
      breathRate = Math.max(0, rate);
    },
    lying: (on) => {
      isLying = on;
    },
    kick: (deg) => {
      spin += deg;
    },
    squash: (amount) => {
      sq.v += amount * 10;
    },
    blink: (double) => scheduleBlink(performance.now(), double),
    size: (target) => {
      sizeTarget = Math.max(0.6, Math.min(1.4, target));
    },
    dance: (b) => {
      bpm = b && b > 30 ? b : null;
    },
    stop: () => {
      cancelAnimationFrame(raf);
      written.clear();
      phys.style.transform = "";
    },
  };
}
