"use client";

import type { ReactNode } from "react";

// Shared chrome for the profile "operator console" modules: a graphite
// header rail with corner screws, a mono label, and a status LCD readout.

type LcdTone = "phosphor" | "amber" | "red";

const LCD_COLORS: Record<LcdTone, string> = {
  phosphor: "var(--cf-phosphor)",
  amber: "var(--cf-amber)",
  red: "var(--cf-red)",
};

export function StatusLcd({
  text,
  tone = "phosphor",
}: {
  text: string;
  tone?: LcdTone;
}) {
  return (
    <span
      className="cf-screen cf-lcd"
      style={{
        color: LCD_COLORS[tone],
        fontSize: 15,
        lineHeight: 1,
        letterSpacing: "0.1em",
        padding: "5px 10px 4px",
        minWidth: 88,
        textAlign: "center",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

export function DirtyLed({ on }: { on: boolean }) {
  return (
    <span
      className="cf-mono flex items-center gap-1.5 flex-shrink-0"
      style={{
        fontSize: 10.5,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--cf-text-dim)",
      }}
    >
      <span
        className="cf-led"
        style={
          on
            ? {
                background: "var(--cf-amber)",
                boxShadow: "0 0 7px var(--cf-amber)",
              }
            : { background: "#3a382f" }
        }
      />
      MOD
    </span>
  );
}

export function ModuleHead({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{
        borderBottom: "1.5px solid var(--cf-edge)",
        background: "linear-gradient(to bottom, #34322c, #2c2a25)",
        borderRadius: "7px 7px 0 0",
      }}
    >
      <span className="cf-screw flex-shrink-0" />
      <p
        className="cf-label"
        style={{ color: "var(--cf-phosphor)", fontSize: 11.5 }}
      >
        {label}
        {sub && (
          <span
            style={{ color: "var(--cf-text-dim)", letterSpacing: "0.08em" }}
          >
            {" // "}
            {sub}
          </span>
        )}
      </p>
      <span className="flex-1" />
      {children}
      <span className="cf-screw flex-shrink-0" />
    </div>
  );
}

// A single on/off switch styled to the cassette-futurism palette. Lives here so
// every console module (comms matrix, companion…) shares one physical switch.
export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className="btn-physical cursor-pointer relative flex-shrink-0"
      style={{
        width: 40,
        height: 22,
        borderRadius: 999,
        border: "1.5px solid var(--cf-edge)",
        background: on ? "var(--cf-phosphor)" : "#2a2823",
        boxShadow: on
          ? "0 0 8px rgba(154,166,126,0.5), inset 0 1px 2px rgba(0,0,0,0.3)"
          : "inset 0 1px 3px rgba(0,0,0,0.5)",
        transition: "background 160ms ease, box-shadow 160ms ease",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 2,
          left: on ? 20 : 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: on ? "#14130f" : "#cfcabb",
          transition: "left 160ms var(--ease-expo, ease)",
        }}
      />
    </button>
  );
}
