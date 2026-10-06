"use client";

// Fixed-width VT323 digit cells with an unlit "8" ghost behind each one, like a
// tape-deck counter. Leading zeros render dimmed so the real value reads first.
export default function LcdDigits({
  value,
  digits = 3,
  label,
}: {
  value: number;
  digits?: number;
  label: string;
}) {
  const max = 10 ** digits - 1;
  const text = String(Math.min(Math.max(0, Math.round(value)), max)).padStart(
    digits,
    "0",
  );
  const firstSignificant = text.search(/[1-9]/);

  return (
    <div className="cs-digits" role="img" aria-label={`${label}: ${value}`}>
      {text.split("").map((d, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-position cells
          key={i}
          className={`cs-digit${firstSignificant === -1 ? (i < digits - 1 ? " dim" : "") : i < firstSignificant ? " dim" : ""}`}
        >
          {d}
        </span>
      ))}
    </div>
  );
}
