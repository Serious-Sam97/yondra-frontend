// B-08 · body language, B-09 · smoke tentacles. Two wisps of smoke grow out of
// his rim for a gesture and fade when it's done. Each wisp is a cubic Bézier
// (anchor, two controls, tip) keyframed in the body SVG's coordinate space
// (viewBox -10 -6 160 150) and interpolated on requestAnimationFrame, with a
// puff at the tip for a "hand". Some gestures have no arms at all (eye-roll,
// scoff, throw-up): they flash a class the CSS animates.

export type GestureName =
  | "eyeroll"
  | "scoff"
  | "facepalm"
  | "shrug"
  | "point"
  | "slowclap"
  | "crossarms"
  | "chefkiss"
  | "jazzhands"
  | "throwup"
  | "covereyes"
  | "wave"
  | "shiver"
  | "fingerguns"
  | "count";

type Arm = [number, number, number, number, number, number, number, number];
type Key = { t: number; L?: Arm | null; R?: Arm | null };

// anchors on the rim: left (36,74), right (104,74)
const L0: Arm = [36, 76, 30, 80, 28, 86, 30, 92];
const R0: Arm = [104, 76, 110, 80, 112, 86, 110, 92];

const G: Partial<
  Record<GestureName, { keys: Key[]; cls?: string; ms: number }>
