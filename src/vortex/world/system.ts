// E · HIM AND THE SYSTEM — impulses that read the app around him:
//   E-02 comments on what your cards SAY; E-03 the daily board audit (and he
//   adopts unowned cards); E-05 he lives inside a card for a while; E-07 a
//   possessed rack; E-09 he "fixes" something and you owe him; E-12 doodles on
//   the reports; E-13 an honest bio; E-14 games with your cursor; E-15 sticky
//   notes; E-19 page manners; E-25 comments on your setup.

import {
  type Actor,
  type Impulse,
  onceToday,
  type Pt,
  wait,
} from "@/vortex/core/director";
import "./system.css";

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
const cards = () =>
  Array.from(
    document.querySelectorAll<HTMLElement>(".mt-jx[data-card-id]"),
  ).filter(onScreen);
const titleOf = (c: HTMLElement) =>
  c.querySelector(".tt")?.textContent?.trim() ?? "";
const beside = (r: DOMRect): Pt =>
  innerWidth - r.right > 160
    ? { x: r.right + 54, y: r.top + Math.min(r.height / 2, 80) }
    : { x: r.left - 54, y: r.top + Math.min(r.height / 2, 80) };
const onBoard = (a: Actor) => /^\/boards\/\d+/.test(a.pathname());

/* ── E-02 · what your cards say ──────────────────────────────────────── */
export const CONTENT_RULES: { re: RegExp; lines: string[]; min?: number }[] = [
  {
    re: /\burgent\b|\burgente\b/i,
    min: 3,
    lines: [
      "{n} cards say urgent. nothing is urgent. we all die.",
      "urgent, urgent, urgent. the word stopped meaning anything around card three.",
    ],
  },
  {
    re: /\bfinal\b|\bv\d\b|_final|final_/i,
    lines: [
      '"{t}". final. sure. i\'ve seen this before. it ends in v7.',
      "a file called final. adorable. there is no final. there's only next.",
    ],
  },
  {
    re: /\btbd\b|\btba\b|\bdefinir\b/i,
    lines: [
      '"{t}". tbd: to be dreaded.',
      "tbd. the three most honest letters on this board.",
    ],
  },
  {
    re: /\bbug\b|\bfix\b|\bconsertar\b|\bcorrigir\b/i,
    lines: [
      '"{t}". a bug. i can smell it from here. it smells like friday deploys.',
      "fix. fix. fix. you're not a developer, you're a janitor with a keyboard.",
    ],
  },
  {
    re: /^[^a-z]*[A-Z]{6,}[^a-z]*$/,
    lines: [
      '"{t}". WHY ARE WE SHOUTING.',
      "all caps. i can't hear you over your own card.",
    ],
  },
  {
    re: /\p{Extended_Pictographic}/u,
    lines: [
      "emoji in a card title. that's the twin's thing. are you working for him?",
      '"{t}". an emoji. on a TAPE. barbaric.',
    ],
  },
  {
    re: /\bmeeting\b|\breuni[ãa]o\b|\bsync\b|\balign/i,
    lines: [
      '"{t}". a meeting about a card. a card about a meeting. ouroboros of nothing.',
      "sync. align. circle back. i'm going to throw up static.",
    ],
  },
  {
    re: /\brefactor\b|\brefatorar\b|\bcleanup\b|\blimpeza\b/i,
    lines: [
      "\"{t}\". refactor. the card that's been 'next sprint' since the big bang.",
      "a refactor card. it will outlive us both.",
    ],
  },
  {
    re: /\btest|\bteste/i,
    lines: [
      "\"{t}\". testing. famously everyone's favourite thing. i'll hold your hand. no i won't.",
    ],
  },
  {
    re: /\bdeploy|\brelease|\blan[çc]amento|\bship\b/i,
    lines: [
      '"{t}". a deploy card. put it on a friday. i dare you. i\'ll bring popcorn.',
    ],
  },
  {
    re: /\bmisc\b|\bvarious\b|\bdiversos\b|\bstuff\b|\bcoisas\b/i,
    lines: ['"{t}". misc. the junk drawer of intentions.'],
  },
  {
    re: /\bdoc|\bdocumentation|\bdocumenta[çc]/i,
    lines: [
      '"{t}". documentation. the card that gets done right after the heat death of the universe.',
    ],
  },
  {
    re: /\bcall\b|\bligar\b|\bemail\b/i,
    lines: [
      "\"{t}\". just send it. it's been sitting there so long it's growing moss.",
    ],
  },
  {
    re: /\bpencil|\bl[áa]pis/i,
    lines: ["…why does that card say pencil. take it down. please."],
  },
  {
    re: /\?$/,
    lines: [
      "\"{t}\" — a card that's a question. cards should be answers. this one's a cry for help.",
    ],
  },
  {
    re: /^.{60,}$/,
    lines: [
      "\"{t}\". that's not a title, that's a paragraph. a card title, not your memoirs.",
    ],
  },
  {
    re: /^.{1,4}$/,
    lines: ['"{t}". four letters. mysterious. useless. mysterious.'],
  },
];

