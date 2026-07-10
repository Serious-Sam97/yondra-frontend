import type { CSSProperties } from "react";

/** Analog VU-style needle gauge (cassette-LCD). Needle swings to the value on
 *  load then idles; the numeric readout below it stays authoritative. */
export default function NeedleGauge({
  value,
  max,
  color,
  danger = false,
}: {
  value: number;
  max: number;
  color: string;
  danger?: boolean;
}) {
  const clamped = Math.max(0, Math.min(value, max));
  const angle = -68 + (clamped / (max || 1)) * 136; // sweep -68°..+68°
  const overshoot = Math.min(angle + 8, 74);
  const needleStyle = { "--a": `${angle}deg`, "--o": `${overshoot}deg` } as CSSProperties;

  return (
    <svg viewBox="0 0 120 74" width="100%" height={52} aria-hidden>
      <path d="M16,58 A44,44 0 0 1 104,58" fill="none" stroke="#241f18" strokeWidth={6} strokeLinecap="round" />
      {danger && <path d="M91,27 A44,44 0 0 1 104,58" fill="none" stroke="#5c211c" strokeWidth={6} strokeLinecap="round" />}
      <g className="yd-jit">
        <g className="yd-ndl" style={needleStyle}>
          <polygon points="58,58 62,58 60,18" fill={color} />
        </g>
      </g>
      <circle cx={60} cy={58} r={5} fill="#2b2a26" stroke="#494539" />
    </svg>
  );
}
