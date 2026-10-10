"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { WeirdMode } from "@/components/vortex/mk4/chat";
import {
  getVortexHeadGames,
  getVortexIntensity,
  useVortexFlag,
} from "@/lib/vortex";
import { rare, say, setWeird } from "./bridge";
import { type Gaze, startCamera } from "./camera";
import { demolish, demolishing, rebuild } from "./demolish";
import { startBattery, startMotion, startWeather } from "./device";
import { startMic } from "./mic";
import {
  Fork,
  ForkGhost,
  Interrupt,
  Maintenance,
  Popcorn,
  SecondCursor,
  Speedrun,
} from "./overlays";
import { portal, settle } from "./portal";
import { startTabs, wrapAround } from "./space";
import Tour from "./Tour";
import "./weird.css";
import { tr, useVxLang } from "@/vortex/core/i18n";

// LADO R · the conductor: turns each experimental sense on and off with its
// switch (profile → Vortex → "the weird stuff"), runs the rare events on their
// budgets, and stages the modes you ask for in chat (/demolish, /popcorn,
// /speedrun, /tour, /fork, /studio). Mic and camera always show an indicator
// with a stop button while they're live.

type Mode = Exclude<WeirdMode, "demolish" | "studio"> | "cursor" | null;

const every = (min: number, max: number, fn: () => void) => {
  let t: ReturnType<typeof setTimeout>;
  const next = () => {
    t = setTimeout(
      () => {
        if (!document.hidden) fn();
        next();
      },
      (min + Math.random() * (max - min)) * 60_000,
    );
  };
  next();
  return () => clearTimeout(t);
};

export default function Weird() {
  useVxLang(); // T-13 · re-render on language change
  const torus = useVortexFlag("weird-torus");
  const tabs = useVortexFlag("weird-tabs");
  const mic = useVortexFlag("weird-mic");
  const camera = useVortexFlag("weird-camera");
  const motion = useVortexFlag("weird-motion");
  const battery = useVortexFlag("weird-battery");
  const weather = useVortexFlag("weird-weather");
  const cursor = useVortexFlag("weird-cursor");
  const broadcast = useVortexFlag("weird-broadcast");
  const maintenance = useVortexFlag("weird-maintenance");
  const fork = useVortexFlag("weird-fork");
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [mode, setMode] = useState<Mode>(null);
  const [level, setLevel] = useState(0);
  const [gaze, setGaze] = useState<Gaze | null>(null);
  const done = useCallback(() => setMode(null), []);

  /* simple senses */
  useEffect(
    () => (torus ? every(4, 9, () => void wrapAround()) : undefined),
    [torus],
  );
  useEffect(() => (tabs ? startTabs() : undefined), [tabs]);
  useEffect(() => (battery ? startBattery() : undefined), [battery]);
  useEffect(() => (motion ? startMotion() : undefined), [motion]);
  useEffect(() => (weather ? startWeather() : undefined), [weather]);

  /* R-04 · microphone */
  useEffect(() => {
    if (!mic) return;
    let stop: (() => void) | null = null;
    let cancelled = false;
    void startMic((l) => setLevel(l.rms)).then((s) => {
      if (cancelled) s?.();
      else if (s) stop = s;
      else setWeird("mic", false);
    });
    return () => {
      cancelled = true;
      stop?.();
      setLevel(0);
    };
  }, [mic]);

  /* R-06 · camera */
  useEffect(() => {
    if (!camera) return;
    let stop: (() => void) | null = null;
    let cancelled = false;
    setGaze("looking");
    void startCamera(setGaze).then((s) => {
      if (cancelled) s?.();
      else if (s) stop = s;
      else {
        setWeird("camera", false);
        setGaze(null);
      }
    });
    return () => {
      cancelled = true;
      stop?.();
      setGaze(null);
    };
  }, [camera]);

  /* the rare ones, on budgets */
  useEffect(() => {
    return every(8, 12, () => {
      if (mode) return;
      if (
        broadcast &&
        getVortexIntensity() === "unhinged" &&
        rare("interrupt", 30, 0.06)
      )
        setMode("interrupt");
      else if (
        maintenance &&
        getVortexHeadGames() &&
        rare("maintenance", 30, 0.05)
      )
        setMode("maintenance");
      else if (fork && rare("fork", 1, 0.08)) setMode("fork");
      else if (cursor && getVortexHeadGames() && Math.random() < 0.25)
        setMode("cursor");
    });
  }, [broadcast, maintenance, fork, cursor, mode]);

  /* modes asked for in chat */
  useEffect(() => {
    const on = (e: Event) => {
      const m = (e as CustomEvent<{ mode: WeirdMode }>).detail.mode;
      if (m === "demolish") demolish();
      else if (m === "studio") router.push("/studio");
      else setMode(m);
    };
    window.addEventListener("vortex:weird", on);
    return () => window.removeEventListener("vortex:weird", on);
  }, [router]);

  /* R-10 · a new page rebuilds whatever he broke */
  // biome-ignore lint/correctness/useExhaustiveDependencies: the pathname is the trigger
  useEffect(() => {
    if (demolishing()) rebuild();
  }, [pathname]);

  /* R-11 · portals: into the Below by any link, and on every dimension jump */
  const below = useRef(pathname.startsWith("/below"));
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest<HTMLAnchorElement>(
        "a[href^='/below']",
      );
      if (
        !a ||
        below.current ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.button !== 0
      )
        return;
      e.preventDefault();
      e.stopPropagation();
      const href = a.getAttribute("href") ?? "/below";
      void portal("in", "below").then(() => router.push(href));
    };
    const onDim = (e: Event) => {
      if (!(e as CustomEvent).detail) return;
      void portal("in", "dimension").then(() => {
        settle();
        void portal("out", "dimension");
      });
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("vortex:dimension", onDim);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("vortex:dimension", onDim);
    };
  }, [router]);
  useEffect(() => {
    const now = pathname.startsWith("/below");
    if (now && !below.current) {
      settle();
      setTimeout(() => void portal("out", "below"), 250);
    }
    below.current = now;
  }, [pathname]);

  return (
    <>
      {mic && (
        <output className="vxw-indicator vxw-indicator--mic">
          <span
            className="meter"
            style={{ "--l": Math.min(1, level * 6) } as React.CSSProperties}
          />
          {tr("MIC · never recorded")}
          <button type="button" onClick={() => setWeird("mic", false)}>
            {tr("stop")}
          </button>
        </output>
      )}
      {gaze && (
        <output className="vxw-indicator vxw-indicator--cam">
          <span className="eye" />
          {tr("CAMERA")} ·{" "}
          {tr(
            gaze === "none"
              ? "nobody"
              : gaze === "away"
                ? "you looked away"
                : gaze === "close"
                  ? "too close"
                  : "watching",
          )}
          <button
            type="button"
            onClick={() => {
              setWeird("camera", false);
              say("eye closed. i'll just imagine your face. it's worse.");
            }}
          >
            {tr("stop")}
          </button>
        </output>
      )}
      {mode === "interrupt" && <Interrupt onDone={done} />}
      {mode === "maintenance" && <Maintenance onDone={done} />}
      {mode === "fork" && <Fork onDone={done} />}
      {mode === "popcorn" && <Popcorn onDone={done} />}
      {mode === "speedrun" && <Speedrun onDone={done} />}
      {mode === "cursor" && <SecondCursor onDone={done} />}
      {mode === "tour" && <Tour onDone={done} />}
      <ForkGhost />
    </>
  );
}