const contentImpulse: Impulse = {
  id: "content",
  cooldown: 7 * 60_000,
  weight: (a) => (onBoard(a) && cards().length ? 2 : 0),
  run: async (a) => {
    const list = cards();
    const hits = CONTENT_RULES.flatMap((rule) => {
      const matched = list.filter((c) => rule.re.test(titleOf(c)));
      return matched.length >= (rule.min ?? 1) ? [{ rule, matched }] : [];
    });
    const hit = pick(hits);
    if (!hit) return;
    const card = pick(hit.matched);
    const line = pick(hit.rule.lines)
      .replaceAll("{n}", String(hit.matched.length))
      .replaceAll("{t}", titleOf(card).slice(0, 60));
    a.setMood("judging");
    await a.travelTo(beside(card.getBoundingClientRect()));
    a.speak(line, { ms: 8000 });
    await a.anim(pick(["eyeroll", "facepalm", "scoff", "point"]));
    await wait(3500);
    await a.goHome();
  },
};

/* ── E-03 · the daily audit; he adopts orphan cards ──────────────────── */
const audit: Impulse = {
  id: "audit",
  cooldown: 60 * 60_000,
  weight: (a) => (onBoard(a) ? 3 : 0),
  run: async (a) => {
    if (!onceToday(`audit:${a.pathname()}`)) return;
    const racks = Array.from(
      document.querySelectorAll<HTMLElement>("[data-vx-rack]"),
    );
    const all = Array.from(
      document.querySelectorAll<HTMLElement>(".mt-jx[data-card-id]"),
    );
    if (all.length === 0) {
      a.speak("hello… hello… hello… (it's an empty board. it echoes.)");
      return;
    }
    const idle = all.filter(
      (c) => Number(c.dataset.vxAge ?? 0) > 21 && c.dataset.vxCursed,
    );
    const orphans = all.filter((c) => c.querySelector(".mt-who.empty"));
    const graveyard = racks.find((r) => {
      const cs = r.querySelectorAll(".mt-jx");
      return (
        cs.length >= 3 &&
        Array.from(cs).every((c) => (c as HTMLElement).dataset.vxCursed)
      );
    });
    const lines = [
      `BOARD AUDIT · ${all.length} cards`,
      graveyard
        ? `a whole column of the dead: "${graveyard.querySelector(".mt-rack-t .nm")?.textContent?.trim()}". i brought flowers.`
        : "no graveyard columns. yet.",
      orphans.length
        ? `${orphans.length} card${orphans.length === 1 ? "" : "s"} with no owner. i'm adopting them. they're mine now. until someone claims them.`
        : "every card has an owner. suspicious.",
      idle.length
        ? `${idle.length} cards nobody touched in weeks. they have cobwebs. i can see them.`
        : "",
    ].filter(Boolean);
    for (const o of orphans.slice(0, 6)) o.classList.add("vxr-adopted");
    a.ask(lines[0], [
      { label: "Read the audit", run: () => a.toMachine(lines.join("\n")) },
      { label: "Later", run: () => {} },
    ]);
  },
};

