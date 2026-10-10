"use client";

import { useSyncExternalStore } from "react";
import { apiFetch, fetchDashboard } from "@/lib/api";
import { getVortexFlag } from "@/lib/vortex";
import { claimFragment } from "@/vortex/mysteries/fragments";
import { speakTape } from "@/vortex/voice/tts";
import { boardSong, radio, type Song, songFromSeed } from "./synth";
import "./radio.css";
import { setRadioOn } from "@/vortex/core/mix";

// LADO O · the station: 03.13 DEAD AIR. It tunes in (the server says what's
// on), plays the hour's playlist, and between songs the Host talks — program
// patter, news from below, the Board Report, dedications, requests. Under it
// all: morse on the static (F21), a song recorded backwards in Overtime
// (F20), a dedication "for m." on the Night Shift (F19), the man's voice at
// night (F22) and the live show at 03:13 (F23). One station for the whole
// app; the walkman and the dashboard dial are just two faces of it.

export type Program =
  | "morning-hiss"
  | "lunch-loop"
  | "overtime"
  | "night-shift"
  | "dead-air-live";

interface Now {
  program: Program;
  local: string;
  playlist: number[];
  backwards: number | null;
  rare: { id: string; name: string; seed: number } | null;
  collected: string[];
  dedications: { from: string; text: string }[];
  interference: boolean;
}

export const PROGRAMS: Record<
  Program,
  { name: string; genre: Song["genre"][] }
> = {
  "morning-hiss": { name: "MORNING HISS", genre: ["ambient", "lofi"] },
  "lunch-loop": { name: "LUNCH LOOP", genre: ["elevator", "lofi"] },
  overtime: { name: "OVERTIME", genre: ["synthwave", "lofi"] },
  "night-shift": { name: "NIGHT SHIFT", genre: ["lofi", "ambient"] },
  "dead-air-live": { name: "DEAD AIR · LIVE", genre: ["ambient"] },
};

const PATTER: Record<Program, string[]> = {
  "morning-hiss": [
    "good morning, whoever's listening. the hiss is fresh. the coffee isn't.",
    "news from below: the moth reports no new arrivals. condolences.",
    "weather in the basement: one bulb, flickering. same as yesterday.",
    "this is the morning hiss. if you can hear me, the tape's still running.",
  ],
  "lunch-loop": [
    "lunch loop. requests are open. the moth asked for silence again. denied.",
    "the arcade reports cabinet three is lying. nobody's surprised.",
    "eat something. not your overdue cards. that's someone else's job.",
  ],
  overtime: [
    "overtime. for everyone still at it. i see you. i'm still here too.",
    "if you're working this late, this one's for you. it's a little slow. so are you.",
    "the metronome says you're late. the metronome says that to everyone.",
  ],
  "night-shift": [
    "night shift. just us now. and the hiss.",
    "i keep a mug of tea warm on the desk. for when he comes back.",
    "if you can't sleep, i can't either. let's not sleep together. on the radio.",
  ],
  "dead-air-live": [
    "…are you there? it's thirteen past three. you always said that was our hour.",
    "if you can hear this, the tea's still warm.",
  ],
};

export interface StationState {
  on: boolean;
  program: Program | null;
  song: Song | null;
  host: string | null;
  rareAiring: boolean;
  recorded: boolean;
  flipped: boolean;
  collected: string[];
  voice: boolean;
}

let state: StationState = {
  on: false,
  program: null,
  song: null,
  host: null,
  rareAiring: false,
  recorded: false,
  flipped: false,
  collected: [],
  voice: false,
};
const subs = new Set<() => void>();
const set = (p: Partial<StationState>) => {
  state = { ...state, ...p };
  setRadioOn(state.on); // T-15 · his sounds duck while the radio plays
  for (const f of subs) f();
  window.dispatchEvent(new CustomEvent("vortex:radio", { detail: state }));
};
export function useStation(): StationState {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => state,
    () => state,
  );
}
export const getStation = () => state;

let now: Now | null = null;
let queue: Song[] = [];
let songTimer: ReturnType<typeof setTimeout> | null = null;
let extras: ReturnType<typeof setTimeout>[] = [];
let breaks = 0;
let stopVoice: (() => void) | null = null;
const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

