import { apiFetch } from "@/lib/api";
import { getVortexFlag } from "@/lib/vortex";

// T-07 · TELEMETRY, local by default. Per event: how often it was shown, how
// often it was closed within 1.5 s (irritation) and how often it was clicked
// (fun). Counts live on this device; only with the "share anonymous counts"
// switch on does yesterday's tally go to the server — aggregated there with
// no user id, to calibrate the Director. Nothing else is ever recorded.

type Kind = "shown" | "fast" | "clicked";
const KEY = "yd:vortex.tally";
type Tally = Record<string, Record<string, Partial<Record<Kind, number>>>>; // day → event → counts

const today = () => new Date().toISOString().slice(0, 10);
function read(): Tally {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}
function write(t: Tally) {
  try {
    localStorage.setItem(KEY, JSON.stringify(t));
  } catch {}
}

export function tally(event: string, kind: Kind) {
  if (typeof window === "undefined" || !/^[a-z0-9:._-]{2,40}$/.test(event))
    return;
  const t = read();
  const d = today();
  t[d] ??= {};
  t[d][event] ??= {};
  const e = t[d][event];
  e[kind] = Math.min(500, (e[kind] ?? 0) + 1);
  // keep a week locally
  for (const k of Object.keys(t).sort().slice(0, -7)) delete t[k];
  write(t);
}

export const telemetryConsent = () => getVortexFlag("telemetry", false);

/** send finished days (never today), once, and only with consent */
export async function flushTelemetry() {
  if (!telemetryConsent()) return;
  const t = read();
  const d = today();
  const past = Object.keys(t).filter((k) => k < d);
  if (past.length === 0) return;
  const merged: Record<string, Partial<Record<Kind, number>>> = {};
  for (const day of past)
    for (const [ev, c] of Object.entries(t[day]))
      for (const k of ["shown", "fast", "clicked"] as Kind[]) {
        merged[ev] ??= {};
        merged[ev][k] = Math.min(500, (merged[ev][k] ?? 0) + (c[k] ?? 0));
      }
  const counts = Object.fromEntries(Object.entries(merged).slice(0, 60));
  try {
    await apiFetch("/api/mascot/telemetry", {
      method: "POST",
      body: JSON.stringify({ counts }),
    });
    for (const day of past) delete t[day];
    write(t);
  } catch {}
}

/** what this device has counted (shown in the rack, so you can see it all) */
export function localTally(): Tally {
  return read();
}
