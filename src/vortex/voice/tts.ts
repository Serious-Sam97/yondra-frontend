// His spoken voice (A-13, grown into R-03): the browser's speech synthesis,
// pitched down, with a WebAudio bed of tape hiss and a slow wow so it sounds
// like a worn microcassette. The bed only plays when Tape noises are on.

import { getVortexSound } from "@/lib/vortex";
import { later, startLater } from "@/vortex/core/later";
import { babbleOn } from "./voicePrefs";

const synth = later(() => import("./babble"));

export type VoicePreset = "normal" | "drunk" | "possessed" | "whisper" | "host";

const PRESETS: Record<
  VoicePreset,
  { pitch: number; rate: number; volume: number }
> = {
  normal: { pitch: 0.55, rate: 0.98, volume: 1 },
  drunk: { pitch: 0.45, rate: 0.78, volume: 1 },
  possessed: { pitch: 0.1, rate: 0.7, volume: 1 },
  whisper: { pitch: 0.8, rate: 0.9, volume: 0.45 },
  // O-04 · the Host: softer, tired, a little higher
  host: { pitch: 1.05, rate: 0.9, volume: 0.75 },
};

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const C =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!C) return null;
  ctx ??= new C();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** A looping hiss with a slow wobble, faded in/out around the speech. */
function tapeBed(seconds: number): (() => void) | null {
  const ac = audio();
  if (!ac || !getVortexSound()) return null;
  const len = Math.floor(ac.sampleRate * 2);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.6;
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const band = ac.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 5200;
  band.Q.value = 0.6;
  const gain = ac.createGain();
  const t = ac.currentTime;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.035, t + 0.25);
  // wow: the hiss drifts, like a capstan that's seen things
  const lfo = ac.createOscillator();
  lfo.frequency.value = 0.7;
  const lfoGain = ac.createGain();
  lfoGain.gain.value = 900;
  lfo.connect(lfoGain).connect(band.frequency);
  src.connect(band).connect(gain).connect(ac.destination);
  src.start();
  lfo.start();
  const stopAt = (when: number) => {
    gain.gain.cancelScheduledValues(ac.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.3);
    src.stop(when + 0.35);
    lfo.stop(when + 0.35);
  };
  const auto = setTimeout(() => stopAt(ac.currentTime), (seconds + 1) * 1000);
  return () => {
    clearTimeout(auto);
    stopAt(ac.currentTime);
  };
}

/** N-05 · the splicer's voice mods bend his (never the host's) voice. */
let voiceMod: string | null = null;
export function setVoiceMod(id: string | null) {
  voiceMod = id;
}
export function voiceBend(pitch: number, rate: number): [number, number] {
  if (voiceMod === "voice-deep")
    return [Math.max(0.05, pitch - 0.35), rate * 0.92];
  if (voiceMod === "voice-robot") return [0.3, rate * 1.08];
  if (voiceMod === "voice-am") return [pitch + 0.2, rate * 1.04];
  return [pitch, rate];
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Say it out loud. `onWord` gets each word's char index (lip-sync), `onEnd`
 * fires once. Returns a stop function.
 */
export function speakTape(
  text: string,
  opts: {
    preset?: VoicePreset;
    onWord?: (charIndex: number) => void;
    onEnd?: () => void;
  } = {},
): () => void {
  const clean = text
    .split("ACTION:")[0]
    .replace(/\{\{(card|board|project):\d+\}\}/g, "that")
    .replace(/\*kk+z+t+\*/gi, " ");
  // R-03 · his own synthesized voice, when chosen
  if (babbleOn() && clean.trim() !== "")
    return startLater(synth, (m) => m.babble(clean, opts.preset, opts));
  if (!canSpeak() || clean.trim() === "") {
    opts.onEnd?.();
    return () => {};
  }
  const p = PRESETS[opts.preset ?? "normal"];
  const u = new SpeechSynthesisUtterance(clean);
  const [bp, br] =
    opts.preset === "host" ? [p.pitch, p.rate] : voiceBend(p.pitch, p.rate);
  u.pitch = bp;
  u.rate = br;
  u.volume = p.volume;
  // prefer a low English voice when the system has one
  const voices = window.speechSynthesis.getVoices();
  const v =
    opts.preset === "host"
      ? (voices.find(
          (x) =>
            /en[-_]/i.test(x.lang) &&
            /female|samantha|karen|moira|victoria|google uk english female/i.test(
              x.name,
            ),
        ) ?? voices.find((x) => /^en/i.test(x.lang)))
      : (voices.find(
          (x) =>
            /en[-_]/i.test(x.lang) &&
            /male|daniel|fred|alex|google uk english male/i.test(x.name),
        ) ?? voices.find((x) => /^en/i.test(x.lang)));
  if (v) u.voice = v;
  const stopBed = tapeBed(clean.length / 12);
  let ended = false;
  const finish = () => {
    if (ended) return;
    ended = true;
    stopBed?.();
    opts.onEnd?.();
  };
  u.onboundary = (e) => opts.onWord?.(e.charIndex);
  u.onend = finish;
  u.onerror = finish;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
  return () => {
    window.speechSynthesis.cancel();
    finish();
  };
}
