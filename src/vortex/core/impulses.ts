// C-05 · IMPULSES — what he does when nobody asked. Each one has a weight that
// depends on his needs, mood, traits, the hour and the page, so a bored ghost
// explores, a hungry one stalks late cards, a paranoid one stares at corners.
// Also: the daily routines (C-15), lies (C-17), opinions (C-20), fears and
// superstitions (C-22), short memory (C-23) and territory (C-24).

import { type Actor, type Impulse, onceToday, type Pt, wait } from "./director";

const pick = <T>(l: readonly T[]): T => l[Math.floor(Math.random() * l.length)];
const onScreen = (el: Element) => {
  const r = el.getBoundingClientRect();
  return (
    r.width > 0 &&
    r.top >= 60 &&
    r.bottom <= innerHeight &&
    r.left >= 0 &&
    r.right <= innerWidth
  );
};
const visibleCards = () =>
  Array.from(
    document.querySelectorAll<HTMLElement>(".mt-jx[data-card-id]"),
  ).filter(onScreen);
const beside = (r: DOMRect): Pt =>
  innerWidth - r.right > 160
    ? { x: r.right + 54, y: r.top + Math.min(r.height / 2, 80) }
    : { x: r.left - 54, y: r.top + Math.min(r.height / 2, 80) };
const title = (card: HTMLElement) =>
  card.querySelector(".tt")?.textContent?.trim() ??
  card.dataset.vxKey ??
  "this card";
const needs = (a: Actor) =>
  a.soul()?.needs ?? {
    hunger: 40,
    boredom: 40,
    sanity: 70,
    loneliness: 30,
    ego: 60,
    energy: 70,
  };
const mood = (a: Actor) => a.soul()?.mood ?? "smug";
const unhinged = (a: Actor) => a.intensity() === "unhinged";

/* ── C-05 · the core impulses ─────────────────────────────────────────── */

const explore: Impulse = {
  id: "explore",
  cooldown: 4 * 60_000,
  weight: (a) => 1 + needs(a).boredom / 30,
  run: async (a) => {
    // the corners nobody looks at: the footer, the far right, the very top
    const spots: [Pt, string][] = [
      [
        { x: innerWidth - 120, y: innerHeight - 90 },
        "you have a footer. did you know you have a footer.",
      ],
      [
        { x: innerWidth - 140, y: 150 },
        "nobody ever comes up here. it smells like unused settings.",
      ],
      [
        { x: innerWidth / 2, y: innerHeight - 70 },
        "the bottom of the page. the floor of reality. dusty.",
      ],
    ];
    const [pt, line] = pick(spots);
    a.setMood("curious");
    await a.travelTo(pt);
    a.speak(line);
    await wait(3800);
    await a.goHome();
  },
};

const readCard: Impulse = {
  id: "read-card",
  cooldown: 6 * 60_000,
  weight: (a) =>
    a.pathname().startsWith("/boards/") && visibleCards().length ? 1.6 : 0,
  run: async (a) => {
    const card = pick(visibleCards());
    if (!card) return;
    a.setMood("smug");
    await a.travelTo(beside(card.getBoundingClientRect()));
    const t = title(card);
    a.speak(
      pick([
        `*clears throat* "${t}". a tragedy in one act.`,
        `"${t}". read it slowly. "${t}". no, it doesn't get better.`,
        `presenting: "${t}". written by a human, in a hurry, at 5pm.`,
      ]),
      { ms: 7000 },
    );
    await a.anim("chefkiss");
    await wait(4500);
    await a.goHome();
  },
};

const chaseCursor: Impulse = {
  id: "chase",
  cooldown: 8 * 60_000,
  weight: (a) => (a.idleFor() < 3000 ? 0.8 + needs(a).boredom / 60 : 0),
  run: async (a) => {
    a.setMood("curious");
    let last: Pt | null = null;
    const move = (e: PointerEvent) => {
      last = { x: e.clientX, y: e.clientY };
    };
    addEventListener("pointermove", move, { passive: true });
    const until = Date.now() + 6000;
    while (Date.now() < until) {
      if (last) {
        const p = last as Pt;
        await a.travelTo({ x: p.x - 110, y: p.y + 40 });
      }
      await wait(500);
    }
    removeEventListener("pointermove", move);
    a.speak(
      pick([
        "…i wasn't following you.",
        "you dropped something. it was your dignity.",
      ]),
    );
    await wait(1500);
    await a.goHome();
  },
};