> = {
  facepalm: {
    ms: 1900,
    keys: [
      { t: 0, L: L0 },
      { t: 260, L: [36, 74, 22, 66, 34, 50, 50, 58] },
      { t: 420, L: [36, 74, 26, 64, 40, 54, 59, 62] },
      { t: 1500, L: [36, 74, 26, 64, 40, 54, 59, 62] },
      { t: 1900, L: L0 },
    ],
  },
  covereyes: {
    ms: 2200,
    keys: [
      { t: 0, L: L0, R: R0 },
      {
        t: 260,
        L: [36, 74, 26, 64, 40, 54, 59, 62],
        R: [104, 74, 114, 64, 100, 54, 81, 62],
      },
      {
        t: 1800,
        L: [36, 74, 26, 64, 40, 54, 59, 62],
        R: [104, 74, 114, 64, 100, 54, 81, 62],
      },
      { t: 2200, L: L0, R: R0 },
    ],
  },
  shrug: {
    ms: 1300,
    cls: "vxr-g-shrug",
    keys: [
      { t: 0, L: L0, R: R0 },
      {
        t: 300,
        L: [36, 74, 20, 70, 12, 62, 8, 56],
        R: [104, 74, 120, 70, 128, 62, 132, 56],
      },
      {
        t: 900,
        L: [36, 74, 20, 70, 12, 62, 8, 56],
        R: [104, 74, 120, 70, 128, 62, 132, 56],
      },
      { t: 1300, L: L0, R: R0 },
    ],
  },
  point: {
    ms: 1700,
    keys: [
      { t: 0, R: R0 },
      { t: 180, R: [104, 76, 108, 84, 104, 90, 100, 94] }, // anticipation: recoil
      { t: 420, R: [104, 72, 124, 66, 138, 58, 150, 52] },
      { t: 1350, R: [104, 72, 124, 66, 138, 58, 150, 52] },
      { t: 1700, R: R0 },
    ],
  },
  slowclap: {
    ms: 2400,
    keys: [
      { t: 0, L: L0, R: R0 },
      ...[0, 1, 2].flatMap((i) => [
        {
          t: 300 + i * 650,
          L: [36, 78, 30, 96, 50, 106, 62, 100] as Arm,
          R: [104, 78, 110, 96, 90, 106, 78, 100] as Arm,
        },
        {
          t: 520 + i * 650,
          L: [36, 78, 32, 98, 54, 108, 68, 102] as Arm,
          R: [104, 78, 108, 98, 86, 108, 72, 102] as Arm,
        },
      ]),
      { t: 2400, L: L0, R: R0 },
    ],
  },
  crossarms: {
    ms: 2600,
    keys: [
      { t: 0, L: L0, R: R0 },
      {
        t: 320,
        L: [38, 84, 56, 108, 80, 104, 90, 96],
        R: [102, 84, 84, 108, 60, 104, 50, 96],
      },
      {
        t: 2200,
        L: [38, 84, 56, 108, 80, 104, 90, 96],
        R: [102, 84, 84, 108, 60, 104, 50, 96],
      },
      { t: 2600, L: L0, R: R0 },
    ],
  },
  chefkiss: {
    ms: 1600,
    cls: "vxr-g-kiss",
    keys: [
      { t: 0, R: R0 },
      { t: 300, R: [104, 78, 100, 92, 86, 92, 74, 84] },
      { t: 700, R: [104, 78, 100, 92, 86, 92, 74, 84] },
      { t: 1000, R: [104, 74, 122, 64, 134, 52, 140, 42] },
      { t: 1600, R: R0 },
    ],
  },
  jazzhands: {
    ms: 1800,
    cls: "vxr-g-jazz",
    keys: [
      { t: 0, L: L0, R: R0 },
      {
        t: 250,
        L: [36, 72, 22, 56, 18, 42, 16, 30],
        R: [104, 72, 118, 56, 122, 42, 124, 30],
      },
      {
        t: 1500,
        L: [36, 72, 22, 56, 18, 42, 16, 30],
        R: [104, 72, 118, 56, 122, 42, 124, 30],
      },
      { t: 1800, L: L0, R: R0 },
    ],
  },
  wave: {
    ms: 1600,
    keys: [
      { t: 0, R: R0 },
      { t: 250, R: [104, 72, 118, 60, 122, 46, 120, 34] },
      { t: 550, R: [104, 72, 124, 62, 132, 48, 136, 38] },
      { t: 850, R: [104, 72, 118, 60, 122, 46, 120, 34] },
      { t: 1150, R: [104, 72, 124, 62, 132, 48, 136, 38] },
      { t: 1600, R: R0 },
    ],
  },
  fingerguns: {
    ms: 1500,
    cls: "vxr-g-guns",
    keys: [
      { t: 0, L: L0, R: R0 },
      {
        t: 260,
        L: [36, 76, 20, 74, 8, 72, -4, 70],
        R: [104, 76, 120, 74, 132, 72, 144, 70],
      },
      {
        t: 1100,
        L: [36, 76, 20, 74, 8, 72, -4, 70],
        R: [104, 76, 120, 74, 132, 72, 144, 70],
      },
      { t: 1500, L: L0, R: R0 },
    ],
  },
  count: {
    ms: 2200,
    keys: [
      { t: 0, R: R0 },
      { t: 300, R: [104, 76, 118, 72, 124, 62, 126, 52] },
      { t: 800, R: [104, 76, 120, 70, 128, 60, 132, 52] },
      { t: 1300, R: [104, 76, 118, 72, 124, 62, 126, 52] },
      { t: 1800, R: [104, 76, 120, 70, 128, 60, 132, 52] },
      { t: 2200, R: R0 },
    ],
  },
  eyeroll: { ms: 1100, cls: "vxr-g-eyeroll", keys: [] },
  scoff: { ms: 900, cls: "vxr-g-scoff", keys: [] },
  throwup: { ms: 1600, cls: "vxr-g-throwup", keys: [] },
  shiver: { ms: 1200, cls: "vxr-g-shiver", keys: [] },
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
const path = (a: Arm) =>
  `M${a[0]} ${a[1]} C${a[2]} ${a[3]} ${a[4]} ${a[5]} ${a[6]} ${a[7]}`;

function sample(keys: Key[], side: "L" | "R", t: number): Arm | null {
  const ks = keys.filter((k) => k[side] !== undefined);
  if (ks.length === 0) return null;
  if (t <= ks[0].t) return ks[0][side] ?? null;
  for (let i = 0; i < ks.length - 1; i++) {
    const a = ks[i];
    const b = ks[i + 1];
    if (t >= a.t && t <= b.t) {
      const A = a[side];
      const B = b[side];
      if (!A || !B) return A ?? B ?? null;
      const u = ease((t - a.t) / Math.max(1, b.t - a.t));
      return A.map((v, j) => lerp(v, B[j], u)) as Arm;
    }
  }
  return ks[ks.length - 1][side] ?? null;
}

const NS = "http://www.w3.org/2000/svg";
function overlay(host: HTMLElement): SVGSVGElement {
  let svg = host.querySelector<SVGSVGElement>(":scope > svg.vxr-arms");
  if (svg) return svg;
  svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "vxr-arms");
  svg.setAttribute("viewBox", "-10 -6 160 150");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = `<defs><linearGradient id="vxr-smoke" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a3a9a" stop-opacity=".95"/><stop offset="1" stop-color="#e6c8f0" stop-opacity=".9"/></linearGradient><filter id="vxr-blur"><feGaussianBlur stdDeviation=".55"/></filter></defs>
<g filter="url(#vxr-blur)"><path class="arm l" fill="none" stroke="url(#vxr-smoke)" stroke-width="5.5" stroke-linecap="round"/><path class="arm r" fill="none" stroke="url(#vxr-smoke)" stroke-width="5.5" stroke-linecap="round"/><circle class="puff l" r="4.6" fill="#efe0f5" stroke="#7a3a9a" stroke-width="1"/><circle class="puff r" r="4.6" fill="#efe0f5" stroke="#7a3a9a" stroke-width="1"/></g>`;
  host.appendChild(svg);
  return svg;
}

