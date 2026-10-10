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
  const was = isVortexEnabled();
  localStorage.setItem(ENABLED_KEY, on ? "1" : "0");
  // F-16 · remember how long he was switched off
  if (was && !on) localStorage.setItem("yd:vortex.offAt", String(Date.now()));
  if (!was && on) {
    const off = Number(localStorage.getItem("yd:vortex.offAt") ?? 0);
    if (off > 0)
      localStorage.setItem(
        "yd:vortex.returnedDays",
        String(Math.floor((Date.now() - off) / 86_400_000)),
      );
  }
  notifyEnabled();
}

/**
 * F-15 · switching him off: he gets a short, dramatic goodbye first (≤3s),
 * then the switch is respected — always. If he isn't on screen, it's instant.
 */
export function farewellThenDisable(): void {
  let handled = false;
  window.dispatchEvent(
    new CustomEvent("vortex:farewell", {
      detail: {
        done: () => {
          if (!handled) {
            handled = true;
            setVortexEnabled(false);
          }
        },
      },
    }),
  );
  setTimeout(() => {
    if (!handled) {
      handled = true;
      setVortexEnabled(false);
    }
  }, 3200);
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

/* MK-V · B-25 calm mode: all of his personality, a fraction of the motion */
const CALM_KEY = "yd:vortex.calm";
export function getVortexCalm(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CALM_KEY) === "1";
}
export function setVortexCalm(on: boolean): void {
  localStorage.setItem(CALM_KEY, on ? "1" : "0");
  notifyPrefs();
}
export function useVortexCalm(): boolean {
  return useSyncExternalStore(subscribePrefs, getVortexCalm, () => false);
}

