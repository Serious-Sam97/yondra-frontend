"use client";

import { useSyncExternalStore } from "react";

/**
 * "Vortex" — Yondra's mascot assistant (ported from VortexOS). This module owns his
 * enabled flag (persisted), a `say()` channel so any feature can make him speak, and
 * the catalogues of one-liners: greetings, workspace tips, and route-contextual quips.
 * Original character, no image asset — the sprite is drawn in VortexAssistant.tsx.
 */

const ENABLED_KEY = "yd:vortex.enabled";
const enabledListeners = new Set<() => void>();
const notifyEnabled = () => {
  for (const l of enabledListeners) l();
};

export function isVortexEnabled(): boolean {
  // Default ON — Vortex greets first-timers. Easy to dismiss.
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ENABLED_KEY) !== "0";
}
export function setVortexEnabled(on: boolean): void {
  localStorage.setItem(ENABLED_KEY, on ? "1" : "0");
  notifyEnabled();
}
export function useVortexEnabled(): boolean {
  return useSyncExternalStore(
    (cb) => {
      enabledListeners.add(cb);
      return () => enabledListeners.delete(cb);
    },
    isVortexEnabled,
    () => false, // SSR: hidden until the client knows
  );
}

/* ----------------------------------------------------------- the say() channel */
export interface VortexSpeech {
  text: string;
  action?: { label: string; run: () => void };
}
const sayListeners = new Set<(s: VortexSpeech) => void>();
/** Make Vortex speak (ignored while he's disabled). */
export function vortexSay(s: VortexSpeech): void {
  if (!isVortexEnabled()) return;
  for (const f of sayListeners) f(s);
}
export function subscribeVortexSay(fn: (s: VortexSpeech) => void): () => void {
  sayListeners.add(fn);
  return () => sayListeners.delete(fn);
}

/* --------------------------------------------------------------- catalogues */
export const GREETINGS: string[] = [
  "Hi! I'm Vortex — your guide around here. Click me for a tip anytime.",
  "Hey there! New to Yondra? Click me and I'll show you the ropes.",
  "Welcome back! Click me whenever you want a hand — or ask me about your boards.",
];

/** General workspace tips, shown on click or after a long idle. */
export const TIPS: string[] = [
  "Press ⌘K (or Ctrl+K) anywhere to open the command palette and jump to any board or card.",
  "On a board, press C to add a new card without touching the mouse.",
  "Every board has six views — Board, List, Backlog, Cal, Stats and Map. Try the tabs up top.",
  "Drag a board card onto another project's rail to move the whole board across projects.",
  "Subtasks are real cards — they get their own assignee, due date and column.",
  "The Backlog keeps cards off the board until you're ready to pull them into a column.",
  'Ask me anything about your boards — "what\'s overdue?" is my favourite question.',
  "Cards support checklists, comments with reactions, documents and links — open one and scroll.",
  "CRM boards track deal value and payments; hitting 100% paid can auto-issue the invoice.",
  "You can bulk-create cards by pasting JSON into Import on the board menu.",
  "The dashboard has revenue, conversion and loss reports for your CRM boards.",
  "Planning Poker lives on every card — estimate stories with your whole crew.",
  "Tags come in two flavours: Channel tags (WhatsApp, Email…) and your own Custom tags.",
  "Share a card by copying its link — the board opens with that card popped up.",
];

/** Route-contextual quips — keyed by a pathname prefix, most specific first. */
const ROUTE_QUIPS: Array<[prefix: string, lines: string[]]> = [
  [
    "/dashboard/revenue",
    ["Monthly revenue across your CRM boards — pick a period up top."],
  ],
  [
    "/dashboard/conversion",
    ["Conversion rate = deals won that month over everything in the pipeline."],
  ],
  [
    "/dashboard/loss",
    [
      "Every lost deal lands here with its reason — great for spotting patterns.",
    ],
  ],
  [
    "/dashboard/export",
    ["Export your whole pipeline as CSV or a printable PDF from here."],
  ],
  [
    "/dashboard",
    [
      "Your command center — everything due, assigned and unread in one place.",
      "The reports in the sidebar cover revenue, conversion and lost deals.",
    ],
  ],
  [
    "/projects",
    [
      "Drag boards to reorder them — or drop one on another project to move it.",
      "Each project keeps its own boards, members and import models.",
    ],
  ],
  [
    "/boards",
    [
      "Press C to add a card, or ⌘K to jump anywhere.",
      "Try the Map view for a bird's-eye flowchart of this board.",
      "Drag cards between columns — I'll keep count.",
    ],
  ],
  ["/profile", ["Your operator console — identity, stats and preferences."]],
];

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
export function quipForRoute(pathname: string): string | null {
  const hit = ROUTE_QUIPS.find(([prefix]) => pathname.startsWith(prefix));
  return hit ? pick(hit[1]) : null;
}
export function randomTip(): string {
  return pick(TIPS);
}
export function greeting(): string {
  return pick(GREETINGS);
}
