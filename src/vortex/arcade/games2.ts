import {
  clamp,
  drawVortex,
  type Game,
  H,
  PAL,
  rand,
  tapAt,
  text,
  W,
} from "./engine";

// M-06 · SPLICE — the tape was cut into pieces; splice them back in order.
const PHRASES = [
  "all tape is temporary",
  "the tea is still warm",
  "make it remember me",
  "turn the tape over",
  "nobody owns a radio here",
  "the chair was never empty",
];
export function splice(): Game {
  let pieces: { w: string; x: number; y: number; done: boolean }[] = [];
  let order: string[] = [];
  let at = 0;
  let left = 60;
  let round = 0;
  let wrong = 0;
  const deal = (titles: string[]) => {
    const pool = [...PHRASES, ...titles.map((t) => t.toLowerCase())].filter(
      (p) => p.split(" ").length >= 3 && p.length < 40,
    );
    const phrase = pool[Math.floor(Math.random() * pool.length)];
    order = phrase.split(" ");
    at = 0;
    const shuffled = [...order].sort(() => Math.random() - 0.5);
    pieces = shuffled.map((w, i) => ({
      w,
      x: 20 + (i % 3) * 100,
      y: 80 + Math.floor(i / 3) * 40,
      done: false,
    }));
  };
  const g: Game = {
    title: "SPLICE",
    help: "click the pieces in the right order to splice the tape.",
    score: 0,
    over: false,
    init(api) {
      deal((api.data.titles as string[]) ?? []);
    },
    update(dt, i, api) {
      left -= dt;
      if (left <= 0) g.over = true;
      if (!i.tap) return;
      const p = pieces.find(
        (pp) =>
          !pp.done &&
          tapAt(i).x > pp.x &&
          tapAt(i).x < pp.x + 92 &&
          tapAt(i).y > pp.y &&
          tapAt(i).y < pp.y + 26,
      );
      if (!p) return;
      if (p.w === order[at]) {
        p.done = true;
        at++;
        g.score += 10;
        api.sfx("blip");
        if (at === order.length) {
          g.score += Math.ceil(left);
          round++;
          api.sfx("coin");
          deal((api.data.titles as string[]) ?? []);
        }
      } else {
        wrong++;
        left -= 3;
        api.sfx("hit");
      }
    },
    draw(c) {
      c.fillStyle = PAL.bg;
      c.fillRect(0, 0, W, H);
      c.fillStyle = "#5a3418";
      c.fillRect(10, 30, W - 20, 22);
      text(c, order.slice(0, at).join(" "), 16, 36, PAL.cream, 9);
      for (const p of pieces) {
        if (p.done) continue;
        c.fillStyle = "#7a4a22";
        c.fillRect(p.x, p.y, 92, 26);
        c.fillStyle = "#3f2410";
        c.fillRect(p.x, p.y + 11, 92, 2);
        text(c, p.w, p.x + 46, p.y + 8, PAL.cream, 9, "center");
      }
      text(c, `${g.score}`, 10, 8, PAL.amber, 10);
      text(
        c,
        `${Math.ceil(left)}s · splices ${round}`,
        W - 10,
        8,
        PAL.cream,
        9,
        "right",
      );
      if (wrong)
        text(c, "wrong splice: -3s", W / 2, H - 16, PAL.red, 8, "center");
    },
  };
  return g;
}

