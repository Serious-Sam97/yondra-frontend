// M-02 · THE ARCADE ENGINE. One fixed-step loop (60 updates a second), one
// unified input (keyboard, pointer and touch become the same intents), a tiny
// chiptune voice, and a CRT on top (CSS). Every game is a small object that
// updates and draws on a 320×240 canvas; the engine scales it crisply, pauses
// when the tab hides, and applies the daily machine's mutant rule.

export const W = 320;
export const H = 240;

export type Rule = "inverted" | "slow" | "mono" | "fast" | null;

export interface Input {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  fire: boolean;
  /** pressed this frame */
  firePressed: boolean;
  /** pointer in canvas coordinates (null when not over it) */
  pointer: { x: number; y: number } | null;
  /** a click/tap this frame, in canvas coordinates */
  tap: { x: number; y: number } | null;
  /** keys pressed this frame (lowercase) */
  keys: Set<string>;
}

export interface GameApi {
  sfx(
    kind: "blip" | "hit" | "boom" | "coin" | "lose" | "note",
    note?: number,
  ): void;
  /** the twin cheats: true when the server said he cheats this run */
  cheating: boolean;
  /** flag that he just cheated — shows the CHEATER! button for a moment */
  cheated(): void;
  /** for games that use your board (titles of overdue cards, etc.) */
  data: Record<string, unknown>;
  rule: Rule;
  reducedMotion: boolean;
}

export interface Game {
  title: string;
  /** one line of how to play */
  help: string;
  init(api: GameApi): void;
  update(dt: number, input: Input, api: GameApi): void;
  draw(g: CanvasRenderingContext2D, api: GameApi): void;
  score: number;
  over: boolean;
  /** attract mode: a demo that plays itself (optional) */
  demo?(t: number, g: CanvasRenderingContext2D): void;
}

let audio: AudioContext | null = null;
function ac() {
  if (!audio) {
    const C =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    audio = new C();
  }
  if (audio.state === "suspended") void audio.resume();
  return audio;
}

export function sfx(
  kind: "blip" | "hit" | "boom" | "coin" | "lose" | "note",
  note = 60,
) {
  try {
    const a = ac();
    const t = a.currentTime;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = kind === "boom" ? "sawtooth" : "square";
    const f0 = {
      blip: 880,
      hit: 330,
      boom: 110,
      coin: 988,
      lose: 220,
      note: 440 * 2 ** ((note - 69) / 12),
    }[kind];
    o.frequency.setValueAtTime(f0, t);
    if (kind === "coin") o.frequency.setValueAtTime(1319, t + 0.06);
    if (kind === "lose") o.frequency.exponentialRampToValueAtTime(70, t + 0.5);
    if (kind === "boom") o.frequency.exponentialRampToValueAtTime(40, t + 0.3);
    const len = {
      blip: 0.06,
      hit: 0.1,
      boom: 0.35,
      coin: 0.18,
      lose: 0.55,
      note: 0.16,
    }[kind];
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + len + 0.02);
  } catch {}
}

export const PAL = {
  bg: "#0d0905",
  amber: "#ffb547",
  cream: "#f3e4bd",
  rust: "#b5533c",
  olive: "#6f8a4a",
  cyan: "#8fe3e3",
  pink: "#ff8fd4",
  dim: "#3a2c20",
  red: "#ff3b4d",
};

