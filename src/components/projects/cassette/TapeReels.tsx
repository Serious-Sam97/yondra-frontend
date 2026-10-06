"use client";

import { useId } from "react";
import type { BoardFlow } from "@/interfaces/ProjectInterface";
import { reelRadii } from "@/lib/ui";

// Cassette window contents: two tape packs whose size tracks the board's flow
// (supply reel = still to do, take-up reel = done), white hubs, and the tape
// path down to the guide rollers. Purely decorative — the card's aria-label
// carries the numbers.
const W = 330;
const H = 74;
const CY = 37;
const LX = 66;
const RX = W - 66;

function Pack({ x, r, id }: { x: number; r: number; id: string }) {
  if (r <= 14) return null;
  return (
    <>
      <circle cx={x} cy={CY} r={r} fill={`url(#pk${id})`} />
      {[0.92, 0.8, 0.66, 0.55].map((k) => (
        <circle
          key={k}
          cx={x}
          cy={CY}
          r={Math.max(14, r * k)}
          fill="none"
          stroke="rgba(0,0,0,.35)"
          strokeWidth={0.6}
        />
      ))}
      <circle cx={x} cy={CY} r={r} fill={`url(#gl${id})`} />
    </>
  );
}

function Hub({ x, base, id }: { x: number; base: number; id: string }) {
  return (
    <g className="cs-hub" style={{ transformOrigin: `${x}px ${CY}px` }}>
      <g transform={`rotate(${base} ${x} ${CY})`}>
        <circle
          cx={x}
          cy={CY}
          r={13.5}
          fill={`url(#hb${id})`}
          stroke="#9c947e"
          strokeWidth={0.6}
        />
        <circle cx={x} cy={CY} r={7.5} fill="#0a0b09" />
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <rect
            key={a}
            x={x - 1.4}
            y={CY - 7.6}
            width={2.8}
            height={3.4}
            rx={0.6}
            fill="#e6dfca"
            transform={`rotate(${a} ${x} ${CY})`}
          />
        ))}
        {[30, 150, 270].map((a) => (
          <circle
            key={a}
            cx={x}
            cy={CY - 10.5}
            r={1.3}
            fill="#a59d86"
            transform={`rotate(${a} ${x} ${CY})`}
          />
        ))}
      </g>
    </g>
  );
}

export default function TapeReels({
  flow,
  accent,
}: {
  flow: BoardFlow;
  accent: string;
}) {
  const id = useId().replace(/:/g, "");
  const { left, right } = reelRadii(flow);
  const empty = left === 0 && right === 0;
  // Where the tape leaves each pack (or the bare hub) on its way to the rollers.
  const lr = empty ? 12 : left;
  const rr = empty ? 12 : right;

  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative (aria-hidden); the card's aria-label carries the data
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className="cs-reels"
    >
      <defs>
        <radialGradient id={`pk${id}`}>
          <stop offset=".3" stopColor="#1c120b" />
          <stop offset=".85" stopColor="#3a2618" />
          <stop offset="1" stopColor="#4b3220" />
        </radialGradient>
        <linearGradient id={`gl${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgba(255,220,180,.16)" />
          <stop offset=".5" stopColor="rgba(255,220,180,0)" />
        </linearGradient>
        <radialGradient id={`hb${id}`} cx=".4" cy=".35">
          <stop offset="0" stopColor="#fbf6e6" />
          <stop offset="1" stopColor="#c9c0a6" />
        </radialGradient>
        <linearGradient id={`bg${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#121410" />
          <stop offset="1" stopColor="#070806" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#bg${id})`} />
      <path
        d={`M${LX - lr * 0.2} ${CY + lr} L 26 ${H - 6} M${RX + rr * 0.2} ${CY + rr} L ${W - 26} ${H - 6}`}
        stroke="#3a2618"
        strokeWidth={1.4}
        opacity={empty ? 0.4 : 1}
      />
      <circle cx={26} cy={H - 8} r={4} fill="#2a2823" stroke="#4b4840" />
      <circle cx={W - 26} cy={H - 8} r={4} fill="#2a2823" stroke="#4b4840" />
      <Pack x={LX} r={left} id={id} />
      <Pack x={RX} r={right} id={id} />
      {right > 14 && (
        <circle
          cx={RX}
          cy={CY}
          r={right + 1}
          fill="none"
          stroke={accent}
          strokeOpacity={0.5}
        />
      )}
      <Hub x={LX} base={10} id={id} />
      <Hub x={RX} base={40} id={id} />
    </svg>
  );
}
