"use client";

import {
  faBars,
  faCalendarDays,
  faChartColumn,
  faLayerGroup,
  faMagnifyingGlass,
  faSquareCheck,
  faTableCells,
} from "@fortawesome/free-solid-svg-icons";
import Icon from "@/components/ui/Icon";
import { formatMoney } from "@/lib/currency";

export type BoardViewMode =
  | "kanban"
  | "list"
  | "calendar"
  | "analytics"
  | "backlog"
  | "plans";

interface BoardTopBarProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  isCrm: boolean;
  crmTotal: number;
  currency: string;
  totalCards: number;
  doneCards: number;
  viewMode: BoardViewMode;
  qaEnabled: boolean;
  onSelectView: (view: BoardViewMode) => void;
  onOpenCommand: () => void;
}

// Board top bar: card search, the CRM/progress LCD strip, the view-switcher
// toggle keys, and the desktop keyboard-shortcut hints. Presentational only.
export function BoardTopBar({
  searchQuery,
  setSearchQuery,
  isCrm,
  crmTotal,
  currency,
  totalCards,
  doneCards,
  viewMode,
  qaEnabled,
  onSelectView,
  onOpenCommand,
}: BoardTopBarProps) {
  return (
    <div className="glass-panel flex items-center gap-3 mb-4 flex-wrap px-3 py-2.5 rounded-2xl">
      <div className="relative flex-1 min-w-[160px] max-w-xs">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search cards..."
          className="glass-input w-full text-xs"
          style={{ paddingLeft: "2rem" }}
        />
        <span
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
          style={{ color: "var(--cf-phosphor)" }}
        >
          <Icon icon={faMagnifyingGlass} />
        </span>
      </div>

      {/* CRM total — headline funnel value (LCD strip) */}
      {isCrm && (
        <span
          className="cf-screen cf-mono text-xs flex-shrink-0 px-2.5 py-1 font-bold inline-flex items-center gap-1.5"
          style={{ color: "var(--cf-phosphor)" }}
          title="Total value of all deals on the board"
        >
          <span
            className="cf-led"
            style={{
              background: "var(--cf-phosphor)",
              boxShadow: "0 0 6px var(--cf-phosphor)",
            }}
          />
          {formatMoney(crmTotal, currency)} · {totalCards} deal
          {totalCards !== 1 ? "s" : ""}
        </span>
      )}

      {/* Progress counter — LCD strip (task boards only) */}
      {!isCrm && totalCards > 0 && (
        <span
          className="cf-screen cf-mono text-xs flex-shrink-0 px-2.5 py-1"
          style={{ color: "var(--cf-phosphor)" }}
        >
          {doneCards}/{totalCards} done
        </span>
      )}

      {/* View toggle — hardware toggle keys with status LEDs */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {(
          [
            { key: "kanban", icon: faTableCells, label: "Board" },
            { key: "list", icon: faBars, label: "List" },
            { key: "backlog", icon: faLayerGroup, label: "Backlog" },
            { key: "calendar", icon: faCalendarDays, label: "Cal" },
            { key: "analytics", icon: faChartColumn, label: "Stats" },
            ...(qaEnabled
              ? [{ key: "plans", icon: faSquareCheck, label: "QA" }]
              : []),
          ] as {
            key: BoardViewMode;
            icon: typeof faTableCells;
            label: string;
          }[]
        ).map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => onSelectView(key)}
            style={
              viewMode === key
                ? {
                    background: "var(--cf-edge)",
                    borderColor: "var(--cf-phosphor)",
                    color: "var(--cf-text)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.08), 0 0 8px rgba(154,166,126,0.35)",
                  }
                : { color: "var(--cf-text-muted)" }
            }
            className="aero-pill cf-mono text-[10px] uppercase tracking-widest px-2.5 py-1 font-bold cursor-pointer transition-colors inline-flex items-center gap-1.5"
          >
            <span
              className="cf-led"
              style={{
                background:
                  viewMode === key ? "var(--cf-phosphor)" : "var(--cf-edge)",
                boxShadow:
                  viewMode === key ? "0 0 6px var(--cf-phosphor)" : "none",
              }}
            />
            <Icon icon={icon} />
            {label}
          </button>
        ))}
      </div>

      <div
        className="hidden md:flex items-center gap-3 flex-shrink-0 ml-auto"
        style={{ color: "var(--cf-text-muted)" }}
      >
        <button
          onClick={onOpenCommand}
          className="flex items-center gap-1.5 cursor-pointer transition-colors"
          style={{ color: "var(--cf-text-muted)" }}
        >
          <kbd
            className="cf-mono text-xs glass-input px-2 py-1"
            style={{ color: "#1c2016" }}
          >
            ⌘K
          </kbd>
          <span className="cf-mono text-xs uppercase tracking-widest">
            Search
          </span>
        </button>
        <span style={{ color: "var(--cf-edge)" }}>·</span>
        <p className="cf-mono text-xs uppercase tracking-widest">Press</p>
        <kbd
          className="cf-mono text-xs glass-input px-2 py-1"
          style={{ color: "#1c2016" }}
        >
          C
        </kbd>
        <p className="cf-mono text-xs uppercase tracking-widest">to add</p>
      </div>
    </div>
  );
}
