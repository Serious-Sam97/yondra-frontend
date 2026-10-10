// S-07 · the scene generator: the board's risograph language (lib/boardArt)
// grown into whole rooms of the Below. A seeded composition per room motif —
// floor, back wall, a light source, props in two misregistered ink layers,
// halftone shadows — repainted per palette (seasons and dimensions).
// Numbers and constants only: safe to inject.

export type SceneRoom =
  | "porao"
  | "biblioteca"
  | "cemiterio"
  | "garagem"
  | "estudio"
  | "torre"
  | "feira"
  | "baile";
export type ScenePalette =
  | "below"
  | "halloween"
  | "birthday"
  | "y1985"
  | "noir"
  | "underwater"
  | "paper"
  | "baroque";

export const SCENE_ROOMS: SceneRoom[] = [
  "porao",
  "biblioteca",
  "cemiterio",
  "garagem",
  "estudio",
  "torre",
  "feira",
  "baile",
];
export const SCENE_PALETTES: ScenePalette[] = [
  "below",
  "halloween",
  "birthday",
  "y1985",
  "noir",
  "underwater",
  "paper",
  "baroque",
];

// [paper, ink A, ink B, shadow]
const PAL: Record<ScenePalette, [string, string, string, string]> = {
  below: ["#1a0d10", "#ff4a3d", "#ffa400", "#000000"],
  halloween: ["#140b1e", "#ff7a00", "#7a5cff", "#000000"],
  birthday: ["#fff1e0", "#ff4fa3", "#2ab7e0", "#3a2a3a"],
  y1985: ["#0b0221", "#ff2e88", "#ffd319", "#000000"],
  noir: ["#d8d4cc", "#1a1a1a", "#7a7a7a", "#000000"],
  underwater: ["#062a35", "#2ab7e0", "#3fae6a", "#00141c"],
  paper: ["#f4efe0", "#222222", "#c2272d", "#555555"],
  baroque: ["#2a1608", "#c8962e", "#8a1a2a", "#000000"],
};

function prng(seed: number) {
  let s = Math.abs(seed) % 233280 || 7;
  return (n = 1) => {
    s = (s * 9301 + 49297) % 233280;
    return (s / 233280) * n;
  };
}

const W = 320;
const H = 200;
const r1 = (n: number) => Math.round(n * 10) / 10;

let darkPaper = true;
/** one prop in two misregistered layers (the riso look) */
function twice(
  shape: (dx: number, dy: number, c: string) => string,
  a: string,
  b: string,
) {
  const blend = darkPaper ? "screen" : "multiply";
  return `<g opacity=".92">${shape(0, 0, a)}</g><g opacity=".8" style="mix-blend-mode:${blend}">${shape(1.8, -1.4, b)}</g>`;
}

const PROPS: Record<
  SceneRoom,
  (r: (n?: number) => number, a: string, b: string) => string