const hum: Impulse = {
  id: "hum",
  cooldown: 10 * 60_000,
  weight: (a) => (mood(a) === "smug" || mood(a) === "happy" ? 0.9 : 0.3),
  run: async (a) => {
    a.speak(
      pick([
        "♪ dum dum dum… rewinding… ♪",
        "♪ all tape is temporary, la la la ♪",
        "♪ hmm hmm. don't listen. ♪",
      ]),
      { ms: 4000 },
    );
    await a.anim("shrug");
  },
};

const stareCorner: Impulse = {
  id: "stare-corner",
  cooldown: 12 * 60_000,
  weight: (a) => (needs(a).sanity < 50 ? 2 : 0.4) + (a.hour() < 5 ? 1 : 0),
  run: async (a) => {
    a.lookAt({ x: innerWidth - 4, y: 4 }, 5200);
    await a.anim("paranoid-glance");
    await wait(4200);
    if (Math.random() < 0.5)
      a.speak(
        pick(["…", "nothing. it's nothing.", "did that corner just move."]),
      );
  },
};

const daydream: Impulse = {
  id: "daydream",
  cooldown: 12 * 60_000,
  weight: (a) => (needs(a).energy < 45 ? 1.4 : 0.4),
  run: async (a) => {
    await a.anim("dream");
    if (Math.random() < 0.6)
      a.speak(
        pick([
          "…the tea's still warm…",
          "…three thirteen… three thirteen…",
          "…whose garage is this…",
        ]),
        { ms: 4500 },
      );
  },
};

const workProject: Impulse = {
  id: "work-project",
  cooldown: 15 * 60_000,
  weight: (a) => (a.soul()?.agenda.some((g) => g.col === "doing") ? 0.8 : 0),
  run: async (a) => {
    const doing = a.soul()?.agenda.filter((g) => g.col === "doing") ?? [];
    const g = pick(doing);
    if (!g) return;
    await a.anim("count-fingers");
    a.speak(
      `working on "${g.title}". ${g.progress}% done. don't look at my board.`,
    );
  },
};

/* ── C-17 · he lies ──────────────────────────────────────────────────── */
const LIES = [
  "i moved a card for you while you weren't looking. you're welcome.",
  "i've been awake all night guarding your board.",
  "i didn't eat anything today. nothing. not even a backlog item.",
  "i fixed three bugs while you were gone. they're invisible now.",
  "the radio? what radio. there's no radio.",
];
const lie: Impulse = {
  id: "lie",
  cooldown: 20 * 60_000,
  weight: (a) => (a.soul()?.traits.includes("honest-ish") ? 0.2 : 0.6),
  run: async (a) => {
    a.setLying(true);
    void a.anim("lie");
    a.speak(pick(LIES), { ms: 8000 });
    await wait(8000);
    a.setLying(false);
  },
};

/* ── C-20 · opinions ─────────────────────────────────────────────────── */
const opinion: Impulse = {
  id: "opinion",
  cooldown: 20 * 60_000,
  weight: (a) => (a.soul() && a.pathname().startsWith("/boards/") ? 0.7 : 0),
  run: async (a) => {
    const s = a.soul();
    if (!s) return;
    const word = s.likes.funny_word.toLowerCase();
    const card = visibleCards().find((c) =>
      title(c).toLowerCase().includes(word),
    );
    if (card) {
      await a.travelTo(beside(card.getBoundingClientRect()));
      a.speak(
        `"${word}". hahaha. HAHAHA. "${word}". i'm sorry. it's just. "${word}".`,
      );
      await a.anim("jazzhands");
      await wait(3000);
      await a.goHome();
      return;
    }
    a.speak(
      pick([
        `my favourite label colour is ${s.likes.color}. i'm telling you in case you want to make me happy. you won't.`,
        `${s.likes.hated_color} labels make me physically ill. i'm a ghost. it's impressive.`,
        `${s.likes.board_type} boards are the only honest boards. fight me.`,
      ]),
    );
  },
};

/* ── C-22 · fears ────────────────────────────────────────────────────── */
const fearPencil: Impulse = {
  id: "fear-pencil",
  cooldown: 30 * 60_000,
  weight: () =>
    visibleCards().some((c) =>
      /\b(pencil|l[áa]pis|rewind|rebobin)/i.test(title(c)),
    )
      ? 6
      : 0,
  run: async (a) => {
    await a.anim("terror");
    a.speak(
      pick([
        "is that a PENCIL. on your board. why would you do this to me.",
        "that card says pencil. i'm leaving. i'm not leaving. i'm frozen.",
      ]),
    );
    a.report("dark_seen");
  },
};

