import {
  clamp,
  drawVortex,
  type Game,
  H,
  hit,
  PAL,
  rand,
  tapAt,
  text,
  W,
} from "./engine";

// M-03 · CARD INVADERS — your overdue cards are the invaders, he's the ship,
// the Metronome is the boss. Shot titles are remembered (you can open them
// after; opening never changes anything).
export function invaders(): Game {
  type Inv = {
    x: number;
    y: number;
    w: number;
    h: number;
    t: string;
    alive: boolean;
  };
  let inv: Inv[] = [];
  let shots: { x: number; y: number }[] = [];
  let bombs: { x: number; y: number; v: number }[] = [];
  let px = W / 2;
  let dir = 1;
  let lives = 3;
  let cool = 0;
  let boss: { x: number; hp: number; t: number } | null = null;
  let wave = 0;
  const shot: string[] = [];
  const spawn = (titles: string[]) => {
    inv = [];
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 6; c++) {
        const t =
          titles[(r * 6 + c + wave * 5) % Math.max(1, titles.length)] ??
          "late card";
        inv.push({
          x: 24 + c * 46,
          y: 24 + r * 22,
          w: 40,
          h: 14,
          t: t.slice(0, 9),
          alive: true,
        });
      }
  };
  const g: Game = {
    title: "CARD INVADERS",
    help: "←/→ to move, space to fire. they're your overdue cards.",
    score: 0,
    over: false,
    init(api) {
      spawn((api.data.titles as string[]) ?? []);
      api.data.shot = shot;
    },
    update(dt, i, api) {
      px = clamp(
        px + ((i.right ? 1 : 0) - (i.left ? 1 : 0)) * 150 * dt,
        12,
        W - 12,
      );
      if (i.pointer) px = clamp(i.pointer.x, 12, W - 12);
      cool -= dt;
      if ((i.fire || i.firePressed) && cool <= 0) {
        shots.push({ x: px, y: H - 30 });
        cool = 0.35;
        api.sfx("blip");
      }
      for (const s of shots) s.y -= 240 * dt;
      shots = shots.filter((s) => s.y > -5);
      const alive = inv.filter((v) => v.alive);
      if (!boss) {
        const edge = alive.some((v) => (dir > 0 ? v.x + v.w > W - 6 : v.x < 6));
        if (edge) {
          dir *= -1;
          for (const v of alive) v.y += 8;
        }
        for (const v of alive)
          v.x += dir * (20 + wave * 6 + (18 - alive.length) * 2) * dt;
        if (alive.length && Math.random() < dt * (0.8 + wave * 0.3)) {
          const s = alive[Math.floor(Math.random() * alive.length)];
          const fast = api.cheating && Math.random() < 0.3;
          if (fast) api.cheated();
          bombs.push({ x: s.x + s.w / 2, y: s.y + s.h, v: fast ? 200 : 90 });
        }
        if (alive.some((v) => v.y + v.h > H - 34)) g.over = true;
        if (alive.length === 0) {
          wave++;
          if (wave % 2 === 0) boss = { x: W / 2, hp: 20, t: 0 };
          else spawn((api.data.titles as string[]) ?? []);
        }
      } else {
        boss.t += dt;
        boss.x = W / 2 + Math.sin(boss.t * 1.6) * 110;
        if (Math.random() < dt * 2.2) bombs.push({ x: boss.x, y: 60, v: 120 });
      }
      for (const s of shots) {
        for (const v of alive)
          if (hit({ x: s.x - 1, y: s.y, w: 2, h: 5 }, v)) {
            v.alive = false;
            s.y = -10;
            g.score += 10;
            shot.push(v.t);
            api.sfx("hit");
          }
        if (boss && Math.abs(s.x - boss.x) < 18 && s.y < 76 && s.y > 30) {
          s.y = -10;
          boss.hp--;
          api.sfx("hit");
          if (boss.hp <= 0) {
            g.score += 200;
            boss = null;
            api.sfx("boom");
            spawn((api.data.titles as string[]) ?? []);
          }
        }
      }
      for (const b of bombs) b.y += b.v * dt;
      bombs = bombs.filter((b) => b.y < H);
      for (const b of bombs)
        if (Math.abs(b.x - px) < 10 && b.y > H - 30) {
          b.y = H + 10;
          lives--;
          api.sfx("lose");
          if (lives <= 0) g.over = true;
        }
    },
    draw(c) {
      c.fillStyle = PAL.bg;
      c.fillRect(0, 0, W, H);
      for (const v of inv)
        if (v.alive) {
          c.fillStyle = PAL.cream;
          c.fillRect(v.x, v.y, v.w, v.h);
          c.fillStyle = PAL.rust;
          c.fillRect(v.x, v.y, 3, v.h);
          text(c, v.t, v.x + 5, v.y + 3, "#2a1f17", 7);
        }
      if (boss) {
        c.strokeStyle = PAL.amber;
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(W / 2, 0);
        c.lineTo(boss.x, 52);
        c.stroke();
        c.fillStyle = PAL.cream;
        c.beginPath();
        c.arc(boss.x, 56, 16, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = "#111";
        c.beginPath();
        c.moveTo(boss.x, 56);
        c.lineTo(
          boss.x + 8 * Math.cos(boss.t * 6),
          56 + 8 * Math.sin(boss.t * 6),
        );
        c.stroke();
        c.fillStyle = PAL.red;
        c.fillRect(boss.x - 20, 78, (boss.hp / 20) * 40, 3);
        text(c, "THE METRONOME", W / 2, 6, PAL.amber, 8, "center");
      }
      c.fillStyle = PAL.amber;
      for (const s of shots) c.fillRect(s.x - 1, s.y, 2, 5);
      c.fillStyle = PAL.red;
      for (const b of bombs) c.fillRect(b.x - 1.5, b.y, 3, 6);
      drawVortex(c, px, H - 20, 10);
      text(c, `${g.score}`, 6, H - 12, PAL.amber);
      text(
        c,
        "♥".repeat(Math.max(0, lives)),
        W - 6,
        H - 12,
        PAL.pink,
        8,
        "right",
      );
    },
  };
  return g;
}

