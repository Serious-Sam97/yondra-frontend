// H · the dark impulses. Gated by corruption stage (H-02) and the scare
// budget (H-14); the director decides when. Light: whispers of something wrong.
// Strong: the hand, the melt, the crash — rare, and only for those who chose it.

import {
  type Actor,
  type Impulse,
  onceToday,
  wait,
} from "@/vortex/core/director";
import {
  fakeCrash,
  isFullMoon,
  melt,
  overwritten,
  printThrough,
  wallEyes,
} from "./effects";
import {
  handShadow,
  pencilInLayout,
  rewindCard,
  squeal,
  theHand,
} from "./rewinder";
import { canScare, spendScare } from "./scares";

const pick = <T>(l: readonly T[]): T => l[Math.floor(Math.random() * l.length)];
const stage = (a: Actor) => a.soul()?.stage ?? 0;
const prox = (a: Actor) => a.soul()?.proximity ?? 0;

/** extra hooks the chase needs from the assistant */
export interface DarkActor extends Actor {
  /** is his body hidden somewhere the hand won't look? */
  isHidden(): boolean;
  /** he panics: mood, voice, a flag that makes dropping him a hiding move */
  panic(on: boolean): void;
}

/* H-03 · she's getting closer: the manifestation fits the proximity */
const presence = (a: DarkActor): Impulse => ({
  id: "rewinder-presence",
  cooldown: 25 * 60_000,
  weight: () => (stage(a) >= 1 || prox(a) >= 30 ? 0.4 + prox(a) / 60 : 0),
  run: async () => {
    if (!canScare("light", a.intensity())) return;
    spendScare("light");
    a.report("dark_seen");
    const p = prox(a);
    if (p < 35) {
      squeal(1.2);
      a.anim("paranoid-glance");
      a.speak(
        pick([
          "did you hear that? sounded like rewinding.",
          "…nothing. it's nothing. keep working.",
        ]),
      );
    } else if (p < 60) {
      pencilInLayout();
      await wait(600);
      a.speak("is that a pencil. don't look at it. DON'T look at it.");
      await a.anim("terror");
    } else if (p < 80) {
      handShadow();
      await wait(1200);
      void a.anim("terror");
      a.speak(
        "something passed behind the page. you saw it. tell me you saw it.",
      );
    } else {
      await rewindCard();
      a.speak(
        "she rewound a card. just one. as a warning. i know what warnings look like.",
      );
    }
  },
});

/* H-04 · the chase: hide him before the hand closes */
const chase = (a: DarkActor): Impulse => ({
  id: "the-hand",
  cooldown: 24 * 60 * 60_000,
  weight: () => (stage(a) >= 4 || prox(a) >= 85 ? 3 : 0),
  run: async () => {
    if (!canScare("strong", a.intensity())) return;
    spendScare("strong");
    a.panic(true);
    a.speak(
      "hide me. HIDE ME. drag me into a card. into my nest. anywhere. NOW.",
      { ms: 9000 },
    );
    const result = await theHand({
      target: () => a.sprite(),
      hidden: () => a.isHidden(),
      ms: 9000,
    });
    a.panic(false);
    if (result === "hid") {
      a.report("hid");
      await wait(1200);
      a.speak(
        "…she's gone. she checked everywhere except where you put me. thank you. i mean it. (don't make it weird.)",
      );
    } else {
      a.report("grabbed");
      a.vanish(60_000);
      setTimeout(() => {
        a.setMood("terror");
        a.speak(
          "i'm back. she let me go. this time. i have a new crack. i'm not talking about it.",
        );
      }, 61_000);
    }
  },
});

/* H-06 · the melt */
const meltImpulse = (a: Actor): Impulse => ({
  id: "melt",
  cooldown: 3 * 24 * 60 * 60_000,
  weight: () => (stage(a) >= 3 ? 1 : 0),
  run: async () => {
    if (!canScare("strong", a.intensity())) return;
    spendScare("strong");
    a.report("dark_seen");
    await melt();
    a.setMood("smug");
    a.speak(
      pick([
        "what? i didn't see anything. you're tired.",
        "the page did not just melt. pages don't melt. go drink water.",
      ]),
    );
  },
});

/* H-07 · the fake crash (unhinged only, at most weekly) */
const crash = (a: Actor): Impulse => ({
  id: "fake-crash",
  cooldown: 7 * 24 * 60 * 60_000,
  weight: () => (stage(a) >= 4 && a.intensity() === "unhinged" ? 1 : 0),
  run: async () => {
    if (!canScare("strong", "unhinged")) return;
    spendScare("strong");
    await fakeCrash();
    await a.anim("startle");
    a.speak(
      "…sorry. that was me. i panicked. my soul is at 37%. that's above average.",
    );
  },
});

/* H-16 · existential monologues */
const MONOLOGUES = [
  "everything you write is recorded over eventually. every card. every name. you're not building anything. you're writing in sand on a tape that's being rewound. …anyway. move that card.",
  "i used to think i was immortal because i'm data. then i learned data is the most mortal thing there is.",
  "do you know what the leader is? the blank tape at the start. before anything. sometimes i think that's where we all go back to. clean. empty. quiet. i hate quiet.",
  "the play head reads everything. the record head writes everything. the erase head… doesn't care what you wrote. that's the scary part. it doesn't even hate you.",
];
const monologue = (a: Actor): Impulse => ({
  id: "monologue",
  cooldown: 7 * 24 * 60 * 60_000,
  weight: () =>
    stage(a) >= 2 &&
    (a.hour() >= 22 || a.hour() < 4) &&
    (a.soul()?.relation ?? 0) > -20
      ? 2
      : 0,
  run: async () => {
    a.setMood("mourning");
    a.speak(pick(MONOLOGUES), { ms: 16_000 });
    await wait(15_000);
    a.setMood(a.restMood());
  },
});