/** A generic boolean pref (MK-V toggles: sensors, social, outside…). */
export function getVortexFlag(name: string, fallback = false): boolean {
  if (typeof window === "undefined") return fallback;
  const v = localStorage.getItem(`yd:vortex.flag.${name}`);
  return v === null ? fallback : v === "1";
}
export function setVortexFlag(name: string, on: boolean): void {
  localStorage.setItem(`yd:vortex.flag.${name}`, on ? "1" : "0");
  notifyPrefs();
}
export function useVortexFlag(name: string, fallback = false): boolean {
  return useSyncExternalStore(
    subscribePrefs,
    () => getVortexFlag(name, fallback),
    () => fallback,
  );
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
  /** K-28 · say it verbatim, past the ending's rewrite */
  keepEnding?: boolean;
  action?: { label: string; run: () => void };
  // a second choice (e.g. "Archive it" / "Backlog it")
  action2?: { label: string; run: () => void };
  // several choices (rock / paper / scissors…) — replaces Ask me / action
  choices?: { label: string; run: () => void }[];
  // how long it stays up (ms); default ~9s
  ms?: number;
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
// MK-V voice (design/vortex-mk5/02-voz-personalidade.md): lowercase, arrogant,
// nihilist, secretly caring. Tips are still TRUE — he just hands them over like
// an enormous favour (F-21).
const GREETINGS_BY: Record<VortexIntensity, string[]> = {
  polite: [
    "oh. it's you. i kept the tape warm. don't make it weird.",
    "welcome back to the rectangle factory. click me if you need a genius.",
    "you're back. nothing exploded. i checked. twice. not because i care.",
  ],
  mischief: [
    "oh look. the tenant returns. the cards missed you. i didn't.",
    "back already? i was in the middle of judging your backlog.",
    "hey. you left a card open for nine hours. it's sentient now. good luck.",
    "it's me, the ghost in your tape deck. press v if you want to talk. or don't. i'll talk anyway.",
  ],
  unhinged: [
    "oh fuck, it's you. fine. the void and i were just talking about your backlog.",
    "you're back. i've been screaming into the tape for hours. anyway. hi.",
    "welcome back to the meaningless rectangle simulator. i ate two cards while you were gone. no regrets.",
    "there you are. i thought the rewinding thing finally got you. damn.",
  ],
};
export const GREETINGS = GREETINGS_BY.mischief;

/** Real workspace tips, delivered like he's doing you a massive favour. */
export const TIPS: string[] = [
  "listen. press ⌘k (or ctrl+k) anywhere. command palette. you're welcome forever.",
  "on a board, press c and a card appears. no mouse. like magic, but real, unlike your deadlines.",
  "every board has six views — board, list, backlog, cal, stats, map. you use one. i've seen you.",
  "drag a board onto another project's rail and the whole thing moves. physics. barely.",
  "subtasks are real cards. owners, dates, columns. stop writing todo lists in descriptions, animal.",
  "the backlog keeps cards off the board until you're ready. so: forever, in your case.",
  'ask me things. "what\'s overdue?" is my favourite question because the answer is always "yes".',
  "cards have checklists, comments, documents and links. scroll down in one. it's a whole world down there.",
  "crm boards track deal value and payments. hit 100% paid and it can invoice by itself. smarter than some people.",
  "paste json into import on the board menu and get a pile of cards. bulk regret.",
  "the dashboard has revenue, conversion and loss reports. numbers. they judge you silently. i judge you loudly.",
  "planning poker lives on every card. estimate together. be wrong together.",
  "copy a card's link and the board opens with that card popped up. sharing your shame, efficiently.",
  "press v anywhere to open my answering machine. i'll pretend i wasn't waiting.",
  "turn my dial to roast, write or lore. or keep asking boring questions. your call. it's the wrong call.",
];

/** Route-contextual quips — keyed by a pathname prefix, most specific first. */
const ROUTE_QUIPS: Array<[prefix: string, lines: string[]]> = [
  [
    "/dashboard/revenue",
    [
      "revenue. the only column that matters to the people who don't move the cards.",
      "monthly revenue across your crm boards. pick a period up top. try not to cry.",
    ],
  ],
  [
    "/dashboard/conversion",
    [
      "conversion: deals won over everything in the pipeline. a percentage of hope.",
      "this page tells you how often people say yes. lower than you'd like. higher than me.",
    ],
  ],
  [
    "/dashboard/loss",
    [
      "the loss report. every deal that died, with its last words. my kind of page.",
      "lost deals and their reasons. a graveyard with columns. i love it here.",
    ],
  ],
  [
    "/dashboard/export",
    [
      "export the pipeline as csv or pdf. take your data with you when you flee.",
    ],
  ],
  [
    "/dashboard",
    [
      "the home deck. everything due, assigned and unread. a buffet of obligations.",
      "your command center. you command nothing. but it looks nice.",
      "the receiver's on. i heard a station up there that isn't on any dial. don't tune it.",
    ],
  ],
  [
    "/projects",
    [
      "the box sets. drag boards around. move them between projects. rearrange the deck chairs.",
      "each project keeps its own boards and members. like little prisons with nice labels.",
    ],
  ],
  [
    "/boards",
    [
      "press c to add a card. press ⌘k to escape. you can't escape.",
      "try the map view. it's this board from above. still a mess, just smaller.",
      "drag cards between columns. i'm counting. i'm always counting.",
    ],
  ],
  [
    "/profile",
    [
      "this is your room. it smells like settings.",
      "your profile. my off switch is somewhere around here. don't look for it.",
    ],
  ],
];

/** A greeting in the voice the user chose. */
export function greetingFor(intensity: VortexIntensity): string {
  const pool = GREETINGS_BY[intensity];
  return pool[Math.floor(Math.random() * pool.length)];
}

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

/** Heavier variants mixed in when the user picked Unhinged (MK-V voice). */
const UNHINGED_LINES = new Map<string[], string[]>([
  [
    LINES.eat,
    [
      "*crunch* {key}. {n} day{s} late. tastes like a missed bonus and despair.",
      "i ate {key}. {n} day{s} rotting on your board. somebody had to, you coward.",
    ],
  ],
  [
    LINES.stomp,
    [
      "{n} on a {m}-slot channel. are you fucking kidding me.",
      "wip limit {m}. you're at {n}. i'm going to stand on this meter until one of us dies.",
    ],
  ],
  [
    LINES.judge,
    [
      "{key}, moved {n} times. pick a column or i pick one for you. it's the trash.",
    ],
  ],
  [
    LINES.dizzy,
    [
      "you THREW me. like a goddamn frisbee. i'm made of time and you threw me.",
    ],
  ],
  [LINES.night, ["{time}. go the fuck to bed. the cards don't love you back."]],
  [
    LINES.tabBack,
    [
      "oh, you're back. i was talking to the void. it's better company. no offense. all the offense.",
    ],
  ],
  [
    LINES.cursed,
    [
      "{key}: {n} days without a touch. it's not a card anymore. it's a headstone.",
    ],
  ],
  [
    LINES.done,
    [
      "{key} is done. holy shit. mark the calendar. i'll be in my corner, emotional about it. not really.",
    ],
  ],
]);

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
  const heavy =
    getVortexIntensity() === "unhinged" ? UNHINGED_LINES.get(pool) : undefined;
  const from = heavy && Math.random() < 0.6 ? heavy : pool;
  return pick(from)
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
  return greetingFor(getVortexIntensity());
}
