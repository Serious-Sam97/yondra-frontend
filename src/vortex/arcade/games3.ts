import { drawVortex, type Game, H, PAL, rand, tapAt, text, W } from "./engine";

// M-11 · ROCK PAPER TAPE — the Coil's rules: pencil beats tape (rewinds it),
// magnet beats pencil, tape beats magnet (wraps it). Best of five. When he's
// losing and his ego is low, his eye twitches and he changes his hand.
const HANDS = ["tape", "pencil", "magnet"] as const;
type Hand = (typeof HANDS)[number];
const BEATS: Record<Hand, Hand> = {
  pencil: "tape",
  magnet: "pencil",
  tape: "magnet",
};
export function rps(): Game {
  let me = 0;
  let him = 0;
  let last: { you: Hand; him: Hand; twitch: boolean } | null = null;
  let wait = 0;
  const btn = (k: number) => ({ x: 40 + k * 90, y: 170, w: 80, h: 36 });
  const g: Game = {
    title: "ROCK PAPER TAPE",
    help: "pencil beats tape · magnet beats pencil · tape beats magnet. best of five.",
    score: 0,
    over: false,
    init() {},
    update(dt, i, api) {
      wait -= dt;
      if (wait > 0) return;
      let pick: Hand | null = null;
      if (i.keys.has("1")) pick = "tape";
      if (i.keys.has("2")) pick = "pencil";
      if (i.keys.has("3")) pick = "magnet";
      if (i.tap)
        HANDS.forEach((h, k) => {
          const b = btn(k);
          if (
            tapAt(i).x > b.x &&
            tapAt(i).x < b.x + b.w &&
            tapAt(i).y > b.y &&
            tapAt(i).y < b.y + b.h
          )
            pick = h;
        });
      if (!pick) return;
      let his: Hand = HANDS[Math.floor(Math.random() * 3)];
      let twitch = false;
      if (api.cheating && me > him && BEATS[pick] === his) {
        // he sees your hand and swaps his
        his = (Object.keys(BEATS) as Hand[]).find(
          (h) => BEATS[h] === pick,
        ) as Hand;
        twitch = true;
        api.cheated();
      }
      if (BEATS[pick] === his) me++;
      else if (BEATS[his] === pick) him++;
      api.sfx(
        BEATS[pick] === his ? "coin" : BEATS[his] === pick ? "lose" : "blip",
      );
      last = { you: pick, him: his, twitch };
      g.score = me;
      wait = 0.6;
      if (me >= 3 || him >= 3) g.over = true;
    },
    draw(c) {
      c.fillStyle = PAL.bg;
      c.fillRect(0, 0, W, H);
      drawVortex(c, W / 2, 60, 24, last?.twitch ? "hurt" : "ok");
      if (last?.twitch)
        text(c, "(his eye twitches)", W / 2, 90, PAL.pink, 8, "center");
      if (last)
        text(
          c,
          `you: ${last.you}   him: ${last.him}`,
          W / 2,
          110,
          PAL.cream,
          10,
          "center",
        );
      text(c, `${me} — ${him}`, W / 2, 130, PAL.amber, 14, "center");
      HANDS.forEach((h, k) => {
        const b = btn(k);
        c.fillStyle = "#3a2c20";
        c.fillRect(b.x, b.y, b.w, b.h);
        text(
          c,
          `${k + 1} · ${h}`,
          b.x + b.w / 2,
          b.y + 13,
          PAL.cream,
          10,
          "center",
        );
      });
    },
  };
  return g;
}

