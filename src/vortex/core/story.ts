"use client";

import { vxSound } from "@/components/vortex/vortexSound";
import { apiFetch } from "@/lib/api";
import { ALL_MOODS, type VortexMood } from "@/lib/vortexArt";
import {
  fakeCrash,
  melt,
  overwritten,
  printThrough,
  wallEyes,
} from "@/vortex/dark/effects";
import {
  handShadow,
  pencilInLayout,
  rewindCard,
  squeal,
} from "@/vortex/dark/rewinder";
import "./story.css";

// LADO L · THE SERIES, client side. The server decides what's due
// (StoryService); this stages it: "previously on…" on the VFD (L-01/L-10),
// the title card, the scripted steps through his body and voice, the choices
// (L-11), the cliffhanger cut and the credits with a one-frame teaser
// (L-12/L-13). The Videoteca (L-14) replays the same thing without effects.

export type Step =
  | ["say", string, string?]
  | ["mood", string]
  | ["anim", string]
  | ["wait", number]
  | ["fx", string]
  | ["choice", string, string, [string, string, string][]]
  | ["below", string];

export interface Episode {
  id: string;
  season: number;
  n: number;
  title: string;
  recap: string;
  steps: Step[];
  credits: string;
  teaser: string;
  finale: boolean;
  special: boolean;
  chosen?: Record<string, string>;
}

export interface Stage {
  speak(
    text: string,
    o?: {
      ms?: number;
      choices?: { label: string; run: () => void }[];
      action?: { label: string; run: () => void };
    },
  ): void;
  setMood(m: VortexMood): void;
  anim(name: string): unknown;
  restMood(): VortexMood;
  goBelow(): void;
  /** L-10 · days you were away before this episode */
  awayDays?(): number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const MOOD_ALIAS: Record<string, VortexMood> = { scared: "terror" };
function asMood(m?: string): VortexMood | null {
  if (!m) return null;
  const v = (MOOD_ALIAS[m] ?? m) as VortexMood;
  return ALL_MOODS.includes(v) ? v : null;
}
const readMs = (t: string) => Math.min(9000, 1400 + t.length * 48);

/** A VFD card at the bottom of the screen. Click (or Esc) to skip. */
function vfd(label: string, text: string, ms: number, cls = ""): Promise<void> {
  return new Promise((done) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = `vxl-vfd ${cls}`;
    el.innerHTML = "<b></b><span></span><i>skip ▸▸</i>";
    (el.querySelector("b") as HTMLElement).textContent = label;
    (el.querySelector("span") as HTMLElement).textContent = text;
    document.body.appendChild(el);
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      el.classList.add("is-out");
      window.removeEventListener("keydown", onKey);
      setTimeout(() => el.remove(), 400);
      done();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    el.addEventListener("click", close);
    window.addEventListener("keydown", onKey);
    setTimeout(close, ms);
  });
}

/** One frame of the next episode (L-13). */
async function teaserFrame(text: string) {
  if (!text) return;
  const el = document.createElement("div");
  el.className = "vxl-teaser";
  el.setAttribute("aria-hidden", "true");
  el.textContent = text;
  document.body.appendChild(el);
  await sleep(140);
  el.remove();
}