// M-04 · TAPE RUNNER — he runs along a tape that unspools forever; jump the
// dropouts and pencils; the Rewinder is always behind you.
export function runner(): Game {
  let y = 0;
  let vy = 0;
  let speed = 90;
  let obs: { x: number; kind: "gap" | "pencil"; w: number }[] = [];
  let next = 1;
  let t = 0;
  let behind = 0;
  const ground = H - 50;
  const g: Game = {
    title: "TAPE RUNNER",
    help: "space / tap to jump. she's behind you.",
    score: 0,
    over: false,
    init() {},
    update(dt, i, api) {
      t += dt;
      speed = 90 + t * 4;
      g.score += speed * dt * 0.1;
      if ((i.firePressed || i.keys.has("arrowup") || i.tap) && y >= 0) {
        vy = -230;
        api.sfx("blip");
      }
      vy += 600 * dt;
      y = Math.min(0, y + vy * dt);
      if (y >= 0) vy = 0;
      next -= dt;
      if (next <= 0) {
        obs.push({
          x: W + 10,
          kind: Math.random() < 0.5 ? "gap" : "pencil",
          w: rand(18, 30),
        });
        next = rand(0.9, 1.8) * (110 / speed) * 1.4;
      }
      for (const o of obs) o.x -= speed * dt;
      obs = obs.filter((o) => o.x > -40);
      const me = { x: 60 - 8, y: ground + y - 16, w: 16, h: 16 };
      for (const o of obs) {
        if (
          o.kind === "pencil" &&
          hit(me, { x: o.x, y: ground - 14, w: 8, h: 14 })
        )
          g.over = true;
        if (
          o.kind === "gap" &&
          y >= 0 &&
          me.x + 8 > o.x &&
          me.x + 8 < o.x + o.w
        )
          g.over = true;
      }
      behind = Math.min(40, behind + dt * 2);
      if (g.over) api.sfx("lose");
    },
    draw(c) {
      c.fillStyle = PAL.bg;
      c.fillRect(0, 0, W, H);
      c.fillStyle = "#5a3418";
      c.fillRect(0, ground, W, 8);
      c.fillStyle = "#3f2410";
      for (let x = -((t * speed) % 16); x < W; x += 16)
        c.fillRect(x, ground + 2, 8, 2);
      for (const o of obs) {
        if (o.kind === "gap") {
          c.fillStyle = PAL.bg;
          c.fillRect(o.x, ground - 1, o.w, 12);
        } else {
          c.fillStyle = "#c8962e";
          c.fillRect(o.x, ground - 14, 8, 14);
          c.fillStyle = "#e9c9a0";
          c.fillRect(o.x, ground - 18, 8, 4);
          c.fillStyle = "#2a1f17";
          c.fillRect(o.x + 3, ground - 20, 2, 2);
        }
      }
      c.fillStyle = "rgba(0,0,0,.85)";
      c.fillRect(0, ground - 70, 18 + behind / 3, 70);
      c.fillStyle = PAL.cream;
      c.beginPath();
      c.arc(10 + behind / 6, ground - 60, 7, 0, Math.PI * 2);
      c.fill();
      drawVortex(c, 60, ground + y - 9, 9);
      text(c, `${Math.floor(g.score)} m`, W - 6, 8, PAL.amber, 8, "right");
    },
  };
  return g;
}

