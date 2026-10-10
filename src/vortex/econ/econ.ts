"use client";

import { useSyncExternalStore } from "react";
import { apiFetch } from "@/lib/api";

// LADO N · the client side of the economy. The server owns every number
// (ledger, caps, stock, recipes); this caches the case so the sprite can wear
// what's equipped and the cursed things can misbehave, and pings one minute
// of real, active use at a time.

export type Currency = "tokens" | "minutes" | "echoes";
export type Slot = "costume" | "eye" | "border" | "voice" | "trail";

export interface Item {
  id: string;
  n?: number;
  name: string;
  cat: string;
  rarity: "common" | "uncommon" | "rare" | "cursed" | "unique";
  desc: string;
  vx: string | null;
  price: [Currency, number] | null;
  slot?: Slot;
  color?: string;
  effect?: string;
  corruption?: number;
}

export interface Case {
  balance: Record<Currency, number>;
  inventory: Item[];
  equip: Partial<Record<Slot, string | null>>;
  level: {
    level: number;
    xp: number;
    next: number;
    points: number;
    skills: string[];
  };
  collections: {
    id: string;
    name: string;
    have: number;
    size: number;
    complete: boolean;
  }[];
  recipes: {
    id: string;
    in: string[];
    echoes: number;
    out: string;
    out_name: string;
  }[];
  skills_tree: Record<"genius" | "chaos" | "soul", string[]>;
  offered_today: boolean;
}

let cache: Case | null = null;
const subs = new Set<() => void>();
const emit = () => {
  for (const f of subs) f();
};

export async function loadCase(): Promise<Case | null> {
  try {
    cache = await apiFetch<Case>("/api/mascot/econ");
    emit();
    return cache;
  } catch {
    return null;
  }
}

export function useCase(): Case | null {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => cache,
    () => null,
  );
}
export const getCase = () => cache;

async function post<T>(
  url: string,
  body: unknown,
): Promise<T & { ok?: boolean; reason?: string }> {
  try {
    const r = await apiFetch<T>(url, {
      method: "POST",
      body: JSON.stringify(body),
    });
    void loadCase();
    return r as T & { ok?: boolean };
  } catch (e) {
    try {
      return { ok: false, ...JSON.parse((e as { body: string }).body) };
    } catch {
      return { ok: false, reason: "the tape jammed." } as T & {
        ok: boolean;
        reason: string;
      };
    }
  }
}

export const buy = (shop: string, id: string) =>
  post("/api/mascot/shop/buy", { shop, id });
export const equip = (slot: Slot, id: string | null) =>
  post("/api/mascot/econ/equip", { slot, id });
export const craft = (recipe: string) =>
  post<{ made?: string }>("/api/mascot/econ/craft", { recipe });
export const offer = (id: string) =>
  post<{ back?: string | null }>("/api/mascot/econ/offer", { id });
export const learn = (branch: string) =>
  post<{ skill?: string }>("/api/mascot/econ/learn", { branch });

export async function stock(
  shop: "counter" | "splicer" | "archivist" | "black",
) {
  return apiFetch<{ stock: Item[]; balance: Record<Currency, number> }>(
    `/api/mascot/shop?shop=${shop}`,
  );
}

/** The thing he's wearing in a slot, with its catalogue row. */
export function equipped(slot: Slot): Item | null {
  const id = cache?.equip[slot];
  return id ? (cache?.inventory.find((i) => i.id === id) ?? null) : null;
}

/** N-13 · cursed things in the case misbehave while you keep them. */
export function curses(): string[] {
  return (cache?.inventory ?? [])
    .filter((i) => i.cat === "cursed" && i.effect)
    .map((i) => i.effect as string);
}

/** One minute of active use: only when the tab is visible and you did something this minute. */
export function startActiveClock(): () => void {
  let lastInput = Date.now();
  const mark = () => {
    lastInput = Date.now();
  };
  const evs = ["pointerdown", "keydown", "wheel"] as const;
  for (const e of evs) window.addEventListener(e, mark, { passive: true });
  const iv = setInterval(() => {
    if (document.hidden || Date.now() - lastInput > 60_000) return;
    void apiFetch("/api/mascot/econ/tick", { method: "POST" }).catch(() => {});
  }, 60_000);
  return () => {
    clearInterval(iv);
    for (const e of evs) window.removeEventListener(e, mark);
  };
}

export const CURRENCY_LABEL: Record<Currency, string> = {
  tokens: "tokens",
  minutes: "tape minutes",
  echoes: "echoes",
};
export const CURRENCY_ICON: Record<Currency, string> = {
  tokens: "◉",
  minutes: "◎",
  echoes: "✶",
};
