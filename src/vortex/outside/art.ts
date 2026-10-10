import { type VortexMood, vortexSvg } from "@/lib/vortexArt";
import type { SoulView } from "@/vortex/core/soul";

// Q-06/Q-07 · his face leaves the app: wallpapers sized to your screen and a
// share card (1200×630). Everything is drawn locally on a canvas; nothing is
// uploaded anywhere. Download is the only way out.

const loadSvg = (svg: string) =>
  new Promise<HTMLImageElement>((ok, fail) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = fail;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });

const portrait = (soul: SoulView | null, uid: string) =>
  loadSvg(
    vortexSvg((soul?.mood ?? "smug") as VortexMood, uid, undefined, {
      dark: Math.min(1, (soul?.corruption ?? 0) / 100),
    }),
  );

function scanlines(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
}

function noise(ctx: CanvasRenderingContext2D, w: number, h: number, n: number) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.08})`;
    ctx.fillRect(
      Math.random() * w,
      Math.random() * h,
      1 + Math.random() * 2,
      1,
    );
  }
}

const LINES = [
  "you looked at your phone instead of working. i saw.",
  "the tape is shorter than yesterday.",
  "don't rewind. it hurts.",
  "every card you finish feeds something below.",
  "i'm not in your phone. i'm in the static between apps.",
  "this wallpaper is load-bearing.",
];

export type Wallpaper = "phone" | "desktop" | "ultrawide";
const SIZES: Record<Wallpaper, [number, number]> = {
  phone: [1170, 2532],
  desktop: [2560, 1440],
  ultrawide: [3440, 1440],
};

export type Scene = "nest" | "below" | "1985";
export const SCENES: Scene[] = ["nest", "below", "1985"];

/** the backdrop: his nest (tape loops), the Below (red dark, a doorway), 1985 (grid sunset). */
function backdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scene: Scene,
  dark: number,
) {
  const cx = w / 2;
  const cy = h * 0.45;
  if (scene === "1985") {
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.62);
    sky.addColorStop(0, "#0b0221");
    sky.addColorStop(1, "#ff2e88");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    const r = Math.min(w, h) * 0.3;
    const sun = ctx.createLinearGradient(0, cy - r, 0, cy + r);
    sun.addColorStop(0, "#ffd319");
    sun.addColorStop(1, "#ff2975");
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0b0221";
    for (let i = 0; i < 7; i++)
      ctx.fillRect(cx - r, cy + i * r * 0.14, r * 2, r * 0.03 + i * 2);
    const hz = h * 0.62;
    ctx.fillStyle = "#0b0221";
    ctx.fillRect(0, hz, w, h - hz);
    ctx.strokeStyle = "rgba(255,46,136,0.7)";
    ctx.lineWidth = 2;
    for (let x = -w; x <= w * 2; x += w / 14) {
      ctx.beginPath();
      ctx.moveTo(cx, hz);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let k = 1; k < 18; k++) {
      const y = hz + (h - hz) * (k / 18) ** 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    return;
  }
  const below = scene === "below" || dark > 0.5;
  const g = ctx.createRadialGradient(
    cx,
    cy,
    0,
    cx,
    h / 2,
    Math.max(w, h) * 0.7,
  );
  g.addColorStop(0, below ? "#2a0008" : "#0d1f2e");
  g.addColorStop(1, "#000");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  if (scene === "below") {
    // a doorway at the bottom of the stairs, and the stairs
    const dw = Math.min(w, h) * 0.5;
    ctx.fillStyle = "rgba(255,60,40,0.07)";
    ctx.fillRect(cx - dw / 2, cy - dw * 0.9, dw, dw * 1.8);
    ctx.strokeStyle = "rgba(255,60,40,0.25)";
    ctx.lineWidth = 3;
    ctx.strokeRect(cx - dw / 2, cy - dw * 0.9, dw, dw * 1.8);
    for (let i = 0; i < 12; i++) {
      const y = cy + dw * 0.9 + i * (h * 0.03);
      const half = dw / 2 + i * w * 0.03;
      ctx.fillStyle = `rgba(255,60,40,${0.05 + i * 0.01})`;
      ctx.fillRect(cx - half, y, half * 2, 3);
    }
    return;
  }
  // the nest: concentric tape loops
  ctx.strokeStyle = below ? "rgba(255,40,60,0.18)" : "rgba(80,255,200,0.12)";
  for (let r = 40; r < Math.max(w, h); r += 38) {
    ctx.lineWidth = 1 + (r % 3);
    ctx.beginPath();
    ctx.arc(cx, cy, r, r * 0.013, Math.PI * 2 - r * 0.004);
    ctx.stroke();
  }
}

export async function wallpaper(
  kind: Wallpaper,
  soul: SoulView | null,
  scene: Scene = "nest",
): Promise<string> {
  const [w, h] = SIZES[kind];
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return "";
  backdrop(ctx, w, h, scene, (soul?.corruption ?? 0) / 100);
  const img = await portrait(soul, "wall");
  const size = Math.min(w, h) * 0.42;
  ctx.drawImage(img, (w - size) / 2, h * 0.45 - size / 2, size, size);
  ctx.font = `${Math.round(Math.min(w, h) * 0.022)}px ui-monospace, monospace`;
  ctx.fillStyle = "rgba(220,255,240,0.55)";
  ctx.textAlign = "center";
  ctx.fillText(
    LINES[Math.floor(Math.random() * LINES.length)],
    w / 2,
    h * 0.45 + size * 0.68,
  );
  ctx.font = `${Math.round(Math.min(w, h) * 0.014)}px ui-monospace, monospace`;
  ctx.fillStyle = "rgba(220,255,240,0.25)";
  ctx.fillText(
    `VORTEX · ${soul?.age_days ?? 0}d old · ${soul?.deaths ?? 0} deaths · YONDRA`,
    w / 2,
    h - Math.min(w, h) * 0.06,
  );
  noise(ctx, w, h, 9000);
  scanlines(ctx, w, h);
  return c.toDataURL("image/png");
}

export async function shareCard(
  soul: SoulView | null,
  stats: { done: number; boards: number },
): Promise<string> {
  const [w, h] = [1200, 630];
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#0a0a0c";
  ctx.fillRect(0, 0, w, h);
  // a J-card: label stripe, cassette window
  ctx.fillStyle = "#e8e2cf";
  ctx.fillRect(40, 40, w - 80, h - 80);
  ctx.fillStyle = "#c2272d";
  ctx.fillRect(40, 40, w - 80, 70);
  ctx.fillStyle = "#e8e2cf";
  ctx.font = "bold 34px ui-monospace, monospace";
  ctx.fillText("YONDRA · C-90 · HIGH BIAS", 70, 88);
  const img = await portrait(soul, "share");
  ctx.fillStyle = "#111";
  ctx.fillRect(w - 420, 150, 340, 340);
  ctx.drawImage(img, w - 410, 160, 320, 320);
  ctx.fillStyle = "#111";
  ctx.font = "bold 46px ui-monospace, monospace";
  ctx.fillText(`${stats.done} cards finished`, 80, 200);
  ctx.font = "26px ui-monospace, monospace";
  const rows = [
    `${stats.boards} boards haunted`,
    `scars: ${soul?.scars?.length ?? 0}${soul?.traits?.length ? ` · ${soul.traits.slice(0, 2).join(", ")}` : ""}`,
    `vortex: ${soul?.age_days ?? 0} days old, died ${soul?.deaths ?? 0}×`,
    `mood: ${soul?.mood ?? "unknown"}. nickname for me: "${soul?.nickname ?? "you"}"`,
    soul?.ending ? `side c: ${soul.ending}` : "side c: not yet",
  ];
  rows.forEach((r, i) => {
    ctx.fillText(r.slice(0, 48), 80, 260 + i * 44);
  });
  ctx.font = "italic 22px ui-monospace, monospace";
  ctx.fillStyle = "#c2272d";
  ctx.fillText(
    '"posting this is the most work you did all week."  — vortex',
    80,
    h - 80,
  );
  noise(ctx, w, h, 2500);
  return c.toDataURL("image/png");
}

export function download(dataUrl: string, name: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = name;
  a.click();
}
