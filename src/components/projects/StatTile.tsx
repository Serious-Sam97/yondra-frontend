"use client";

// Dark LCD readout tile for the project stat row (Boards / Cards / Progress / Members).
export default function StatTile({
  label,
  value,
  suffix,
  bar,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  bar?: number; // 0–100; renders a phosphor progress bar under the number
}) {
  return (
    <div
      className="rounded-md p-2.5"
      style={{
        background: "#0d1410",
        border: "1.5px solid #11140f",
        boxShadow: "inset 0 2px 6px rgba(0,0,0,0.8)",
      }}
    >
      <div
        className="cf-mono uppercase"
        style={{
          fontSize: "8px",
          letterSpacing: "0.14em",
          color: "var(--cf-text-dim)",
        }}
      >
        {label}
      </div>
      <div
        className="cf-lcd"
        style={{ fontSize: "28px", lineHeight: 1, color: "var(--cf-phosphor)" }}
      >
        {value}
        {suffix && (
          <span style={{ fontSize: "14px", color: "var(--cf-text-dim)" }}>
            {suffix}
          </span>
        )}
      </div>
      {bar !== undefined && (
        <div
          className="rounded-sm mt-1.5 overflow-hidden"
          style={{ height: 5, background: "#11140f" }}
        >
          <div
            style={{
              height: "100%",
              width: `${bar}%`,
              background: "var(--cf-phosphor)",
              boxShadow: "0 0 7px var(--cf-phosphor)",
            }}
          />
        </div>
      )}
    </div>
  );
}
