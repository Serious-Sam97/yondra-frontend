// Vortex MK-IV progress, kept on this device only: daily done-streak,
// achievements, the compliment jar, unlocked costumes, the riddle of the day,
// the escape room, an optional birthday and a little session diary. Never sent
// anywhere. Every read/write tolerates blocked storage.

import { useSyncExternalStore } from "react";

const KEY = "yd:vortex.progress";
const DAY = 86_400_000;

export type Costume =
  | "none"
  | "witch"
  | "scarf"
  | "party"
  | "monocle"
  | "crown"
  | "sunglasses";

export const ACHIEVEMENTS: Record<string, { label: string; hint: string }> = {
  "night-owl": {
    label: "Night Owl",
    hint: "three nights in a row past midnight",
  },
  archivist: { label: "Archivist", hint: "visited the basement" },
  "jam-breaker": { label: "Jam Breaker", hint: "cleared three jams" },
  exorcist: { label: "Exorcist", hint: "exorcised a restless card" },
  escapee: { label: "Escapee", hint: "escaped the tape machine" },
  "ghost-buster": {
    label: "Ghost Buster",
    hint: "whacked 10 ghosts in one round",
  },
  streak7: { label: "Week on Tape", hint: "a 7-day done streak" },
  "riddle-master": {
    label: "Riddle Master",
    hint: "solved the riddle of the day",
  },
  sweet: { label: "Sweet Talker", hint: "filled the compliment jar" },
  seeker: { label: "Seeker", hint: "found him hiding" },
};

export interface Progress {
  streak: { count: number; last: string | null }; // last = toDateString()
  achievements: Record<string, number>; // id → unlocked at
  compliments: number;
  costumes: Costume[]; // unlocked by play
  costume: Costume | "auto"; // chosen
  riddle: { day: string | null; solved: boolean; asked: boolean };
  escape: number; // escape-room step (0 = not started, 4 = escaped)
  birthday: string | null; // "MM-DD"
  sessions: number[]; // session start times (last 12)
  lateNights: string[]; // dates with activity between 00:00 and 05:00
  jamsCleared: number;
}

const EMPTY: Progress = {
  streak: { count: 0, last: null },
  achievements: {},
  compliments: 0,
  costumes: [],
  costume: "auto",
  riddle: { day: null, solved: false, asked: false },
  escape: 0,
  birthday: null,
  sessions: [],
  lateNights: [],
  jamsCleared: 0,
};

let cache: Progress | null = null;
const listeners = new Set<() => void>();

export function getProgress(): Progress {
  if (cache) return cache;
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    cache = raw ? { ...EMPTY, ...raw } : { ...EMPTY };
  } catch {
    cache = { ...EMPTY };
  }
  return cache as Progress;
}

export function updateProgress(fn: (p: Progress) => Progress): Progress {
  const next = fn(structuredClone(getProgress()));
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // blocked storage: progress lives for this tab only
  }
  for (const l of listeners) l();
  return next;
}

export function useProgress(): Progress {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getProgress,
    () => EMPTY,
  );
}

/** Unlock an achievement; returns its label the first time, null after. */
export function unlock(id: string): string | null {
  if (!ACHIEVEMENTS[id] || getProgress().achievements[id]) return null;
  updateProgress((p) => ({
    ...p,
    achievements: { ...p.achievements, [id]: Date.now() },
  }));
  return ACHIEVEMENTS[id].label;
}

export function unlockCostume(c: Costume): boolean {
  if (getProgress().costumes.includes(c)) return false;
  updateProgress((p) => ({ ...p, costumes: [...p.costumes, c] }));
  return true;
}

/** A card was finished today: extend (or restart) the daily streak. */
export function bumpStreak(): number {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - DAY).toDateString();
  const p = updateProgress((p) => {
    if (p.streak.last === today) return p;
    const count = p.streak.last === yesterday ? p.streak.count + 1 : 1;
    return { ...p, streak: { count, last: today } };
  });
  return p.streak.count;
}

/** The streak as it stands (0 if the chain broke before yesterday). */
export function liveStreak(p = getProgress()): number {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - DAY).toDateString();
  return p.streak.last === today || p.streak.last === yesterday
    ? p.streak.count
    : 0;
}

export function recordSession(): { minutesSinceLast: number | null } {
  const now = Date.now();
  const before = getProgress().sessions;
  const last = before.length ? before[before.length - 1] : null;
  const hour = new Date().getHours();
  updateProgress((p) => ({
    ...p,
    sessions: [...p.sessions, now].slice(-12),
    lateNights:
      hour < 5 && !p.lateNights.includes(new Date().toDateString())
        ? [...p.lateNights, new Date().toDateString()].slice(-10)
        : p.lateNights,
  }));
  return { minutesSinceLast: last ? Math.round((now - last) / 60_000) : null };
}

/** Consecutive nights (ending today) with a session between 00:00 and 05:00. */
export function lateNightRun(p = getProgress()): number {
  let n = 0;
  for (let d = 0; d < 10; d++) {
    const day = new Date(Date.now() - d * DAY).toDateString();
    if (p.lateNights.includes(day)) n++;
    else break;
  }
  return n;
}

export function setBirthday(mmdd: string | null) {
  updateProgress((p) => ({ ...p, birthday: mmdd }));
}
export function isBirthday(p = getProgress()): boolean {
  if (!p.birthday) return false;
  const d = new Date();
  const mmdd = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return p.birthday === mmdd;
}

/** Seasonal / earned costume to wear right now. */
export function currentCostume(accountCreatedAt?: string | null): Costume {
  const p = getProgress();
  if (p.costume !== "auto") {
    return p.costume === "none" || p.costumes.includes(p.costume)
      ? p.costume
      : "none";
  }
  const d = new Date();
  const m = d.getMonth();
  if (isBirthday(p)) return "party";
  if (accountCreatedAt) {
    const c = new Date(accountCreatedAt);
    if (
      c.getMonth() === m &&
      c.getDate() === d.getDate() &&
      c.getFullYear() < d.getFullYear()
    )
      return "party";
  }
  if (m === 9 && d.getDate() >= 24) return "witch"; // late October
  if (m === 11) return "scarf";
  if (d.getDay() === 0 || d.getDay() === 6) return "sunglasses";
  return p.costumes.includes("crown") ? "crown" : "none";
}
