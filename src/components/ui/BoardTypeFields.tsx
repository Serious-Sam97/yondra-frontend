"use client";

import type { BoardType } from "@/interfaces/BoardInterface";
import { CURRENCIES } from "@/lib/currency";

export const BOARD_TYPES: {
  key: BoardType;
  label: string;
  desc: string;
  color: string;
}[] = [
  { key: "kanban", label: "Kanban", desc: "Task workflow", color: "#4CAF50" },
  { key: "scrum", label: "Scrum", desc: "Timed sprints", color: "#1976D2" },
  { key: "crm", label: "CRM", desc: "Sales funnel", color: "#FFB000" },
];

// Board-type segmented selector + (crm-only) currency picker. Shared by the
// create-board modal and the board Settings → General tab so the two stay in sync.
export function BoardTypeFields({
  type,
  currency,
  onTypeChange,
  onCurrencyChange,
}: {
  type: BoardType;
  currency: string;
  onTypeChange: (t: BoardType) => void;
  onCurrencyChange: (c: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label
          className="cf-label uppercase tracking-widest font-bold"
          style={{ fontSize: "12px", color: "var(--cf-text-muted)" }}
        >
          Board type
        </label>
        <div className="grid grid-cols-3 gap-2.5">
          {BOARD_TYPES.map((bt) => {
            const active = type === bt.key;
            return (
              <button
                key={bt.key}
                type="button"
                onClick={() => onTypeChange(bt.key)}
                className="flex flex-col items-start gap-1.5 rounded-lg px-3.5 py-3 cursor-pointer transition-all duration-150 text-left"
                style={{
                  border: `1px solid ${active ? bt.color : "var(--cf-edge)"}`,
                  background: active ? "rgba(255,255,255,0.04)" : "transparent",
                  boxShadow: active ? `0 0 8px ${bt.color}` : undefined,
                }}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className="rounded-full"
                    style={{
                      width: 11,
                      height: 11,
                      background: bt.color,
                      boxShadow: `0 0 6px ${bt.color}`,
                    }}
                  />
                  <span
                    className="cf-mono uppercase font-bold"
                    style={{
                      fontSize: "12px",
                      letterSpacing: "0.08em",
                      color: active ? "var(--cf-text)" : "var(--cf-text-muted)",
                    }}
                  >
                    {bt.label}
                  </span>
                </span>
                <span
                  className="cf-mono"
                  style={{ fontSize: "10px", color: "var(--cf-text-muted)" }}
                >
                  {bt.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {type === "crm" && (
        <div className="flex flex-col gap-1.5">
          <label
            className="cf-label uppercase tracking-widest font-bold"
            style={{ fontSize: "12px", color: "var(--cf-text-muted)" }}
          >
            Deal currency
          </label>
          <select
            value={currency}
            onChange={(e) => onCurrencyChange(e.target.value)}
            className="glass-input cf-lcd cursor-pointer"
            style={{ fontSize: "15px" }}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code} className="text-black">
                {c.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