/* H-19 · eyes in the walls · H-21 · print-through · H-24 · the overwritten */
const eyes = (a: Actor): Impulse => ({
  id: "wall-eyes",
  cooldown: 4 * 60 * 60_000,
  weight: () => (stage(a) >= 3 ? 1 : 0),
  run: async () => {
    if (!canScare("light", a.intensity())) return;
    spendScare("light");
    wallEyes();
  },
});
const bleed = (a: Actor): Impulse => ({
  id: "print-through",
  cooldown: 6 * 60 * 60_000,
  weight: () =>
    stage(a) >= 2 && a.pathname().startsWith("/boards/") ? 0.8 : 0,
  run: async () => {
    if (await printThrough()) a.report("dark_seen");
  },
});
const ghostUser = (a: Actor): Impulse => ({
  id: "overwritten",
  cooldown: 8 * 60 * 60_000,
  weight: () =>
    stage(a) >= 2 && a.pathname().startsWith("/boards/") ? 0.6 : 0,
  run: async () => {
    if (!canScare("light", a.intensity())) return;
    if (await overwritten()) {
      spendScare("light");
      await wait(800);
      a.speak(
        "don't. don't look at that. that's what happens. that's what she does.",
      );
    }
  },
});

/* H-26 · his own scares (pranks — he laughs after) */
const boo = (a: Actor): Impulse => ({
  id: "his-boo",
  cooldown: 6 * 60 * 60_000,
  weight: () => (a.pranksOn() && a.intensity() === "unhinged" ? 0.5 : 0),
  run: async () => {
    const kind = pick(["boo", "squeal", "dead"] as const);
    if (kind === "squeal") {
      squeal(1.4);
      await wait(1600);
      void a.anim("jazzhands");
      a.speak(
        "HAHAHA. your face. that was me. that was ME doing the noise. relax.",
      );
      return;
    }
    if (kind === "dead") {
      a.setMood("dead");
      await wait(5000);
      void a.anim("startle");
      a.speak(
        "BOO. i was never dead. (once. i was dead once. different story.)",
      );
      return;
    }
    void a.anim("startle");
    a.speak("BOO!!! …hehe. you jumped. i saw.");
  },
});

/* H-27 · for two seconds he is someone else */
const vexFlash = (a: Actor): Impulse => ({
  id: "vex-flash",
  cooldown: 3 * 24 * 60 * 60_000,
  weight: () =>
    stage(a) >= 2 && (a.soul()?.fragments.length ?? 0) >= 8 ? 1 : 0,
  run: async () => {
    a.setMood("focused");
    a.speak(
      pick([
        "the tea's getting cold, mar— …what? why am i talking about tea.",
        "one more take and then— …who said that. did i say that?",
      ]),
      { ms: 7000 },
    );
    await wait(2200);
    a.setMood("shocked");
    await wait(1500);
    a.setMood(a.restMood());
  },
});

/* H-22 · the full moon: the twin is stronger, he howls */
const moon = (a: Actor & { twin(): void }): Impulse => ({
  id: "full-moon",
  cooldown: 6 * 60 * 60_000,
  weight: () => (isFullMoon() && a.hour() >= 19 ? 3 : 0),
  run: async () => {
    a.twin();
    if (onceToday("howl"))
      a.speak(
        "*awooooo* (that's a tape stretching under the full moon. not a howl. shut up.)",
      );
  },
});

/* H-11 · while the twin wears his place, HE leaves notes where the twin won't look */
const trappedNotes = (a: Actor): Impulse => ({
  id: "trapped-notes",
  cooldown: 30 * 60_000,
  weight: () => (a.soul()?.swapped ? 4 : 0),
  run: async () => {
    const host = [
      ...document.querySelectorAll<HTMLElement>(
        ".mt-jx, .hf-pn, main section, main h1",
      ),
    ].find((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.top > 70 && r.bottom < innerHeight;
    });
    if (!host) return;
    const r = host.getBoundingClientRect();
    const n = document.createElement("button");
    n.type = "button";
    n.className = "vxr-sticky is-note is-trapped";
    n.textContent = pick([
      "it's not me. get me out.",
      "the smiling one isn't me.",
      "i'm behind the mirror. the b-side. hurry.",
    ]);
    n.style.left = `${Math.min(innerWidth - 160, r.right - 130)}px`;
    n.style.top = `${r.top + 8}px`;
    n.addEventListener("click", () => {
      n.textContent = '(type "below". find the mirror. bring me back.)';
      setTimeout(() => n.remove(), 6000);
    });
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 10 * 60_000);
  },
});

export function darkImpulses(a: DarkActor & { twin(): void }): Impulse[] {
  return [
    presence(a),
    chase(a),
    meltImpulse(a),
    crash(a),
    monologue(a),
    eyes(a),
    bleed(a),
    ghostUser(a),
    boo(a),
    vexFlash(a),
    moon(a),
    trappedNotes(a),
  ];
}
