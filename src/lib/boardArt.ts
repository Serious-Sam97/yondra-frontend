// Generative "risograph" art for the multitrack board (design/board-final.png).
// Everything here returns SVG markup built only from numbers and our own colour
// constants — never user text — so it is safe to inject with innerHTML.

import type { CardInterface } from "@/interfaces/CardInterface";

export type ArtKind = "sunset" | "memphis" | "rings" | "stripes" | "wave";

const KINDS: ArtKind[] = ["sunset", "memphis", "wave", "stripes", "rings"];

// Print inks: the card palette (saturated enough to survive multiply on cream).
export const INKS = [
  "#ff4fa3",
  "#ffa400",
  "#2ab7e0",
  "#7a5cff",
  "#3fae6a",
  "#ff4a3d",
];

/** Stable art motif per card. */
export function artKindFor(id: number | string): ArtKind {
  const n = typeof id === "number" ? id : hash(String(id));
  return KINDS[Math.abs(n) % KINDS.length];
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

/** The two print inks for a card: its first two tag colours, else a palette pair. */
export function cardInks(
  card: Pick<CardInterface, "id" | "tags">,
): [string, string] {
  const tagColors = (card.tags ?? [])
    .map((t) => t.color)
    .filter((c): c is string => !!c && /^#[0-9a-f]{6}$/i.test(c));
  const n = Math.abs(
    typeof card.id === "number" ? card.id : hash(String(card.id)),
  );
  const a = tagColors[0] ?? INKS[n % INKS.length];
  const fallbackB =
    INKS[(n + 1) % INKS.length] === a
      ? INKS[(n + 2) % INKS.length]
      : INKS[(n + 1) % INKS.length];
  const b = tagColors[1] && tagColors[1] !== a ? tagColors[1] : fallbackB;
  return [a, b];
}

/** Small seeded PRNG so art is stable across renders. */
function prng(seed: number) {
  let s = Math.abs(seed) % 233280 || 7;
  return (n: number) => {
    s = (s * 9301 + 49297) % 233280;
    return (s / 233280) * n;
  };
}

/** Two-ink cover art for the top of a card (280×62 viewBox, slice-fit). */
export function coverArt(
  kind: ArtKind,
  a: string,
  b: string,
  seed: number,
  uid: string,
): string {
  const id = `ca${uid}`;
  const W = 280;
  const H = 62;
  const sd = (Math.abs(seed) % 9) + 1;
  const half = `<pattern id="${id}" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(${(sd * 17) % 45})"><circle cx="2" cy="2" r="1.15" fill="${b}"/></pattern>`;
  const half2 = `<pattern id="${id}b" width="3.2" height="3.2" patternUnits="userSpaceOnUse"><circle cx="1.6" cy="1.6" r=".9" fill="${a}"/></pattern>`;
  const off = 'transform="translate(1.6,1.1)"';
  let g = "";
  if (kind === "sunset") {
    let stripes = "";
    for (let y = 6; y < 44; y += 5)
      stripes += `<rect x="0" y="${y + (y > 24 ? (y - 24) * 0.15 : 0)}" width="${W}" height="${y > 24 ? 3.2 - (y - 24) * 0.07 : 3.2}" fill="#000"/>`;
    let grid = "";
    for (let i = -12; i <= 12; i++)
      grid += `<line x1="${140 + i * 8}" y1="44" x2="${140 + i * 40}" y2="${H}" stroke="${a}" stroke-width="1.1"/>`;
    for (const y of [46, 49, 53, 58])
      grid += `<line x1="0" x2="${W}" y1="${y}" y2="${y}" stroke="${a}" stroke-width="1.1"/>`;
    const cx = 150 + sd * 9;
    g = `<defs>${half}<mask id="${id}m"><rect width="${W}" height="${H}" fill="#fff"/>${stripes}</mask></defs>
      <rect class="ink" width="${W}" height="44" fill="url(#${id})" opacity=".55"/>
      <circle class="ink" cx="${cx}" cy="40" r="30" fill="${b}" mask="url(#${id}m)"/>
      <g class="ink" ${off}><circle cx="${cx}" cy="40" r="30" fill="none" stroke="${a}" stroke-width="1.4"/></g>
      <rect class="ink" y="44" width="${W}" height="${H - 44}" fill="${a}" opacity=".25"/><g class="ink">${grid}</g>`;
  } else if (kind === "memphis") {
    const rnd = prng(sd * 7919);
    let s = "";
    for (let i = 0; i < 9; i++) {
      const x = rnd(W);
      const y = rnd(H);
      const t = i % 3;
      if (t === 0)
        s += `<path class="ink" d="M${x} ${y} q6 -8 12 0 t12 0 t12 0" fill="none" stroke="${i % 2 ? a : b}" stroke-width="3" stroke-linecap="round"/>`;
      if (t === 1)
        s += `<polygon class="ink" points="${x},${y} ${x + 14},${y + 4} ${x + 4},${y + 15}" fill="${i % 2 ? b : a}"/>`;
      if (t === 2)
        s += `<circle class="ink" cx="${x}" cy="${y}" r="${5 + rnd(6)}" fill="none" stroke="${a}" stroke-width="2.4"/>`;
    }
    g = `<defs>${half}${half2}</defs><rect class="ink" width="${W}" height="${H}" fill="url(#${id})" opacity=".45"/>
      <rect class="ink" x="${W * 0.55}" y="-10" width="70" height="90" fill="url(#${id}b)" transform="rotate(18 ${W * 0.6} 30)" opacity=".7"/>${s}`;
  } else if (kind === "rings") {
    let r = "";
    for (let i = 1; i < 12; i++)
      r += `<circle cx="${70 + sd * 6}" cy="31" r="${i * 6}" fill="none" stroke="${a}" stroke-width="${i % 3 ? 1.2 : 2.6}"/>`;
    let r2 = "";
    for (let i = 1; i < 10; i++)
      r2 += `<circle cx="${210 - sd * 4}" cy="40" r="${i * 7}" fill="none" stroke="${b}" stroke-width="2.2"/>`;
    g = `<defs>${half2}</defs><rect class="ink" width="${W}" height="${H}" fill="url(#${id}b)" opacity=".3"/><g class="ink">${r}</g><g class="ink">${r2}</g>`;
  } else if (kind === "stripes") {
    let s = "";
    for (let i = -6; i < 30; i++)
      s += `<rect x="${i * 16}" y="-20" width="7" height="110" fill="${i % 3 === 0 ? b : a}" transform="skewX(-28)"/>`;
    g = `<defs>${half}</defs><g class="ink" opacity=".85">${s}</g><rect class="ink" x="0" y="0" width="${W}" height="${H}" fill="url(#${id})" opacity=".35"/>`;
  } else {
    let p = "";
    let q = "";
    for (let k = 0; k < 6; k++) {
      let d = `M0 ${12 + k * 8}`;
      for (let x = 0; x <= W; x += 8)
        d += ` L${x} ${(12 + k * 8 + Math.sin((x + sd * 30 + k * 20) / 22) * (6 - k * 0.6)).toFixed(1)}`;
      const path = `<path d="${d}" fill="none" stroke="${k % 2 ? b : a}" stroke-width="${k % 2 ? 2.4 : 1.4}"/>`;
      if (k % 2) q += path;
      else p += path;
    }
    g = `<defs>${half}</defs><rect class="ink" width="${W}" height="${H}" fill="url(#${id})" opacity=".35"/><g class="ink">${p}</g><g class="ink" ${off}>${q}</g>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${g}</svg>`;
}

/** Printed art inside the card's solid colour spine (darker + lighter inks of the same hue). */
export function spineArt(
  kind: ArtKind,
  a: string,
  b: string,
  seed: number,
  uid: string,
): string {
  const W = 300;
  const H = 40;
  const id = `sa${uid}`;
  const sd = (Math.abs(seed) % 9) + 1;
  const dk = `color-mix(in srgb, ${a} 55%, #000)`;
  const lt = `color-mix(in srgb, ${a} 55%, #fff)`;
  let g = `<defs><pattern id="${id}" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1.1" fill="${dk}"/></pattern>
   <linearGradient id="${id}f" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>
   <mask id="${id}m"><rect width="${W}" height="${H}" fill="url(#${id}f)"/></mask></defs>`;
  g += `<rect width="${W}" height="${H}" fill="url(#${id})" mask="url(#${id}m)" opacity=".75"/>`;
  if (kind === "sunset") {
    for (let i = 0; i < 6; i++)
      g += `<rect x="${W - 120}" y="${6 + i * 5.5}" width="120" height="${2.4 - i * 0.25}" fill="${b}" opacity=".9"/>`;
    g += `<circle cx="${W - 60}" cy="44" r="30" fill="none" stroke="${lt}" stroke-width="1.2" opacity=".7"/>`;
  } else if (kind === "stripes") {
    for (let i = 0; i < 28; i++)
      g += `<rect x="${i * 14}" y="-10" width="5" height="60" fill="${i % 3 ? dk : b}" opacity="${i % 3 ? 0.45 : 0.8}" transform="skewX(-30)"/>`;
  } else if (kind === "wave") {
    for (let k = 0; k < 4; k++) {
      let d = `M0 ${8 + k * 8}`;
      for (let x = 0; x <= W; x += 6)
        d += ` L${x} ${(8 + k * 8 + Math.sin((x + k * 25 + sd * 30) / 18) * 3.5).toFixed(1)}`;
      g += `<path d="${d}" fill="none" stroke="${k % 2 ? b : lt}" stroke-width="1.4" opacity=".75"/>`;
    }
  } else if (kind === "rings") {
    for (let i = 1; i < 9; i++)
      g += `<circle cx="${W - 40}" cy="20" r="${i * 7}" fill="none" stroke="${i % 2 ? b : dk}" stroke-width="2" opacity=".7"/>`;
  } else {
    const rnd = prng(sd * 104729);
    for (let i = 0; i < 7; i++) {
      const x = 90 + rnd(W - 90);
      const y = rnd(H);
      g +=
        i % 2
          ? `<path d="M${x} ${y} q5 -6 10 0 t10 0 t10 0" fill="none" stroke="${b}" stroke-width="2.4" stroke-linecap="round" opacity=".85"/>`
          : `<polygon points="${x},${y} ${x + 11},${y + 3} ${x + 3},${y + 11}" fill="${lt}" opacity=".7"/>`;
    }
  }
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${g}</svg>`;
}

/** Barcode bar widths (1–3px) for the card footer, stable per card. */
export function barcode(seed: number, count = 18): number[] {
  const s = (Math.abs(seed) % 7) + 2;
  return Array.from({ length: count }, (_, i) => ((s * (i + 3) * 7) % 3) + 1);
}

/** Oscilloscope header art: two hairline waves + ticks (1400×110 viewBox). */
export function headerWaveform(): string {
  let d1 = "M0 55";
  let d2 = "M0 55";
  for (let x = 0; x <= 1400; x += 4) {
    const env = Math.sin((x / 1400) * Math.PI) ** 1.4;
    d1 += ` L${x} ${(55 + Math.sin(x / 9) * Math.sin(x / 61) * 30 * env).toFixed(1)}`;
    d2 += ` L${x} ${(55 + Math.sin(x / 13 + 1) * Math.sin(x / 83) * 22 * env).toFixed(1)}`;
  }
  let ticks = "";
  for (let x = 0; x <= 1400; x += 28)
    ticks += `<line x1="${x}" x2="${x}" y1="104" y2="${x % 140 ? 108 : 100}" stroke="#e8e4d6" opacity=".18"/>`;
  return `<svg viewBox="0 0 1400 110" preserveAspectRatio="xMaxYMid slice" aria-hidden="true"><defs>
    <linearGradient id="mt-hw-fd" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".3" stop-color="#fff"/></linearGradient>
    <mask id="mt-hw-mk"><rect width="1400" height="110" fill="url(#mt-hw-fd)"/></mask></defs>
    <g mask="url(#mt-hw-mk)"><path d="${d1}" fill="none" stroke="#2ab7e0" stroke-width="1.1" opacity=".5"/><path d="${d2}" fill="none" stroke="#ff4fa3" stroke-width="1.1" opacity=".42"/>
    <line x1="0" x2="1400" y1="55" y2="55" stroke="#e8e4d6" stroke-width=".5" opacity=".12" stroke-dasharray="2 4"/>${ticks}</g></svg>`;
}

export interface FlowDay {
  done: number;
  review: number;
  doing: number;
  todo: number;
}

/** Stacked 14-day flow waveform (done / review / doing / to do), today marked red. */
export function flowWave(days: FlowDay[], w = 520, h = 38): string {
  if (days.length < 2)
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"></svg>`;
  const max = Math.max(
    1,
    ...days.map((d) => d.done + d.review + d.doing + d.todo),
  );
  const x = (i: number) => (i / (days.length - 1)) * w;
  const y = (v: number) => h - (v / max) * (h - 2);
  const layers: [keyof FlowDay, string][] = [
    ["done", "#9aa67e"],
    ["review", "#ff6fd8"],
    ["doing", "#ffb000"],
    ["todo", "#6f7466"],
  ];
  const acc = days.map(() => 0);
  let out = "";
  layers.forEach(([key, c], li) => {
    const lo = acc.slice();
    days.forEach((d, i) => {
      acc[i] += d[key];
    });
    const top = acc
      .map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)
      .join(" L");
    const bot = lo
      .map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)
      .reverse()
      .join(" L");
    out += `<path d="M${top} L${bot} Z" fill="${c}" fill-opacity="${li === 3 ? 0.35 : 0.55}"/><path d="M${top}" fill="none" stroke="${c}" stroke-width="1.2" style="filter:drop-shadow(0 0 3px ${c})"/>`;
  });
  for (let i = 1; i < days.length; i++)
    out += `<line x1="${x(i)}" x2="${x(i)}" y1="0" y2="${h}" stroke="rgba(154,166,126,.07)"/>`;
  out += `<line x1="${w - 1}" x2="${w - 1}" y1="0" y2="${h}" stroke="#ff5a4d" stroke-width="1.5" style="filter:drop-shadow(0 0 4px #ff5a4d)"/>`;
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${out}</svg>`;
}

/** Mini tape window for the deck readout: reels sized by remaining vs done. */
export function miniReels(doneFrac: number, accent: string): string {
  const left = 4.5 + 6 * Math.sqrt(Math.max(0, 1 - doneFrac));
  const right = 4.5 + 6 * Math.sqrt(Math.max(0, doneFrac));
  return `<svg viewBox="0 0 58 26" aria-hidden="true"><rect width="58" height="26" rx="13" fill="#060806"/>
    <circle cx="14" cy="13" r="${left.toFixed(1)}" fill="#2e1f14" stroke="#4b3220" stroke-width=".6"/>
    <circle cx="44" cy="13" r="${right.toFixed(1)}" fill="#2e1f14" stroke="${accent}" stroke-opacity=".55" stroke-width=".6"/>
    <circle cx="14" cy="13" r="4.2" fill="#e9e2cc"/><circle cx="14" cy="13" r="2" fill="#0a0b09"/>
    <circle cx="44" cy="13" r="4.2" fill="#e9e2cc"/><circle cx="44" cy="13" r="2" fill="#0a0b09"/></svg>`;
}

/** Striped rack rail strip (9px wide) in the channel colour with pink accents. */
export function railArt(color: string): string {
  let s = "";
  for (let k = 0; k < 40; k++)
    s += `<rect y="${k * 15}" width="9" height="7" fill="${k % 3 ? color : "#ff4fa3"}" opacity="${k % 2 ? 0.9 : 0.5}"/>`;
  return `<svg viewBox="0 0 9 600" preserveAspectRatio="none" aria-hidden="true">${s}</svg>`;
}

/** Faint liner art printed in the empty space of a rack. */
export const LINER_ART: [ArtKind, string, string][] = [
  ["memphis", "#8a8f80", "#7a5cff"],
  ["sunset", "#ffa400", "#ff4fa3"],
  ["rings", "#ff4fa3", "#ffa400"],
  ["wave", "#9aa67e", "#2ab7e0"],
];