// M-05 · KANBAN TETRIS — the pieces are J-cards in your column colours; full
// lines go to Done. Now and then the Twin's piece falls: perfect, and it fits nowhere.
export function tetris(): Game {
  const CW = 10;
  const COLS = 10;
  const ROWS = 20;
  const OX = (W - COLS * CW) / 2;
  const OY = 20;
  const SHAPES = [
    [[1, 1, 1, 1]],
    [
      [1, 1],
      [1, 1],
    ],
    [
      [0, 1, 0],
      [1, 1, 1],
    ],
    [
      [1, 0, 0],
      [1, 1, 1],
    ],
    [
      [0, 0, 1],
      [1, 1, 1],
    ],
    [
      [1, 1, 0],
      [0, 1, 1],
    ],
    [
      [0, 1, 1],
      [1, 1, 0],
    ],
  ];
  const TWIN = [
    [1, 1, 1],
    [1, 0, 1],
    [1, 1, 1],
  ];
  const COLORS = [
    PAL.rust,
    PAL.amber,
    PAL.olive,
    PAL.cyan,
    PAL.cream,
    "#c8962e",
    "#8a7a5c",
  ];
  let grid: (string | null)[][] = Array.from({ length: ROWS }, () =>
    Array(COLS).fill(null),
  );
  let piece = { s: SHAPES[0], x: 4, y: 0, c: COLORS[0], twin: false };
  let fall = 0;
  let move = 0;
  let flash = 0;
  const fits = (s: number[][], x: number, y: number) =>
    s.every((row, r) =>
      row.every(
        (v, c) =>
          !v ||
          (x + c >= 0 &&
            x + c < COLS &&
            y + r < ROWS &&
            (y + r < 0 || !grid[y + r][x + c])),
      ),
    );
  const spawn = () => {
    const twin = Math.random() < 0.06;
    const k = Math.floor(Math.random() * SHAPES.length);
    piece = {
      s: twin ? TWIN : SHAPES[k],
      x: 3,
      y: 0,
      c: twin ? PAL.pink : COLORS[k],
      twin,
    };
    if (!fits(piece.s, piece.x, piece.y)) g.over = true;
  };
  const rotate = (s: number[][]) =>
    s[0].map((_, i) => s.map((r) => r[i]).reverse());
  const g: Game = {
    title: "KANBAN TETRIS",
    help: "←/→ move, ↑ rotate, ↓ drop. full rows go to Done.",
    score: 0,
    over: false,
    init() {
      spawn();
    },
    update(dt, i, api) {
      move -= dt;
      if (move <= 0) {
        if (i.left && fits(piece.s, piece.x - 1, piece.y)) piece.x--;
        if (i.right && fits(piece.s, piece.x + 1, piece.y)) piece.x++;
        if (i.left || i.right) move = 0.12;
      }
      if (i.keys.has("arrowup") || i.keys.has("w") || i.tap) {
        const r = rotate(piece.s);
        if (fits(r, piece.x, piece.y)) piece.s = r;
      }
      fall += dt * (i.down ? 12 : 1.6 + g.score / 3000);
      if (fall >= 1) {
        fall = 0;
        if (fits(piece.s, piece.x, piece.y + 1)) piece.y++;
        else {
          piece.s.forEach((row, r) => {
            row.forEach((v, c) => {
              if (v && piece.y + r >= 0)
                grid[piece.y + r][piece.x + c] = piece.c;
            });
          });
          const before = grid.length;
          grid = grid.filter((row) => row.some((v) => !v));
          const cleared = before - grid.length;
          while (grid.length < ROWS) grid.unshift(Array(COLS).fill(null));
          if (cleared) {
            g.score += [0, 100, 300, 500, 800][cleared];
            flash = 0.5;
            api.sfx("coin");
          } else api.sfx("blip");
          spawn();
        }
      }
      flash = Math.max(0, flash - dt);
    },
    draw(c) {
      c.fillStyle = PAL.bg;
      c.fillRect(0, 0, W, H);
      c.fillStyle = "#1a120b";
      c.fillRect(OX, OY, COLS * CW, ROWS * CW);
      const cell = (x: number, y: number, col: string) => {
        c.fillStyle = col;
        c.fillRect(OX + x * CW, OY + y * CW, CW - 1, CW - 1);
        c.fillStyle = "rgba(0,0,0,.25)";
        c.fillRect(OX + x * CW, OY + y * CW + CW - 3, CW - 1, 2);
      };
      grid.forEach((row, y) => {
        row.forEach((v, x) => {
          if (v) cell(x, y, v);
        });
      });
      piece.s.forEach((row, r) => {
        row.forEach((v, cc) => {
          if (v) cell(piece.x + cc, piece.y + r, piece.c);
        });
      });
      if (piece.twin)
        text(c, "the twin's piece 😊", W / 2, 6, PAL.pink, 8, "center");
      if (flash > 0) text(c, "→ DONE", W / 2, H / 2, PAL.olive, 16, "center");
      text(c, `${g.score}`, OX + COLS * CW + 10, OY, PAL.amber, 10);
    },
  };
  return g;
}

