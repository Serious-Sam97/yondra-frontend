// Vortex chat extras: slash commands, tones, the riddle of the day, fortune
// cookies, the sprint tarot and compliment detection. Pure functions — the
// component decides what to do with the result.

export type SlashResult =
  // ask the AI with these whitelisted style keys and this (rewritten) question
  | { kind: "ai"; style: string[]; question: string }
  // answered locally, no AI call
  | { kind: "local"; reply: string }
  // something for the component to run (games, notes, voice…)
  | {
      kind: "run";
      action:
        | "rps"
        | "roulette"
        | "whack"
        | "hide"
        | "voice"
        | "riddle"
        | "clear"
        | "costume";
      arg?: string;
    }
  | { kind: "note"; to: string; body: string }
  | { kind: "birthday"; mmdd: string | null }
  | null; // not a command

const HELP = [
  "/roast · /hype · /explain <thing> · /excuse <card>",
  "/recap · /standup · /write <card> · /card <card> <question>",
  "/fortune · /riddle · /rps · /roulette · /whack · /hide",
  "/note @name text · /birthday MM-DD · /costume · /voice · /forget",
].join("\n");

export function parseSlash(input: string): SlashResult {
  const m = /^\/(\w+)\s*([\s\S]*)$/.exec(input.trim());
  if (!m) return null;
  const [, cmd, rest] = m;
  const arg = rest.trim();
  switch (cmd.toLowerCase()) {
    case "help":
      return { kind: "local", reply: `things I do:\n${HELP}` };
    case "roast":
      return {
        kind: "ai",
        style: ["roast"],
        question: arg || "roast my workspace",
      };
    case "hype":
      return {
        kind: "ai",
        style: ["hype"],
        question: arg || "hype me up about my workspace",
      };
    case "explain":
      return {
        kind: "ai",
        style: ["explain"],
        question: arg
          ? `explain: ${arg}`
          : "explain how my workspace is set up",
      };
    case "excuse":
      return {
        kind: "ai",
        style: ["excuse"],
        question: arg
          ? `an excuse for why ${arg} is late`
          : "an excuse for my overdue work",
      };
    case "recap":
      return {
        kind: "ai",
        style: ["recap"],
        question: "what happened in my workspace today?",
      };
    case "standup":
      return { kind: "ai", style: ["standup"], question: "write my standup" };
    case "write":
      return arg
        ? {
            kind: "ai",
            style: ["write"],
            question: `draft a description for ${arg}`,
          }
        : { kind: "local", reply: "which card? try /write YON-153" };
    case "card": {
      const [key, ...q] = arg.split(/\s+/);
      return key
        ? {
            kind: "ai",
            style: ["card"],
            question: `${key}: ${q.join(" ") || "how are you feeling?"}`,
          }
        : {
            kind: "local",
            reply:
              "which card should I channel? try /card YON-153 why are you late?",
          };
    }
    case "fortune":
      return { kind: "local", reply: `🥠 *crack* — "${fortune()}"` };
    case "riddle":
      return { kind: "run", action: "riddle" };
    case "rps":
      return { kind: "run", action: "rps" };
    case "roulette":
      return { kind: "run", action: "roulette" };
    case "whack":
      return { kind: "run", action: "whack" };
    case "hide":
      return { kind: "run", action: "hide" };
    case "voice":
      return { kind: "run", action: "voice" };
    case "forget":
      return { kind: "run", action: "clear" };
    case "costume":
      return { kind: "run", action: "costume", arg };
    case "birthday": {
      if (!arg || /^(clear|none|off)$/i.test(arg))
        return { kind: "birthday", mmdd: null };
      const b = /^(\d{1,2})[-/.](\d{1,2})$/.exec(arg);
      if (!b)
        return {
          kind: "local",
          reply: "tell me like this: /birthday 03-14 (month-day)",
        };
      const mm = Number(b[1]);
      const dd = Number(b[2]);
      if (mm < 1 || mm > 12 || dd < 1 || dd > 31)
        return { kind: "local", reply: "that's not a day. nice try." };
      return {
        kind: "birthday",
        mmdd: `${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`,
      };
    }
    case "note": {
      const n = /^@?(\S+)\s+([\s\S]+)$/.exec(arg);
      return n
        ? { kind: "note", to: n[1], body: n[2].trim().slice(0, 200) }
        : { kind: "local", reply: "who's it for? /note @ana boo" };
    }
    default:
      return { kind: "local", reply: `never heard of /${cmd}. try /help` };
  }
}

/** Style key for his current face, sent along with every question. */
export function moodStyle(mood: string, hour: number): string[] {
  if (hour < 5) return ["sleepy"];
  return [
    "smug",
    "judging",
    "hungry",
    "happy",
    "possessed",
    "curious",
  ].includes(mood)
    ? [mood]
    : [];
}