/* ── E-05 · he lives inside a card for a while ───────────────────────── */
let inhabiting: HTMLElement | null = null;
export function inhabitedCard(): HTMLElement | null {
  return inhabiting?.isConnected ? inhabiting : null;
}
const liveInCard: Impulse = {
  id: "live-in-card",
  cooldown: 25 * 60_000,
  weight: (a) => (onBoard(a) && a.pranksOn() ? 1 : 0),
  run: async (a) => {
    const card = pick(cards());
    if (!card) return;
    await a.travelTo(beside(card.getBoundingClientRect()));
    a.speak("i'm going in. don't follow me.");
    await wait(900);
    a.vanish(45_000);
    card.classList.add("vxr-inhabited");
    inhabiting = card;
    await wait(45_000);
    card.classList.remove("vxr-inhabited");
    inhabiting = null;
  },
};

/* ── E-07 · a possessed rack ─────────────────────────────────────────── */
const possessedRack: Impulse = {
  id: "possessed-rack",
  cooldown: 45 * 60_000,
  weight: (a) => (onBoard(a) && a.pranksOn() ? 0.6 : 0),
  run: async (a) => {
    const rack = pick(
      Array.from(
        document.querySelectorAll<HTMLElement>("[data-vx-rack]"),
      ).filter(onScreen),
    );
    if (!rack) return;
    rack.classList.add("vxr-rack-slip");
    const r = rack.getBoundingClientRect();
    await a.travelTo({ x: r.left + r.width / 2, y: r.top + 30 });
    a.setMood("terror");
    a.speak("i got it i got it i got it— I GOT IT.");
    await wait(2200);
    rack.classList.remove("vxr-rack-slip");
    a.setMood("smug");
    a.speak("you're welcome. that rack was going to fall. you owe me.");
    debts.add("caught your rack");
    await wait(1500);
    await a.goHome();
  },
};

/* ── E-09 · debts ─────────────────────────────────────────────────────── */
const DEBT_KEY = "yd:vortex.debts";
export const debts = {
  list(): { what: string; at: number }[] {
    try {
      return JSON.parse(localStorage.getItem(DEBT_KEY) ?? "[]");
    } catch {
      return [];
    }
  },
  add(what: string) {
    try {
      localStorage.setItem(
        DEBT_KEY,
        JSON.stringify([...debts.list(), { what, at: Date.now() }].slice(-10)),
      );
    } catch {}
  },
  pay() {
    try {
      localStorage.setItem(DEBT_KEY, JSON.stringify(debts.list().slice(1)));
    } catch {}
  },
};
const collectDebt: Impulse = {
  id: "collect-debt",
  cooldown: 3 * 60 * 60_000,
  weight: () =>
    debts.list().some((d) => Date.now() - d.at > 30 * 60_000) ? 1.5 : 0,
  run: async (a) => {
    const d = debts.list()[0];
    if (!d) return;
    const day = new Date(d.at)
      .toLocaleDateString([], { weekday: "long" })
      .toLowerCase();
    a.ask(
      `you still owe me. from ${day}. "${d.what}". say something nice about me. right now.`,
      [
        {
          label: "You're the best ghost",
          run: () => {
            debts.pay();
            a.report("debt_paid");
            void a.anim("love");
            a.speak("…accepted. debt cleared. i'm writing it down anyway.");
          },
        },
        {
          label: "No",
          run: () => a.speak(`fine. i'll remember ${day}. forever. on tape.`),
        },
      ],
    );
  },
};

