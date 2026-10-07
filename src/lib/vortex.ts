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

/* -------------------------------------------------- intensity & head games */
// How much chaos he's allowed: polite = reactions + tips only, mischief = the
// occasional head game and rituals (default), unhinged = all of it, often.
// "Head games" is a separate kill switch for the pranks that mess with the page.
export type VortexIntensity = "polite" | "mischief" | "unhinged";
const INTENSITY_KEY = "yd:vortex.intensity";
const HEADGAMES_KEY = "yd:vortex.headgames";
const prefListeners = new Set<() => void>();
const notifyPrefs = () => {
  for (const l of prefListeners) l();
};
const subscribePrefs = (cb: () => void) => {
  prefListeners.add(cb);
  return () => prefListeners.delete(cb);
};

export function getVortexIntensity(): VortexIntensity {
  if (typeof window === "undefined") return "mischief";
  const v = localStorage.getItem(INTENSITY_KEY);
  return v === "polite" || v === "unhinged" ? v : "mischief";
}
export function setVortexIntensity(v: VortexIntensity): void {
  localStorage.setItem(INTENSITY_KEY, v);
  notifyPrefs();
}
export function useVortexIntensity(): VortexIntensity {
  return useSyncExternalStore(
    subscribePrefs,
    getVortexIntensity,
    () => "mischief",
  );
}
export function getVortexHeadGames(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(HEADGAMES_KEY) !== "0";
}
export function setVortexHeadGames(on: boolean): void {
  localStorage.setItem(HEADGAMES_KEY, on ? "1" : "0");
  notifyPrefs();
}
export function useVortexHeadGames(): boolean {
  return useSyncExternalStore(subscribePrefs, getVortexHeadGames, () => true);
}

const SOUND_KEY = "yd:vortex.sound";
export function getVortexSound(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SOUND_KEY) === "1"; // opt-in
}
export function setVortexSound(on: boolean): void {
  localStorage.setItem(SOUND_KEY, on ? "1" : "0");
  notifyPrefs();
}
export function useVortexSound(): boolean {
  return useSyncExternalStore(subscribePrefs, getVortexSound, () => false);
}

/* ------------------------------------------------------------------ mounts */
// Contexts the user "mounted" into Vortex's chat — a board (deep) or a project
// (all its boards). Persisted per device, like the enabled flag. The cap
// mirrors the backend's mounts validation.
export type VortexMountType = "project" | "board";
export interface VortexMount {
  type: VortexMountType;
  id: number;
  name: string;
}
export const VORTEX_MAX_MOUNTS = 6;

const MOUNTS_KEY = "yd:vortex.mounts";
const NO_MOUNTS: VortexMount[] = [];
let mountsCache: VortexMount[] | null = null;
const mountsListeners = new Set<() => void>();
const notifyMounts = () => {
  for (const l of mountsListeners) l();
};

function readMounts(): VortexMount[] {
  if (typeof window === "undefined") return NO_MOUNTS;
  if (mountsCache) return mountsCache;
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(MOUNTS_KEY) ?? "[]");
    mountsCache = Array.isArray(raw)
      ? (raw as VortexMount[]).filter(
          (m) =>
            (m?.type === "project" || m?.type === "board") &&
            typeof m.id === "number" &&
            typeof m.name === "string",
        )
      : [];
  } catch {
    mountsCache = [];
  }
  return mountsCache;
}
function writeMounts(next: VortexMount[]): void {
  mountsCache = next;
  localStorage.setItem(MOUNTS_KEY, JSON.stringify(next));
  notifyMounts();
}

export function useVortexMounts(): VortexMount[] {
  return useSyncExternalStore(
    (cb) => {
      mountsListeners.add(cb);
      return () => mountsListeners.delete(cb);
    },
    readMounts,
    () => NO_MOUNTS,
  );
}
export function isVortexMounted(type: VortexMountType, id: number): boolean {
  return readMounts().some((m) => m.type === type && m.id === id);
}
/** Add a mount (no-op if already mounted or at the cap). */
export function mountVortexContext(m: VortexMount): void {
  const cur = readMounts();
  if (cur.some((x) => x.type === m.type && x.id === m.id)) return;
  if (cur.length >= VORTEX_MAX_MOUNTS) return;
  writeMounts([...cur, m]);
}
export function unmountVortexContext(type: VortexMountType, id: number): void {
  writeMounts(readMounts().filter((m) => !(m.type === type && m.id === id)));
}
export function clearVortexMounts(): void {
  writeMounts([]);
}

