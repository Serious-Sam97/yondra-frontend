import type { VortexProp } from "@/components/vortex/mk4/useVortexWorld";
import { getVortexFlag, setVortexFlag } from "@/lib/vortex";
import type { VortexMood } from "@/lib/vortexArt";

// LADO R · how the experimental modules reach his body and voice without
// touching the assistant: plain window events. Everything here is opt-in and
// device-local; each switch lives under yd:vortex.flag.weird-*.

export type BodyCmd =
  | { cmd: "travel"; x: number; y: number }
  | { cmd: "place"; x: number; y: number; ms?: number }
  | { cmd: "home" }
  | { cmd: "mood"; mood: VortexMood }
  | { cmd: "prop"; prop: VortexProp }
  | { cmd: "hide" }
  | { cmd: "show" }
  | { cmd: "fx"; cls: string; ms?: number }
  | { cmd: "anim"; name: string };

export const body = (d: BodyCmd) =>
  window.dispatchEvent(new CustomEvent("vortex:body", { detail: d }));

export const say = (text: string, mood?: VortexMood) =>
  window.dispatchEvent(
    new CustomEvent("vortex:say", { detail: { text, mood } }),
  );

/** his sprite on screen right now (null when he's disabled or hidden) */
export function where(): DOMRect | null {
  const el = document.querySelector<HTMLElement>(".vxa-sprite");
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 ? r : null;
}
export const centre = (r: DOMRect) => ({
  x: r.left + r.width / 2,
  y: r.top + r.height / 2,
});

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
export const pick = <T>(xs: readonly T[]): T =>
  xs[Math.floor(Math.random() * xs.length)];

export type WeirdFlag =
  | "torus"
  | "tabs"
  | "mic"
  | "camera"
  | "motion"
  | "battery"
  | "weather"
  | "cursor"
  | "broadcast"
  | "maintenance"
  | "fork";

export const weirdOn = (f: WeirdFlag) => getVortexFlag(`weird-${f}`, false);
export const setWeird = (f: WeirdFlag, on: boolean) =>
  setVortexFlag(`weird-${f}`, on);

/** at most once per `days` per device, and then only with chance `p` per call (R-13, R-14, R-15) */
export function rare(key: string, days: number, p: number): boolean {
  try {
    const k = `yd:vortex.rare.${key}`;
    const last = Number(localStorage.getItem(k) ?? 0);
    if (Date.now() - last < days * 86_400_000 || Math.random() > p)
      return false;
    localStorage.setItem(k, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}
