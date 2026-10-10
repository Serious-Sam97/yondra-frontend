// O-02 · THE RADIO'S MUSIC. No audio files: every song is a seed. A seeded
// generator picks the chords, bassline, arpeggio, drums and tempo for one of
// four fixed genres, so a song with the same seed always sounds the same and
// has the same name. Everything runs through a worn-tape chain (wow & flutter
// on a modulated delay, a low-pass, hiss, the odd dropout). Bars are scheduled
// by a pure function so the same song can also be rendered offline — which is
// how the backwards songs (F20) get reversed. Sound here is always the
// user's explicit choice (they turned the dial), so it ignores Tape noises.

export type Genre = "synthwave" | "lofi" | "elevator" | "ambient";

export interface Song {
  id: string;
  name: string;
  genre: Genre;
  seed: number;
  bpm: number;
  root: number; // midi note of the key
  minor: boolean;
  /** O-08 · a melody line (scale degrees) — board songs carry one */
  melody?: number[];
  rare?: boolean;
  /** F20 · this one was recorded backwards */
  backwards?: boolean;
}

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const ADJ = [
  "tape",
  "late",
  "amber",
  "quiet",
  "broken",
  "slow",
  "cold",
  "warm",
  "lost",
  "night",
  "empty",
  "magnetic",
  "hollow",
  "golden",
  "rewound",
  "static",
];
const NOUN = [
  "hiss",
  "kitchen",
  "overtime",
  "basement",
  "highway",
  "lamp",
  "receiver",
  "elevator",
  "garage",
  "deadline",
  "corridor",
  "signal",
  "mixtape",
  "moth",
  "monday",
  "reel",
];
const GENRE_BPM: Record<Genre, [number, number]> = {
  synthwave: [84, 102],
  lofi: [68, 82],
  elevator: [96, 112],
  ambient: [56, 64],
};

/** A catalogue song from a seed: name, genre, tempo, key. */
export function songFromSeed(seed: number, genre?: Genre): Song {
  const r = rng(seed);
  const g: Genre =
    genre ??
    (["synthwave", "lofi", "elevator", "ambient"] as Genre[])[
      Math.floor(r() * 4)
    ];
  const [lo, hi] = GENRE_BPM[g];
  const name = `${ADJ[Math.floor(r() * ADJ.length)]} ${NOUN[Math.floor(r() * NOUN.length)]}`;
  return {
    id: `s${seed}`,
    name,
    genre: g,
    seed,
    bpm: Math.round(lo + r() * (hi - lo)),
    root: 45 + Math.floor(r() * 7),
    minor:
      g === "synthwave" ? r() < 0.8 : g === "elevator" ? r() < 0.15 : r() < 0.5,
  };
}