/* ----------------------------------------------------------- the say() channel */
export interface VortexSpeech {
  text: string;
  action?: { label: string; run: () => void };
  // a second choice (e.g. "Archive it" / "Backlog it")
  action2?: { label: string; run: () => void };
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
  "oh. you're back. I've been watching the cards for you. click me for a tip.",
  "hi! I'm Vortex. I live in the tape machine now. click me, drag me, ask me things.",
  "welcome back. nothing exploded while you were gone. probably.",
  "it's me, the ghost in your tape deck. ask me about your boards — I read everything.",
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

/* ----------------------------------------------------- MK-II reaction lines */
// Dark, dry one-liners for his board reactions. {key} = ticket key, {n} = a
// number (days late, moves, cards…), {m} = a second number (WIP limit).
export const LINES = {
  eat: [
    "*crunch* {key} was {n} day{s} late. tasted like regret.",
    "{key} was {n} day{s} overdue, so I ate it. you're welcome.",
    "mmm. {key}. aged {n} day{s} past its date. a fine vintage.",
    "nobody was coming for {key}. now it's inside me. {n} day{s} late.",
  ],
  spit: [
    "fine. *ptoo* — {key} is back. still late, though.",
    "ugh, take it. {key} tasted like a missed deadline anyway.",
  ],
  poke: [
    "it's not dead. it's just waiting on {reason}. like all of us.",
    "*poke* *poke* — {key} is jammed: {reason}. I'll keep poking.",
    "taped it off. nobody touch {key} until {reason} shows up.",
  ],
  stomp: [
    "{n} playing on a {m}-slot channel. bold.",
    "WIP limit is {m}. you have {n}. I'm stomping on the meter until you stop.",
    "{n}/{m}. the needle is in the red and so is my patience.",
  ],
  done: [
    "{key}: done. I'm rewinding the tape in its honor.",
    "{key} shipped. one less ghost in the machine.",
    "look at you, finishing {key}. I almost feel something.",
  ],
  judge: [
    "you moved {key} {n} times today. commitment issues?",
    "{key}, moved {n} times. pick a column, any column.",
    "{n} moves for {key}. it's getting dizzy. so am I.",
  ],
  dizzy: [
    "WHY WOULD YOU THROW ME",
    "the room is spinning. is the room supposed to spin?",
    "ok. new home. I didn't like the old one anyway.",
  ],
  seance: [
    "the spirits of {n} overdue card{s} are restless tonight. exorcise one?",
    "I hear whispers from {n} late card{s}. {key} is the loudest.",
    "{n} restless ghost{s} on this board. {key} keeps knocking.",
  ],
  calm: [
    "no restless spirits today. suspicious.",
    "nothing overdue. the tape is quiet. too quiet.",
  ],
  fed: [
    "you fed me {key}. delicious. what now — archive it forever, or banish it to the backlog?",
    "*gulp* {key}. I can keep it down (archive) or spit it into the backlog.",
  ],
  night: [
    "it's {time}. go to bed. the board will still be here. so will I.",
    "{time}. even the ghosts are asleep. why aren't you?",
    "night shift again? fine. I'll keep the tape warm.",
  ],
  witching: [
    "it's the witching hour. don't move any cards. they move back.",
    "3am. this is when the deadlines come out to play.",
  ],
  cursed: [
    "{key} has been idle for {n} days. it's cursed now. don't touch it.",
    "cobwebs on {key}. {n} days without a visitor. even I'm scared of it.",
  ],
  gravity: [
    "did the floor just move? weird. not me.",
    "huh. something tilted. must be the tape heads.",
  ],
  clock: [
    "13:61 is a real time if you believe hard enough.",
    "your clock had a little episode. it's fine now. I think.",
  ],
  screw: [
    "oops. a screw fell out. you should put that back before the panel notices.",
    "something just went *tink*. I didn't touch anything.",
  ],
  screwBack: ["thanks. the panel was getting anxious.", "good as new. ish."],
  flee: [
    "sorry. reflex. the Archive button gets nervous when you hover.",
    "the button ran. buttons do that around me.",
  ],
  tabBack: [
    "oh, you're back. I thought you died.",
    "welcome back. I licked the cards while you were gone. just a little.",
    "you left. I counted the seconds. all of them.",
  ],
  possessed: [
    "IT'S MINE NOW.",
    "THE TAPE BELONGS TO ME.",
    "rewind. rewind. REWIND.",
  ],
  unpossessed: [
    "…what happened? why is everything red. was that me?",
    "I blacked out. did I eat anyone important?",
  ],
  poked: [
    "stop poking me.",
    "one more click and I bite.",
    "I have feelings. mostly hunger.",
  ],
  summoned: [
    "you called?",
    "you typed my name. bold.",
    "vortex. that's me. hi.",
  ],
  friday: ["it's friday. the cards will wait. they always do."],
  horoscope: [
    "today the stars say: {n} card{s} will look at you funny. don't blink.",
    "your tape horoscope: mercury is in review. so is everything else.",
    "omens are good. omens are always good right before they aren't.",
    "the cards whisper your name. mostly the overdue ones.",
  ],
  wander: [
    "just stretching. don't mind me.",
    "patrolling the tape deck.",
    "I live here now.",
  ],
};

/** Fill a LINES template: {key} {n} {m} {s} (plural s) {reason} {time}. */
export function line(
  pool: string[],
  vars: {
    key?: string;
    n?: number;
    m?: number;
    reason?: string;
    time?: string;
  } = {},
): string {
  return pick(pool)
    .replaceAll("{time}", vars.time ?? "late")
    .replaceAll("{key}", vars.key ?? "this card")
    .replaceAll("{n}", String(vars.n ?? ""))
    .replaceAll("{m}", String(vars.m ?? ""))
    .replaceAll("{s}", vars.n === 1 ? "" : "s")
    .replaceAll("{reason}", vars.reason?.trim() || "something");
}

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
