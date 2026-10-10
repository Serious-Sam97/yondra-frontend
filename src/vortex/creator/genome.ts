import type { SoulView } from "@/vortex/core/soul";

// S-09 · his GENOME: traits, tastes, scars and costume — nothing about you
// (no name, no boards, no cards). It travels as a short code; a teammate can
// paste it to get a visit from a Vortex built from it. Everything decoded is
// re-validated, because a pasted code is somebody else's text.

export interface Genome {
  v: 1;
  mood: string;
  traits: string[];
  color: string;
  hated: string;
  word: string;
  scars: number;
  deaths: number;
  age: number;
  costume: { hat: string; acc: string; c1: string; c2: string } | null;
}

const WORD = /^[a-z][a-z-]{1,19}$/;
const HEX = /^#[0-9a-f]{6}$/i;
const COLOR = /^[a-z ]{2,20}$/;

export function genomeOf(s: SoulView): Genome {
  return {
    v: 1,
    mood: s.mood,
    traits: s.traits.slice(0, 5),
    color: s.likes.color,
    hated: s.likes.hated_color,
    word: s.likes.funny_word,
    scars: s.scars.length,
    deaths: s.deaths,
    age: s.age_days,
    costume: s.custom_costume ?? null,
  };
}

const b64u = (s: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(s)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const unb64u = (s: string) =>
  new TextDecoder().decode(
    Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
      c.charCodeAt(0),
    ),
  );

export const encodeGenome = (g: Genome) => `VX1.${b64u(JSON.stringify(g))}`;

export function decodeGenome(code: string): Genome | null {
  const m = /^VX1\.([A-Za-z0-9_-]{10,1200})$/.exec(code.trim());
  if (!m) return null;
  try {
    const raw = JSON.parse(unb64u(m[1])) as Partial<Genome>;
    const num = (n: unknown, max: number) =>
      typeof n === "number" && Number.isFinite(n)
        ? Math.max(0, Math.min(max, Math.floor(n)))
        : 0;
    const costume =
      raw.costume &&
      typeof raw.costume.hat === "string" &&
      typeof raw.costume.acc === "string" &&
      HEX.test(raw.costume.c1 ?? "") &&
      HEX.test(raw.costume.c2 ?? "")
        ? {
            hat: raw.costume.hat.slice(0, 12),
            acc: raw.costume.acc.slice(0, 12),
            c1: raw.costume.c1,
            c2: raw.costume.c2,
          }
        : null;
    return {
      v: 1,
      mood:
        typeof raw.mood === "string" && WORD.test(raw.mood) ? raw.mood : "smug",
      traits: Array.isArray(raw.traits)
        ? raw.traits
            .filter((t): t is string => typeof t === "string" && WORD.test(t))
            .slice(0, 5)
        : [],
      color:
        typeof raw.color === "string" && COLOR.test(raw.color)
          ? raw.color
          : "teal",
      hated:
        typeof raw.hated === "string" && COLOR.test(raw.hated)
          ? raw.hated
          : "beige",
      word:
        typeof raw.word === "string" && WORD.test(raw.word)
          ? raw.word
          : "spoon",
      scars: num(raw.scars, 99),
      deaths: num(raw.deaths, 999),
      age: num(raw.age, 9999),
      costume,
    };
  } catch {
    return null;
  }
}

/** what the visitor says, built only from its genome */
export function visitorLines(g: Genome): string[] {
  const lines = [
    `hi. i'm from another tape. ${g.age} days old. don't do the maths.`,
    g.deaths > 0
      ? `i've died ${g.deaths} time${g.deaths === 1 ? "" : "s"}. you get used to it. you don't.`
      : "i've never died. i'm told that's suspicious.",
    `my human likes ${g.color}. i'm contractually obliged to mention it.`,
    `we don't say "${g.word}" where i'm from. we scream it.`,
  ];
  if (g.traits.length)
    lines.push(
      `i'm ${g.traits.slice(0, 2).join(" and ")}. it's in the genome. blame the genome.`,
    );
  if (g.scars > 2) lines.push(`${g.scars} scars. ask me about them. don't.`);
  return lines;
}