// M-08 · DEADLINE DASH — a maze of columns; eat every card before the
// Metronome catches you.
export function dash(): Game {
  const MAP = [
    "###################",
    "#........#........#",
    "#.##.###.#.###.##.#",
    "#.................#",
    "#.##.#.#####.#.##.#",
    "#....#...#...#....#",
    "####.### # ###.####",
    "#.......M.........#",
    "#.##.#.#####.#.##.#",
    "#....#...V...#....#",
    "#.##.###.#.###.##.#",
    "#........#........#",
    "###################",
  ];
  const S = 16;
  const OX = (W - MAP[0].length * S) / 2;
  const OY = 18;
  let grid: string[][] = [];
  let me = { x: 9, y: 9, dx: 0, dy: 0, nx: 0, ny: 0 };
  let mt = { x: 8, y: 7 };
  let stepT = 0;
  let mtT = 0;
  let level = 1;
  const reset = () => {
    grid = MAP.map((r) => r.split(""));
    me = { x: 9, y: 9, dx: 0, dy: 0, nx: 0, ny: 0 };
    mt = { x: 8, y: 7 };
  };
  const open = (x: number, y: number) =>
    grid[y]?.[x] !== undefined && grid[y][x] !== "#";
  const g: Game = {
    title: "DEADLINE DASH",
    help: "arrows to move. eat the cards. the metronome is coming.",
    score: 0,
    over: false,
    init() {
      reset();
    },
    update(dt, i, api) {
      if (i.left) [me.nx, me.ny] = [-1, 0];
      if (i.right) [me.nx, me.ny] = [1, 0];
      if (i.up) [me.nx, me.ny] = [0, -1];
      if (i.down) [me.nx, me.ny] = [0, 1];
      if (i.tap) {
        const tx = (i.tap.x - OX) / S - me.x;
        const ty = (i.tap.y - OY) / S - me.y;
        [me.nx, me.ny] =
          Math.abs(tx) > Math.abs(ty) ? [Math.sign(tx), 0] : [0, Math.sign(ty)];
      }
      stepT += dt;
      if (stepT > 0.16) {
        stepT = 0;
        if (open(me.x + me.nx, me.y + me.ny)) [me.dx, me.dy] = [me.nx, me.ny];
        if (open(me.x + me.dx, me.y + me.dy)) {
          me.x += me.dx;
          me.y += me.dy;
        }
        if (grid[me.y][me.x] === ".") {
          grid[me.y][me.x] = " ";
          g.score += 10;
          api.sfx("blip");
          if (!grid.some((r) => r.includes("."))) {
            level++;
            g.score += 100;
            api.sfx("coin");
            reset();
          }
        }
      }
      mtT += dt;
      if (mtT > Math.max(0.12, 0.3 - level * 0.03)) {
        mtT = 0;
        const opts = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].filter(([dx, dy]) => open(mt.x + dx, mt.y + dy));
        opts.sort(
          (a, b) =>
            Math.hypot(mt.x + a[0] - me.x, mt.y + a[1] - me.y) -
            Math.hypot(mt.x + b[0] - me.x, mt.y + b[1] - me.y),
        );
        const pick =
          Math.random() < 0.8
            ? opts[0]
            : opts[Math.floor(Math.random() * opts.length)];
        if (pick) {
          mt.x += pick[0];
          mt.y += pick[1];
        }
      }
      if (mt.x === me.x && mt.y === me.y) {
        api.sfx("lose");
        g.over = true;
      }
    },
    draw(c) {
      c.fillStyle = PAL.bg;
      c.fillRect(0, 0, W, H);
      grid.forEach((row, y) => {
        row.forEach((v, x) => {
          if (v === "#") {
            c.fillStyle = "#3a2c20";
            c.fillRect(OX + x * S, OY + y * S, S, S);
            c.fillStyle = "#4a3828";
            c.fillRect(OX + x * S, OY + y * S, S, 2);
          }
          if (v === ".") {
            c.fillStyle = PAL.cream;
            c.fillRect(OX + x * S + 5, OY + y * S + 5, 6, 5);
          }
        });
      });
      drawVortex(c, OX + me.x * S + S / 2, OY + me.y * S + S / 2, 6);
      c.fillStyle = PAL.cream;
      c.beginPath();
      c.arc(OX + mt.x * S + S / 2, OY + mt.y * S + S / 2, 7, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#111";
      c.beginPath();
      c.moveTo(OX + mt.x * S + S / 2, OY + mt.y * S + S / 2);
      c.lineTo(OX + mt.x * S + S / 2 + 4, OY + mt.y * S + S / 2 - 4);
      c.stroke();
      text(c, `${g.score}`, 6, 4, PAL.amber, 9);
      text(c, `lv ${level}`, W - 6, 4, PAL.cream, 9, "right");
    },
  };
  return g;
}

// M-09 · VU HERO — four tracks of a four-channel tape; hit the notes on the line.
export function vuhero(): Game {
  const LANES = 4;
  const LX = (l: number) => 80 + l * 40;
  const LINE = H - 40;
  let notes: { l: number; y: number; hit: boolean }[] = [];
  let t = 0;
  let nextAt = 1;
  let combo = 0;
  let vu = 0;
  let flash: number[] = [0, 0, 0, 0];
  const keys = ["d", "f", "j", "k"];
  const g: Game = {
    title: "VU HERO",
    help: "D F J K (or tap the lanes) when the notes cross the line.",
    score: 0,
    over: false,
    init() {},
    update(dt, i, api) {
      t += dt;
      if (t > 60) g.over = true;
      const bpm = 100 + t;
      if (t >= nextAt) {
        notes.push({ l: Math.floor(Math.random() * LANES), y: 0, hit: false });
        if (Math.random() < 0.2)
          notes.push({
            l: Math.floor(Math.random() * LANES),
            y: -8,
            hit: false,
          });
        nextAt += (60 / bpm) * (Math.random() < 0.3 ? 0.5 : 1);
      }
      for (const n of notes) n.y += 120 * dt;
      const press = (l: number) => {
        flash[l] = 0.12;
        const n = notes.find(
          (nn) => nn.l === l && !nn.hit && Math.abs(nn.y - LINE) < 14,
        );
        if (n) {
          n.hit = true;
          combo++;
          g.score += 10 + Math.min(combo, 20);
          vu = Math.min(1, vu + 0.15);
          api.sfx("note", 60 + [0, 3, 7, 10][l] + (combo % 4) * 2);
        } else {
          combo = 0;
        }
      };
      keys.forEach((k, l) => {
        if (i.keys.has(k)) press(l);
      });
      if (i.tap) {
        const l = Math.round((i.tap.x - 80) / 40);
        if (l >= 0 && l < LANES) press(l);
      }
      for (const n of notes)
        if (!n.hit && n.y > LINE + 16 && n.y < LINE + 18) combo = 0;
      notes = notes.filter((n) => n.y < H + 10 && !n.hit);
      vu = Math.max(0, vu - dt * 0.4);
      flash = flash.map((f) => Math.max(0, f - dt));
    },
    draw(c) {
      c.fillStyle = PAL.bg;
      c.fillRect(0, 0, W, H);
      for (let l = 0; l < LANES; l++) {
        c.fillStyle = flash[l] > 0 ? "#3a2a14" : "#1a120b";
        c.fillRect(LX(l) - 16, 0, 32, H);
        c.fillStyle = "#5a3418";
        c.fillRect(LX(l) - 1, 0, 2, H);
        text(c, keys[l].toUpperCase(), LX(l), H - 18, PAL.dim, 9, "center");
      }
      c.fillStyle = PAL.amber;
      c.fillRect(60, LINE, 160, 2);
      for (const n of notes) {
        c.fillStyle = [PAL.rust, PAL.amber, PAL.olive, PAL.cyan][n.l];
        c.fillRect(LX(n.l) - 12, n.y - 4, 24, 8);
      }
      // the VU needle
      c.fillStyle = "#e9dcbc";
      c.fillRect(240, 30, 70, 44);
      c.strokeStyle = "#111";
      c.beginPath();
      const a = -Math.PI * 0.8 + vu * Math.PI * 0.6;
      c.moveTo(275, 70);
      c.lineTo(275 + Math.cos(a) * 30, 70 + Math.sin(a) * 30);
      c.stroke();
      text(c, "VU", 245, 33, "#111", 7);
      text(c, `${g.score}`, 8, 8, PAL.amber, 10);
      text(c, `x${combo}`, 8, 22, PAL.cyan, 8);
      text(c, `${Math.max(0, Math.ceil(60 - t))}s`, 240, 80, PAL.cream, 8);
    },
  };
  return g;
}

