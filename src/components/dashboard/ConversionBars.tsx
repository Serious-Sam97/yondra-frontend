"use client";

import { useId, useState } from "react";
import type { ConversionMonth } from "@/interfaces/ConversionReportInterface";

// "Jul" / "Jul '26" — year suffix only on January or the first bar, matching
// the revenue chart's axis so the two reports read the same.
function monthLabel(m: string, showYear: boolean): string {
  const [y, mo] = m.split("-");
  const d = new Date(Number(y), Number(mo) - 1, 1);
  const short = d.toLocaleDateString(undefined, { month: "short" });
  return showYear ? `${short} '${y.slice(2)}` : short;
}

const pct = (rate: number) => `${(rate * 100).toFixed(1)}%`;

/** Monthly conversion rate as olive bars on the pale-green LCD screen. Bars
 *  scale to the peak month's rate (so a low-conversion pipeline stays legible);
 *  the exact percentage is always in the label, tooltip and hover readout. A
 *  dashed line marks the mean. Reuses the revenue chart's .rv-* styling. */
export default function ConversionBars({
  months,
  onHover,
}: {
  months: ConversionMonth[];
  onHover?: (m: ConversionMonth | null) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const clipId = useId();

  const data = months.length ? months : [];
  const max = Math.max(...data.map((m) => m.rate), 0.0001);
  const mean = data.length
    ? data.reduce((s, m) => s + m.rate, 0) / data.length
    : 0;

  // Fixed viewBox; the SVG scales responsively to its container width.
  const W = 660;
  const H = 168;
  const padT = 10;
  const padB = 24; // room for the month labels
  const innerH = H - padT - padB;
  const n = data.length || 1;
  const slot = W / n;
  const barW = Math.min(38, slot * 0.6);
  const meanY = padT + innerH * (1 - mean / max);

  const set = (i: number | null) => {
    setHover(i);
    onHover?.(i == null ? null : (data[i] ?? null));
  };

  return (
    <div className="yd-cbox">
      <svg
        className="rv-scr"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Monthly conversion rate bar chart"
      >
        <defs>
          <clipPath id={clipId}>
            <rect x="0" y="0" width={W} height={H} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          {/* mean anchor line */}
          {mean > 0 && (
            <line
              x1={0}
              x2={W}
              y1={meanY}
              y2={meanY}
              className="rv-mean"
              strokeDasharray="4 4"
            />
          )}
          {data.map((m, i) => {
            const h = Math.max((m.rate / max) * innerH, m.rate > 0 ? 2 : 0);
            const x = i * slot + (slot - barW) / 2;
            const y = padT + innerH - h;
            const isJan = m.month.endsWith("-01");
            return (
              <g
                key={m.month}
                onMouseEnter={() => set(i)}
                onMouseLeave={() => set(null)}
              >
                {/* full-slot hit area so hover is forgiving between bars */}
                <rect
                  x={i * slot}
                  y={0}
                  width={slot}
                  height={H}
                  fill="transparent"
                />
                {h > 0 && (
                  <rect
                    className={`rv-bar${hover === i ? " on" : ""}`}
                    x={x}
                    y={y}
                    width={barW}
                    height={h}
                    rx={2}
                  >
                    <title>
                      {monthLabel(m.month, true)} — {pct(m.rate)} · {m.won} won /{" "}
                      {m.total} total
                    </title>
                  </rect>
                )}
                <text
                  className={`rv-xl${hover === i ? " on" : ""}`}
                  x={i * slot + slot / 2}
                  y={H - 8}
                  textAnchor="middle"
                >
                  {monthLabel(m.month, i === 0 || isJan)}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