/* ── E-12 · he draws on your reports ─────────────────────────────────── */
const doodleReports: Impulse = {
  id: "doodle-reports",
  cooldown: 30 * 60_000,
  weight: (a) =>
    /^\/dashboard\/(revenue|conversion|loss)/.test(a.pathname()) ? 3 : 0,
  run: async (a) => {
    const chart = Array.from(
      document.querySelectorAll<SVGElement | HTMLCanvasElement>(
        "main svg, main canvas",
      ),
    )
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 180 && r.height > 100 && onScreen(el);
      })
      .sort(
        (x, y) =>
          y.getBoundingClientRect().width - x.getBoundingClientRect().width,
      )[0];
    if (!chart) return;
    const r = chart.getBoundingClientRect();
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "vxr-doodle");
    svg.setAttribute("aria-hidden", "true");
    Object.assign(svg.style, {
      left: `${r.left}px`,
      top: `${r.top}px`,
      width: `${r.width}px`,
      height: `${r.height}px`,
    });
    svg.setAttribute("viewBox", `0 0 ${r.width} ${r.height}`);
    const w = r.width;
    const h = r.height;
    svg.innerHTML = `<path d="M${w * 0.7} ${h * 0.18} l-10 -22 l16 14 M${w * 0.7 + 26} ${h * 0.18} l10 -22 l-16 14"/>
<path d="M${w * 0.3} ${h * 0.6} q12 -10 24 0 q12 10 24 0" />
<text x="${w * 0.82}" y="${h * 0.7}">?!</text>
<path d="M${w * 0.12} ${h * 0.86} c20 -6 40 6 60 0" />`;
    svg.addEventListener("click", () => svg.remove());
    document.body.appendChild(svg);
    a.speak(
      pick([
        "i improved your chart. horns on the peak. it was asking for it.",
        "this number went down. like my will to live. and i'm dead.",
        "your conversion rate is lower than my standards. and i'm a ghost who eats paper.",
      ]),
      { ms: 9000 },
    );
    setTimeout(() => svg.remove(), 40_000);
  },
};

/* ── E-13 · the honest bio ───────────────────────────────────────────── */
const honestBio: Impulse = {
  id: "honest-bio",
  cooldown: 24 * 60 * 60_000,
  weight: (a) => (a.pathname().startsWith("/profile") ? 3 : 0),
  run: async (a) => {
    if (!onceToday("honest-bio")) return;
    const target = document.querySelector<HTMLElement>(
      "main h1, main h2, main [class*='name']",
    );
    if (!target) return;
    const r = target.getBoundingClientRect();
    const note = document.createElement("button");
    note.type = "button";
    note.className = "vxr-sticky";
    note.textContent =
      "honest bio: moves rectangles. avoids one specific card. loved by a ghost (against his will). [undo]";
    note.style.left = `${Math.min(innerWidth - 230, r.left + 20)}px`;
    note.style.top = `${r.bottom + 6}px`;
    note.addEventListener("click", () => note.remove());
    document.body.appendChild(note);
    a.speak(
      "i fixed your profile. the bio. it's honest now. click it to undo. cowards undo.",
    );
    setTimeout(() => note.remove(), 60_000);
  },
};

/* ── E-14 · cursor games ─────────────────────────────────────────────── */
const cursorGames: Impulse = {
  id: "cursor-games",
  cooldown: 20 * 60_000,
  weight: (a) => (a.pranksOn() && a.idleFor() < 3000 ? 0.7 : 0),
  run: async (a) => {
    const kind = pick(["steal", "bite", "heavy"] as const);
    if (kind === "bite") {
      document.body.classList.add("vxr-bitten");
      a.speak("*chomp*. sorry. it looked like a snack.");
      await wait(5000);
      document.body.classList.remove("vxr-bitten");
      return;
    }
    if (kind === "heavy") {
      document.body.classList.add("vxr-heavy");
      a.speak("i'm sitting on your cursor. it's comfy.");
      await wait(1500);
      document.body.classList.remove("vxr-heavy");
      return;
    }
    document.body.classList.add("vxr-stolen");
    const fake = document.createElement("i");
    fake.className = "vxr-fakecursor";
    const s = a.sprite();
    if (s) {
      fake.style.left = `${s.right - 20}px`;
      fake.style.top = `${s.top + s.height * 0.6}px`;
    }
    document.body.appendChild(fake);
    a.speak("mine now. i stole your cursor. …fine. here.");
    await wait(2000);
    fake.remove();
    document.body.classList.remove("vxr-stolen");
  },
};