/* ── C-15 · routines ─────────────────────────────────────────────────── */
const breakfast: Impulse = {
  id: "breakfast",
  cooldown: 60 * 60_000,
  weight: (a) => (a.hour() >= 6 && a.hour() < 11 ? 3 : 0),
  run: async (a) => {
    if (!onceToday("breakfast")) return;
    a.setMood("hungry");
    a.speak(
      unhinged(a)
        ? "breakfast. *eats the oldest thing in your backlog* tastes like a fucking deadline from march."
        : "breakfast. *nibbles the oldest card in your backlog* stale. like your plans.",
    );
    a.report("ate");
    await wait(3000);
    a.setMood(a.restMood());
  },
};
const morningReview: Impulse = {
  id: "morning-review",
  cooldown: 60 * 60_000,
  weight: (a) =>
    a.pathname().startsWith("/boards/") && a.hour() < 13 ? 2.5 : 0,
  run: async (a) => {
    if (!onceToday("review")) return;
    const racks = Array.from(
      document.querySelectorAll<HTMLElement>("[data-vx-rack]"),
    ).filter(onScreen);
    a.setMood("judging");
    for (const r of racks.slice(0, 4)) {
      const b = r.getBoundingClientRect();
      await a.travelTo({ x: b.left + b.width / 2, y: b.top + 40 });
      await wait(350);
    }
    const late = document.querySelectorAll(".mt-jx[data-vx-late]").length;
    const grade = Math.max(1, 10 - late * 2 - Math.floor(Math.random() * 2));
    a.speak(
      `morning inspection: ${grade}/10. ${late ? `${late} late card${late === 1 ? "" : "s"}. disgusting.` : "nothing late. suspicious."}`,
    );
    await wait(2500);
    await a.goHome();
  },
};
const smokeBreak: Impulse = {
  id: "smoke-break",
  cooldown: 3 * 60 * 60_000,
  weight: (a) => (a.hour() >= 14 && a.hour() < 17 ? 1.5 : 0),
  run: async (a) => {
    if (!onceToday("smoke")) return;
    a.speak("smoke break. i don't smoke. i AM smoke. back in three.");
    await wait(2500);
    a.vanish(3 * 60_000);
  },
};
const nightRitual: Impulse = {
  id: "night-ritual",
  cooldown: 3 * 60 * 60_000,
  weight: (a) =>
    a.hour() >= 21 && a.pathname().startsWith("/boards/") ? 2 : 0,
  run: async (a) => {
    if (!onceToday("night-ritual")) return;
    a.speak("lights out. one by one. don't argue with me.");
    for (const c of visibleCards().slice(0, 8)) {
      c.classList.add("vxr-lightsout");
      await wait(260);
    }
    await wait(2200);
    for (const c of document.querySelectorAll(".vxr-lightsout"))
      c.classList.remove("vxr-lightsout");
  },
};

/* ── C-24 · territory: he naps in the Done column ───────────────────── */
const territory: Impulse = {
  id: "territory",
  cooldown: 30 * 60_000,
  weight: (a) =>
    a.pathname().startsWith("/boards/") && needs(a).energy < 60 ? 1.2 : 0.2,
  run: async (a) => {
    const done = document.querySelector<HTMLElement>("[data-vx-done]");
    if (!done || !onScreen(done)) return;
    const r = done.getBoundingClientRect();
    const crowded = done.querySelectorAll(".mt-dsp, .mt-jx").length > 25;
    await a.travelTo({ x: r.left + r.width / 2, y: r.top + 30 });
    if (crowded) {
      a.speak(
        "the done column is MY bed and you've filled it with cards. i'm moving out.",
      );
      await a.anim("sulk");
      await a.goHome();
      return;
    }
    a.speak(
      "this is my spot. the done column. it's warm. nobody bothers you when you're done.",
    );
    await a.anim("sleep");
  },
};

export const IMPULSES: Impulse[] = [
  explore,
  readCard,
  chaseCursor,
  hum,
  stareCorner,
  daydream,
  workProject,
  lie,
  opinion,
  fearPencil,
  breakfast,
  morningReview,
  smokeBreak,
  nightRitual,
  territory,
];
