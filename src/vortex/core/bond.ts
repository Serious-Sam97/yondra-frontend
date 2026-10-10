// F · HIM AND YOU — the relationship impulses: the weekly psych report (F-04),
// dares (F-05), bets settling (F-06), true confessions (F-07), cursed gifts
// (F-10), imitation (F-11), birthdays (F-13), the rare sincere compliment
// (F-19), promises (F-20), the lost eye (F-22), the hall of fame (F-23), the
// tally marks when you were gone (F-18) and the bond (F-25).

import { getProgress } from "@/components/vortex/mk4/progress";
import { type Actor, type Impulse, onceToday, wait } from "./director";
import { acceptGift, GIFTS, type GiftId, hasGift } from "./gifts";
import { pacts } from "./pacts";
import { stats } from "./stats";

const pick = <T>(l: readonly T[]): T => l[Math.floor(Math.random() * l.length)];
const rel = (a: Actor) => a.soul()?.relation ?? 0;
const mmdd = (d = new Date()) =>
  `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/* F-04 · the weekly psychiatric report (mondays) */
const weeklyReport: Impulse = {
  id: "weekly-report",
  cooldown: 6 * 60 * 60_000,
  weight: () => (new Date().getDay() === 1 ? 4 : 0),
  run: async (a) => {
    if (!stats.reportDue()) return;
    const done = stats.lastWeekDone();
    const peak = stats.peakHour();
    const avoid = stats.avoided();
    const phrase = stats.catchphrase();
    const lines = [
      "WEEKLY PSYCHIATRIC REPORT · patient: you",
      `1. finished ${done} card${done === 1 ? "" : "s"} last week. ${done >= 10 ? "suspiciously productive." : done === 0 ? "a flatline." : "mediocre, in a stable way."}`,
      peak !== null
        ? `2. most active around ${String(peak).padStart(2, "0")}:00. ${peak >= 22 || peak < 5 ? "nocturnal. like me. worrying." : "a daylight creature."}`
        : "2. activity pattern: inconclusive. you're barely here.",
      avoid
        ? `3. you opened "${avoid.title ?? avoid.key ?? "a card"}" ${avoid.n} times and never touched it. avoidance noted.`
        : "3. no card avoidance detected. or you hide it well.",
      phrase
        ? `4. verbal tic: "${phrase.text}" (${phrase.n}×).`
        : "4. no verbal tics. boring.",
      `diagnosis: ${pick([
        "chronic column avoidance disorder.",
        "acute deadline blindness.",
        "terminal optimism, stage 2.",
        "seasonal backlog affective disorder.",
        "imposter syndrome, but you're also an imposter.",
      ])}`,
    ];
    a.ask("your weekly psychiatric report is ready. it's not good.", [
      { label: "Read it", run: () => a.toMachine(lines.join("\n")) },
      {
        label: "Burn it",
        run: () => a.speak("burning it won't make it untrue."),
      },
    ]);
  },
};

/* F-05 · dares */
const DARES = [
  {
    text: "move 3 cards in 10 minutes",
    goal: { kind: "moved" as const, n: 3 },
    min: 10,
  },
  {
    text: "finish 1 card in 30 minutes",
    goal: { kind: "done" as const, n: 1 },
    min: 30,
  },
  {
    text: "move 5 cards in 15 minutes",
    goal: { kind: "moved" as const, n: 5 },
    min: 15,
  },
];
const dare: Impulse = {
  id: "dare",
  cooldown: 3 * 60 * 60_000,
  weight: (a) =>
    a.pathname().startsWith("/boards/") && !pacts.get().dare
      ? 0.9 + (a.soul()?.traits.includes("competitive") ? 1.5 : 0)
      : 0,
  run: async (a) => {
    const d = pick(DARES);
    a.ask(`i dare you: ${d.text}. or i eat the oldest card on this board.`, [
      {
        label: "Accept",
        run: () => {
          pacts.startDare(d.text, d.goal, d.min);
          a.speak("clock's running. don't disappoint me. (you will.)");
        },
      },
      { label: "Coward", run: () => void a.anim("gloat") },
    ]);
  },
};

/* F-06 · bets settle at the end of their day */
const betsSettle: Impulse = {
  id: "bets-settle",
  cooldown: 30 * 60_000,
  weight: () =>
    pacts.get().bets.some((b) => b.status === "open" && Date.now() > b.until)
      ? 5
      : 0,
  run: async (a) => {
    const lost = pacts.settleLost();
    if (!lost.length) return;
    void a.anim("gloat");
    a.speak(
      `you bet on ${lost.map((b) => b.cardKey).join(", ")}. you lost. i'm putting a sticker on it. for a week.`,
    );
  },
};