function say(text: string, ms = 9000, voiced = true) {
  set({ host: text });
  stopVoice?.();
  stopVoice =
    state.voice && voiced ? speakTape(text, { preset: "host" }) : null;
  const t = setTimeout(() => {
    if (state.host === text) set({ host: null });
  }, ms);
  extras.push(t);
}

/** O-05 · this just in: your board, as 80s radio news. */
async function boardReport(): Promise<string> {
  try {
    const d = await fetchDashboard();
    const v = d.vitals;
    const stale = d.deck.find(
      (c) => c.due_date && new Date(c.due_date) < new Date(),
    );
    const bits = [
      `this just in: ${v.done_7d} cards finished this week${v.done_7d > v.done_prev_7d ? ", up from last week. sources call it 'suspicious'." : v.done_7d < v.done_prev_7d ? ", down from last week. the market is concerned." : "."}`,
      v.overdue > 0
        ? `${v.overdue} overdue${stale ? `. '${stale.name.slice(0, 40)}' enters another day past due. sources close to the card describe it as 'tired'.` : "."}`
        : "nothing overdue. authorities are investigating.",
      v.in_progress > 0
        ? `${v.in_progress} cards still playing. stay tuned.`
        : "",
    ];
    return bits.filter(Boolean).join(" ");
  } catch {
    return "the board report is late. like everything.";
  }
}

function buildQueue(n: Now) {
  const genres = PROGRAMS[n.program].genre;
  queue = n.playlist.map((seed, i) => {
    const s = songFromSeed(seed, genres[i % genres.length]);
    return i === n.backwards
      ? { ...s, name: "revo epat eht nrut", backwards: true }
      : s;
  });
  if (n.rare) {
    const r = songFromSeed(n.rare.seed, "ambient");
    queue.splice(1, 0, { ...r, id: n.rare.id, name: n.rare.name, rare: true });
  }
}

async function breakBetweenSongs() {
  if (!now) return;
  breaks++;
  if (now.dedications.length) {
    const d = now.dedications.shift();
    if (d)
      return say(
        `a dedication, from ${d.from}: "${d.text}". this one's for you.`,
        11000,
      );
  }
  if (now.program === "night-shift" && breaks === 2) {
    // F19 · one dedication addressed to an initial
    return say(
      "and the last dedication tonight… for m., from the night shift.",
      9000,
    );
  }
  if (breaks % 3 === 0) return say(await boardReport(), 14000);
  say(pick(PATTER[now.program]));
}

function playNext() {
  if (!state.on) return;
  const song = queue.shift() ?? songFromSeed(Math.floor(Math.random() * 1e5));
  queue.push(songFromSeed(song.seed + 1));
  void radio.play(song);
  set({ song, rareAiring: !!song.rare, recorded: false, flipped: false });
  const ms = song.backwards ? 45_000 : 120_000 + Math.random() * 60_000;
  songTimer = setTimeout(async () => {
    await breakBetweenSongs();
    playNext();
  }, ms);
}

/** Tune in to 03.13. */
export async function tuneIn() {
  if (state.on) return;
  radio.static(1.2);
  set({ on: true, voice: getVortexFlag("radio-voice") });
  try {
    now = await apiFetch<Now>("/api/mascot/radio");
    void apiFetch("/api/mascot/radio/on", { method: "POST" }).catch(() => {});
  } catch {
    now = {
      program: "night-shift",
      local: "",
      playlist: [1, 2, 3, 4, 5, 6],
      backwards: null,
      rare: null,
      collected: [],
      dedications: [],
      interference: false,
    };
  }
  set({ program: now.program, collected: now.collected });
  buildQueue(now);
  say(
    now.program === "dead-air-live"
      ? pick(PATTER["dead-air-live"])
      : `you're listening to 03.13, dead air. this is ${PROGRAMS[now.program].name.toLowerCase()}.`,
  );
  playNext();
  // F21 · the static isn't random: every few minutes, morse under it
  const morse = () => {
    if (!state.on) return;
    radio.morse("garage");
    extras.push(setTimeout(morse, 240_000));
  };
  extras.push(setTimeout(morse, 70_000));
  // F22 · at night, after a while, a man's voice cuts through for two seconds
  if (now.interference)
    extras.push(
      setTimeout(async () => {
        if (!state.on) return;
        radio.static(2.2);
        say("—can you hear me? —", 2400);
        await heard("interference");
      }, 200_000),
    );
  // F23 · the live show: stay a couple of minutes
  if (now.program === "dead-air-live")
    extras.push(setTimeout(() => void heard("dead-air"), 90_000));
}

