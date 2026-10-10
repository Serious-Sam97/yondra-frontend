// H-14 · the scare budget. The dark side is a SYSTEM, not a slot machine:
//   Mischief → up to 2 light events a week (stages 1–2).
//   Unhinged → up to 1 a day, and 1 strong event (chase, melt, crash) a week.
//   Polite   → none (he only hints).
// Never in the first 2 minutes of a session, never while busy (the director
// already checks), and the user can pause scares for a day or a week.

import { getVortexFlag } from "@/lib/vortex";

const KEY = "yd:vortex.scares";
const sessionStart = Date.now();

type Weight = "light" | "strong";
interface Log {
  light: number[];
  strong: number[];
}

function load(): Log {
  try {
    return {
      light: [],
      strong: [],
      ...(JSON.parse(localStorage.getItem(KEY) ?? "null") ?? {}),
    };
  } catch {
    return { light: [], strong: [] };
  }
}

export function scaresPausedUntil(): number {
  try {
    return Number(localStorage.getItem("yd:vortex.scares.pausedUntil") ?? 0);
  } catch {
    return 0;
  }
}
export function pauseScares(ms: number) {
  try {
    localStorage.setItem(
      "yd:vortex.scares.pausedUntil",
      String(Date.now() + ms),
    );
  } catch {}
}

/** May a scare of this weight happen now? (doesn't spend it) */
export function canScare(
  weight: Weight,
  intensity: "polite" | "mischief" | "unhinged",
): boolean {
  if (intensity === "polite") return false;
  if (getVortexFlag("noscares")) return false;
  if (Date.now() < scaresPausedUntil()) return false;
  if (Date.now() - sessionStart < 2 * 60_000) return false;
  const log = load();
  const week = Date.now() - 7 * 86_400_000;
  const day = Date.now() - 86_400_000;
  if (intensity === "mischief") {
    if (weight === "strong") return false;
    return log.light.filter((t) => t > week).length < 2;
  }
  if (weight === "strong") return log.strong.filter((t) => t > week).length < 1;
  return log.light.filter((t) => t > day).length < 1;
}

/** Spend one. */
export function spendScare(weight: Weight) {
  const log = load();
  const week = Date.now() - 7 * 86_400_000;
  log[weight] = [...log[weight].filter((t) => t > week), Date.now()];
  try {
    localStorage.setItem(KEY, JSON.stringify(log));
  } catch {}
}
