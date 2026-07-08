// Shared UI helpers used across the projects/dashboard views — extracted so the
// same palettes and formatters aren't re-declared inline in every page.

import type { BoardFlow, ProjectBoard } from "@/interfaces/ProjectInterface";

export const AVATAR_COLORS = [
  "#4CAF50",
  "#FF9800",
  "#1976D2",
  "#F44336",
  "#7B1FA2",
  "#FFC107",
  "#00BCD4",
  "#E91E63",
];
export const PROJECT_COLORS = [
  "#1976D2",
  "#388E3C",
  "#F57C00",
  "#7B1FA2",
  "#C62828",
  "#00838F",
  "#AD1457",
  "#4527A0",
];

// Board accent keys (board.background, from the board settings) → hex.
export const ACCENT_HEX: Record<string, string> = {
  phosphor: "#9aa67e",
  amber: "#ffb000",
  cyan: "#6fe0ff",
  red: "#ff5a4d",
  magenta: "#ff6fd8",
};

// Distinct fallback palette so boards without an explicit accent still read apart
// at a glance (assigned deterministically by board id).
export const BOARD_PALETTE = [
  "#6fe0ff",
  "#ffb000",
  "#ff5a4d",
  "#ff6fd8",
  "#9aa67e",
  "#a78bfa",
  "#22c55e",
  "#f97316",
];

/**
 * A board's display colour: its own accent if set, then any stored colour, then a
 * distinct per-board palette colour, and finally the parent project's colour.
 */
export function boardColor(
  board: { id?: number; background?: string | null; color?: string | null },
  projectColor: string,
): string {
  if (board.background && ACCENT_HEX[board.background])
    return ACCENT_HEX[board.background];
  if (board.color) return board.color;
  if (board.id != null) return BOARD_PALETTE[board.id % BOARD_PALETTE.length];
  return projectColor;
}

export function initials(n: string): string {
  return n
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function avatarColor(id: number): string {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

export function timeAgo(d: string): string {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 120) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 172800) return "yesterday";
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return `${Math.floor(s / 604800)}w ago`;
}

/** Real done/total progress for a board. Falls back to flow when done_count is absent. */
export function boardProgress(
  board: Pick<ProjectBoard, "flow" | "done_count" | "cards_count">,
): { done: number; total: number; pct: number } {
  const flow = board.flow;
  const total =
    board.cards_count ?? (flow ? flow.todo + flow.doing + flow.done : 0);
  const done = board.done_count ?? flow?.done ?? 0;
  return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

export function boardFlow(
  board: Pick<ProjectBoard, "flow" | "cards_count" | "done_count">,
): BoardFlow {
  if (board.flow) return board.flow;
  const total = board.cards_count ?? 0;
  const done = board.done_count ?? 0;
  return { todo: Math.max(0, total - done), doing: 0, done };
}

// --- Colour math for the accent-tinted board cards ---
// Board colours are stored as #rrggbb. tint() lightens toward white (the card
// casing), shade() darkens toward black (ink text / borders on a light casing).

function parseHex(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function tint(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex);
  const f = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}

export function shade(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex);
  const f = (c: number) => Math.round(c * amount);
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}