// M-18 · THE DUEL — Vortex vs the Twin at noon. You're the judge: click FIRE
// the moment it shows. Too early and the Twin wins (and grows stronger).
export function duel(): Game {
  let round = 0;
  let won = 0;
  let state: "wait" | "fire" | "result" = "wait";
  let t = 0;
  let at = rand(1.5, 4);
  let msg = "wait for it…";
  const g: Game = {
    title: "THE DUEL",
    help: "click / space the instant FIRE appears. not before.",
    score: 0,
    over: false,
    init() {},
    update(dt, i, api) {
      t += dt;
      const pressed = i.firePressed;
      if (state === "wait") {
        if (pressed) {
          msg = "too early. the twin shoots first. 😊";
          api.data.twinWon = true;
          api.sfx("lose");
          state = "result";
          t = 0;
        } else if (t >= at) {
          state = "fire";
          t = 0;
          api.sfx("boom");
        }
      } else if (state === "fire") {
        if (pressed) {
          won++;
          msg = `${Math.round(t * 1000)} ms. he wins. he'll take the credit.`;
          api.sfx("coin");
          state = "result";
          t = 0;
        } else if (t > 0.45) {
          msg = "too slow. the twin wins. 😊";
          api.sfx("lose");
          state = "result";
          t = 0;
        }
      } else if (t > 1.6) {
        round++;
        g.score = won;
        if (round >= 3) g.over = true;
        state = "wait";
        t = 0;
        at = rand(1.5, 5);
        msg = "wait for it…";
      }
    },
    draw(c) {
      c.fillStyle = "#2a1a0a";
      c.fillRect(0, 0, W, H);
      c.fillStyle = "#c8962e";
      c.fillRect(0, H - 60, W, 60);
      drawVortex(c, 60, H - 76, 14);
      c.fillStyle = "#f3f3f3";
      c.beginPath();
      c.arc(W - 60, H - 76, 14, 0, Math.PI * 2);
      c.fill();
      text(c, "😊", W - 60, H - 84, "#111", 12, "center");
      if (state === "fire") text(c, "FIRE!", W / 2, 70, PAL.red, 32, "center");
      text(c, msg, W / 2, 30, PAL.cream, 9, "center");
      text(
        c,
        `round ${Math.min(3, round + 1)}/3 · ${won}`,
        W / 2,
        H - 20,
        "#2a1f17",
        9,
        "center",
      );
    },
  };
  return g;
}

// M-16 · QUIZ OF YOUR BOARD — a game show about your own work. He mocks every miss.
export function quiz(): Game {
  type Q = { q: string; a: string[]; right: number };
  let qs: Q[] = [];
  let k = 0;
  let wait = 0;
  let quip = "";
  const box = (n: number) => ({
    x: 30 + (n % 2) * 140,
    y: 120 + Math.floor(n / 2) * 44,
    w: 130,
    h: 36,
  });
  const MOCK = [
    "wrong. the audience is booing. the audience is static.",
    "no. it's YOUR board.",
    "incorrect. impressive, actually.",
    "wrong. i'm telling everyone.",
  ];
  const g: Game = {
    title: "QUIZ OF YOUR BOARD",
    help: "a game show about your own board. click the answer.",
    score: 0,
    over: false,
    init(api) {
      const d = api.data as {
        done7?: number;
        overdue?: number;
        playing?: number;
        oldest?: string;
        titles?: string[];
        boards?: number;
      };
      const opts = (n: number) => {
        const s = new Set([
          n,
          n + 1 + Math.floor(Math.random() * 3),
          Math.max(0, n - 1 - Math.floor(Math.random() * 2)),
          n + 4,
        ]);
        const a = [...s].slice(0, 4).sort(() => Math.random() - 0.5);
        return { a: a.map(String), right: a.indexOf(n) };
      };
      const mk = (q: string, n: number) => ({ q, ...opts(n) });
      qs = [
        mk("how many cards did you finish in the last 7 days?", d.done7 ?? 0),
        mk("how many cards are overdue right now?", d.overdue ?? 0),
        mk("how many cards are playing (in progress)?", d.playing ?? 0),
      ];
      if (d.oldest && (d.titles?.length ?? 0) >= 3) {
        const others = (d.titles ?? [])
          .filter((t) => t !== d.oldest)
          .slice(0, 3);
        const a = [d.oldest, ...others].sort(() => Math.random() - 0.5);
        qs.push({
          q: "which card on your deck is the most late?",
          a: a.map((t) => t.slice(0, 18)),
          right: a.indexOf(d.oldest),
        });
      }
      qs.push(mk("how many fingers am i holding up?", 0));
    },
    update(dt, i, api) {
      wait -= dt;
      if (wait > 0 || !i.tap || k >= qs.length) return;
      const q = qs[k];
      q.a.forEach((_, n) => {
        const b = box(n);
        if (
          tapAt(i).x > b.x &&
          tapAt(i).x < b.x + b.w &&
          tapAt(i).y > b.y &&
          tapAt(i).y < b.y + b.h
        ) {
          if (n === q.right) {
            g.score++;
            quip = "correct. don't get used to it.";
            api.sfx("coin");
          } else {
            quip = MOCK[Math.floor(Math.random() * MOCK.length)];
            api.sfx("lose");
          }
          k++;
          wait = 1.2;
          if (k >= qs.length)
            setTimeout(() => {
              g.over = true;
            }, 1300);
        }
      });
    },
    draw(c) {
      c.fillStyle = "#1a0f1a";
      c.fillRect(0, 0, W, H);
      for (let x = 0; x < W; x += 20) {
        c.fillStyle = (x / 20) % 2 ? PAL.amber : PAL.pink;
        c.fillRect(x + 6, 4, 6, 6);
      }
      drawVortex(c, 30, 40, 12);
      const q = qs[Math.min(k, qs.length - 1)];
      if (q) {
        text(c, q.q, 50, 30, PAL.cream, 9);
        q.a.forEach((a, n) => {
          const b = box(n);
          c.fillStyle = "#3a2a3a";
          c.fillRect(b.x, b.y, b.w, b.h);
          text(c, a, b.x + b.w / 2, b.y + 13, PAL.cream, 9, "center");
        });
      }
      if (quip) text(c, quip, W / 2, 86, PAL.pink, 8, "center");
      text(c, `${g.score}/${qs.length}`, W - 8, 30, PAL.amber, 10, "right");
    },
  };
  return g;
}

