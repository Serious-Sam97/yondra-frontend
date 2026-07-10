'use client'

import { useEffect, useRef } from "react";

/** Sprint burndown as a dotted LCD chart: dim ideal diagonal + bright "burned
 *  so far" line from committed (day 0) to remaining (today). No per-day history
 *  exists yet, so the actual line is the straight trend between those two known
 *  points — honest about what the backend can currently provide. */
export default function BurndownLCD({
  committed,
  remaining,
  daysTotal,
  daysElapsed,
}: {
  committed: number;
  remaining: number;
  daysTotal: number | null;
  daysElapsed: number | null;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const rm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const dpr = window.devicePixelRatio || 1;
    const H = 104;
    const W = cv.clientWidth || cv.parentElement?.clientWidth || 320;
    cv.width = W * dpr;
    cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cap = Math.max(committed, 1);
    const COLS = 20;
    const ROWS = 10;
    const curFrac = daysTotal && daysTotal > 0 ? Math.min(1, (daysElapsed ?? 0) / daysTotal) : 1;
    const curCol = Math.max(1, Math.round((COLS - 1) * curFrac));

    const cell = (cx: number, cy: number, cw: number, ch: number, a: number) => {
      ctx.fillStyle = `rgba(38,46,24,${a})`;
      const r = Math.min(2, cw / 3);
      ctx.beginPath();
      ctx.moveTo(cx + r, cy);
      ctx.arcTo(cx + cw, cy, cx + cw, cy + ch, r);
      ctx.arcTo(cx + cw, cy + ch, cx, cy + ch, r);
      ctx.arcTo(cx, cy + ch, cx, cy, r);
      ctx.arcTo(cx, cy, cx + cw, cy, r);
      ctx.fill();
    };

    let raf = 0;
    const draw = (prog: number) => {
      ctx.clearRect(0, 0, W, H);
      const m = 6, gap = 2;
      const cw = (W - 2 * m - (COLS - 1) * gap) / COLS;
      const ch = (H - 2 * m - (ROWS - 1) * gap) / ROWS;
      const at = (c: number, r: number, a: number) =>
        cell(m + c * (cw + gap), m + (ROWS - 1 - r) * (ch + gap), cw, ch, a);

      // ghost grid
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) at(c, r, 0.1);
      // ideal diagonal (dim)
      for (let c = 0; c < COLS; c++) {
        const iv = cap * (1 - c / (COLS - 1));
        at(c, Math.round((iv / cap) * (ROWS - 1)), 0.28);
      }
      // actual "burned so far" (bright), animated left→right
      const maxc = Math.floor(curCol * prog);
      for (let c = 0; c <= maxc; c++) {
        const v = cap + (remaining - cap) * (c / curCol);
        at(c, Math.round((v / cap) * (ROWS - 1)), 0.92);
      }
      if (prog < 1 && !rm) raf = requestAnimationFrame(() => draw(Math.min(1, prog + 0.05)));
    };

    if (rm) draw(1);
    else raf = requestAnimationFrame(() => draw(0.1));
    return () => cancelAnimationFrame(raf);
  }, [committed, remaining, daysTotal, daysElapsed]);

  return (
    <div className="yd-cbox">
      <canvas ref={ref} className="yd-scr" style={{ height: 104 }} />
    </div>
  );
}
