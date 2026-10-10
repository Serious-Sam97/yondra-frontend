"use client";

import { useSyncExternalStore } from "react";

// F-05 dares, F-06 bets, F-20 promises — deals you make with him, kept on this
// device. He keeps score forever (the soul gets the outcome events).

export interface Dare {
  id: string;
  text: string;
  /** what counts: cards moved / cards done */
  goal: { kind: "moved" | "done"; n: number };
  progress: number;
  until: number;
}
export interface Bet {
  id: string;
  cardKey: string;
  stake: string;
  /** end of the local day */
  until: number;
  status: "open" | "won" | "lost";
}
export interface Promise_ {
  id: string;
  text: string;
  until: number;
  status: "open" | "kept" | "broken";
}

interface Pacts {
  dare: Dare | null;
  bets: Bet[];
  promises: Promise_[];
}

const KEY = "yd:vortex.pacts";
const listeners = new Set<() => void>();
let cache: Pacts | null = null;

function read(): Pacts {
  if (cache) return cache;
  try {
    cache = {
      dare: null,
      bets: [],
      promises: [],
      ...(JSON.parse(localStorage.getItem(KEY) ?? "null") ?? {}),
    };
  } catch {
    cache = { dare: null, bets: [], promises: [] };
  }
  return cache as Pacts;
}
function write(p: Pacts) {
  cache = p;
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        ...p,
        bets: p.bets.slice(-20),
        promises: p.promises.slice(-20),
      }),
    );
  } catch {}
  for (const l of listeners) l();
}
const endOfDay = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 0);
  return d.getTime();
};
const uid = () => Math.random().toString(36).slice(2, 9);

export const pacts = {
  get: read,
  startDare(text: string, goal: Dare["goal"], minutes: number): Dare {
    const d: Dare = {
      id: uid(),
      text,
      goal,
      progress: 0,
      until: Date.now() + minutes * 60_000,
    };
    write({ ...read(), dare: d });
    return d;
  },
  /** count progress; resolves "won" when the goal is reached */
  bump(kind: "moved" | "done"): "won" | null {
    const p = read();
    const d = p.dare;
    if (!d || Date.now() > d.until) return null;
    if (d.goal.kind !== kind && !(d.goal.kind === "moved" && kind === "done"))
      return null;
    const progress = d.progress + 1;
    if (progress >= d.goal.n) {
      write({ ...p, dare: null });
      return "won";
    }
    write({ ...p, dare: { ...d, progress } });
    return null;
  },
  /** a dare whose time ran out (once) */
  expired(): Dare | null {
    const p = read();
    if (p.dare && Date.now() > p.dare.until) {
      const d = p.dare;
      write({ ...p, dare: null });
      return d;
    }
    return null;
  },
  bet(cardKey: string, stake = "my dignity"): Bet {
    const b: Bet = {
      id: uid(),
      cardKey: cardKey.toUpperCase(),
      stake,
      until: endOfDay(),
      status: "open",
    };
    write({ ...read(), bets: [...read().bets, b] });
    return b;
  },
  /** a card was finished: open bets on it are won */
  cardDone(cardKey: string | undefined): Bet | null {
    if (!cardKey) return null;
    const p = read();
    const b = p.bets.find(
      (x) => x.status === "open" && x.cardKey === cardKey.toUpperCase(),
    );
    if (!b) return null;
    write({
      ...p,
      bets: p.bets.map((x) => (x.id === b.id ? { ...x, status: "won" } : x)),
    });
    return b;
  },
  /** open bets past their day are lost; returns them (once) */
  settleLost(): Bet[] {
    const p = read();
    const lost = p.bets.filter(
      (b) => b.status === "open" && Date.now() > b.until,
    );
    if (lost.length)
      write({
        ...p,
        bets: p.bets.map((b) =>
          lost.includes(b) ? { ...b, status: "lost" } : b,
        ),
      });
    return lost;
  },
  lostBetKeys(): string[] {
    const week = Date.now() - 7 * 86_400_000;
    return read()
      .bets.filter((b) => b.status === "lost" && b.until > week)
      .map((b) => b.cardKey);
  },
  promise(text: string): Promise_ {
    const pr: Promise_ = {
      id: uid(),
      text: text.slice(0, 140),
      until: endOfDay(),
      status: "open",
    };
    write({ ...read(), promises: [...read().promises, pr] });
    return pr;
  },
  /** promises past due that he hasn't asked about yet */
  duePromises(): Promise_[] {
    return read().promises.filter(
      (p) => p.status === "open" && Date.now() > p.until,
    );
  },
  settlePromise(id: string, kept: boolean) {
    const p = read();
    write({
      ...p,
      promises: p.promises.map((x) =>
        x.id === id ? { ...x, status: kept ? "kept" : "broken" } : x,
      ),
    });
  },
  brokenPromise(): Promise_ | null {
    const b = read().promises.filter((p) => p.status === "broken");
    return b[Math.floor(Math.random() * b.length)] ?? null;
  },
};

export function useDare(): Dare | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => read().dare,
    () => null,
  );
}
