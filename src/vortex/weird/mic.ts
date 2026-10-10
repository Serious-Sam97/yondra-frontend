import { body, centre, pick, say, where } from "./bridge";

// R-04 · the microphone, opt-in. Only two numbers ever exist: loudness (RMS)
// and pitch (autocorrelation). Nothing is recorded, transcribed or sent; the
// samples are overwritten 10× a second inside the AnalyserNode.
//   silence → he whispers · noise → he covers his ears · a shout → he flees ·
//   a whistle (high, steady) → he comes to you like a dog.

export interface MicLevel {
  rms: number;
  pitch: number | null;
}
type Listener = (l: MicLevel) => void;

function autoPitch(buf: Float32Array, rate: number): number | null {
  // classic autocorrelation, limited to 600–3200 Hz (whistle range)
  const minLag = Math.floor(rate / 3200);
  const maxLag = Math.floor(rate / 600);
  let best = 0;
  let bestLag = -1;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let s = 0;
    for (let i = 0; i < buf.length - lag; i++) s += buf[i] * buf[i + lag];
    if (s > best) {
      best = s;
      bestLag = lag;
    }
  }
  let energy = 0;
  for (const v of buf) energy += v * v;
  return bestLag > 0 && best / energy > 0.6 ? rate / bestLag : null;
}

export async function startMic(
  onLevel?: Listener,
): Promise<(() => void) | null> {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
  } catch {
    say(
      "no microphone. fine. i'll guess what you're saying. it's probably rude.",
    );
    return null;
  }
  const ac = new AudioContext();
  const src = ac.createMediaStreamSource(stream);
  const an = ac.createAnalyser();
  an.fftSize = 2048;
  src.connect(an); // never connected to the speakers, never to a recorder
  const buf = new Float32Array(an.fftSize);

  let quietSince = performance.now();
  let loudSince: number | null = null;
  let whistleSince: number | null = null;
  let lastPitch = 0;
  let cooldown = 0;
  let pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const onMove = (e: PointerEvent) => {
    pointer = { x: e.clientX, y: e.clientY };
  };
  window.addEventListener("pointermove", onMove, { passive: true });

  const react = (now: number, rms: number, pitch: number | null) => {
    if (now < cooldown) return;
    // a shout: run
    if (rms > 0.32) {
      cooldown = now + 12_000;
      const r = where();
      const c = r ? centre(r) : pointer;
      body({ cmd: "mood", mood: "terror" });
      body({
        cmd: "travel",
        x: c.x < window.innerWidth / 2 ? window.innerWidth - 90 : 90,
        y: c.y < window.innerHeight / 2 ? window.innerHeight - 120 : 140,
      });
      say(
        pick([
          "WHY ARE WE YELLING",
          "i'm made of tape. TAPE. i tear.",
          "ok ok ok i'm over here now. far away. where it's quiet.",
        ]),
      );
      return;
    }
    // sustained noise: ears covered
    if (rms > 0.09) {
      loudSince ??= now;
      if (now - loudSince > 2500) {
        cooldown = now + 30_000;
        loudSince = null;
        body({ cmd: "mood", mood: "shocked" });
        say(
          pick([
            "*covers ears* where ARE you. a construction site? a family lunch?",
            "it's so loud there. i can hear it through the screen. i don't have ears. i can still hear it.",
          ]),
        );
      }
    } else loudSince = null;
    // a whistle: high, steady pitch
    if (pitch && rms > 0.015 && Math.abs(pitch - lastPitch) / pitch < 0.06) {
      whistleSince ??= now;
      if (now - whistleSince > 550) {
        cooldown = now + 15_000;
        whistleSince = null;
        body({ cmd: "mood", mood: "love" });
        body({ cmd: "travel", x: pointer.x, y: Math.max(140, pointer.y) });
        say(
          pick([
            "…did you just whistle at me. i came. i hate that i came.",
            "i'm not a dog. *arrives wagging* i'm NOT a dog.",
            "good— no. don't say good boy. don't you dare.",
          ]),
        );
      }
    } else whistleSince = null;
    lastPitch = pitch ?? 0;
    // a long silence: whisper
    if (rms > 0.012) quietSince = now;
    else if (now - quietSince > 25_000) {
      quietSince = now;
      cooldown = now + 600_000;
      body({ cmd: "mood", mood: "paranoid" });
      say(
        pick([
          "*whispering* it's so quiet. are we hiding? who are we hiding from?",
          "*whispering* shh. i think the cards are asleep.",
        ]),
      );
    }
  };

  const tick = setInterval(() => {
    an.getFloatTimeDomainData(buf);
    let s = 0;
    for (const v of buf) s += v * v;
    const rms = Math.sqrt(s / buf.length);
    const pitch = rms > 0.01 ? autoPitch(buf, ac.sampleRate) : null;
    onLevel?.({ rms, pitch });
    react(performance.now(), rms, pitch);
  }, 100);

  return () => {
    clearInterval(tick);
    window.removeEventListener("pointermove", onMove);
    for (const t of stream.getTracks()) t.stop();
    void ac.close();
  };
}
