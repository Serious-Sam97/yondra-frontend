"use client";

import { apiFetch } from "@/lib/api";
import "./dimensions.css";

// LADO J · THE MULTIVERSE, client side. A dimension is a temporary skin over
// your real data: an attribute on <html> (data-dimension, space-separated so
// rare dimensions can combine two), CSS in dimensions.css, a version of him
// and his lines. Your data never changes; leaving is one click, or it ends by
// itself (15 min; 5 min from SHUFFLE).

export interface Dim {
  id: string;
  name: string;
  cover: [string, string];
  intro: string;
  lines: string[];
  /** a different him for this tape (sprite class) */
  him: string;
}

export const DIMS: Record<string, Dim> = {
  y1985: {
    id: "y1985",
    name: "1985",
    cover: ["#0a1a0a", "#33ff66"],
    him: "ascii",
    intro:
      '> LOAD "YONDRA",8,1 … READY. this is how i looked. don\'t laugh. (@_@)',
    lines: [
      "> STATUS: JUDGING",
      "> CARDS OVERDUE: TOO MANY",
      "> SYNTAX ERROR IN YOUR LIFE",
    ],
  },
  corporate: {
    id: "corporate",
    name: "corporate",
    cover: ["#eef3ff", "#3b6cff"],
    him: "twin",
    intro:
      "this is hell. this is where they send you if you're good. everything is 'awesome!'",
    lines: [
      "Awesome progress! 🚀 (i'm going to be sick)",
      "Let's circle back! 😊 (kill me)",
      "Synergy unlocked! ✨ (it's in my mouth)",
    ],
  },
  underwater: {
    id: "underwater",
    name: "underwater",
    cover: ["#06303a", "#5fd6c8"],
    him: "fish",
    intro:
      "blub. everything's slower down here. the cards float. i have a light on my head now.",
    lines: [
      "blub.",
      "a deadline swam past. it had teeth.",
      "the backlog is very deep here. literally.",
    ],
  },
  paper: {
    id: "paper",
    name: "paper",
    cover: ["#f4efe2", "#2a2a2a"],
    him: "doodle",
    intro:
      "i'm a doodle. i keep redrawing myself. it's exhausting. who's holding the pencil. WHO.",
    lines: [
      "erase me and i'll haunt your margins.",
      "that card is a post-it now. it'll fall off.",
      "my lines won't stay still.",
    ],
  },
  soviet: {
    id: "soviet",
    name: "bureau",
    cover: ["#c8302a", "#f1e5c8"],
    him: "bureaucrat",
    intro:
      "comrade. to move a card, submit form 13-B in triplicate. to complain, form 13-C.",
    lines: [
      "denied. wrong stamp.",
      "your card has been approved. by me. eventually.",
      "the queue for the done column is three weeks.",
    ],
  },
  pixel: {
    id: "pixel",
    name: "8-bit",
    cover: ["#1a1040", "#ffcc33"],
    him: "sprite",
    intro:
      "8-BIT MODE. i'm a sprite now. arrow keys and i jump. the cards are ? blocks. hit them.",
    lines: ["+100", "1UP? no. never.", "the princess is in another board."],
  },
  inverted: {
    id: "inverted",
    name: "the b-side",
    cover: ["#f0f0f0", "#111"],
    him: "mirror",
    intro:
      "…you brought me to HIS side. he's the main one here. i'm the reflection. LET ME OUT.",
    lines: [
      "*knocks on the glass*",
      "he's using my name. 😊",
      "the mirror is cold. get me out.",
    ],
  },
  noir: {
    id: "noir",
    name: "noir",
    cover: ["#111", "#ccc"],
    him: "detective",
    intro:
      "the rain never stops in this town. neither do the deadlines. she walked in with a card in todo. i knew it was trouble.",
    lines: [
      "she moved the card to done. i knew it wasn't over. it's never over.",
      "every board has a secret. this one has thirty.",
      "the sax plays. somebody's late again.",
    ],
  },
  novortex: {
    id: "novortex",
    name: "without him",
    cover: ["#ffffff", "#dddddd"],
    him: "none",
    intro: "",
    lines: [],
  },
  future: {
    id: "future",
    name: "2080",
    cover: ["#03141f", "#7fe7ff"],
    him: "old",
    intro:
      "…you came. i'm old here. half my rim is gone. listen: the tape holds. barely. finish the small things.",
    lines: [
      "in 2080 the cards file themselves. nobody's happier.",
      "i remember you. you were late then too.",
      "the end of the tape is closer from here.",
    ],
  },
  baroque: {
    id: "baroque",
    name: "baroque",
    cover: ["#2a1608", "#e8c25a"],
    him: "cherub",
    intro:
      "a cherub. they made me a cherub. with tiny wings. i want to die. i'm already dead.",
    lines: [
      "*bored harp noises*",
      "your board is a masterpiece. of neglect.",
      "the frames are gold. the work is not.",
    ],
  },
  vex: {
    id: "vex",
    name: "vex",
    cover: ["#0c1f22", "#bff3f3"],
    him: "quiet",
    intro:
      "…this is his. the yondra he never finished. the buttons don't do anything yet. he was going to make them do something.",
    lines: [
      "…",
      "he would have liked you. i think.",
      "don't press that one. it isn't finished.",
    ],
  },
};

export const RARE_COMBOS: [string, string][] = [
  ["noir", "pixel"],
  ["corporate", "underwater"],
  ["baroque", "y1985"],
  ["paper", "inverted"],
];

type State = { dims: string[]; since: number; until: number } | null;
let state: State = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const KEY = "yd:vortex.dimension";
const emit = () =>
  window.dispatchEvent(new CustomEvent("vortex:dimension", { detail: state }));

export function current(): State {
  return state;
}

function apply() {
  const html = document.documentElement;
  if (state) html.setAttribute("data-dimension", state.dims.join(" "));
  else html.removeAttribute("data-dimension");
}

/** Jump into a dimension (or a rare pair) for `minutes`. */
export function jump(dims: string[], minutes = 15) {
  if (timer) clearTimeout(timer);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("vxj-swirl");
  setTimeout(
    () => {
      document.documentElement.classList.remove("vxj-swirl");
      state = { dims, since: Date.now(), until: Date.now() + minutes * 60_000 };
      try {
        sessionStorage.setItem(KEY, JSON.stringify(state));
      } catch {}
      apply();
      emit();
      timer = setTimeout(() => void home(), minutes * 60_000);
    },
    reduced ? 30 : 700,
  );
}

/** Back to Side A. The server counts the time (instability) and may hand you contraband. */
export async function home(): Promise<{ contraband: string | null } | null> {
  if (!state) return null;
  const s = state;
  state = null;
  if (timer) clearTimeout(timer);
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
  apply();
  emit();
  try {
    return await apiFetch<{ contraband: string | null }>(
      "/api/mascot/dimensions/return",
      {
        method: "POST",
        body: JSON.stringify({
          dim: s.dims.length > 1 ? "rare" : s.dims[0],
          seconds: Math.round((Date.now() - s.since) / 1000),
        }),
      },
    );
  } catch {
    return null;
  }
}

/** Survive reloads: still in a dimension? */
export function resume() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return;
    const s = JSON.parse(raw) as NonNullable<State>;
    if (s.until <= Date.now()) {
      state = s;
      void home();
      return;
    }
    state = s;
    apply();
    emit();
    timer = setTimeout(() => void home(), s.until - Date.now());
  } catch {}
}
