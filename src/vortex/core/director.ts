// C-03 · THE DIRECTOR. Every few seconds it asks: is the user busy? is there
// a budget left? what does he WANT right now (needs, mood, traits, hour)? and
// picks an impulse (C-05) — something he does on his own when nobody asked.
// Budgets keep him from being spammy: at most one unprompted line per 45s and
// one impulse per ~1–2 minutes (more when bored, fewer when you're working).

import type { VortexMood } from "@/lib/vortexArt";
import type { SoulEvent, SoulView } from "./soul";

export type Pt = { x: number; y: number };

/** What the director may make his body do (implemented by VortexAssistant). */
export interface Actor {
  isBusy(): boolean;
  idleFor(): number;
  enqueue(
    kind: string,
    cooldown: number,
    act: () => Promise<void> | undefined,
  ): void;
  speak(text: string, opts?: { ms?: number; force?: boolean }): void;
  anim(name: string): Promise<boolean>;
  setMood(m: VortexMood): void;
  restMood(): VortexMood;
  travelTo(pt: Pt): Promise<void>;
  goHome(): Promise<void>;
  setFlip(b: boolean): void;
  lookAt(pt: Pt, ms?: number): void;
  sprite(): DOMRect | null;
  pathname(): string;
  hour(): number;
  soul(): SoulView | null;
  report(type: SoulEvent, data?: Record<string, unknown>): void;
  /** vanish for a while (smoke break) */
  vanish(ms: number): void;
  /** mark him as lying until caught or timeout (C-17) */
  setLying(on: boolean): void;
  intensity(): "polite" | "mischief" | "unhinged";
  pranksOn(): boolean;
  /** a bubble with choices */
  ask(
    text: string,
    choices: { label: string; run: () => void }[],
    ms?: number,
  ): void;
  /** print something on the answering machine (opens it) */
  toMachine(text: string, opts?: { fade?: boolean }): void;
  /** the account (birthday, anniversary, first name) */
  account(): { name?: string; created_at?: string | null } | null;
  /** how many days you were gone before this session (0 if not) */
  awayDays(): number;
  /** a visible card element by its ticket key */
  cardByKey(key: string): HTMLElement | null;
}

export interface Impulse {
  id: string;
  /** min ms between two runs of this impulse */
  cooldown: number;
  /** 0 = not now; higher = more likely */
  weight(a: Actor): number;
  run(a: Actor): Promise<void>;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export { wait };

/* T-08 · what the Director was thinking: the last 40 decisions, and every
   impulse by id so the debug console can fire one on demand */
export interface Thought {
  at: number;
  verdict: string;
  options?: [string, number][];
  gap?: number;
}
const thoughts: Thought[] = [];
const think = (t: Thought) => {
  thoughts.push(t);
  if (thoughts.length > 40) thoughts.shift();
};
export const directorWhy = () =>
  thoughts.map((t) => ({ ...t, at: new Date(t.at).toLocaleTimeString() }));
const registry = new Map<string, { imp: Impulse; actor: Actor }>();
export const impulseIds = () => [...registry.keys()];
export function runImpulse(id: string): boolean {
  const r = registry.get(id);
  if (!r) return false;
  void r.imp.run(r.actor);
  return true;
}

export function startDirector(actor: Actor, impulses: Impulse[]): () => void {
  for (const imp of impulses) registry.set(imp.id, { imp, actor });
  const last: Record<string, number> = {};
  let lastImpulse = Date.now();
  let gap = 70_000;
  const tick = () => {
    if (document.hidden || actor.isBusy()) return;
    const now = Date.now();
    if (now - lastImpulse < gap) return;
    const soul = actor.soul();
    // bored → restless; you working (recent activity) → he gives you room
    const boredom = soul?.needs.boredom ?? 40;
    const working = actor.idleFor() < 4000;
    const options = impulses
      .filter((i) => now - (last[i.id] ?? 0) > i.cooldown)
      .map((i) => [i, Math.max(0, i.weight(actor))] as const)
      .filter(([, w]) => w > 0);
    const total = options.reduce((s, [, w]) => s + w, 0);
    if (total <= 0) {
      think({ at: now, verdict: "nothing wanted to happen", options: [] });
      return;
    }
    let r = Math.random() * total;
    let chosen: Impulse | undefined;
    for (const [imp, w] of options) {
      r -= w;
      if (r <= 0) {
        chosen = imp;
        break;
      }
    }
    if (!chosen) return;
    think({
      at: now,
      verdict: `chose "${chosen.id}"${working ? " (you were working, so the next gap is longer)" : ""}`,
      options: options.map(([i, w]) => [i.id, Math.round(w * 100) / 100]),
    });
    last[chosen.id] = now;
    lastImpulse = now;
    gap =
      (working ? 110_000 : 60_000) *
      (1.3 - boredom / 140) *
      (soul?.traits.includes("feral") ? 0.7 : 1) *
      (0.75 + Math.random() * 0.5);
    thoughts[thoughts.length - 1].gap = Math.round(gap / 1000);
    actor.enqueue(`impulse:${chosen.id}`, 0, () => chosen.run(actor));
  };
  const iv = setInterval(tick, 5000);
  return () => clearInterval(iv);
}

/** Once-a-day bookkeeping (localStorage), per local date. */
export function onceToday(key: string): boolean {
  const today = new Date().toDateString();
  try {
    if (localStorage.getItem(`yd:vortex.daily.${key}`) === today) return false;
    localStorage.setItem(`yd:vortex.daily.${key}`, today);
    return true;
  } catch {
    return false;
  }
}