/* ── compliments ───────────────────────────────────────────────────────── */
const NICE =
  /\b(thanks?|thank you|thx|love (you|u)|good (job|boy|work)|you('| a)?re (the best|great|cute|amazing|awesome)|cute|adorable|best|awesome|legend|obrigad[oa]|valeu|lindo|fofo)\b/i;
export function isCompliment(text: string): boolean {
  return NICE.test(text);
}

/* ── riddle of the day ─────────────────────────────────────────────────── */
const RIDDLES: { q: string; a: RegExp; answer: string }[] = [
  {
    q: "I have a head and a tail but no body. I get stuck in machines. what am I?",
    a: /\b(tape|cassette)\b/i,
    answer: "a tape",
  },
  {
    q: "the more you finish, the less of me there is. the more you ignore me, the more I grow. what am I?",
    a: /\b(backlog|to-?do|work|tasks?)\b/i,
    answer: "the backlog",
  },
  {
    q: "I'm always coming but never arrive. you set me, then you miss me. what am I?",
    a: /\b(deadline|due date|tomorrow)\b/i,
    answer: "a deadline",
  },
  {
    q: "I spin all day and never get dizzy. you put me in, I sing. what am I?",
    a: /\b(record|vinyl|reel|tape|disc)\b/i,
    answer: "a reel",
  },
  {
    q: "I disappear when you say my name. what am I?",
    a: /\bsilence\b/i,
    answer: "silence",
  },
  {
    q: "what has columns but holds up nothing?",
    a: /\b(board|kanban|spreadsheet|table)\b/i,
    answer: "your board",
  },
  {
    q: "I'm full of holes but I still hold the music. what am I?",
    a: /\b(punch ?card|music box|cassette|tape|record)\b/i,
    answer: "a music box",
  },
];
export function riddleOfTheDay(date = new Date()): (typeof RIDDLES)[number] {
  const n = Math.floor(date.getTime() / 86_400_000);
  return RIDDLES[n % RIDDLES.length];
}

/* ── fortune cookies ───────────────────────────────────────────────────── */
const FORTUNES = [
  "a card you forgot will remember you.",
  "your next column will be emptier than your last.",
  "beware of tickets ending in 7.",
  "someone will move your card. it will not be me. probably.",
  "the deadline you fear is closer than it appears in the mirror.",
  "today you will finish something. maybe this cookie.",
  "a jam will clear itself. a different jam will form.",
  "the backlog is watching. wave.",
  "you will be visited by a ghost from Review.",
  "lucky numbers: 3, 13, WIP limit + 1.",
];
export function fortune(): string {
  return FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
}

/* ── sprint tarot ──────────────────────────────────────────────────────── */
export const TAROT = [
  {
    name: "The Tower",
    glyph: "🗼",
    meaning: "something will fall over mid-sprint. it's fine. rebuild.",
  },
  {
    name: "The Hermit",
    glyph: "🏮",
    meaning: "one card will be worked on alone, in the dark, for too long.",
  },
  {
    name: "The Wheel",
    glyph: "☸",
    meaning: "cards will go around and around. pick a column.",
  },
  {
    name: "The Star",
    glyph: "✦",
    meaning: "an easy win is hiding in To Do. find it first.",
  },
  {
    name: "Death",
    glyph: "☠",
    meaning: "not literal. something gets archived. let it go.",
  },
  {
    name: "The Fool",
    glyph: "🃏",
    meaning: "someone commits to too much. it might be you.",
  },
  {
    name: "The Sun",
    glyph: "☀",
    meaning: "a clean sprint. suspiciously clean.",
  },
  {
    name: "The Moon",
    glyph: "☾",
    meaning: "night shifts ahead. I'll keep the tape warm.",
  },
];
export function drawTarot() {
  return TAROT[Math.floor(Math.random() * TAROT.length)];
}

/* ── morse (his blinks) ───────────────────────────────────────────────── */
const MORSE: Record<string, string> = {
  a: ".-",
  b: "-...",
  c: "-.-.",
  d: "-..",
  e: ".",
  f: "..-.",
  g: "--.",
  h: "....",
  i: "..",
  j: ".---",
  k: "-.-",
  l: ".-..",
  m: "--",
  n: "-.",
  o: "---",
  p: ".--.",
  q: "--.-",
  r: ".-.",
  s: "...",
  t: "-",
  u: "..-",
  v: "...-",
  w: ".--",
  x: "-..-",
  y: "-.--",
  z: "--..",
};
export function toMorse(word: string): string[] {
  return word
    .toLowerCase()
    .split("")
    .map((c) => MORSE[c] ?? "")
    .filter(Boolean);
}