// M-17 · CORRUPTED MEMORY — pairs of J-cards whose colours drift every time you
// flip; match the PATTERN (the stripes), not the colour.
export function memory(): Game {
  type Card = { pat: number; open: boolean; done: boolean; hue: number };
  let cards: Card[] = [];
  let first: number | null = null;
  let wait = 0;
  let moves = 0;
  const pos = (k: number) => ({
    x: 40 + (k % 4) * 62,
    y: 20 + Math.floor(k / 4) * 52,
  });
  const g: Game = {
    title: "CORRUPTED MEMORY",
    help: "match the stripes, not the colours. they won't hold still.",
    score: 0,
    over: false,
    init() {
      const pats = [...Array(8).keys()]
        .flatMap((p) => [p, p])
        .sort(() => Math.random() - 0.5);
      cards = pats.map((pat) => ({
        pat,
        open: false,
        done: false,
        hue: Math.random() * 360,
      }));
    },
    update(dt, i, api) {
      wait -= dt;
      if (wait > 0 || !i.tap) return;
      const k = cards.findIndex((_, n) => {
        const p = pos(n);
        return (
          tapAt(i).x > p.x &&
          tapAt(i).x < p.x + 52 &&
          tapAt(i).y > p.y &&
          tapAt(i).y < p.y + 44
        );
      });
      if (k < 0 || cards[k].open || cards[k].done) return;
      cards[k].open = true;
      for (const c of cards) c.hue = (c.hue + rand(20, 70)) % 360; // the corruption
      api.sfx("blip");
      if (first === null) first = k;
      else {
        moves++;
        const a = cards[first];
        const b = cards[k];
        if (a.pat === b.pat) {
          a.done = b.done = true;
          api.sfx("coin");
          if (cards.every((c) => c.done)) {
            g.score = Math.max(10, 200 - moves * 6);
            g.over = true;
          }
        } else {
          wait = 0.8;
          setTimeout(() => {
            a.open = false;
            b.open = false;
          }, 750);
        }
        first = null;
      }
    },
    draw(c) {
      c.fillStyle = PAL.bg;
      c.fillRect(0, 0, W, H);
      cards.forEach((card, k) => {
        const p = pos(k);
        if (!card.open && !card.done) {
          c.fillStyle = "#3a2c20";
          c.fillRect(p.x, p.y, 52, 44);
          text(c, "?", p.x + 26, p.y + 14, PAL.dim, 14, "center");
          return;
        }
        c.fillStyle = `hsl(${card.hue},45%,${card.done ? 35 : 55}%)`;
        c.fillRect(p.x, p.y, 52, 44);
        c.fillStyle = PAL.bg;
        for (let s = 0; s <= card.pat; s++)
          c.fillRect(p.x + 4 + s * 5, p.y + 6, 2, 32);
      });
      text(c, `moves ${moves}`, W / 2, H - 12, PAL.cream, 8, "center");
    },
  };
  return g;
}

