'use client'

import { useEffect, useRef } from "react";

/** Completed-cards-per-day as a dot-matrix LCD bar equalizer (dark olive cells
 *  on the pale-green screen). Rises in on load, then a faint peak shimmer. */
export default function ThroughputLCD({ data }: { data: number[] }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const series = data.length ? data : [0];
    const rm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const dpr = window.devicePixelRatio || 1;
    const H = 92;
    const W = cv.clientWidth || cv.parentElement?.clientWidth || 320;
    cv.width = W * dpr;
    cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const MAX = Math.max(...series, 1);
    const COLS = 26;
    const ROWS = 8;

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
    const draw = (t: number, prog: number) => {
      ctx.clearRect(0, 0, W, H);
      const m = 6, gap = 2;
      const cw = (W - 2 * m - (COLS - 1) * gap) / COLS;
      const ch = (H - 2 * m - (ROWS - 1) * gap) / ROWS;
      for (let c = 0; c < COLS; c++) {
        const p = c / (COLS - 1);
        const idx = p * (series.length - 1);
        const lo = Math.floor(idx);
        const hi = Math.min(lo + 1, series.length - 1);
        const v = (series[lo] ?? 0) + ((series[hi] ?? 0) - (series[lo] ?? 0)) * (idx - lo);
        const lvl = (v / MAX) * ROWS * prog;
        const flick = Math.sin(t * 0.005 + c * 0.9) * 0.18;
        for (let r = 0; r < ROWS; r++) {
          const px = m + c * (cw + gap);
          const py = m + (ROWS - 1 - r) * (ch + gap);
          const a = r < Math.floor(lvl) ? 0.9 : r < lvl ? 0.5 + flick : 0.1;
          cell(px, py, cw, ch, Math.max(0.1, a));
        }
      }
      if (!rm) raf = requestAnimationFrame((nt) => draw(nt, Math.min(1, prog + 0.05)));
    };

    if (rm) draw(0, 1);
    else raf = requestAnimationFrame((t) => draw(t, 0.12));
    return () => cancelAnimationFrame(raf);
  }, [data]);

  return (
    <div className="yd-cbox">
      <canvas ref={ref} className="yd-scr" style={{ height: 92 }} />
    </div>
  );
}
