"use client";

import {
  faBars,
  faCalendarDays,
  faChartColumn,
  faLayerGroup,
  faMagnifyingGlass,
  faSitemap,
  faSquareCheck,
  faTableCells,
} from "@fortawesome/free-solid-svg-icons";
import Icon from "@/components/ui/Icon";
import { formatMoney } from "@/lib/currency";

// Stable keys for the fixed 12-segment progress meter (positional, never reordered).
const METER_SEGMENTS = Array.from({ length: 12 }, (_, i) => `seg-${i}`);

export type BoardViewMode =
  | "kanban"
  | "list"
  | "calendar"
  | "analytics"
  | "backlog"
  | "roadmap"
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
  showSubtasks: boolean;
  subtaskTotal: number;
  onToggleSubtasks: () => void;
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
  showSubtasks,
  subtaskTotal,
  onToggleSubtasks,
  onSelectView,
  onOpenCommand,
}: BoardTopBarProps) {
  // Task-board progress rendered as a 12-segment LCD tape meter.
  const litSegs =
    totalCards > 0 ? Math.round((doneCards / totalCards) * 12) : 0;

  return (
    <div className="bh-deck mb-4">
      <span className="bh-screw tl" />
      <span className="bh-screw tr" />
      <span className="bh-screw bl" />
      <span className="bh-screw br" />

      {/* left zone: search grows, LCD meter fixed */}
      <div className="bh-left">
        <div className="bh-search">
          <span className="bh-mag">
            <Icon icon={faMagnifyingGlass} />
          </span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cards..."
            className="glass-input w-full text-xs"
            style={{ paddingLeft: "1.9rem" }}
          />
        </div>

        {/* CRM total — headline funnel value */}
        {isCrm && (
          <div
            className="bh-meter"
            title="Total value of all deals on the board"
          >
            <span className="bh-cap">Pipeline</span>
            <span className="bh-read">{formatMoney(crmTotal, currency)}</span>
            <span className="bh-cap">
              {totalCards} deal{totalCards !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* Progress counter — segmented LCD tape (task boards only) */}
        {!isCrm && totalCards > 0 && (
          <div
            className="bh-meter"
            title={`${doneCards} of ${totalCards} cards done`}
          >
            <span className="bh-cap">Done</span>
            <span className="bh-read">
              {doneCards}
              <span className="bh-tot">/{totalCards}</span>
            </span>
            <span className="bh-segs" aria-hidden="true">
              {METER_SEGMENTS.map((id, i) => (
                <i key={id} className={i < litSegs ? "on" : undefined} />
              ))}
            </span>
          </div>
        )}
      </div>

      {/* view switcher — recessed selector housing with lit keys */}
      <div className="bh-selector" role="tablist" aria-label="Board view">
        {(
          [
            { key: "kanban", icon: faTableCells, label: "Board" },
            { key: "list", icon: faBars, label: "List" },
            { key: "backlog", icon: faLayerGroup, label: "Backlog" },
            { key: "calendar", icon: faCalendarDays, label: "Cal" },
            { key: "analytics", icon: faChartColumn, label: "Stats" },
            { key: "roadmap", icon: faSitemap, label: "Map" },
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
            type="button"
            role="tab"
            aria-selected={viewMode === key}
            onClick={() => onSelectView(key)}
            className={`bh-key${viewMode === key ? " on" : ""}`}
          >
            <span className="bh-led" />
            <Icon icon={icon} />
            {label}
          </button>
        ))}
      </div>

      {/* subtasks reveal toggle — shows child cards in their columns. When there are
          hidden subtasks it glows phosphor + shows a count so it's discoverable. */}
      {subtaskTotal > 0 && (
        <button
          type="button"
          onClick={onToggleSubtasks}
          aria-pressed={showSubtasks}
          title={
            showSubtasks
              ? "Hide subtasks"
              : `Show ${subtaskTotal} subtask${subtaskTotal === 1 ? "" : "s"} on the board`
          }
          className={`bh-key${showSubtasks ? " on" : ""}`}
          style={
            !showSubtasks
              ? {
                  borderColor: "var(--cf-phosphor)",
                  color: "var(--cf-phosphor)",
                  boxShadow: "0 0 8px rgba(120,255,180,0.25)",
                }
              : undefined
          }
        >
          <span className="bh-led" />
          <Icon icon={faSitemap} />
          Subtasks
          <span
            className="cf-mono"
            style={{
              marginLeft: 4,
              padding: "0 5px",
              borderRadius: 999,
              fontSize: "9px",
              background: showSubtasks ? "rgba(0,0,0,0.25)" : "var(--cf-phosphor)",
              color: showSubtasks ? "var(--cf-text)" : "var(--cf-screen)",
            }}
          >
            {subtaskTotal}
          </span>
        </button>
      )}

      {/* right zone: keycap shortcut hints (desktop only) */}
      <div className="bh-right hidden md:flex">
        <span className="bh-div" />
        <button type="button" onClick={onOpenCommand} className="bh-hint">
          <kbd className="bh-kbd">⌘K</kbd>
          Search
        </button>
        <span className="bh-hint">
          <kbd className="bh-kbd">C</kbd>
          Add
        </span>
      </div>
    </div>
  );
}