/** The radio turning itself on: a burst of static and the station on the VFD. */
function radio() {
  vxSound("hiss");
  const el = document.createElement("div");
  el.className = "vxl-radio";
  el.setAttribute("aria-hidden", "true");
  el.textContent = "📻 03.13 · DEAD AIR";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

function staticBurst() {
  vxSound("hiss");
  document.documentElement.classList.add("vxl-static");
  setTimeout(
    () => document.documentElement.classList.remove("vxl-static"),
    700,
  );
}

async function fx(name: string, live: boolean, stage: Stage) {
  if (!live) return; // the Videoteca replays the words, not the damage
  switch (name) {
    case "squeal":
      return squeal(1.4);
    case "pencil":
      return void pencilInLayout();
    case "hand":
      return handShadow();
    case "rewind-card":
      return void (await rewindCard());
    case "melt":
      return melt();
    case "crash":
      return fakeCrash();
    case "print-through":
      return void (await printThrough());
    case "overwritten":
      return void (await overwritten());
    case "wall-eyes": {
      const stop = wallEyes();
      setTimeout(stop, 6000);
      return;
    }
    case "static":
      return staticBurst();
    case "radio":
      return radio();
    case "die":
      document.documentElement.classList.add("vxl-flatline");
      return void setTimeout(
        () => document.documentElement.classList.remove("vxl-flatline"),
        4200,
      );
    case "reform":
      stage.setMood("shocked");
      return staticBurst();
  }
}

/**
 * Play one episode. `live` = the real first airing (effects, choices count);
 * otherwise a rewatch from the Videoteca. Resolves with the choices made.
 */
export async function playEpisode(
  ep: Episode,
  stage: Stage,
  live = true,
): Promise<Record<string, string>> {
  const choices: Record<string, string> = {};
  const away = stage.awayDays?.() ?? 0;
  if (ep.recap && live && away >= 5) {
    // L-10 · gone a while: he narrates it himself, like a tired host
    stage.setMood("bored");
    const line = `you were gone ${away} days. previously, on me: ${ep.recap} …try to keep up.`;
    stage.speak(line, { ms: readMs(line) + 600 });
    await sleep(readMs(line));
  } else if (ep.recap) {
    await vfd("PREVIOUSLY ON VORTEX", ep.recap, 5000, "is-prev");
  }
  await vfd(
    ep.special ? "SPECIAL EPISODE" : `SEASON ${ep.season} · EPISODE ${ep.n}`,
    ep.title.toUpperCase(),
    2600,
    "is-title",
  );
  for (const step of ep.steps) {
    switch (step[0]) {
      case "say": {
        const m = asMood(step[2]);
        if (m) stage.setMood(m);
        stage.speak(step[1], { ms: readMs(step[1]) + 600 });
        await sleep(readMs(step[1]));
        break;
      }
      case "mood": {
        const m = asMood(step[1]);
        if (m) stage.setMood(m);
        break;
      }
      case "anim":
        await stage.anim(step[1]);
        break;
      case "wait":
        await sleep(step[1]);
        break;
      case "fx":
        await fx(step[1], live, stage);
        break;
      case "choice": {
        const [, key, text, opts] = step;
        const picked = await new Promise<[string, string, string]>((res) => {
          stage.speak(text, {
            ms: 60_000,
            choices: opts.map((o) => ({ label: o[1], run: () => res(o) })),
          });
          // nobody answered in a minute: the first option, as he'd assume
          setTimeout(() => res(opts[0]), 60_000);
        });
        choices[key] = picked[0];
        stage.speak(picked[2], { ms: readMs(picked[2]) + 600 });
        await sleep(readMs(picked[2]));
        break;
      }
      case "below":
        stage.speak(step[1], {
          ms: 14_000,
          action: { label: "go below", run: () => stage.goBelow() },
        });
        await sleep(readMs(step[1]) + 2000);
        break;
    }
  }
  if (ep.finale) {
    // L-12 · the cut
    document.documentElement.classList.add("vxl-cut");
    await sleep(900);
    document.documentElement.classList.remove("vxl-cut");
  }
  stage.setMood(stage.restMood());
  await vfd(
    ep.finale ? "END OF SEASON" : "CREDITS",
    ep.credits || "written by the tape",
    10_000,
    "is-credits",
  );
  await teaserFrame(ep.teaser);
  return choices;
}

export async function fetchDueEpisode(): Promise<Episode | null> {
  try {
    const forced = new URLSearchParams(window.location.search).get("episode");
    const r = await apiFetch<{ due: Episode | null }>(
      `/api/mascot/story${forced ? `?episode=${encodeURIComponent(forced)}` : ""}`,
    );
    return r.due;
  } catch {
    return null;
  }
}

export async function markSeen(id: string, choices: Record<string, string>) {
  try {
    await apiFetch("/api/mascot/story/seen", {
      method: "POST",
      body: JSON.stringify({ id, choices }),
    });
  } catch {}
}

export async function fetchLibrary(): Promise<Episode[]> {
  try {
    return (
      await apiFetch<{ episodes: Episode[] }>("/api/mascot/story/library")
    ).episodes;
  } catch {
    return [];
  }
}

/** Ask the assistant to replay an episode from the Videoteca. */
export function rewatch(ep: Episode) {
  window.dispatchEvent(new CustomEvent("vortex:rewatch", { detail: ep }));
}
