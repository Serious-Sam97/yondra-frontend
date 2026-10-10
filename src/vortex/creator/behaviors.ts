import type { VortexMood } from "@/lib/vortexArt";
import type { VortexEvent } from "@/lib/vortexBus";
import { body, say } from "@/vortex/weird/bridge";

// S-10 · registerBehavior(): how any feature of Yondra teaches him to react to
// it without touching his core. A behavior names the pages it cares about,
// what he does when you arrive, and how he reacts to bus events there. The
// runner (Creator.tsx) enforces the manners: one entrance per page visit,
// reactions rate-limited per behavior, nothing while the chat is open.
//
//   registerBehavior({
//     id: "studio",
//     match: (path) => path === "/studio",
//     enter: (v) => v.say("the studio. try not to make a hit. i'd get jealous."),
//     on: { "card.moved": (e, v) => e.done && v.anim("slowclap") },
//     cooldownMs: 20_000,
//   });

export interface BehaviorApi {
  say(text: string, mood?: VortexMood): void;
  mood(m: VortexMood): void;
  anim(name: string): void;
  travel(x: number, y: number): void;
  home(): void;
}

export interface Behavior {
  id: string;
  match: (pathname: string) => boolean;
  /** once per visit to a matching page (after a short beat) */
  enter?: (v: BehaviorApi, pathname: string) => void;
  /** bus events while on a matching page */
  on?: Partial<{
    [K in VortexEvent["type"]]: (
      e: Extract<VortexEvent, { type: K }>,
      v: BehaviorApi,
    ) => void;
  }>;
  /** minimum gap between two reactions of this behavior (default 15 s) */
  cooldownMs?: number;
}

const REGISTRY = new Map<string, Behavior>();

export function registerBehavior(b: Behavior): () => void {
  REGISTRY.set(b.id, b);
  return () => REGISTRY.delete(b.id);
}
export function behaviorsFor(pathname: string): Behavior[] {
  return [...REGISTRY.values()].filter((b) => {
    try {
      return b.match(pathname);
    } catch {
      return false;
    }
  });
}

export const behaviorApi: BehaviorApi = {
  say: (t, m) => say(t, m),
  mood: (m) => body({ cmd: "mood", mood: m }),
  anim: (name) => body({ cmd: "anim", name }),
  travel: (x, y) => body({ cmd: "travel", x, y }),
  home: () => body({ cmd: "home" }),
};

/* ── the first citizens: pages from the later fitas declare themselves ── */
registerBehavior({
  id: "studio",
  match: (p) => p === "/studio",
  enter: (v) =>
    v.say("the studio. try not to write a hit. i'd get jealous.", "smug"),
});
registerBehavior({
  id: "zine",
  match: (p) => p === "/zine",
  enter: (v) => {
    v.anim("chefkiss");
    v.say(
      "my zine. my face. my words. print it in colour or don't print it at all.",
    );
  },
});
registerBehavior({
  id: "jcard",
  match: (p) => p.startsWith("/jcard/"),
  enter: (v) =>
    v.say(
      "a j-card. for a real tape. you own a real tape? …you own a real tape.",
      "love",
    ),
});
registerBehavior({
  id: "sprint-report",
  match: (p) => /^\/boards\/\d+\/report\//.test(p),
  enter: (v) =>
    v.say(
      "a report. there's a vortex edition, you know. top right. it has opinions.",
      "judging",
    ),
  on: {
    "card.opened": (_e, v) => v.anim("eyeroll"),
  },
  cooldownMs: 30_000,
});
