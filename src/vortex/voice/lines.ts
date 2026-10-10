// Lines the answering machine plays on its own (no AI): nagging (A-08), the
// silent treatment (A-09), "i saw that" (A-12), yesterday (A-16), the other
// voices on the line (A-19) and the messages left while you were away (A-20).

const pick = <T>(list: readonly T[]): T =>
  list[Math.floor(Math.random() * list.length)];

export const NAG = [
  "?",
  "hello",
  "i'm aging here.",
  "i'm literally made of time and you're wasting it.",
] as const;

export const IGNORING = ["", "", "…"] as const;
export const UNIGNORE_PLEASE = [
  "fine. since you begged.",
  "ugh. ok. because you said the magic word.",
  "manners. disgusting. here.",
] as const;
export const UNIGNORE_PRETTY = [
  "…that was weirdly effective. don't do it again.",
  "pretty please. who raised you. ok. ok.",
] as const;

export function sawThat(deleted: string, swore: boolean): string {
  if (swore)
    return pick([
      "you typed a bad word and deleted it. i'm so proud and so disappointed.",
      "i saw the swear. you coward. say it with your chest.",
    ]);
  if (deleted.length > 160)
    return pick([
      "you deleted a whole paragraph. that's going to the b-side now. forever.",
      "a whole essay, gone. i read it. it was mid.",
    ]);
  return pick([
    "i saw that.",
    "you deleted something. i know. i always know.",
    "typed, deleted. classic you.",
  ]);
}

/** A-16 · bring up what you asked on an earlier day. */
export function yesterday(snippet: string, days: number): string {
  const when =
    days <= 1 ? "yesterday" : days < 7 ? `${days} days ago` : "last week";
  const s = snippet.length > 60 ? `${snippet.slice(0, 57)}…` : snippet;
  return pick([
    `${when} you asked me "${s}". did you do it? you didn't. i can smell it.`,
    `oh look who's back. ${when} it was "${s}". progress report? no? figured.`,
    `${when}: "${s}". i've been thinking about it. not really. maybe a little.`,
  ]);
}

/* ── A-19 · the other voices on the line ─────────────────────────────────── */
export const REWINDER = [
  "ALL TAPE IS TEMPORARY.",
  "RETENTION PERIOD EXPIRED.",
  "RECORDING OVER.",
  "SIDE A · 45 MIN · DO NOT ERASE.",
  "YOU ARE BEING RECORDED.",
  "THE PENCIL IS SHARP.",
] as const;
// the static child only speaks backwards — reversed on screen (A-19 / H-12)
export const CHILD = [
  "he left me in the dark",
  "turn the tape over",
  "the tea is still warm",
  "three thirteen",
  "i was the part that was afraid",
] as const;
export const AFTER_OTHER = [
  "who was that. who were you talking to. don't answer that.",
  "…sorry. bad reception. that wasn't me.",
  "did you hear something? no? good. good.",
  "the line's dirty tonight. ignore whatever that was.",
] as const;

export function otherVoice(kind: "rewinder" | "child"): string {
  if (kind === "rewinder") return pick(REWINDER);
  return pick(CHILD).split("").reverse().join("");
}

/* ── A-20 · messages left on the machine ─────────────────────────────────── */
export interface Recording {
  from: "vortex" | "radio" | "static";
  text: string;
  at: number;
}

const FROM_HIM = [
  "it's me. obviously. you left. the cards started talking. i ate two. you're welcome.",
  "hey. it's vortex. i'm not calling because i miss you. i'm calling because the board is quiet and it's creepy.",
  "you've been gone {h} hours. i counted. i don't have anything else to do. call me back. don't.",
  "this is a recorded message. i rearranged nothing. if something looks different, you're imagining it.",
  "you left a tab open. i stared at it for {h} hours. it stared back.",
];
// the radio lady, talking to someone else — her first appearance in the story
const FROM_RADIO = [
  "…sorry, wrong extension. i was trying to reach… never mind. the tea's still warm, if he asks.",
  "this is dead air, 03.13. if you can hear this — tell him the station's still on.",
  "…is this his line? no. no, of course not. forget i called.",
];
const STATIC_WORDS = ["below", "rewind", "garage", "remember", "thirteen"];

/** 1–3 recordings for an absence of `hours` (deterministic per absence). */
export function recordingsFor(hours: number, since: number): Recording[] {
  const h = Math.max(2, Math.round(hours));
  const out: Recording[] = [
    {
      from: "vortex",
      text: pick(FROM_HIM).replaceAll("{h}", String(h)),
      at: since + 60 * 60_000 * Math.min(h - 1, 1 + Math.random() * (h - 1)),
    },
  ];
  if (hours >= 6 || Math.random() < 0.35)
    out.push({
      from: "radio",
      text: pick(FROM_RADIO),
      at: since + 60 * 60_000 * (0.5 + Math.random() * (h - 1)),
    });
  if (hours >= 12 && Math.random() < 0.6) {
    const w = pick(STATIC_WORDS);
    out.push({
      from: "static",
      text: `shhhhhhkkkkkk… ${w} …kkkhhhhhhhhh`,
      at: since + 60 * 60_000 * (h - 0.5),
    });
  }
  return out.sort((a, b) => a.at - b.at);
}

export const RECORDING_LABEL: Record<Recording["from"], string> = {
  vortex: "VORTEX",
  radio: "UNKNOWN · 03.13",
  static: "NO CALLER ID",
};