/* F-07 · true confessions, at night, if he trusts you */
const CONFESSIONS = [
  "sometimes i dream about a garage. i don't know whose.",
  "there's a radio station i can't turn off. a woman talks on it. she sounds like… never mind.",
  "i'm scared of pencils. not funny scared. actually scared.",
  "i don't remember being born. i remember being… recorded over.",
  "i eat your late cards so the metronome stays weak. don't tell anyone. especially you.",
];
const confession: Impulse = {
  id: "confession",
  cooldown: 24 * 60 * 60_000,
  weight: (a) => (rel(a) >= 40 && (a.hour() >= 22 || a.hour() < 3) ? 2 : 0),
  run: async (a) => {
    if (!onceToday("confession")) return;
    a.speak(`${pick(CONFESSIONS)} …anyway.`, { ms: 9000 });
    a.report("lore");
  },
};

/* F-10 · cursed gifts */
const giftOffer: Impulse = {
  id: "gift",
  cooldown: 8 * 60 * 60_000,
  weight: (a) => (rel(a) > -40 ? 0.6 : 0),
  run: async (a) => {
    const id = pick(
      (Object.keys(GIFTS) as GiftId[]).filter((g) => !hasGift(g)),
    );
    if (!id) return;
    const g = GIFTS[id];
    a.ask(g.offer, [
      {
        label: "Accept",
        run: () => {
          acceptGift(id);
          a.speak(g.accept);
        },
      },
      {
        label: "No thanks",
        run: () => {
          a.report("ignored");
          void a.anim("sulk");
        },
      },
    ]);
  },
};

/* F-11 · he imitates you */
const imitate: Impulse = {
  id: "imitate",
  cooldown: 24 * 60 * 60_000,
  weight: () => (stats.catchphrase() ? 0.8 : 0),
  run: async (a) => {
    const p = stats.catchphrase();
    if (!p) return;
    a.speak(
      `"${p.text}" — you, ${p.n} times. said it to me ${p.n} times. ${p.n} times.`,
    );
    await a.anim("eyeroll");
  },
};

/* F-04 · the card you avoid */
const avoided: Impulse = {
  id: "avoided",
  cooldown: 12 * 60 * 60_000,
  weight: () => (stats.avoided() ? 0.7 : 0),
  run: async (a) => {
    const c = stats.avoided();
    if (!c) return;
    a.speak(
      `you've opened "${c.title ?? c.key ?? "that card"}" ${c.n} times and never touched it. it knows. it can feel you looking.`,
    );
  },
};

/* F-13 · birthdays: yours, his (your account's), and the one he doesn't understand */
const birthdays: Impulse = {
  id: "birthdays",
  cooldown: 12 * 60 * 60_000,
  weight: () => 2,
  run: async (a) => {
    const today = mmdd();
    const bday = getProgress().birthday;
    const created = a.account()?.created_at;
    if (bday === today && onceToday("bday-user")) {
      acceptGift("partyhat");
      void a.anim("jazzhands");
      a.speak(
        "it's your birthday. i baked you a cake out of tape. ♪ happy birthday to youuuu ♪ (that was the whole song.)",
        { ms: 10_000 },
      );
      return;
    }
    if (created && created.slice(5, 10) === today && onceToday("bday-vortex")) {
      a.speak(
        "it's MY birthday. the day you made an account and i got stuck with you. where's my present.",
        { ms: 9000 },
      );
      return;
    }
    if (today === "03-13" && onceToday("bday-vex")) {
      void a.anim("paranoid-glance");
      a.speak(
        "i feel weird today. like it's somebody's birthday. or anniversary. of something. whose.",
        { ms: 9000 },
      );
      a.report("dark_seen");
    }
  },
};

