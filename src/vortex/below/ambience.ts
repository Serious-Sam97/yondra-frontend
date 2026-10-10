// I-19 · each room hums: tape hiss, a tape motor, wind, a clock, an arcade,
// a radio far away — or nothing at all (the leader). WebAudio only, very quiet,
// and only with Tape noises on.

import { getVortexSound } from "@/lib/vortex";

let ctx: AudioContext | null = null;
let stop: (() => void) | null = null;

function noiseBuffer(ac: AudioContext, secs = 2) {
  const b = ac.createBuffer(1, ac.sampleRate * secs, ac.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

export function playHum(kind: string) {
  stop?.();
  stop = null;
  if (!getVortexSound() || kind === "silence") return;
  const C =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!C) return;
  ctx ??= new C();
  const ac = ctx;
  if (ac.state === "suspended") void ac.resume();
  const out = ac.createGain();
  out.gain.value = 0.0001;
  out.gain.exponentialRampToValueAtTime(0.03, ac.currentTime + 1.2);
  out.connect(ac.destination);
  const nodes: AudioScheduledSourceNode[] = [];
  const timers: ReturnType<typeof setInterval>[] = [];

  const noise = (freq: number, q: number, gain: number) => {
    const src = ac.createBufferSource();
    src.buffer = noiseBuffer(ac);
    src.loop = true;
    const f = ac.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ac.createGain();
    g.gain.value = gain;
    src.connect(f).connect(g).connect(out);
    src.start();
    nodes.push(src);
    return { f, g };
  };

  if (kind === "hiss") noise(5000, 0.5, 0.8);
  if (kind === "wind") {
    const { f } = noise(500, 0.8, 1);
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.08;
    const lg = ac.createGain();
    lg.gain.value = 300;
    lfo.connect(lg).connect(f.frequency);
    lfo.start();
    nodes.push(lfo);
  }
  if (kind === "motor") {
    const o = ac.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = 54;
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 180;
    const g = ac.createGain();
    g.gain.value = 0.4;
    o.connect(lp).connect(g).connect(out);
    o.start();
    nodes.push(o);
    noise(3000, 0.6, 0.3);
  }
  if (kind === "clock") {
    timers.push(
      setInterval(() => {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.frequency.value = 1800;
        g.gain.setValueAtTime(0.6, ac.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.05);
        o.connect(g).connect(out);
        o.start();
        o.stop(ac.currentTime + 0.06);
      }, 1000),
    );
  }
  if (kind === "arcade") {
    const notes = [262, 330, 392, 523, 392, 330];
    let i = 0;
    timers.push(
      setInterval(() => {
        const o = ac.createOscillator();
        o.type = "square";
        const g = ac.createGain();
        o.frequency.value = notes[i++ % notes.length] / 2;
        g.gain.setValueAtTime(0.12, ac.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.18);
        o.connect(g).connect(out);
        o.start();
        o.stop(ac.currentTime + 0.2);
      }, 260),
    );
    noise(4000, 0.5, 0.2);
  }
  if (kind === "radio") {
    noise(1500, 1.4, 0.6);
    const o = ac.createOscillator();
    o.type = "triangle";
    o.frequency.value = 220;
    const g = ac.createGain();
    g.gain.value = 0.08;
    const trem = ac.createOscillator();
    trem.frequency.value = 4;
    const tg = ac.createGain();
    tg.gain.value = 0.05;
    trem.connect(tg).connect(g.gain);
    o.connect(g).connect(out);
    o.start();
    trem.start();
    nodes.push(o, trem);
  }

  stop = () => {
    out.gain.cancelScheduledValues(ac.currentTime);
    out.gain.setValueAtTime(out.gain.value, ac.currentTime);
    out.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.4);
    for (const t of timers) clearInterval(t);
    setTimeout(() => {
      for (const n of nodes) {
        try {
          n.stop();
        } catch {}
      }
      out.disconnect();
    }, 450);
  };
}

export function stopHum() {
  stop?.();
  stop = null;
}
