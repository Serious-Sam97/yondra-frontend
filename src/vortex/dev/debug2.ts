import { apiFetch } from "@/lib/api";
import { directorWhy, impulseIds, runImpulse } from "@/vortex/core/director";
import { refreshSoul, type useSoul } from "@/vortex/core/soul";
import { genomeOf } from "@/vortex/creator/genome";
import { demolish } from "@/vortex/weird/demolish";
import { portal } from "@/vortex/weird/portal";
import { wrapAround } from "@/vortex/weird/space";

// T-08 · __vortexDebug 2.0 (dev only), merged into the assistant's object:
//   run("R-13")          fire a phase by id (or any impulse / prank id)
//   phases()             what run() knows
//   time(h)              he lives h hours (server), then the soul reloads
//   date("03-13") / date("03:13") / date("fullmoon") / date.reset()
//   stage(n)             corruption to the bottom of stage n (0–5)
//   online("Ana")        a teammate appears on the board
//   director.why()       the Director's last 40 decisions
//   perf()               frame-time / long-task overlay (T-03)

const weird = (mode: string) => () =>
  window.dispatchEvent(new CustomEvent("vortex:weird", { detail: { mode } }));

const PHASES: Record<string, () => unknown> = {
  "R-01": () => wrapAround(true),
  "R-10": () => demolish(),
  "R-11": () =>
    portal("in", "dimension").then(() => portal("out", "dimension")),
  "R-13": weird("interrupt"),
  "R-14": weird("maintenance"),
  "R-15": weird("fork"),
  "R-17": weird("popcorn"),
  "R-18": weird("speedrun"),
  "R-20": weird("tour"),
  "R-12": () => window.location.assign("/studio"),
  "Q-06": () => window.location.assign("/zine"),
  "S-09": () => {
    const s = soulNow();
    if (s)
      window.dispatchEvent(
        new CustomEvent("vortex:visitor", { detail: genomeOf(s) }),
      );
  },
};
let soulNow: () => ReturnType<typeof useSoul> = () => null;

const STAGE_FLOOR = [0, 15, 35, 55, 75, 90];
const SYNODIC = 29.530588853 * 86_400_000;
const NEW_MOON = Date.parse("2000-01-06T18:14:00Z");

/* a fake clock: Date shifted by an offset (dev only, reversible) */
const RealDate = Date;
let offset = 0;
function shiftTo(target: number) {
  offset = target - RealDate.now();
  class Shifted extends RealDate {
    constructor(...a: unknown[]) {
      if (a.length === 0) super(RealDate.now() + offset);
      else super(...(a as [string]));
    }
    static now() {
      return RealDate.now() + offset;
    }
  }
  (window as unknown as { Date: DateConstructor }).Date =
    Shifted as unknown as DateConstructor;
}
const date = Object.assign(
  (what: string) => {
    const now = new RealDate();
    let t: number;
    if (/^\d{2}-\d{2}$/.test(what))
      t = new RealDate(`${now.getFullYear()}-${what}T12:00:00`).getTime();
    else if (/^\d{2}:\d{2}$/.test(what)) {
      const [h, m] = what.split(":").map(Number);
      const d = new RealDate(now);
      d.setHours(h, m, 0, 0);
      t = d.getTime();
    } else if (what === "fullmoon") {
      const n = Math.ceil((RealDate.now() - NEW_MOON) / SYNODIC);
      t = NEW_MOON + (n - 0.5) * SYNODIC;
    } else t = RealDate.parse(what);
    if (!Number.isFinite(t)) return `can't read "${what}"`;
    shiftTo(t);
    return `the browser now thinks it's ${new Date().toString()}`;
  },
  {
    reset: () => {
      (window as unknown as { Date: DateConstructor }).Date = RealDate;
      offset = 0;
      return "real time restored";
    },
  },
);

/* T-03 · perf overlay: average frame time over the last second and long tasks */
let perfEl: HTMLDivElement | null = null;
function perf() {
  if (perfEl) {
    perfEl.remove();
    perfEl = null;
    return "perf overlay off";
  }
  const el = document.createElement("div");
  el.style.cssText =
    "position:fixed;right:8px;top:8px;z-index:2147483647;background:#000c;color:#7dffb0;font:11px ui-monospace,monospace;padding:6px 8px;pointer-events:none;white-space:pre";
  document.body.appendChild(el);
  perfEl = el;
  let frames: number[] = [];
  let last = performance.now();
  let long = 0;
  const po =
    "PerformanceObserver" in window
      ? new PerformanceObserver((l) => {
          long += l.getEntries().length;
        })
      : null;
  try {
    po?.observe({ entryTypes: ["longtask"] });
  } catch {}
  const loop = (now: number) => {
    if (!perfEl) {
      po?.disconnect();
      return;
    }
    frames.push(now - last);
    last = now;
    frames = frames.slice(-60);
    const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
    const mem = (
      performance as unknown as { memory?: { usedJSHeapSize: number } }
    ).memory;
    el.textContent = `frame ${avg.toFixed(1)} ms · ${(1000 / avg).toFixed(0)} fps\nlong tasks ${long}${mem ? `\nheap ${(mem.usedJSHeapSize / 1e6).toFixed(0)} MB` : ""}\nvortex nodes ${document.querySelectorAll("[class*='vx']").length}`;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return "perf overlay on";
}

export function debug2(opts: {
  soul: () => ReturnType<typeof useSoul>;
  prank: (k: string) => unknown;
  online: (name: string) => void;
}) {
  soulNow = opts.soul;
  return {
    run: (id: string) => {
      if (PHASES[id]) return void PHASES[id]();
      if (runImpulse(id)) return `impulse ${id}`;
      return opts.prank(id);
    },
    phases: () => ({ phases: Object.keys(PHASES), impulses: impulseIds() }),
    time: async (hours: number) => {
      await apiFetch("/api/mascot/dev/soul", {
        method: "POST",
        body: JSON.stringify({ away_hours: Math.round(hours) }),
      });
      await refreshSoul();
      return `${hours} h passed for him`;
    },
    date,
    stage: async (n: number) => {
      await apiFetch("/api/mascot/dev/soul", {
        method: "POST",
        body: JSON.stringify({
          corruption: STAGE_FLOOR[Math.max(0, Math.min(5, n))] + 1,
        }),
      });
      await refreshSoul();
      return `stage ${n}`;
    },
    online: (name: string) => opts.online(name),
    director: { why: directorWhy },
    perf,
  };
}