async function heard(what: "interference" | "dead-air") {
  try {
    const r = await apiFetch<{ granted: string[] }>("/api/mascot/radio/heard", {
      method: "POST",
      body: JSON.stringify({ what }),
    });
    // the server granted it; claiming again just files the toast
    for (const id of r.granted) void claimFragment(id);
  } catch {}
}

export function tuneOut() {
  if (!state.on) return;
  if (songTimer) clearTimeout(songTimer);
  for (const t of extras) clearTimeout(t);
  extras = [];
  stopVoice?.();
  radio.stop();
  set({ on: false, song: null, host: null, program: null, rareAiring: false });
}

export function skip() {
  if (!state.on) return;
  if (songTimer) clearTimeout(songTimer);
  radio.static(0.4);
  playNext();
}

/** O-09 · REC while a rare tape plays: it's yours (the server checks). */
export async function rec() {
  const s = state.song;
  if (!s) return false;
  if (!s.rare) {
    say("you can record anything. you'll only keep the rare ones.", 5000);
    return false;
  }
  try {
    const r = await apiFetch<{ ok: boolean }>("/api/mascot/radio/rec", {
      method: "POST",
      body: JSON.stringify({ id: s.id }),
    });
    if (r.ok) {
      set({
        recorded: true,
        collected: [...new Set([...state.collected, s.id])],
      });
      say(`you caught "${s.name}". that one doesn't air twice.`, 7000);
    }
    return r.ok;
  } catch {
    return false;
  }
}

/** F20 · flip the cassette: a backwards song plays forwards, and says something. */
export function flip() {
  const s = state.song;
  if (!s) return;
  if (s.backwards) {
    const fwd = { ...s, backwards: false, name: "turn the tape over" };
    void radio.play(fwd);
    set({ song: fwd, flipped: true });
    say("…did that song just say something?", 6000);
  } else {
    radio.static(0.3);
    set({ flipped: !state.flipped });
  }
}

/** O-07 · a request: a genre, or the song of your board (O-08). */
export async function request(kind: Song["genre"] | "board") {
  if (!state.on) await tuneIn();
  let song: Song;
  if (kind === "board") {
    try {
      const d = await fetchDashboard();
      const name = d.deck[0]?.board_name ?? "your board";
      song = boardSong(name, {
        doneWeek: d.vitals.done_7d,
        overdue: d.vitals.overdue,
        titles: d.deck.map((c) => c.name),
      });
      say(
        `a request: a song made of "${name}". ${song.bpm} bpm. ${song.minor ? "minor key. we know why." : "major key. enjoy it while it lasts."}`,
        10000,
      );
    } catch {
      song = songFromSeed(Math.floor(Math.random() * 1e5));
    }
  } else {
    song = songFromSeed(Math.floor(Math.random() * 1e5), kind);
    say(`a request for ${kind}. "${song.name}". coming up.`, 7000);
  }
  queue.unshift(song);
  skip();
}

export function setStationVoice(on: boolean) {
  set({ voice: on });
  if (!on) stopVoice?.();
}

export async function dedicate(to: number, text: string) {
  return apiFetch<{ ok: boolean; reason?: string }>(
    "/api/mascot/radio/dedicate",
    {
      method: "POST",
      body: JSON.stringify({ to, text }),
    },
  );
}

export const RARE_COUNT = 12;

/** Put a line on air (the Void Hour, the Vortex hijacking the mic…). */
export function onAir(text: string, ms = 8000, voiced = false) {
  say(text, ms, voiced);
}
