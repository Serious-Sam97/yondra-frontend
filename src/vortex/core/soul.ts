"use client";

import { useSyncExternalStore } from "react";
import { apiFetch } from "@/lib/api";

// C · the soul, client side. The server owns his state (needs, mood + cause,
// relation, corruption, agenda, nest…); the client only REPORTS events
// (batched, every couple of seconds) and reads the view back. A `visit` on
// load hands over what he did while you were gone (C-09).

export type SoulEvent =
  | "visit"
  | "chat"
  | "compliment"
  | "fed"
  | "ate"
  | "card_done"
  | "ignored"
  | "woke"
  | "caught_lie"
  | "reopened"
  | "twin"
  | "game"
  | "lore"
  | "night"
  | "care"
  | "apology"
  | "debt_paid"
  | "gift"
  | "rude"
  | "sweet"
  | "scrolled"
  | "dark_seen"
  | "purify"
  | "returned"
  | "bond_seen"
  | "promise_kept"
  | "promise_broken"
  | "bet"
  | "dare"
  | "help"
  | "grabbed"
  | "hid"
  | "die"
  | "invoke_rewinder"
  | "exorcised"
  | "rescue"
  | "halloween"
  | "nightmare_calmed";

export interface AgendaItem {
  id: string;
  title: string;
  col: "backlog" | "todo" | "doing" | "blocked" | "done";
  progress: number;
}
export interface AwayEntry {
  at: string;
  kind: string;
  text: string;
}
export interface SoulView {
  needs: Record<
    "hunger" | "boredom" | "sanity" | "loneliness" | "ego" | "energy",
    number
  >;
  mood: string;
  cause: string;
  relation: number;
  nickname: string;
  corruption: number;
  stage: number;
  proximity: number;
  age_days: number;
  deaths: number;
  scars: string[];
  traits: string[];
  likes: {
    color: string;
    hated_color: string;
    funny_word: string;
    hated_day: number;
    board_type: string;
  };
  agenda: AgendaItem[];
  nest: { id: string; note: string | null; at?: string }[];
  away: AwayEntry[];
  sick: boolean;
  offended: { until: string; reason: string | null } | null;
  debts: unknown[];
  fragments: string[];
  diary_unlocked: boolean;
  dead_until: string | null;
  story: { season: number; episode: number; seen: string[] };
  /** K-28 · what you chose on Side C (free | erase | keep | flip) */
  ending?: "free" | "erase" | "keep" | "flip" | null;
  ngplus?: number;
  jr_born?: string | null;
  /** D-20 · a gadget blew up on him */
  singed?: boolean;
  /** S-01 · tricks you taught him */
  tricks?: { id: string; trigger: string; anim: string; line: string }[];
  /** S-08 · the costume you designed */
  custom_costume?: { hat: string; acc: string; c1: string; c2: string } | null;
  /** M-20 · you're this week's team champion (he wears a crown) */
  champion?: boolean;
  /** M-13 · roulette punishments */
  upside?: boolean;
  strange_theme?: boolean;
  /** erase only: a short-lived token while a "help" frame is due */
  help?: string | null;
  tz: string;
  last_seen: string | null;
  bond_ready?: boolean;
  forgot_you?: boolean;
  unread_letters?: number;
  new_fragments?: string[];
  swapped?: boolean;
  reborn?: boolean;
  tape_left?: number;
}

let soul: SoulView | null = null;
let raw: SoulView | null = null;

/* T-01 · DARK unit: the highest corruption stage you allow him to show (0–5).
   Applied where his soul enters the client, so every dark effect obeys it. */
const STAGE_MAX = [14, 34, 54, 74, 89, 100];
export function darkCap(): number {
  try {
    const n = Number(localStorage.getItem("yd:vortex.darkcap") ?? 5);
    return Number.isFinite(n) ? Math.max(0, Math.min(5, Math.round(n))) : 5;
  } catch {
    return 5;
  }
}
function capView(v: SoulView): SoulView {
  const cap = darkCap();
  return v.stage <= cap
    ? v
    : { ...v, stage: cap, corruption: Math.min(v.corruption, STAGE_MAX[cap]) };
}
export function setDarkCap(n: number) {
  try {
    localStorage.setItem("yd:vortex.darkcap", String(n));
  } catch {}
  if (raw) {
    soul = capView(raw);
    for (const l of listeners) l();
  }
}
let away: AwayEntry[] = [];
const listeners = new Set<() => void>();
const emit = () => {
  for (const l of listeners) l();
};
let queue: { type: SoulEvent; data?: Record<string, unknown> }[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let loading: Promise<SoulView | null> | null = null;

const tz = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
};

async function post(
  events: { type: SoulEvent; data?: Record<string, unknown> }[],
): Promise<SoulView | null> {
  try {
    const v = await apiFetch<SoulView>("/api/mascot/soul/events", {
      method: "POST",
      body: JSON.stringify({ events, tz: tz() }),
    });
    raw = v;
    soul = capView(v);
    if (v.away?.length) away = [...away, ...v.away];
    emit();
    return v;
  } catch {
    return null; // offline / logged out: he keeps his last face
  }
}

/** First contact of the session: a visit (ticks his time, returns the away log). */
export function loadSoul(): Promise<SoulView | null> {
  loading ??= post([{ type: "visit" }]).finally(() => {
    loading = null;
  });
  return loading;
}

/** Re-read without side effects (time passing changes his mood). */
export async function refreshSoul(): Promise<void> {
  try {
    raw = await apiFetch<SoulView>("/api/mascot/soul");
    soul = capView(raw);
    emit();
  } catch {}
}

/** Report something that happened. Batched; never blocks the UI. */
export function report(type: SoulEvent, data?: Record<string, unknown>) {
  queue.push(data ? { type, data } : { type });
  if (queue.length >= 30) return void flush();
  timer ??= setTimeout(flush, 1800);
}

export function flush(): Promise<SoulView | null> | undefined {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (queue.length === 0) return;
  const batch = queue.slice(0, 40);
  queue = queue.slice(40);
  return post(batch);
}

/** Hand over (and clear) what he did while you were away. */
export function takeAway(): AwayEntry[] {
  const out = away;
  away = [];
  return out;
}

export function getSoul(): SoulView | null {
  return soul;
}
export function useSoul(): SoulView | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => soul,
    () => null,
  );
}
/** For tests / the lab. */
export function setSoulForDev(v: SoulView | null) {
  raw = v;
  soul = v && capView(v);
  emit();
}

if (typeof window !== "undefined") {
  // don't lose the last events when the tab closes
  window.addEventListener("pagehide", () => {
    if (queue.length === 0) return;
    const token = localStorage.getItem("token");
    const base = process.env.NEXT_PUBLIC_API ?? "";
    try {
      void fetch(`${base}/api/mascot/soul/events`, {
        method: "POST",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ events: queue.slice(0, 40), tz: tz() }),
      });
    } catch {}
    queue = [];
  });
}