/** O-08 · a song made of your board: tempo = velocity, key = mood, melody = titles. */
export function boardSong(
  boardName: string,
  stats: { doneWeek: number; overdue: number; titles: string[] },
): Song {
  const seed = hash(boardName);
  const melody = stats.titles
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .slice(0, 32)
    .split("")
    .map((c) => (c.charCodeAt(0) - 97) % 7);
  return {
    id: `b${seed}`,
    name: boardName.toLowerCase(),
    genre: stats.overdue > stats.doneWeek ? "lofi" : "synthwave",
    seed,
    bpm: Math.max(64, Math.min(132, 66 + stats.doneWeek * 4)),
    root: 45 + (seed % 7),
    minor: stats.overdue > stats.doneWeek,
    melody: melody.length ? melody : [0, 2, 4, 2],
  };
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const PROGS: Record<Genre, number[][]> = {
  synthwave: [
    [0, 5, 3, 4],
    [0, 3, 5, 4],
    [5, 3, 0, 4],
  ],
  lofi: [
    [1, 4, 0, 5],
    [0, 5, 1, 4],
    [3, 4, 2, 5],
  ],
  elevator: [
    [0, 5, 1, 4],
    [0, 3, 1, 4],
  ],
  ambient: [
    [0, 3],
    [0, 5],
  ],
};
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export interface Patterns {
  prog: number[];
  arp: number[];
  swing: number;
  drums: boolean;
}
export function patterns(song: Song): Patterns {
  const r = rng(song.seed ^ 0x9e37);
  const progs = PROGS[song.genre];
  return {
    prog: progs[Math.floor(r() * progs.length)],
    arp: Array.from({ length: 8 }, () => Math.floor(r() * 3)),
    swing: song.genre === "lofi" ? 0.12 : 0,
    drums: song.genre !== "ambient",
  };
}

function degree(song: Song, deg: number, oct = 0) {
  const scale = song.minor ? MINOR : MAJOR;
  const d = ((deg % 7) + 7) % 7;
  return song.root + scale[d] + 12 * (oct + Math.floor(deg / 7));
}

function voice(
  ac: BaseAudioContext,
  dest: AudioNode,
  type: OscillatorType,
  f: number,
  t: number,
  dur: number,
  gain: number,
  cutoff = 4000,
) {
  const o = ac.createOscillator();
  o.type = type;
  o.frequency.value = f;
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = cutoff;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.03, dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(lp).connect(g).connect(dest);
  o.start(t);
  o.stop(t + dur + 0.05);
}

let noiseBuf: AudioBuffer | null = null;
function noise(ac: BaseAudioContext) {
  if (noiseBuf && noiseBuf.sampleRate === ac.sampleRate) return noiseBuf;
  const b = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  noiseBuf = b;
  return b;
}
function hit(
  ac: BaseAudioContext,
  dest: AudioNode,
  t: number,
  kind: "kick" | "snare" | "hat",
) {
  if (kind === "kick") {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.18);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + 0.32);
    return;
  }
  const src = ac.createBufferSource();
  src.buffer = noise(ac);
  const f = ac.createBiquadFilter();
  f.type = kind === "hat" ? "highpass" : "bandpass";
  f.frequency.value = kind === "hat" ? 7000 : 1800;
  const g = ac.createGain();
  const len = kind === "hat" ? 0.04 : 0.16;
  g.gain.setValueAtTime(kind === "hat" ? 0.08 : 0.22, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(f).connect(g).connect(dest);
  src.start(t);
  src.stop(t + len + 0.02);
}

/** Schedule one bar of `song` at time t0. Pure: works on live and offline contexts. */
export function scheduleBar(
  ac: BaseAudioContext,
  dest: AudioNode,
  song: Song,
  p: Patterns,
  bar: number,
  t0: number,
) {
  const beat = 60 / song.bpm;
  const chordDeg = p.prog[bar % p.prog.length];
  const chord = [chordDeg, chordDeg + 2, chordDeg + 4].map((d) =>
    degree(song, d, 1),
  );
  // pad
  const padType: OscillatorType =
    song.genre === "elevator"
      ? "sine"
      : song.genre === "lofi"
        ? "triangle"
        : "sawtooth";
  for (const n of chord) {
    voice(
      ac,
      dest,
      padType,
      hz(n),
      t0,
      beat * 4,
      0.035,
      song.genre === "synthwave" ? 1400 : 2200,
    );
    if (song.genre === "synthwave")
      voice(ac, dest, padType, hz(n) * 1.004, t0, beat * 4, 0.025, 1200);
  }
  if (song.genre === "ambient") {
    if (bar % 2 === 0)
      voice(
        ac,
        dest,
        "sine",
        hz(degree(song, chordDeg + 4, 2)),
        t0 + beat * 2,
        beat * 3,
        0.05,
      );
    return;
  }
  // bass
  for (let b = 0; b < 4; b++) {
    const off = song.genre === "synthwave" ? [0, 0.5] : [0];
    for (const o of off)
      voice(
        ac,
        dest,
        "triangle",
        hz(degree(song, chordDeg, -1)),
        t0 + (b + o) * beat,
        beat * 0.45,
        0.12,
        600,
      );
  }
  // arp / keys / melody
  const steps = song.genre === "synthwave" ? 16 : 8;
  const step = (beat * 4) / steps;
  for (let i = 0; i < steps; i++) {
    const sw = i % 2 === 1 ? p.swing * step * 2 : 0;
    const t = t0 + i * step + sw;
    if (song.melody?.length) {
      if (i % 2 === 0) {
        const d = song.melody[(bar * 4 + i / 2) % song.melody.length];
        voice(
          ac,
          dest,
          "square",
          hz(degree(song, d, 2)),
          t,
          step * 1.6,
          0.03,
          2600,
        );
      }
    } else if (song.genre === "synthwave" || i % 2 === 0) {
      const n = chord[p.arp[i % p.arp.length]];
      voice(
        ac,
        dest,
        song.genre === "synthwave" ? "square" : "triangle",
        hz(n + 12),
        t,
        step * 0.9,
        0.025,
        3000,
      );
    }
    if (p.drums) {
      if (song.genre !== "elevator" && (i === 0 || i === steps / 2))
        hit(ac, dest, t, "kick");
      if (i === steps / 4 || i === (steps * 3) / 4) hit(ac, dest, t, "snare");
      if (i % (steps / 8) === 0) hit(ac, dest, t, "hat");
    }
  }
}