let running: { cancel: () => void } | null = null;

/** Play a gesture on his face host. Resolves when done (or cancelled). */
export function gesture(
  host: HTMLElement,
  name: GestureName,
  opts: { reduced?: boolean } = {},
): Promise<void> {
  const g = G[name];
  if (!g) return Promise.resolve();
  running?.cancel();
  return new Promise((resolve) => {
    if (g.cls) {
      host.classList.add(g.cls);
    }
    const svg = g.keys.length ? overlay(host) : null;
    const armL = svg?.querySelector<SVGPathElement>(".arm.l");
    const armR = svg?.querySelector<SVGPathElement>(".arm.r");
    const puffL = svg?.querySelector<SVGCircleElement>(".puff.l");
    const puffR = svg?.querySelector<SVGCircleElement>(".puff.r");
    const start = performance.now();
    let raf = 0;
    const show = (el: Element | null | undefined, on: boolean) =>
      el?.setAttribute("opacity", on ? "1" : "0");
    const finish = () => {
      cancelAnimationFrame(raf);
      if (g.cls) host.classList.remove(g.cls);
      if (svg) svg.classList.remove("is-on");
      running = null;
      resolve();
    };
    const draw = (t: number) => {
      const L = sample(g.keys, "L", t);
      const R = sample(g.keys, "R", t);
      for (const [arm, puff, a] of [
        [armL, puffL, L],
        [armR, puffR, R],
      ] as const) {
        if (!arm || !puff) continue;
        show(arm, !!a);
        show(puff, !!a);
        if (a) {
          arm.setAttribute("d", path(a));
          puff.setAttribute("cx", String(a[6]));
          puff.setAttribute("cy", String(a[7]));
        }
      }
    };
    if (svg) svg.classList.add("is-on");
    if (opts.reduced) {
      // B-25: a held pose instead of motion
      draw(g.ms * 0.5);
      const t = setTimeout(finish, Math.min(1200, g.ms));
      running = {
        cancel: () => {
          clearTimeout(t);
          finish();
        },
      };
      return;
    }
    const frame = (now: number) => {
      const t = now - start;
      if (t >= g.ms) return finish();
      draw(t);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    running = { cancel: finish };
  });
}

export const GESTURES = Object.keys(G) as GestureName[];