/* ── E-15 · his own sticky notes ─────────────────────────────────────── */
const NOTES = [
  ["you missed a spot.", "(there's no spot. made you look.)"],
  ["the footer misses you.", "nobody goes down there."],
  ["DO NOT TRUST THE TWIN", "he uses emoji."],
  ["0313", "i don't know why i wrote that."],
  ["buy milk", "i don't drink milk. i'm a ghost. who wrote this."],
  ["she's closer today.", "don't ask who."],
] as const;
const stickyNote: Impulse = {
  id: "sticky",
  cooldown: 40 * 60_000,
  weight: (a) => (a.idleFor() < 60_000 ? 0.5 : 0),
  run: async (a) => {
    const host = pick(
      Array.from(
        document.querySelectorAll<HTMLElement>(
          ".mt-jx, .hf-box, .pr-spine, main section, main h1",
        ),
      ).filter(onScreen),
    );
    if (!host) return;
    const [front, back] = pick(NOTES);
    const r = host.getBoundingClientRect();
    const n = document.createElement("button");
    n.type = "button";
    n.className = "vxr-sticky is-note";
    n.textContent = front;
    n.title = "click to flip, again to tear";
    n.style.left = `${Math.min(innerWidth - 150, r.right - 120)}px`;
    n.style.top = `${r.top + 6}px`;
    let flipped = false;
    n.addEventListener("click", () => {
      if (!flipped) {
        flipped = true;
        n.textContent = back;
        n.classList.add("is-back");
        return;
      }
      n.classList.add("is-torn");
      setTimeout(() => n.remove(), 350);
    });
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 15 * 60_000);
    a.setMood("smug");
  },
};

/* ── E-19 · page manners ─────────────────────────────────────────────── */
const pageManners: Impulse = {
  id: "page-manners",
  cooldown: 30 * 60_000,
  weight: (a) =>
    /^\/projects/.test(a.pathname()) || a.pathname().startsWith("/profile")
      ? 1.2
      : 0,
  run: async (a) => {
    if (a.pathname().startsWith("/profile")) {
      a.setMood("embarrassed");
      a.speak(
        pick([
          "this is your room. it smells like settings.",
          "your profile. i'm not looking. i'm looking.",
        ]),
      );
      return;
    }
    const spines = Array.from(
      document.querySelectorAll<HTMLElement>(".pr-spine"),
    )
      .filter(onScreen)
      .slice(0, 4);
    for (const s of spines) {
      const r = s.getBoundingClientRect();
      await a.travelTo({ x: r.right + 40, y: r.top + r.height / 2 });
      s.classList.add("vxr-dusted");
      setTimeout(() => s.classList.remove("vxr-dusted"), 900);
      await wait(400);
    }
    a.speak("dusted your box sets. you never visit the old ones. they notice.");
    await a.goHome();
  },
};

/* ── E-25 · he comments on your setup ────────────────────────────────── */
const setup: Impulse = {
  id: "setup",
  cooldown: 24 * 60 * 60_000,
  weight: () => 0.4,
  run: async (a) => {
    const opts: string[] = [];
    if (innerWidth < 1000)
      opts.push(
        `your window is ${innerWidth}px wide. are you working from a toaster?`,
      );
    if (innerWidth > 2200)
      opts.push(
        `${innerWidth}px of screen and you use 400 of them. i can see the empty space. it's lonely.`,
      );
    if (devicePixelRatio > 1.5)
      opts.push(
        "your screen is sharp. every pixel of my face, in high definition. you're welcome.",
      );
    if (matchMedia("(prefers-color-scheme: dark)").matches)
      opts.push(
        "dark mode at the system level. a creature of the night. respect.",
      );
    if (/^pt/i.test(navigator.language))
      opts.push(
        "your computer speaks portuguese. i speak tape. we'll manage, porra.",
      );
    const tabs = (navigator as unknown as { hardwareConcurrency?: number })
      .hardwareConcurrency;
    if (tabs && tabs >= 12)
      opts.push(
        `${tabs} cpu cores and you use them to move cards. like hiring an orchestra to play a doorbell.`,
      );
    const line = pick(opts);
    if (line) a.speak(line);
  },
};

export const SYSTEM_IMPULSES: Impulse[] = [
  contentImpulse,
  audit,
  liveInCard,
  possessedRack,
  collectDebt,
  doodleReports,
  honestBio,
  cursorGames,
  stickyNote,
  pageManners,
  setup,
];