/** The worn-tape chain: wobble (modulated delay), low-pass, hiss. Returns its input. */
function tapeChain(ac: BaseAudioContext, out: AudioNode, wear = 1) {
  const input = ac.createGain();
  const delay = ac.createDelay(0.05);
  delay.delayTime.value = 0.012;
  const wow = ac.createOscillator();
  wow.frequency.value = 0.55;
  const wowG = ac.createGain();
  wowG.gain.value = 0.0016 * wear;
  wow.connect(wowG).connect(delay.delayTime);
  const flutter = ac.createOscillator();
  flutter.frequency.value = 9;
  const flG = ac.createGain();
  flG.gain.value = 0.0002 * wear;
  flutter.connect(flG).connect(delay.delayTime);
  wow.start();
  flutter.start();
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 6500;
  input.connect(delay).connect(lp).connect(out);
  const hiss = ac.createBufferSource();
  hiss.buffer = noise(ac);
  hiss.loop = true;
  const hg = ac.createGain();
  hg.gain.value = 0.012 * wear;
  hiss.connect(hg).connect(out);
  hiss.start();
  return {
    input,
    stop: () => {
      for (const n of [wow, flutter, hiss]) n.stop();
    },
  };
}

/** F20 · render a song offline and flip it: the backwards version. */
export async function renderReversed(
  song: Song,
  bars = 4,
): Promise<AudioBuffer> {
  const secs = (60 / song.bpm) * 4 * bars + 1;
  const off = new OfflineAudioContext(1, Math.ceil(44100 * secs), 44100);
  const p = patterns(song);
  for (let b = 0; b < bars; b++)
    scheduleBar(off, off.destination, song, p, b, b * (60 / song.bpm) * 4);
  const buf = await off.startRendering();
  const d = buf.getChannelData(0);
  d.reverse();
  return buf;
}

const MORSE: Record<string, string> = {
  a: ".-",
  b: "-...",
  c: "-.-.",
  d: "-..",
  e: ".",
  f: "..-.",
  g: "--.",
  h: "....",
  i: "..",
  j: ".---",
  k: "-.-",
  l: ".-..",
  m: "--",
  n: "-.",
  o: "---",
  p: ".--.",
  q: "--.-",
  r: ".-.",
  s: "...",
  t: "-",
  u: "..-",
  v: "...-",
  w: ".--",
  x: "-..-",
  y: "-.--",
  z: "--..",
};

type Listener = (e: { type: "song"; song: Song | null }) => void;

/** One radio for the whole app (the walkman follows you between pages). */
class Radio {
  private ac: AudioContext | null = null;
  private master: GainNode | null = null;
  private chain: { input: GainNode; stop: () => void } | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private src: AudioBufferSourceNode | null = null;
  private listeners = new Set<Listener>();
  song: Song | null = null;
  volume = 0.6;

  private ctx() {
    if (!this.ac) {
      const C =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      this.ac = new C();
      this.master = this.ac.createGain();
      this.master.gain.value = this.volume * 0.5;
      this.master.connect(this.ac.destination);
    }
    if (this.ac.state === "suspended") void this.ac.resume();
    return this.ac;
  }