// M-10 · PONG OF THE VOID — the ball is him. he complains every time. first to 5.
export function pong(): Game {
  let py = H / 2;
  let ay = H / 2;
  let bx = W / 2;
  let by = H / 2;
  let vx = 120;
  let vy = 60;
  let me = 0;
  let him = 0;
  let say = "";
  let sayT = 0;
  const OW = [
    "ow.",
    "OW.",
    "rude.",
    "my face.",
    "again?!",
    "i'm a person.",
    "stop.",
  ];
  const g: Game = {
    title: "PONG OF THE VOID",
    help: "↑/↓ or the mouse. the ball is him. he hates this.",
    score: 0,
    over: false,
    init() {},
    update(dt, i, api) {
      if (i.pointer) py = clamp(i.pointer.y, 20, H - 20);
      py = clamp(
        py + ((i.down ? 1 : 0) - (i.up ? 1 : 0)) * 180 * dt,
        20,
        H - 20,
      );
      // he cheats when he's losing: his paddle teleports a little
      const lead = me - him;
      let aiSpeed = 110 + him * 10;
      if (api.cheating && lead >= 2) {
        aiSpeed = 260;
        if (Math.random() < 0.02) api.cheated();
      }
      ay += clamp(by - ay, -aiSpeed * dt, aiSpeed * dt);
      bx += vx * dt;
      by += vy * dt;
      if (by < 10 || by > H - 10) vy *= -1;
      const bounce = (paddleY: number, side: number) => {
        if (Math.abs(by - paddleY) < 24) {
          vx = -vx * 1.06;
          vy += (by - paddleY) * 4;
          say = OW[Math.floor(Math.random() * OW.length)];
          sayT = 0.8;
          api.sfx("hit");
          bx = side;
        }
      };
      if (bx < 22 && vx < 0) bounce(py, 22);
      if (bx > W - 22 && vx > 0) bounce(ay, W - 22);
      if (bx < 0 || bx > W) {
        if (bx > W) me++;
        else him++;
        api.sfx(bx > W ? "coin" : "lose");
        bx = W / 2;
        by = H / 2;
        vx = (Math.random() < 0.5 ? -1 : 1) * 120;
        vy = rand(-60, 60);
        g.score = me;
        if (me >= 5 || him >= 5) g.over = true;
      }
      sayT -= dt;
    },
    draw(c) {
      c.fillStyle = PAL.bg;
      c.fillRect(0, 0, W, H);
      c.fillStyle = PAL.dim;
      for (let y = 0; y < H; y += 12) c.fillRect(W / 2 - 1, y, 2, 6);
      c.fillStyle = PAL.cream;
      c.fillRect(10, py - 20, 6, 40);
      c.fillStyle = PAL.amber;
      c.fillRect(W - 16, ay - 20, 6, 40);
      drawVortex(c, bx, by, 7, sayT > 0 ? "hurt" : "ok");
      if (sayT > 0) text(c, say, bx, by - 20, PAL.pink, 8, "center");
      text(c, `${me}`, W / 2 - 20, 8, PAL.cream, 14, "right");
      text(c, `${him}`, W / 2 + 20, 8, PAL.amber, 14);
    },
  };
  return g;
}