/** Draw his face (a tiny pixel version) at x,y, size s. */
export function drawVortex(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  s = 12,
  mood: "ok" | "hurt" = "ok",
) {
  g.fillStyle = "#c0207a";
  g.beginPath();
  g.arc(x, y, s, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = PAL.cyan;
  g.lineWidth = 1.5;
  g.stroke();
  g.fillStyle = "#fff";
  g.fillRect(x - s * 0.55, y - s * 0.3, s * 0.4, s * 0.45);
  g.fillRect(x + s * 0.15, y - s * 0.3, s * 0.4, s * 0.45);
  g.fillStyle = "#1a0033";
  if (mood === "hurt") {
    g.fillRect(x - s * 0.5, y - s * 0.1, s * 0.3, s * 0.08);
    g.fillRect(x + s * 0.2, y - s * 0.1, s * 0.3, s * 0.08);
  } else {
    g.fillRect(x - s * 0.42, y - s * 0.18, s * 0.18, s * 0.22);
    g.fillRect(x + s * 0.28, y - s * 0.18, s * 0.18, s * 0.22);
  }
  g.fillRect(x - s * 0.3, y + s * 0.35, s * 0.6, s * 0.1);
}

export function text(
  g: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  color = PAL.cream,
  size = 8,
  align: CanvasTextAlign = "left",
) {
  g.fillStyle = color;
  g.font = `${size}px "Share Tech Mono", monospace`;
  g.textAlign = align;
  g.textBaseline = "top";
  g.fillText(s, x, y);
}

/**
 * Run a game on a canvas. Resolves with the final score when it's over (or
 * when stopped). Returns a stop function synchronously via the `onStop` arg.
 */
export function run(
  canvas: HTMLCanvasElement,
  game: Game,
  api: Omit<GameApi, "reducedMotion">,
  onFrame?: (game: Game) => void,
): { done: Promise<number>; stop: () => void } {
  const g = canvas.getContext("2d") as CanvasRenderingContext2D;
  g.imageSmoothingEnabled = false;
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const full: GameApi = { ...api, reducedMotion };
  const input: Input = {
    left: false,
    right: false,
    up: false,
    down: false,
    fire: false,
    firePressed: false,
    pointer: null,
    tap: null,
    keys: new Set(),
  };
  const inv = api.rule === "inverted";
  const keyMap = (k: string, on: boolean) => {
    const key = k.toLowerCase();
    if (key === "arrowleft" || key === "a") input[inv ? "right" : "left"] = on;
    if (key === "arrowright" || key === "d") input[inv ? "left" : "right"] = on;
    if (key === "arrowup" || key === "w") input[inv ? "down" : "up"] = on;
    if (key === "arrowdown" || key === "s") input[inv ? "up" : "down"] = on;
    if (key === " " || key === "enter") {
      if (on && !input.fire) input.firePressed = true;
      input.fire = on;
    }
    if (on) input.keys.add(key);
  };
  const kd = (e: KeyboardEvent) => {
    if (
      ["arrowleft", "arrowright", "arrowup", "arrowdown", " "].includes(
        e.key.toLowerCase(),
      )
    )
      e.preventDefault();
    keyMap(e.key, true);
  };
  const ku = (e: KeyboardEvent) => keyMap(e.key, false);
  const toCanvas = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    let x = ((e.clientX - r.left) / r.width) * W;
    const y = ((e.clientY - r.top) / r.height) * H;
    if (inv) x = W - x;
    return { x, y };
  };
  const pm = (e: PointerEvent) => {
    input.pointer = toCanvas(e);
  };
  const pd = (e: PointerEvent) => {
    input.pointer = toCanvas(e);
    input.tap = input.pointer;
    input.firePressed = true;
    input.fire = true;
  };
  const pu = () => {
    input.fire = false;
  };
  window.addEventListener("keydown", kd);
  window.addEventListener("keyup", ku);
  canvas.addEventListener("pointermove", pm);
  canvas.addEventListener("pointerdown", pd);
  window.addEventListener("pointerup", pu);

  game.init(full);
  let raf = 0;
  let last = performance.now();
  let acc = 0;
  let stopped = false;
  const speed = api.rule === "slow" ? 0.6 : api.rule === "fast" ? 1.5 : 1;
  const step = 1000 / 60;
  let resolve: (n: number) => void = () => {};
  const done = new Promise<number>((r) => {
    resolve = r;
  });
  const frame = (now: number) => {
    if (stopped) return;
    raf = requestAnimationFrame(frame);
    if (document.hidden) {
      last = now;
      return; // paused while the tab is away
    }
    acc += Math.min(100, now - last) * speed;
    last = now;
    while (acc >= step) {
      game.update(step / 1000, input, full);
      input.firePressed = false;
      input.tap = null;
      input.keys.clear();
      acc -= step;
    }
    g.save();
    if (inv) {
      g.translate(W, 0);
      g.scale(-1, 1);
    }
    game.draw(g, full);
    g.restore();
    if (api.rule === "mono") {
      const img = g.getImageData(0, 0, W, H);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
        d[i] = d[i + 1] = d[i + 2] = v;
      }
      g.putImageData(img, 0, 0);
    }
    onFrame?.(game);
    if (game.over) {
      stop();
      resolve(Math.max(0, Math.round(game.score)));
    }
  };
  raf = requestAnimationFrame(frame);
  const stop = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    window.removeEventListener("keydown", kd);
    window.removeEventListener("keyup", ku);
    canvas.removeEventListener("pointermove", pm);
    canvas.removeEventListener("pointerdown", pd);
    window.removeEventListener("pointerup", pu);
    resolve(Math.max(0, Math.round(game.score)));
  };
  return { done, stop };
}

export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const clamp = (v: number, a: number, b: number) =>
  Math.max(a, Math.min(b, v));
export const hit = (
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Where the tap landed this frame (far off-screen when there was none). */
export const tapAt = (i: Input) => i.tap ?? { x: -999, y: -999 };
