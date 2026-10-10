"use client";

import { apiFetch } from "@/lib/api";
import { speakTape, type VoicePreset } from "@/vortex/voice/tts";
import { getStation, onAir, request } from "./station";

// O-12 · THE VOID HOUR: his weekly talk show about your week, with a guest
// from below. The script comes from the server (written once a week); here it
// airs over an ambient bed, line by line, with voices when the host mic is on.

interface Show {
  week: string;
  guest: string;
  lines: { who: "vortex" | "guest"; text: string }[];
}

const GUEST_NAME: Record<string, string> = {
  moth: "THE ARCHIVIST",
  locutora: "THE HOST",
  splicer: "THE SPLICER",
  metronome: "THE METRONOME",
  wow: "WOW",
  twin: "THE TWIN",
};
const GUEST_VOICE: Record<string, VoicePreset> = {
  moth: "drunk",
  locutora: "host",
  splicer: "whisper",
  metronome: "possessed",
  wow: "drunk",
  twin: "host",
};

let airing = false;

export async function playVoidHour() {
  if (airing) return;
  airing = true;
  try {
    const show = await apiFetch<Show>("/api/mascot/radio/void-hour");
    await request("ambient");
    await new Promise((r) => setTimeout(r, 2500));
    for (const l of show.lines) {
      if (!getStation().on) break;
      const who =
        l.who === "vortex" ? "VORTEX" : (GUEST_NAME[show.guest] ?? "GUEST");
      const ms = Math.min(12_000, 2200 + l.text.length * 55);
      onAir(`${who}: ${l.text}`, ms);
      if (getStation().voice)
        await new Promise<void>((done) => {
          speakTape(l.text, {
            preset:
              l.who === "vortex"
                ? "normal"
                : (GUEST_VOICE[show.guest] ?? "host"),
            onEnd: done,
          });
          setTimeout(done, ms + 4000);
        });
      else await new Promise((r) => setTimeout(r, ms));
    }
  } catch {
    onAir(
      "the void hour is off the air this week. technical difficulties. (he overslept.)",
      6000,
    );
  } finally {
    airing = false;
  }
}