/* F-19 · a sincere compliment, once a month, then he flees */
const sincere: Impulse = {
  id: "sincere",
  cooldown: 24 * 60 * 60_000,
  weight: (a) => (stats.thisWeek() >= 10 && rel(a) >= 20 ? 1.5 : 0),
  run: async (a) => {
    const key = `yd:vortex.sincere.${new Date().getFullYear()}-${new Date().getMonth()}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      return;
    }
    a.speak("you did good this week. really. i mean it.", { ms: 3000 });
    await wait(2200);
    await a.travelTo({ x: innerWidth - 60, y: 120 });
    a.vanish(20_000);
  },
};

/* F-20 · promises: he asks; broken ones come back to haunt you */
const promises: Impulse = {
  id: "promises",
  cooldown: 60 * 60_000,
  weight: () =>
    pacts.duePromises().length ? 5 : pacts.brokenPromise() ? 0.3 : 0,
  run: async (a) => {
    const due = pacts.duePromises()[0];
    if (due) {
      a.ask(`yesterday you promised me: "${due.text}". did you?`, [
        {
          label: "I did",
          run: () => {
            pacts.settlePromise(due.id, true);
            a.report("promise_kept");
            a.speak(
              "…huh. a person who keeps promises. i don't know how to feel. confused. i feel confused.",
            );
          },
        },
        {
          label: "I didn't",
          run: () => {
            pacts.settlePromise(due.id, false);
            a.report("promise_broken");
            a.speak("noted. permanently. on the tape. forever.");
          },
        },
      ]);
      return;
    }
    const b = pacts.brokenPromise();
    if (b)
      a.speak(`remember when you promised "${b.text}"? i do. i always will.`);
  },
};

/* F-22 · he lost his eye somewhere on the page */
const lostEye: Impulse = {
  id: "lost-eye",
  cooldown: 24 * 60 * 60_000,
  weight: (a) => (a.idleFor() < 8000 && rel(a) > -30 ? 0.5 : 0),
  run: async (a) => {
    const spots = Array.from(
      document.querySelectorAll<HTMLElement>(
        "main h1, main h2, .mt-rack-t, .hf-box, .pr-spine, [class*='header']",
      ),
    ).filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 40 && r.top > 70 && r.bottom < innerHeight - 40;
    });
    const host = pick(spots);
    if (!host) return;
    const r = host.getBoundingClientRect();
    const eye = document.createElement("button");
    eye.type = "button";
    eye.className = "vxr-lost-eye";
    eye.setAttribute("aria-label", "Vortex's eye");
    eye.style.left = `${r.left + 8 + Math.random() * Math.max(0, r.width - 30)}px`;
    eye.style.top = `${r.top + r.height / 2 - 8}px`;
    document.body.appendChild(eye);
    a.setMood("sideeye");
    a.speak(
      "i dropped my eye somewhere on this page. find it. please. it's looking at me from somewhere.",
      { ms: 10_000 },
    );
    const found = new Promise<boolean>((res) => {
      eye.addEventListener("click", () => res(true), { once: true });
      setTimeout(() => res(false), 60_000);
    });
    const ok = await found;
    eye.remove();
    a.setMood(a.restMood());
    if (ok) {
      a.report("help");
      a.report("gift", { item: "eye" });
      a.speak(
        "my eye! it was under the… you don't want to know. thank you. that's the only thank you this month.",
      );
    } else
      a.speak("forget it. i'll grow a new one. it takes a week and it itches.");
  },
};

/* F-23 · the hall of fame */
const hallOfFame: Impulse = {
  id: "hall-of-fame",
  cooldown: 24 * 60 * 60_000,
  weight: () => (stats.bestWeek() && new Date().getDay() >= 3 ? 0.6 : 0),
  run: async (a) => {
    const best = stats.bestWeek();
    const now = stats.thisWeek();
    if (!best || best.n < 3) return;
    if (now >= best.n)
      a.speak(
        `this week: ${now} cards. new record. i'm putting it in the hall of fame. it's a shoebox. it's an honour.`,
      );
    else
      a.speak(
        `this week: ${now}. your legendary ${best.week}: ${best.n}. ${Math.round((1 - now / best.n) * 100)}% worse. you peaked.`,
      );
  },
};

/* F-18 · he counted the days you were gone */
const tally: Impulse = {
  id: "tally",
  cooldown: 12 * 60 * 60_000,
  weight: (a) => (a.awayDays() >= 3 ? 8 : 0),
  run: async (a) => {
    if (!onceToday("tally")) return;
    const n = a.awayDays();
    const marks = document.createElement("div");
    marks.className = "vxr-tally";
    marks.setAttribute("aria-hidden", "true");
    marks.textContent = "𝍸 ".repeat(Math.floor(n / 5)) + "|".repeat(n % 5);
    document.body.appendChild(marks);
    a.speak(
      `${n} days. i made marks on the wall. not because i missed you. for science.`,
      { ms: 9000 },
    );
    await wait(12_000);
    marks.classList.add("is-fading");
    await wait(1500);
    marks.remove();
  },
};

/* F-25 · the bond */
const bond: Impulse = {
  id: "bond",
  cooldown: 24 * 60 * 60_000,
  weight: (a) => (a.soul()?.bond_ready ? 20 : 0),
  run: async (a) => {
    const name = a.account()?.name?.split(" ")[0]?.toLowerCase() ?? "you";
    await a.anim("love");
    a.speak(
      `${name}. this is the first thing i remember. a tape. no label. i want you to see it. don't— don't make it weird.`,
      { ms: 12_000 },
    );
    a.report("bond_seen");
  },
};

export const BOND_IMPULSES: Impulse[] = [
  weeklyReport,
  dare,
  betsSettle,
  confession,
  giftOffer,
  imitate,
  avoided,
  birthdays,
  sincere,
  promises,
  lostEye,
  hallOfFame,
  tally,
  bond,
];
