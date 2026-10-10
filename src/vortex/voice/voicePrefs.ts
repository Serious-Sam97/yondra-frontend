import { getVortexFlag, getVortexSound } from "@/lib/vortex";
import type { VortexMood } from "@/lib/vortexArt";
import type { VoicePreset } from "./tts";

// R-03 · the cheap half of his own voice: whether it's on, and which preset a
// mood gets. The synthesizer itself (babble.ts) loads only when it speaks.

export const moodPreset = (m: VortexMood): VoicePreset =>
  m === "drunk" || m === "dizzy"
    ? "drunk"
    : m === "possessed" || m === "malicious" || m === "fury"
      ? "possessed"
      : m === "paranoid" || m === "asleep" || m === "dreaming"
        ? "whisper"
        : "normal";

export const babbleOn = () =>
  getVortexSound() && getVortexFlag("weird-babble", false);
