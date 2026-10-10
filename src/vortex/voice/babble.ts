import { vortexVolume } from "@/components/vortex/vortexSound";
import { duck } from "@/vortex/core/mix";
import type { VoicePreset } from "./tts";

// R-03 · HIS OWN VOICE. The browser's speech synthesis can't be routed through
// WebAudio, so this is a voice built from scratch: one syllable per few
// letters, a glottal buzz shaped by two vowel formants taken from the text,
// then the tape chain — saturation, wow & flutter, a little garage reverb.
// Each mood has a preset: drunk slurs and drifts flat, possessed adds a
// second voice an octave below, whisper is breath with no buzz.

interface Voice {
  base: number; // Hz
  rate: number; // syllables per second
  detune: number; // cents of random drift
  breath: number; // 0..1 noise mix
  octave: boolean; // a second voice an octave down
  drive: number; // saturation amount
  gain: number;
}
const VOICES: Record<VoicePreset, Voice> = {
  normal: {
    base: 118,
    rate: 11,
    detune: 40,
    breath: 0.12,
    octave: false,
    drive: 2.2,
    gain: 0.22,
  },
  drunk: {
    base: 104,
    rate: 7,
    detune: 180,
    breath: 0.15,
    octave: false,
    drive: 2.6,
    gain: 0.22,
  },
  possessed: {
    base: 92,
    rate: 8,
    detune: 60,
    breath: 0.25,
    octave: true,
    drive: 5,
    gain: 0.2,
  },
  whisper: {
    base: 140,
    rate: 10,
    detune: 20,
    breath: 1,
    octave: false,
    drive: 1,
    gain: 0.16,
  },
  host: {
    base: 190,
    rate: 9,
    detune: 25,
    breath: 0.1,
    octave: false,
    drive: 1.4,
    gain: 0.18,
  },
};

// [F1, F2] for the vowel a letter suggests
const FORMANTS: Record<string, [number, number]> = {
  a: [730, 1090],
  e: [530, 1840],
  i: [290, 2290],
  o: [570, 840],
  u: [300, 870],
  y: [290, 2000],
};

export { babbleOn, moodPreset } from "./voicePrefs";

let ctx: AudioContext | null = null;
let reverb: ConvolverNode | null = null;
function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}
/** a small, boxy room: decaying noise with early slap */
function garage(ac: AudioContext): ConvolverNode {
  if (reverb) return reverb;
  const len = Math.floor(ac.sampleRate * 0.9);
  const buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / ac.sampleRate;
      d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 7) * (t < 0.012 ? 0.2 : 1);
    }
  }
  reverb = ac.createConvolver();
  reverb.buffer = buf;
  return reverb;
}
function shaper(ac: AudioContext, k: number): WaveShaperNode {
  const ws = ac.createWaveShaper();
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  ws.curve = curve;
  return ws;
}
function noise(ac: AudioContext): AudioBuffer {
  const b = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

/** speak `text` in his own voice; returns a stop function */
export function babble(
  text: string,
  preset: VoicePreset = "normal",
  opts: { onWord?: (charIndex: number) => void; onEnd?: () => void } = {},
): () => void {
  const ac = audio();
  const clean = text.replace(/\*[^*]*\*/g, " ").slice(0, 400);
  if (!ac || !clean.trim()) {
    opts.onEnd?.();
    return () => {};
  }
  const v = VOICES[preset];
  const out = ac.createGain();
  out.gain.value = v.gain * vortexVolume() * duck();
  const drive = shaper(ac, v.drive);
  const tone = ac.createBiquadFilter(); // tape: no air above 4.5k
  tone.type = "lowpass";
  tone.frequency.value = 4500;
  const wet = ac.createGain();
  wet.gain.value = 0.18;
  drive.connect(tone).connect(out);
  tone.connect(garage(ac)).connect(wet).connect(out);
  out.connect(ac.destination);
  // wow (0.6 Hz) and flutter (11 Hz) bend every oscillator's pitch
  const wow = ac.createOscillator();
  wow.frequency.value = 0.6;
  const wowAmt = ac.createGain();
  wowAmt.gain.value = 18;
  const flut = ac.createOscillator();
  flut.frequency.value = 11;
  const flutAmt = ac.createGain();
  flutAmt.gain.value = 6;
  wow.connect(wowAmt);
  flut.connect(flutAmt);
  wow.start();
  flut.start();

  const n = noise(ac);
  const t0 = ac.currentTime + 0.05;
  const step = 1 / v.rate;
  const syl: { at: number; char: number }[] = [];
  let t = t0;
  // a syllable every ~3 letters; spaces and punctuation are pauses
  for (let i = 0; i < clean.length; i += 3) {
    const chunk = clean.slice(i, i + 3).toLowerCase();
    if (/^[\s.,!?…]+$/.test(chunk)) {
      t += /[.!?…]/.test(chunk) ? step * 2.5 : step * 0.8;
      continue;
    }
    const vowel = [...chunk].find((c) => c in FORMANTS) ?? "a";
    const [f1, f2] = FORMANTS[vowel];
    const dur = step * (0.75 + Math.random() * 0.35);
    const pitch =
      v.base *
      2 **
        ((((chunk.charCodeAt(0) * 7) % 9) -
          4 +
          (Math.random() - 0.5) * (v.detune / 50)) /
          12);
    const env = ac.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(1, t + 0.015);
    env.gain.setTargetAtTime(0, t + dur * 0.6, dur * 0.25);
    const fA = ac.createBiquadFilter();
    fA.type = "bandpass";
    fA.frequency.value = f1;
    fA.Q.value = 6;
    const fB = ac.createBiquadFilter();
    fB.type = "bandpass";
    fB.frequency.value = f2;
    fB.Q.value = 8;
    const mix = ac.createGain();
    fA.connect(mix);
    fB.connect(mix);
    mix.connect(env).connect(drive);
    const voices = v.octave ? [1, 0.5] : [1];
    for (const mult of voices) {
      if (v.breath < 1) {
        const o = ac.createOscillator();
        o.type = "sawtooth";
        o.frequency.setValueAtTime(pitch * mult, t);
        o.frequency.linearRampToValueAtTime(
          pitch * mult * (preset === "drunk" ? 0.9 : 0.97),
          t + dur,
        );
        wowAmt.connect(o.detune);
        flutAmt.connect(o.detune);
        const g = ac.createGain();
        g.gain.value = (1 - v.breath) * (mult < 1 ? 0.8 : 1);
        o.connect(g);
        g.connect(fA);
        g.connect(fB);
        o.start(t);
        o.stop(t + dur + 0.1);
      }
    }
    const br = ac.createBufferSource();
    br.buffer = n;
    const bg = ac.createGain();
    bg.gain.value = v.breath * 0.6;
    br.connect(bg);
    bg.connect(fA);
    bg.connect(fB);
    br.start(t, Math.random() * 0.5, dur + 0.1);
    syl.push({ at: t, char: i });
    t += dur;
  }
  const end = t + 0.3;
  const timers = syl.map((s) =>
    setTimeout(() => opts.onWord?.(s.char), (s.at - ac.currentTime) * 1000),
  );
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    for (const x of timers) clearTimeout(x);
    out.gain.setTargetAtTime(0, ac.currentTime, 0.03);
    setTimeout(() => {
      wow.stop();
      flut.stop();
      out.disconnect();
    }, 200);
    opts.onEnd?.();
  };
  const endT = setTimeout(finish, (end - ac.currentTime) * 1000);
  return () => {
    clearTimeout(endT);
    finish();
  };
}
