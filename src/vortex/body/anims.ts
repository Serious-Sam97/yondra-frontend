// B-20 · the animation library. Every later phase just calls
// `animator.play("sulk")`: a named, declarative timeline of mood changes,
// gestures, lines, sounds and body impulses, with priorities — a reaction can
// interrupt idle business, fear interrupts everything, and a non-interruptible
// beat holds until it ends.

import type { VortexSoundName } from "@/components/vortex/vortexSound";
import type { VortexMood } from "@/lib/vortexArt";
import type { BodyEngine } from "./engine";
import type { GestureName } from "./gestures";

export interface AnimCtx {
  setMood(m: VortexMood): void;
  restMood(): VortexMood;
  gesture(g: GestureName): Promise<void>;
  say(text: string): void;
  flash(cls: string, ms: number): void;
  sound(name: VortexSoundName): void;
  body(): BodyEngine | null;
}

export interface Step {
  at: number;
  mood?: VortexMood | "rest";
  gesture?: GestureName;
  say?: string | string[];
  flash?: [string, number];
  sound?: VortexSoundName;
  dilate?: number;
  breath?: number;
  squash?: number;
  kick?: number;
  lying?: boolean;
  blink?: boolean;
  run?: (ctx: AnimCtx) => void;
}

interface Anim {
  steps: Step[];
  priority: number;
  interruptible: boolean;
  /** total length; defaults to the last step + 600ms */
  ms?: number;
}

const LIB = new Map<string, Anim>();

export function defineAnim(
  name: string,
  steps: Step[],
  opts: { priority?: number; interruptible?: boolean; ms?: number } = {},
) {
  LIB.set(name, {
    steps: [...steps].sort((a, b) => a.at - b.at),
    priority: opts.priority ?? 1,
    interruptible: opts.interruptible ?? true,
    ms: opts.ms,
  });
}

export function hasAnim(name: string) {
  return LIB.has(name);
}
/** S-05 · read an animation back (for the timeline editor) */
export function animSpec(name: string) {
  const a = LIB.get(name);
  return a
    ? {
        steps: a.steps.map((s) => ({ ...s })),
        priority: a.priority,
        interruptible: a.interruptible,
        ms: a.ms,
      }
    : null;
}
export function animNames() {
  return [...LIB.keys()];
}

const pick = (s: string | string[]) =>
  Array.isArray(s) ? s[Math.floor(Math.random() * s.length)] : s;

export function createAnimator(ctx: AnimCtx) {
  let current: { name: string; anim: Anim; cancel: () => void } | null = null;

  const play = (name: string): Promise<boolean> => {
    const anim = LIB.get(name);
    if (!anim) return Promise.resolve(false);
    if (current) {
      const blocked =
        !current.anim.interruptible || current.anim.priority > anim.priority;
      if (blocked) return Promise.resolve(false);
      current.cancel();
    }
    return new Promise<boolean>((resolve) => {
      const timers: ReturnType<typeof setTimeout>[] = [];
      let done = false;
      const end = (ok: boolean) => {
        if (done) return;
        done = true;
        for (const t of timers) clearTimeout(t);
        const b = ctx.body();
        b?.lying(false);
        b?.breath(1);
        b?.dilate(1);
        if (current?.name === name) current = null;
        resolve(ok);
      };
      current = { name, anim, cancel: () => end(false) };
      for (const s of anim.steps) {
        timers.push(
          setTimeout(() => {
            const b = ctx.body();
            if (s.mood)
              ctx.setMood(s.mood === "rest" ? ctx.restMood() : s.mood);
            if (s.gesture) void ctx.gesture(s.gesture);
            if (s.say) ctx.say(pick(s.say));
            if (s.flash) ctx.flash(s.flash[0], s.flash[1]);
            if (s.sound) ctx.sound(s.sound);
            if (s.dilate !== undefined) b?.dilate(s.dilate);
            if (s.breath !== undefined) b?.breath(s.breath);
            if (s.squash !== undefined) b?.squash(s.squash);
            if (s.kick !== undefined) b?.kick(s.kick);
            if (s.lying !== undefined) b?.lying(s.lying);
            if (s.blink) b?.blink(true);
            s.run?.(ctx);
          }, s.at),
        );
      }
      const last = anim.steps[anim.steps.length - 1]?.at ?? 0;
      timers.push(setTimeout(() => end(true), anim.ms ?? last + 600));
    });
  };

  return {
    play,
    current: () => current?.name ?? null,
    stop: () => current?.cancel(),
  };
}
export type Animator = ReturnType<typeof createAnimator>;

/* ─────────────────────────── the library ─────────────────────────── */

