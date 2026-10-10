#!/usr/bin/env node
// Q-10 · Vortex in the terminal. Reads a read-only feed with a revocable key;
// writes nothing anywhere. Zero dependencies on purpose: he hates node_modules.

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const key =
  args.find((a) => !a.startsWith("--")) ?? process.env.YONDRA_VORTEX_KEY;
const api = (process.env.YONDRA_API ?? "http://localhost").replace(/\/$/, "");
const polite = flag("--polite");
const color = !flag("--no-color") && process.stdout.isTTY;

const c = (code) => (s) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);
const pink = c("95");
const red = c("91");
const dim = c("2");
const green = c("92");
const bold = c("1");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function type(line, speed = 14) {
  if (!process.stdout.isTTY) return console.log(line);
  for (const ch of line) {
    process.stdout.write(ch);
    await sleep(speed + Math.random() * speed);
  }
  process.stdout.write("\n");
}

const FACES = {
  smug: [
    '  .-"""-.  ',
    " /  ◕ ‿ ◕ \\ ",
    "|   ‿‿‿   |",
    " \\  ‾‾‾  / ",
    "  '-...-'  ",
  ],
  asleep: [
    '  .-"""-.  ',
    " /  - _ - \\ z",
    "|         |Z",
    " \\  ‿‿‿  / ",
    "  '-...-'  ",
  ],
  possessed: [
    '  .-"""-.  ',
    " /  ● _ ● \\ ",
    "|  ▓▓▓▓▓  |",
    " \\ ‾‾‾‾‾ / ",
    "  '-...-'  ",
  ],
  judging: [
    '  .-"""-.  ',
    " /  ¬ _ ¬ \\ ",
    "|    ___  |",
    " \\       / ",
    "  '-...-'  ",
  ],
};
const face = (mood, corruption) => {
  const f =
    FACES[mood] ??
    (corruption > 60
      ? FACES.possessed
      : mood === "dormant"
        ? FACES.asleep
        : FACES.judging);
  return f.map((l) => (corruption > 60 ? red(l) : pink(l))).join("\n");
};

const pick = (xs) => xs[Math.floor(Math.random() * xs.length)];
// deal jokes like cards: no repeats until the deck runs out
const decks = new Map();
const deal = (xs) => {
  let d = decks.get(xs);
  if (!d?.length) {
    d = [...xs].sort(() => Math.random() - 0.5);
    decks.set(xs, d);
  }
  return d.pop();
};
const RUDE_LATE = [
  (n) => `"${n}" is overdue. the metronome sends his regards.`,
  (n) =>
    `"${n}". late. i'd say i'm disappointed but that requires expectations.`,
  (n) => `"${n}" has been late so long it qualifies for a pension.`,
];
const RUDE_SOON = [
  (n, d) => `"${n}" — ${d}. i've already drafted the apology email for you.`,
  (n, d) =>
    `"${n}" is due ${d}. you'll start it at 23:58. i've seen your work.`,
  (n, d) => `"${n}", due ${d}. tick tock. that's not a clock, that's me.`,
];
const RUDE_NONE = [
  (n) =>
    `"${n}". no date. schrödinger's task: done and not done until someone asks.`,
  (n) => `"${n}" has no due date. a card without a deadline is a wish.`,
  (n) => `"${n}". undated. like your ambitions.`,
];
const POLITE = (card) =>
  card.overdue
    ? `"${card.name}" is overdue.`
    : card.due
      ? `"${card.name}" is due ${card.due}.`
      : `"${card.name}" has no due date.`;

function comment(card) {
  if (polite) return POLITE(card);
  if (card.overdue) return deal(RUDE_LATE)(card.name);
  if (card.due) return deal(RUDE_SOON)(card.name, card.due);
  return deal(RUDE_NONE)(card.name);
}

async function feed() {
  const r = await fetch(`${api}/api/mascot/terminal/${key}`, {
    headers: { Accept: "application/json" },
  });
  if (r.status === 404)
    throw new Error(
      "that key is dead. switch the terminal on in your profile and copy the new one.",
    );
  if (!r.ok)
    throw new Error(`the void returned ${r.status}. not my fault. probably.`);
  return r.json();
}

async function session(v, first) {
  if (first) {
    console.log(dim("▶ PLAY  ·  yondra / 03.13 dead air  ·  C-90\n"));
    console.log(face(v.mood, v.corruption));
    console.log("");
    await type(
      polite
        ? `hello ${v.name}. ${v.done_week} cards done this week.`
        : `oh. it's ${bold(v.nickname ?? v.name)}. in a TERMINAL. how retro. how desperate.`,
    );
    await type(
      dim(
        `(${v.age_days} days old · died ${v.deaths}× · mood: ${v.mood}${v.corruption > 60 ? " · something's wrong with me" : ""})`,
      ),
    );
    if (!polite)
      await type(
        v.done_week >= 10
          ? green(
              `${v.done_week} done this week. who are you trying to impress.`,
            )
          : `${v.done_week} done this week. riveting.`,
      );
    console.log("");
  }
  const cards = first ? v.cards : [pick(v.cards)].filter(Boolean);
  if (cards.length === 0)
    return type(
      polite
        ? "nothing open."
        : "no open cards. either you're done or you're hiding them. i know which.",
    );
  for (const card of cards.slice(0, first ? 6 : 1)) {
    await type(`${card.overdue ? red("✕") : dim("·")} ${comment(card)}`);
    await sleep(250);
  }
}

if (!key) {
  console.error(
    "usage: npx ./tools/yondra-vortex <key>   (profile → vortex → outside the app → terminal)",
  );
  process.exit(1);
}
try {
  await session(await feed(), true);
  if (flag("--watch")) {
    for (;;) {
      await sleep(60_000);
      await session(await feed(), false);
    }
  }
  console.log(dim("\n■ STOP  ·  don't rewind. it hurts."));
} catch (e) {
  console.error(red(e.message));
  process.exit(1);
}
