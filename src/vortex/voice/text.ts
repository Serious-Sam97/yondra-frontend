// Pure text helpers for his voice: the tape glitch (A-06), reading your tone
// (A-14), spotting urgency (A-15), the polite scrub (A-04) and a stable hash
// so every decision about a message is the same on every render and reload.

/** FNV-1a — stable per-string seed. */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic 0..1 from a seed and a salt. */
export function roll(seed: number, salt: number): number {
  return (hash(`${seed}:${salt}`) % 10_000) / 10_000;
}

/* ── the glitch ─────────────────────────────────────────────────────────── */
export const GLITCH = "*kkzzt*";

export type Seg = { t: string; glitch?: boolean };

/**
 * Should this reply hiccup? 1 in ~5 normally, 1 in 2 when he's drunk on
 * entropy, never when serious, never for a reply that's mostly numbers.
 */
export function wantsGlitch(
  text: string,
  mood: string | null | undefined,
  serious?: boolean,
): boolean {
  if (serious || text.length < 24) return false;
  const digits = (text.match(/\d/g) ?? []).length;
  if (digits > text.length * 0.15) return false;
  const p = mood === "drunk" ? 0.5 : mood === "possessed" ? 0.4 : 0.2;
  return roll(hash(text), 1) < p;
}

/**
 * Split a reply into segments with one tape hiccup inside a plain word: the
 * word stutters ("fu-fu—"), then the glitch, then the word again. Never inside
 * numbers, chips ({{card:12}}), ticket keys (YON-12) or code.
 */
export function glitchSegments(text: string): Seg[] {
  const seed = hash(text);
  const words: { start: number; end: number }[] = [];
  const re = /\b[a-z]{4,}\b/g;
  let m: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: classic regex walk
  while ((m = re.exec(text))) {
    const before = text.slice(Math.max(0, m.index - 2), m.index);
    if (before.includes("{") || before.includes("-")) continue;
    words.push({ start: m.index, end: m.index + m[0].length });
  }
  if (words.length === 0) return [{ t: text }];
  // prefer the middle of the reply: it reads like a real hiccup
  const lo = Math.floor(words.length * 0.25);
  const hi = Math.max(lo + 1, Math.ceil(words.length * 0.75));
  const w = words[lo + (seed % (hi - lo))];
  const word = text.slice(w.start, w.end);
  const cut = Math.max(1, Math.min(3, Math.floor(word.length / 2)));
  const stub = word.slice(0, cut);
  return [
    { t: `${text.slice(0, w.start)}${stub}-${stub}— ` },
    { t: GLITCH, glitch: true },
    { t: ` —${text.slice(w.start)}` },
  ];
}

/** Split text that already contains *kkzzt* (the model sometimes writes it). */
export function markGlitches(text: string): Seg[] {
  const parts = text.split(/(\*kk+z+t+\*)/i);
  return parts
    .filter((p) => p !== "")
    .map((p) => (/^\*kk+z+t+\*$/i.test(p) ? { t: p, glitch: true } : { t: p }));
}

/* ── your tone ──────────────────────────────────────────────────────────── */
export type Tone = "stressed" | "chill" | "rude" | "sweet";

const URGENT =
  /\b(urgent|asap|now|quick(ly)?|hurry|deadline|today|prazo|urgente|agora|r[áa]pido|socorro|help)\b|!{2,}/i;
const RUDE =
  /\b(shut up|stupid|idiot|useless|dumb|fuck (you|off)|cala a boca|idiota|in[úu]til|burro|vai se f|porra|caralho)\b/i;
const SWEET =
  /\b(thanks?|thank you|love|cute|sweet|please|pls|obrigad[oa]|valeu|fofo|lindo|por favor|amo)\b|<3|❤/i;

export function isUrgent(text: string): boolean {
  return URGENT.test(text);
}

export function classifyTone(text: string): Tone | null {
  const t = text.trim();
  if (t === "") return null;
  if (RUDE.test(t)) return "rude";
  const letters = t.replace(/[^a-zA-Z]/g, "");
  const caps = letters.length > 6 && letters === letters.toUpperCase();
  if (caps || (isUrgent(t) && t.length < 80)) return "stressed";
  if (SWEET.test(t)) return "sweet";
  if (t.length > 120 || /\b(lol|haha|kkk|hehe)\b/i.test(t)) return "chill";
  return null;
}

/** A question so small he can afford to ignore it (A-09). */
export function isTrivial(text: string): boolean {
  const t = text.trim();
  return (
    t.length < 40 &&
    !t.startsWith("/") &&
    !isUrgent(t) &&
    !/\b(create|make|add|archive|new|crie|criar|adicion|arquiv|move|delete)\b/i.test(
      t,
    )
  );
}

export function isPlease(text: string): "please" | "pretty" | null {
  if (/\bpretty please\b|\bpor favorzinho\b/i.test(text)) return "pretty";
  if (/\b(please|pls|plz|por favor|pfv|pf)\b/i.test(text)) return "please";
  return null;
}

/* ── swearing ───────────────────────────────────────────────────────────── */
const SWEARS: Record<string, string> = {
  motherfucker: "son of a backup",
  fucking: "fudge-adjacent",
  fucked: "demagnetized",
  fuck: "fudge",
  bullshit: "bull-static",
  shit: "static",
  bastard: "buffer",
  bitch: "glitch",
  asshole: "tape-head",
  goddamn: "gosh-darn",
  damn: "darn",
  hell: "heck",
  crap: "crud",
  pissed: "peeved",
  ass: "cassette",
  porra: "poxa",
  caralho: "caramba",
  merda: "meleca",
  puta: "pita",
  foda: "fita",
  cacete: "carambola",
};
const SWEAR_RE = new RegExp(`\\b(${Object.keys(SWEARS).join("|")})\\b`, "gi");

/** Same scrub as the server's polite filter — applied to the live stream too. */
export function polite(text: string): string {
  return text.replace(SWEAR_RE, (w) => SWEARS[w.toLowerCase()] ?? w);
}
export function hasSwear(text: string): boolean {
  SWEAR_RE.lastIndex = 0;
  const yes = SWEAR_RE.test(text);
  SWEAR_RE.lastIndex = 0;
  return yes;
}

/* ── chips ──────────────────────────────────────────────────────────────── */
export type ChipRef = { type: "card" | "board" | "project"; id: number };
const CHIP_RE = /\{\{(card|board|project):(\d+)\}\}/g;

export function chipRefs(text: string): ChipRef[] {
  const out: ChipRef[] = [];
  for (const m of text.matchAll(CHIP_RE))
    out.push({ type: m[1] as ChipRef["type"], id: Number(m[2]) });
  return out;
}
export type Piece = { t: string } | { chip: ChipRef };
export function splitChips(text: string): Piece[] {
  const out: Piece[] = [];
  let last = 0;
  for (const m of text.matchAll(CHIP_RE)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ t: text.slice(last, i) });
    out.push({ chip: { type: m[1] as ChipRef["type"], id: Number(m[2]) } });
    last = i + m[0].length;
  }
  if (last < text.length) out.push({ t: text.slice(last) });
  return out;
}