> = {
  porao: (r, a, b) =>
    twice(
      (dx, dy, c) =>
        `<rect x="${40 + dx}" y="${96 + dy}" width="${r1(36 + r(20))}" height="40" fill="${c}"/><rect x="${200 + dx}" y="${70 + dy}" width="46" height="70" fill="none" stroke="${c}" stroke-width="3"/>`,
      a,
      b,
    ) +
    `<circle cx="${r1(140 + r(40))}" cy="40" r="6" fill="${b}"/><path d="M${r1(140 + r(40))} 0 V34" stroke="${b}" stroke-width="1"/>`,
  biblioteca: (r, a, b) =>
    Array.from({ length: 6 }, (_, i) =>
      twice(
        (dx, dy, c) =>
          `<rect x="${20 + i * 48 + dx}" y="${40 + dy}" width="40" height="110" fill="none" stroke="${c}" stroke-width="2"/>${Array.from({ length: 5 }, (_, k) => `<rect x="${24 + i * 48 + k * 7 + dx}" y="${r1(60 + r(20)) + dy}" width="5" height="${r1(20 + r(30))}" fill="${c}"/>`).join("")}`,
        a,
        b,
      ),
    ).join(""),
  cemiterio: (r, a, b) =>
    `${Array.from({ length: 5 }, (_, i) => {
      const x = 30 + i * 60 + r(12);
      const h = 34 + r(26);
      return twice(
        (dx, dy, c) =>
          `<path d="M${r1(x + dx)} ${170 + dy} v-${r1(h)} q16 -18 32 0 v${r1(h)}Z" fill="${c}"/>`,
        a,
        b,
      );
    }).join("")}<circle cx="260" cy="40" r="18" fill="${b}" opacity=".8"/>`,
  garagem: (r, a, b) =>
    twice(
      (dx, dy, c) =>
        `<rect x="${30 + dx}" y="${40 + dy}" width="260" height="${r1(70 + r(10))}" fill="none" stroke="${c}" stroke-width="3"/>${Array.from({ length: 7 }, (_, k) => `<path d="M${30 + dx} ${50 + k * 10 + dy} H${290 + dx}" stroke="${c}" stroke-width="1.5"/>`).join("")}`,
      a,
      b,
    ) +
    `<rect x="120" y="140" width="80" height="20" rx="4" fill="${a}"/><circle cx="140" cy="150" r="6" fill="${b}"/><circle cx="180" cy="150" r="6" fill="${b}"/>`,
  estudio: (r, a, b) =>
    twice(
      (dx, dy, c) =>
        `<rect x="${60 + dx}" y="${70 + dy}" width="200" height="70" rx="6" fill="${c}"/>`,
      a,
      b,
    ) +
    Array.from(
      { length: 12 },
      (_, k) =>
        `<rect x="${72 + k * 15}" y="${r1(80 + r(20))}" width="6" height="${r1(20 + r(30))}" fill="${b}"/>`,
    ).join("") +
    `<path d="M160 70 V20" stroke="${a}" stroke-width="2"/><circle cx="160" cy="18" r="8" fill="none" stroke="${a}" stroke-width="3"/>`,
  torre: (r, a, b) =>
    twice(
      (dx, dy, c) =>
        `<path d="M${140 + dx} ${180 + dy} L${160 + dx} ${20 + dy} L${180 + dx} ${180 + dy}Z" fill="none" stroke="${c}" stroke-width="3"/>${Array.from({ length: 8 }, (_, k) => `<path d="M${142 + k * 2.4 + dx} ${160 - k * 18 + dy} H${178 - k * 2.4 + dx}" stroke="${c}" stroke-width="2"/>`).join("")}`,
      a,
      b,
    ) +
    `<circle cx="160" cy="${r1(60 + r(20))}" r="${r1(30 + r(30))}" fill="none" stroke="${b}" stroke-width="1" stroke-dasharray="3 5"/>`,
  feira: (r, a, b) =>
    twice(
      (dx, dy, c) =>
        `<circle cx="${110 + dx}" cy="${90 + dy}" r="60" fill="none" stroke="${c}" stroke-width="3"/>${Array.from({ length: 12 }, (_, k) => `<path d="M${110 + dx} ${90 + dy} l${r1(Math.cos((k / 12) * 6.283) * 60)} ${r1(Math.sin((k / 12) * 6.283) * 60)}" stroke="${c}" stroke-width="1.5"/>`).join("")}`,
      a,
      b,
    ) +
    `<path d="M200 170 L240 110 L280 170Z" fill="${a}"/><path d="M200 170 L240 110 L280 170" fill="none" stroke="${b}" stroke-width="2" stroke-dasharray="6 6"/>` +
    `<rect x="${r1(10 + r(10))}" y="160" width="300" height="2" fill="${b}"/>`,
  baile: (r, a, b) =>
    `<circle cx="160" cy="40" r="20" fill="${b}"/>${Array.from({ length: 14 }, (_, k) => `<path d="M160 40 L${r1(20 + k * 22)} 200" stroke="${k % 2 ? a : b}" stroke-width="${r1(1 + r(3))}" opacity=".5"/>`).join("")}` +
    twice(
      (dx, dy, c) =>
        Array.from(
          { length: 4 },
          (_, k) =>
            `<circle cx="${70 + k * 60 + dx}" cy="${r1(150 + r(10)) + dy}" r="12" fill="${c}"/>`,
        ).join(""),
      a,
      b,
    ),
};

export function sceneArt(
  room: SceneRoom,
  palette: ScenePalette,
  seed = 1,
): string {
  const [paper, a, b, shadow] = PAL[palette];
  const hex = Number.parseInt(paper.slice(1), 16);
  darkPaper =
    ((hex >> 16) & 255) * 0.3 + ((hex >> 8) & 255) * 0.59 + (hex & 255) * 0.11 <
    128;
  const r = prng(seed * 7919 + room.length * 31 + palette.length);
  const id = `s${Math.abs(seed)}${room}${palette}`;
  // floor line and back wall with a perspective tilt
  const tilt = r1(r(14) - 7);
  const floorY = r1(150 + r(14));
  const halftone = `<pattern id="${id}h" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1.2" fill="${shadow}" opacity=".55"/></pattern>`;
  const grain = `<filter id="${id}g"><feTurbulence baseFrequency=".9" numOctaves="1" seed="${Math.abs(seed) % 97}"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .14 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>`;
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><defs>${halftone}${grain}</defs>
<rect width="${W}" height="${H}" fill="${paper}"/>
<path d="M0 ${floorY} L${W} ${r1(floorY + tilt)} V${H} H0Z" fill="url(#${id}h)"/>
<path d="M0 ${floorY} L${W} ${r1(floorY + tilt)}" stroke="${a}" stroke-width="2"/>
<g transform="translate(${r1(r(60) - 30)} ${r1(r(16) - 8)}) scale(${r1(0.85 + r(0.3))}) rotate(${r1(r(4) - 2)} 160 100)">${PROPS[room](r, a, b)}</g>
<ellipse cx="${r1(80 + r(160))}" cy="${r1(floorY + 12)}" rx="${r1(40 + r(30))}" ry="6" fill="url(#${id}h)"/>
<rect width="${W}" height="${H}" filter="url(#${id}g)" fill="${paper}"/>
</svg>`;
}