defineAnim("eyeroll", [
  { at: 0, mood: "bored", gesture: "eyeroll" },
  { at: 1200, mood: "rest" },
]);
defineAnim("scoff", [
  { at: 0, mood: "smug", gesture: "scoff", squash: 0.15 },
  { at: 1000, mood: "rest" },
]);
defineAnim("facepalm", [
  { at: 0, mood: "judging", gesture: "facepalm" },
  {
    at: 500,
    say: ["unbelievable.", "i can't look at this.", "why are you like this."],
  },
  { at: 2000, mood: "rest" },
]);
defineAnim("shrug", [
  { at: 0, mood: "bored", gesture: "shrug" },
  { at: 1400, mood: "rest" },
]);
defineAnim("point", [
  { at: 0, mood: "judging", gesture: "point" },
  { at: 1800, mood: "rest" },
]);
defineAnim("slowclap", [
  { at: 0, mood: "sideeye", gesture: "slowclap" },
  ...[0, 1, 2].map((i) => ({ at: 420 + i * 650, sound: "click" as const })),
  { at: 2500, mood: "rest" },
]);
defineAnim("sulk", [
  { at: 0, mood: "sulking", gesture: "crossarms", breath: 0.6 },
  { at: 900, say: ["no.", "not talking.", "…"] },
  { at: 2700, mood: "rest" },
]);
defineAnim("chefkiss", [
  { at: 0, mood: "smug", gesture: "chefkiss" },
  {
    at: 700,
    sound: "click",
    say: ["perfection. mine, obviously.", "*mwah*. art."],
  },
  { at: 1700, mood: "rest" },
]);
defineAnim("jazzhands", [
  { at: 0, mood: "hysterical", gesture: "jazzhands", kick: 0.6 },
  {
    at: 300,
    say: ["wooooow. amazing. so impressed.", "incredible. truly. jazz hands."],
  },
  { at: 1900, mood: "rest" },
]);
defineAnim("throwup", [
  { at: 0, mood: "disgust", squash: 0.25 },
  { at: 300, gesture: "throwup", sound: "hiss" },
  { at: 1700, mood: "dizzy" },
  { at: 2600, mood: "rest" },
]);
defineAnim(
  "startle",
  [
    {
      at: 0,
      mood: "shocked",
      flash: ["vxa-startle", 600],
      dilate: 0.5,
      kick: 2,
    },
    { at: 900, mood: "rest" },
  ],
  { priority: 3 },
);
defineAnim(
  "terror",
  [
    { at: 0, mood: "terror", dilate: 0.45, breath: 2.6, gesture: "shiver" },
    { at: 2600, mood: "rest" },
  ],
  { priority: 4 },
);
defineAnim("paranoid-glance", [
  { at: 0, mood: "paranoid", dilate: 0.7 },
  { at: 1800, mood: "rest" },
]);
defineAnim("lie", [
  { at: 0, mood: "lying", lying: true },
  { at: 4000, mood: "rest", lying: false },
]);
defineAnim(
  "cry",
  [
    { at: 0, mood: "crying", breath: 1.6 },
    { at: 5200, mood: "rest" },
  ],
  { priority: 2 },
);
defineAnim("love", [
  { at: 0, mood: "love", dilate: 1.5, kick: 1 },
  { at: 2600, mood: "embarrassed" },
  { at: 3400, say: ["…that didn't happen.", "anyway."] },
  { at: 4000, mood: "rest" },
]);
defineAnim("gloat", [
  { at: 0, mood: "malicious", gesture: "fingerguns" },
  { at: 500, say: ["called it.", "i'm never wrong. it's exhausting."] },
  { at: 1800, mood: "rest" },
]);
defineAnim("jelly", [{ at: 0, squash: 0.35 }], { ms: 500 });
defineAnim("spin-dizzy", [
  { at: 0, kick: 4, flash: ["vxa-spin", 1000] },
  { at: 900, mood: "dizzy" },
  { at: 2800, mood: "rest" },
]);
defineAnim(
  "squeezed",
  [
    { at: 0, mood: "shocked", flash: ["vxr-squeezed", 700], dilate: 1.6 },
    { at: 150, say: ["!!!", "PERSONAL SPACE.", "i'm not a stress ball!!"] },
    { at: 900, mood: "rest" },
  ],
  { priority: 2 },
);
defineAnim(
  "hold-breath",
  [{ at: 0, mood: "shocked", breath: 0, dilate: 1.4 }],
  { ms: 60_000 },
);
defineAnim(
  "cover-eyes",
  [
    { at: 0, mood: "terror", gesture: "covereyes" },
    { at: 2300, mood: "rest" },
  ],
  { priority: 3 },
);
defineAnim("count-fingers", [
  { at: 0, mood: "focused", gesture: "count" },
  { at: 2300, mood: "rest" },
]);
defineAnim(
  "die",
  [
    { at: 0, mood: "terror", breath: 3, gesture: "shiver" },
    { at: 1400, flash: ["vxr-dying", 2600], sound: "rewind" },
    { at: 2600, mood: "dead", breath: 0 },
  ],
  { priority: 9, interruptible: false, ms: 4000 },
);
defineAnim(
  "reform",
  [
    { at: 0, mood: "dead", flash: ["vxr-reform", 2200] },
    { at: 1400, mood: "dormant", blink: true },
    { at: 2400, mood: "shocked" },
    {
      at: 3000,
      say: [
        "…did i miss anything.",
        "i'm back. i think. something's different.",
      ],
    },
    { at: 3800, mood: "rest" },
  ],
  { priority: 9, interruptible: false },
);
defineAnim("dream", [{ at: 0, mood: "dreaming", breath: 0.5 }], { ms: 12_000 });
defineAnim("sleep", [{ at: 0, mood: "asleep", breath: 0.45 }], { ms: 60_000 });
defineAnim(
  "seethe",
  [
    { at: 0, mood: "seething", breath: 1.8 },
    { at: 2200, mood: "fury", squash: 0.3, kick: 3, flash: ["vxr-shake", 600] },
    { at: 3400, mood: "rest" },
  ],
  { priority: 2 },
);