// M-07 · WHACK-A-GHOST 2 — nine holes; the Overwritten pop up (hit them); the
// Twin pops up too (don't). Faster every phase. 45 seconds.
export function whack(): Game {
  type Pop = { hole: number; twin: boolean; t: number };
  let pops: Pop[] = [];
  let left = 45;
  let next = 0.6;
  const hole = (k: number) => ({
    x: 70 + (k % 3) * 90,
    y: 60 + Math.floor(k / 3) * 60,
  });
  const g: Game = {
    title: "WHACK-A-GHOST 2",
    help: "click the overwritten. never the twin.",
    score: 0,
    over: false,
    init() {},
    update(dt, i, api) {
      left -= dt;
      if (left <= 0) g.over = true;
      const phase = 1 + Math.floor((45 - left) / 15);
      next -= dt;
      if (next <= 0) {
        const free = [...Array(9).keys()].filter(
          (k) => !pops.some((p) => p.hole === k),
        );
        if (free.length)
          pops.push({
            hole: free[Math.floor(Math.random() * free.length)],
            twin: Math.random() < 0.18,
            t: 1.4 / phase,
          });
        next = rand(0.3, 0.8) / phase;
      }
      for (const p of pops) p.t -= dt;
      pops = pops.filter((p) => p.t > 0);
      if (i.tap) {
        const p = pops.find((pp) => {
          const h = hole(pp.hole);
          return Math.hypot(tapAt(i).x - h.x, tapAt(i).y - h.y) < 22;
        });
        if (p) {
          pops = pops.filter((q) => q !== p);
          if (p.twin) {
            g.score = Math.max(0, g.score - 3);
            api.sfx("lose");
          } else {
            g.score++;
            api.sfx("hit");
          }
        }
      }
    },
    draw(c) {
      c.fillStyle = PAL.bg;
      c.fillRect(0, 0, W, H);
      for (let k = 0; k < 9; k++) {
        const h = hole(k);
        c.fillStyle = "#1a120b";
        c.beginPath();
        c.ellipse(h.x, h.y + 14, 26, 8, 0, 0, Math.PI * 2);
        c.fill();
      }
      for (const p of pops) {
        const h = hole(p.hole);
        if (p.twin) {
          c.fillStyle = "#f3f3f3";
          c.beginPath();
          c.arc(h.x, h.y, 14, 0, Math.PI * 2);
          c.fill();
          text(c, "😊", h.x, h.y - 6, "#111", 12, "center");
        } else {
          c.globalAlpha = 0.6;
          drawVortex(c, h.x, h.y, 14, "hurt");
          c.globalAlpha = 1;
        }
      }
      text(c, `${g.score}`, 8, 8, PAL.amber, 10);
      text(c, `${Math.ceil(left)}s`, W - 8, 8, PAL.cream, 10, "right");
    },
  };
  return g;
}
