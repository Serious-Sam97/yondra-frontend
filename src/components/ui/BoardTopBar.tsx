"use client";

import {
  faBars,
  faCalendarDays,
  faChartColumn,
  faGear,
  faLayerGroup,
  faMagnifyingGlass,
  faShareNodes,
  faSitemap,
  faSquareCheck,
  faTableCells,
} from "@fortawesome/free-solid-svg-icons";
import Icon from "@/components/ui/Icon";
import { formatMoney } from "@/lib/currency";

// Stable keys for the fixed 12-segment progress meter (positional, never reordered).
const METER_SEGMENTS = Array.from({ length: 12 }, (_, i) => `seg-${i}`);

// Neon status rail welded to the faceplate's top edge — positional, never reordered.
// A dramatic synthwave spectrum: hot magenta → electric violet → cyan → mint →
// amber → blaze, sweeping across the deck's lit top edge.
const RAIL_SEGMENTS: { id: string; color: string; delay: string }[] = [
  { id: "r0", color: "#ff1f8f", delay: "0s" },
  { id: "r1", color: "#b026ff", delay: "0.28s" },
  { id: "r2", color: "#00d4ff", delay: "0.56s" },
  { id: "r3", color: "#00ff9d", delay: "0.84s" },
  { id: "r4", color: "#ffcc00", delay: "1.12s" },
  { id: "r5", color: "#ff3d00", delay: "1.4s" },
];

export type BoardViewMode =
  | "kanban"
  | "list"
  | "calendar"
  | "analytics"
  | "backlog"
  | "roadmap"
  | "plans";

function typeLabel(t?: string): string {
  if (t === "crm") return "CRM";
  if (t === "scrum") return "Scrum";
  if (t === "kanban") return "Kanban";
  return "Board";
}

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
  // Identity zone (merged from the old standalone board header)
  boardName: string;
  boardType?: string;
  memberCount?: number;
  backTitle?: string;
  onBack: () => void;
  canManage?: boolean;
  showShare?: boolean;
  onOpenSettings?: () => void;
  onOpenShare?: () => void;
}

// Board faceplate: a single fused control deck. The neon status rail is the deck's
// top edge; below it, four channel-strip zones — identity, search+progress LCD,
// the view selector, and the action keys. Presentational only.
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
  boardName,
  boardType,
  memberCount = 0,
  backTitle,
  onBack,
  canManage,
  showShare,
  onOpenSettings,
  onOpenShare,
}: BoardTopBarProps) {
  // Task-board progress rendered as a 12-segment LCD tape meter.
  const litSegs =
    totalCards > 0 ? Math.round((doneCards / totalCards) * 12) : 0;

  const subLine = [
    typeLabel(boardType),
    memberCount > 0
      ? `${memberCount} member${memberCount === 1 ? "" : "s"}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="bh-deck mb-4">
      {/* neon status rail — the faceplate's lit top edge (no separate strip) */}
      <div className="bh-rail" aria-hidden="true">
        {RAIL_SEGMENTS.map((s) => (
          <i
            key={s.id}
            style={
              { "--neon": s.color, animationDelay: s.delay } as React.CSSProperties
            }
          />
        ))}
      </div>

      <span className="bh-screw tl" />
      <span className="bh-screw tr" />
      <span className="bh-screw bl" />
      <span className="bh-screw br" />

      <div className="bh-body">
        {/* ── zone: identity ─────────────────────────────────────────────── */}
        <div className="bh-zone bh-ident">
          <button
            type="button"
            onClick={onBack}
            title={backTitle ?? "Back"}
            className="bh-back"
          >
            ‹ Back
          </button>
          <div className="bh-idtext">
            <div className="bh-idtop">
              <span className="bh-idled" />
              <span className="bh-title chrome-text">{boardName || "..."}</span>
            </div>
            {subLine && <span className="bh-sub">{subLine}</span>}
          </div>
        </div>

        <span className="bh-chan" aria-hidden="true" />

        {/* ── zone: search + progress LCD (grows) ────────────────────────── */}
        <div className="bh-zone bh-center">
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

        <span className="bh-chan" aria-hidden="true" />

        {/* ── zone: view selector ────────────────────────────────────────── */}
        <div className="bh-zone">
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
        </div>

        <span className="bh-chan" aria-hidden="true" />

        {/* ── zone: action keys ──────────────────────────────────────────── */}
        <div className="bh-zone bh-acts">
          {/* subtasks reveal toggle — glows phosphor + shows a count badge when
              there are hidden subtasks, so it stays discoverable. */}
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
              className={`bh-ikey${showSubtasks ? " on" : " alert"}`}
            >
              <Icon icon={faSitemap} />
              <span className="bh-badge">{subtaskTotal}</span>
            </button>
          )}
          {canManage && (
            <button
              type="button"
              onClick={onOpenSettings}
              title="Board settings"
              aria-label="Board settings"
              className="bh-ikey"
            >
              <Icon icon={faGear} />
            </button>
          )}
          {canManage && showShare && (
            <button
              type="button"
              onClick={onOpenShare}
              title="Share board"
              aria-label="Share board"
              className="bh-ikey hot"
            >
              <Icon icon={faShareNodes} />
            </button>
          )}
          <button
            type="button"
            onClick={onOpenCommand}
            title="Command palette"
            className="bh-hint hidden lg:inline-flex"
          >
            <kbd className="bh-kbd">⌘K</kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
