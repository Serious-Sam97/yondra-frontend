// Vortex's tape-noise palette, synthesized with WebAudio (no audio files):
// hiss when he flies, a deck-key click when he lands, a fast rewind for a
// finished card, a crunch when he eats, a tink for a falling screw and a low
// whisper when possessed. OFF by default — the user opts in on the profile.

import { getVortexSound } from "@/lib/vortex";
import { duck } from "@/vortex/core/mix";

export type VortexSoundName =
  | "hiss"
  | "click"
  | "rewind"
  | "crunch"
  | "tink"
  | "whisper";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function noise(ac: AudioContext, seconds: number): AudioBufferSourceNode {
  const len = Math.max(1, Math.floor(ac.sampleRate * seconds));
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  return src;
}

function envelope(
  ac: AudioContext,
  peak: number,
  attack: number,
  release: number,
): GainNode {
  const g = ac.createGain();
  const t = ac.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
  return g;
}

/* T-01 · TAPE NOISES volume (0–1), per device */
export function vortexVolume(): number {
  try {
    const v = Number(localStorage.getItem("yd:vortex.volume") ?? 1);
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1;
  } catch {
    return 1;
  }
}
export function setVortexVolume(v: number) {
  try {
    localStorage.setItem(
      "yd:vortex.volume",
      String(Math.max(0, Math.min(1, v))),
    );
  } catch {}
  if (master) master.gain.value = vortexVolume();
}
let master: GainNode | null = null;

/** Play one of his sounds — a no-op unless the user turned sound on. */
export function vxSound(name: VortexSoundName): void {
  if (!getVortexSound()) return;
  const ac = audio();
  if (!ac) return;
  if (!master) {
    master = ac.createGain();
    master.connect(ac.destination);
  }
  master.gain.value = vortexVolume() * duck();
  const out = master;
  const t = ac.currentTime;
  try {
    if (name === "hiss") {
      const n = noise(ac, 0.7);
      const f = ac.createBiquadFilter();
      f.type = "highpass";
      f.frequency.value = 3500;
      n.connect(f)
        .connect(envelope(ac, 0.05, 0.08, 0.55))
        .connect(out);
      n.start(t);
    } else if (name === "click") {
      const o = ac.createOscillator();
      o.type = "square";
      o.frequency.setValueAtTime(1800, t);
      o.frequency.exponentialRampToValueAtTime(240, t + 0.04);
      o.connect(envelope(ac, 0.08, 0.002, 0.05)).connect(out);
      o.start(t);
      o.stop(t + 0.08);
    } else if (name === "rewind") {
      const o = ac.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(2400, t + 0.6);
      const f = ac.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 1200;
      o.connect(f)
        .connect(envelope(ac, 0.05, 0.05, 0.6))
        .connect(out);
      o.start(t);
      o.stop(t + 0.7);
    } else if (name === "crunch") {
      for (let i = 0; i < 3; i++) {
        const n = noise(ac, 0.07);
        const f = ac.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = 900;
        const g = ac.createGain();
        const s = t + i * 0.11;
        g.gain.setValueAtTime(0.0001, s);
        g.gain.exponentialRampToValueAtTime(0.12, s + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, s + 0.07);
        n.connect(f).connect(g).connect(out);
        n.start(s);
      }
    } else if (name === "tink") {
      const o = ac.createOscillator();
      o.type = "triangle";
      o.frequency.value = 3200;
      o.connect(envelope(ac, 0.07, 0.002, 0.35)).connect(out);
      o.start(t);
      o.stop(t + 0.4);
    } else if (name === "whisper") {
      const n = noise(ac, 2.2);
      const f = ac.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 600;
      f.Q.value = 6;
      const lfo = ac.createOscillator();
      const depth = ac.createGain();
      lfo.frequency.value = 3;
      depth.gain.value = 260;
      lfo.connect(depth).connect(f.frequency);
      n.connect(f)
        .connect(envelope(ac, 0.09, 0.4, 1.7))
        .connect(out);
      lfo.start(t);
      n.start(t);
      lfo.stop(t + 2.2);
    }
  } catch {
    // audio is a garnish — never let it throw
  }
}
