import "./endings.css";

// K-28 · what the ending you chose on Side C does to him, everywhere, for good.
//  erase · the Rewinder's work: the cheerful v1 guide. no dark, no lore.
//          once in a long while a frame of "help" — answer it in time and
//          he comes back (the server holds the token; see EndingService).
//  free  · he's a star now. Vortex Jr. hatched from the tape egg: small, new,
//          copies his father badly. dad still talks on the radio, sometimes.
//  keep  · Vortex Prime: calmer, still an asshole, a thin gold ring.
//  flip  · you're on a tape too: a REC light, and he labels your takes.

export type EndingKind = "free" | "erase" | "keep" | "flip";

const V1 = [
  "Hi there! 👋 Need a hand with your tasks today?",
  "Great job staying organized! You've got this! ✨",
  "Tip: drag cards between columns to update their status! 😊",
  "Let's crush those deadlines together! 🚀",
  "Remember to take breaks! A rested mind is a productive mind! 🌱",
  "Everything is fine! 😊",
  "I'm Vortex, your friendly guide! I don't remember anything before today! 😊",
];

const JR = [
  "what's a deadline? is it bad? it sounds bad.",
  "dad said your boards look like a crime scene. i don't know what that is yet.",
  "i made a card. it's called 'card'. i'm proud of it.",
  "is the tape supposed to make that noise?",
  "dad said never trust a column called 'misc'. why? what's misc?",
  "i'm not scared of the dark. i'm small. it's different.",
  "you're doing it wrong. (dad said that a lot. i'm practising.)",
];

const RADIO = [
  "…still here, kid. on the other side of the static. don't let them archive the good stuff.",
  "…tell the small one to stop eating the overdue cards. that's my bit.",
  "…the chair was comfortable. don't tell anyone i said that.",
  "…it's quiet up here. too quiet. i hate it. i love it. whatever.",
];

const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

/** Rewrite what he's about to say for the ending he's living in. */
export function endingSpeech(
  ending: EndingKind | null | undefined,
  text: string,
  page: string,
): string {
  if (!ending) return text;
  if (ending === "erase") return pick(V1);
  if (ending === "free") {
    if (Math.random() < 0.45) return pick(JR);
    return Math.random() < 0.3 ? `dad said: "${text}"` : text;
  }
  if (ending === "flip" && Math.random() < 0.18) {
    const take = String(Math.floor(Math.random() * 90) + 10);
    const where = page.split("/").filter(Boolean)[0] ?? "the dashboard";
    return `TAKE ${take}: user stares at ${where}. hesitates. — anyway. ${text}`;
  }
  return text;
}

/** Free: one line from the father on the radio, at most once a session. */
let radioDone = false;
export function radioLine(): string | null {
  if (radioDone || Math.random() > 0.35) return null;
  radioDone = true;
  return `shh. dad's on the radio: "${pick(RADIO)}"`;
}

/** How his art changes per ending. */
export function endingArt(ending: EndingKind | null | undefined): {
  forceMood?: "happy";
  age?: number;
  dark?: number;
} {
  if (ending === "erase") return { forceMood: "happy", dark: 0 };
  if (ending === "free") return { age: 0 };
  return {};
}