  on(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit() {
    for (const fn of this.listeners) fn({ type: "song", song: this.song });
  }

  get playing() {
    return this.song !== null;
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.master && this.ac)
      this.master.gain.setTargetAtTime(v * 0.5, this.ac.currentTime, 0.1);
  }

  /** Play a song (forever, until stop or another song). */
  async play(song: Song, wear = 1) {
    this.stop(false);
    const ac = this.ctx();
    if (!this.master) return false;
    this.chain = tapeChain(
      ac,
      this.master,
      song.genre === "lofi" ? wear * 2 : wear,
    );
    this.song = song;
    this.emit();
    if (song.backwards) {
      const buf = await renderReversed(song);
      if (this.song !== song) return true;
      const s = ac.createBufferSource();
      s.buffer = buf;
      s.loop = true;
      s.connect(this.chain.input);
      s.start();
      this.src = s;
      return true;
    }
    const p = patterns(song);
    const barLen = (60 / song.bpm) * 4;
    let bar = 0;
    let next = ac.currentTime + 0.1;
    const input = this.chain.input;
    const tick = () => {
      while (next < ac.currentTime + 0.6) {
        scheduleBar(ac, input, song, p, bar++, next);
        // the odd dropout: a worn spot on the tape
        if (Math.random() < 0.04) {
          input.gain.setValueAtTime(1, next + barLen * 0.5);
          input.gain.linearRampToValueAtTime(0.15, next + barLen * 0.52);
          input.gain.linearRampToValueAtTime(1, next + barLen * 0.6);
        }
        next += barLen;
      }
    };
    tick();
    this.timer = setInterval(tick, 200);
    return true;
  }

  stop(emit = true) {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    try {
      this.src?.stop();
    } catch {}
    this.src = null;
    this.chain?.stop();
    this.chain?.input.disconnect();
    this.chain = null;
    this.song = null;
    if (emit) this.emit();
  }

  /** F21 · morse under the static (quiet, at 700 Hz). */
  morse(text: string) {
    const ac = this.ctx();
    if (!this.master) return;
    const unit = 0.09;
    let t = ac.currentTime + 0.2;
    for (const ch of text.toLowerCase()) {
      if (ch === " ") {
        t += unit * 7;
        continue;
      }
      for (const sym of MORSE[ch] ?? "") {
        const len = sym === "." ? unit : unit * 3;
        const o = ac.createOscillator();
        o.frequency.value = 700;
        const g = ac.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.06, t + 0.005);
        g.gain.setValueAtTime(0.06, t + len - 0.005);
        g.gain.linearRampToValueAtTime(0.0001, t + len);
        o.connect(g).connect(this.master);
        o.start(t);
        o.stop(t + len + 0.01);
        t += len + unit;
      }
      t += unit * 2;
    }
  }

  /** A burst of static (interference, tuning). */
  static(seconds = 0.8) {
    const ac = this.ctx();
    if (!this.master) return;
    const s = ac.createBufferSource();
    s.buffer = noise(ac);
    s.loop = true;
    const f = ac.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 1600;
    f.Q.value = 0.6;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.18, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + seconds);
    s.connect(f).connect(g).connect(this.master);
    s.start();
    s.stop(ac.currentTime + seconds + 0.05);
  }

  /** O-15 · a single chord on top (tension or resolution), for the soundtrack mode. */
  chord(kind: "tense" | "resolve") {
    const ac = this.ctx();
    if (!this.master) return;
    const base = 57;
    const notes = kind === "tense" ? [0, 1, 6] : [0, 4, 7, 12];
    notes.forEach((n, i) => {
      voice(
        ac,
        this.master as GainNode,
        "triangle",
        hz(base + n),
        ac.currentTime + i * 0.04,
        kind === "tense" ? 2.2 : 3,
        0.05,
        2400,
      );
    });
  }
}

export const radio =
  typeof window !== "undefined" ? new Radio() : (null as unknown as Radio);
