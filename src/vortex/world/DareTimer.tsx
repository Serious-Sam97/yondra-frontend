"use client";

import { useEffect, useState } from "react";
import { useDare } from "@/vortex/core/pacts";
import "./dare.css";

// F-05 · the dare's countdown: a little floating VFD with the goal and the time
// left. It belongs to him; it just happens to sit on your screen.
export function DareTimer() {
  const dare = useDare();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!dare) return;
    const iv = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(iv);
  }, [dare]);
  if (!dare) return null;
  const left = Math.max(0, dare.until - now);
  const m = Math.floor(left / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  return (
    <div
      className={`vxdare${left < 60_000 ? " is-late" : ""}`}
      role="timer"
      aria-live="off"
    >
      <span className="lbl">DARE</span>
      <span className="txt">{dare.text}</span>
      <span className="clk">
        {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
      </span>
      <span className="prg">
        {dare.progress}/{dare.goal.n}
      </span>
    </div>
  );
}