// M-22 · THE FORBIDDEN GAME — 1989 graphics. A man in a garage at night,
// trying to finish something before 03:13. You can't win. At 03:13 the screen
// rewinds. (After the Free ending, he finishes, and walks out of the door.)
export function forbidden(): Game {
  let work = 0;
  let clock = 2 * 60 + 40; // 02:40, in game minutes
  let rewinding = 0;
  let freedOut = 0;
  const g: Game = {
    title: "—",
    help: "type. work. it's almost done. it's always almost done.",
    score: 0,
    over: false,
    init() {},
    update(dt, i, api) {
      const freed = !!api.data.freed;
      if (rewinding > 0) {
        rewinding += dt;
        if (rewinding > 3) {
          g.score = 1;
          g.over = true;
        }
        return;
      }
      if (freedOut > 0) {
        freedOut += dt;
        if (freedOut > 4) {
          g.score = 1;
          g.over = true;
        }
        return;
      }
      clock += dt * 0.4;
      if (i.keys.size > 0 || i.tap) {
        // asymptotic: the last percent never comes (unless he was freed)
        work += freed ? 2 : (100 - work) * 0.02;
        api.sfx("blip");
      }
      if (freed && work >= 100) {
        freedOut = 0.01;
        api.sfx("coin");
      }
      if (clock >= 3 * 60 + 13) {
        rewinding = 0.01;
        api.sfx("lose");
      }
    },
    draw(c) {
      c.fillStyle = "#000";
      c.fillRect(0, 0, W, H);
      // 1989: chunky, four colours
      c.fillStyle = "#0000aa";
      c.fillRect(0, 0, W, 150);
      c.fillStyle = "#555";
      c.fillRect(0, 150, W, 90);
      c.fillStyle = "#aa5500";
      c.fillRect(80, 120, 140, 10);
      c.fillRect(90, 130, 8, 40);
      c.fillRect(202, 130, 8, 40);
      c.fillStyle = "#aaa";
      c.fillRect(120, 90, 50, 30);
      c.fillStyle = "#00aa00";
      c.fillRect(124, 94, 42, 22);
      // the man
      const walking = freedOut > 0;
      const mx = walking ? 150 + freedOut * 40 : 150;
      c.fillStyle = "#aaa";
      c.fillRect(mx - 6, walking ? 120 : 102, 12, 12);
      c.fillStyle = "#555";
      c.fillRect(mx - 8, walking ? 132 : 114, 16, 24);
      // the door
      c.fillStyle = freedOut > 0 ? "#ffff55" : "#aa5500";
      c.fillRect(270, 90, 30, 60);
      const hh = Math.floor(clock / 60);
      const mm = Math.floor(clock % 60);
      text(
        c,
        `0${hh}:${String(mm).padStart(2, "0")}`,
        W - 10,
        10,
        "#ff5555",
        14,
        "right",
      );
      c.fillStyle = "#aaa";
      c.fillRect(20, 200, 280, 10);
      c.fillStyle = "#55ff55";
      c.fillRect(20, 200, (Math.min(100, work) / 100) * 280, 10);
      text(
        c,
        `${work.toFixed(work > 99 ? 3 : 0)}%`,
        W / 2,
        214,
        "#fff",
        8,
        "center",
      );
      if (rewinding > 0) {
        c.fillStyle = `rgba(255,255,255,${Math.min(0.6, rewinding / 3)})`;
        for (let y = 0; y < H; y += 6)
          c.fillRect(0, (y + rewinding * 200) % H, W, 2);
        text(c, "◀◀ REWIND", 10, 10, "#fff", 12);
      }
      if (freedOut > 0)
        text(
          c,
          "he finished. he went home.",
          W / 2,
          60,
          "#ffff55",
          10,
          "center",
        );
    },
  };
  return g;
}
