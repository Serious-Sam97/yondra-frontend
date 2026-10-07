"use client";

import {
  faChevronLeft,
  faEllipsis,
  faGear,
  faMagnifyingGlass,
} from "@fortawesome/free-solid-svg-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { SvgArt } from "@/components/ui/SvgArt";
import {
  type FlowDay,
  flowWave,
  headerWaveform,
  miniReels,
} from "@/lib/boardArt";
import { formatMoney } from "@/lib/currency";
import { avatarColor, initials } from "@/lib/ui";

export type BoardViewMode =
  | "kanban"
  | "list"
  | "calendar"
  | "analytics"
  | "backlog"
  | "roadmap"
  | "plans";

export type QuickFilter = "mine" | "due" | "jammed" | "aged";

export interface DeckStats {
  done: number;
  total: number;
  wip: number;
  wipLimit: number | null;
  cycleDays: number | null;
  jams: number;
  recording: boolean;
  flow: FlowDay[];
}

export interface DeckTool {
  key: string;
  label: string;
  onClick: () => void;
  divider?: boolean;
}

function typeLabel(t?: string): string {
  if (t === "crm") return "CRM";
  if (t === "scrum") return "Scrum";
  if (t === "kanban") return "Kanban";
  return "Board";
}

const VIEWS: { key: BoardViewMode; label: string }[] = [
  { key: "kanban", label: "Board" },
  { key: "list", label: "List" },
  { key: "backlog", label: "Backlog" },
  { key: "calendar", label: "Cal" },
  { key: "analytics", label: "Stats" },
  { key: "roadmap", label: "Map" },
];

const QUICK: { key: QuickFilter; label: string; dot?: string }[] = [
  { key: "mine", label: "Mine" },
  { key: "due", label: "Due soon" },
  { key: "jammed", label: "Jammed", dot: "var(--cf-red)" },
  { key: "aged", label: "Aged", dot: "#d8b56a" },
];

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
  boardName: string;
  boardType?: string;
  backTitle?: string;
  onBack: () => void;
  canManage?: boolean;
  onOpenSettings?: () => void;
  // Multitrack deck
  backLabel?: string;
  trackNo?: number | null;
  accent?: string;
  stats: DeckStats;
  crew: { id: number; name: string }[];
  quick: Set<QuickFilter>;
  quickCounts: Record<QuickFilter, number>;
  onToggleQuick: (key: QuickFilter) => void;
  filterOpen: boolean;
  filterActive: boolean;
  onToggleFilter: () => void;
  onNewCard?: () => void;
  tools: DeckTool[];
}

// Board header as the multitrack deck (design/board-final.png): a dark, slightly
// translucent glass panel with a hairline oscilloscope, the board's cassette label,
// the flow LCD, crew and the record key; below it the toolbar (search, quick
// filters, view transport).
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
  boardName,
  boardType,
  backTitle,
  onBack,
  canManage,
  onOpenSettings,
  backLabel,
  trackNo,
  accent = "#6fe0ff",
  stats,
  crew,
  quick,
  quickCounts,
  onToggleQuick,
  filterOpen,
  filterActive,
  onToggleFilter,
  onNewCard,
  tools,
}: BoardTopBarProps) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);

  const stripes = [
    accent,
    `color-mix(in srgb, ${accent} 55%, #ff5a4d)`,
    `color-mix(in srgb, ${accent} 45%, #ffb000)`,
  ];
  const art = useMemo(() => headerWaveform(), []);
  const wave = useMemo(() => flowWave(stats.flow), [stats.flow]);
  const reels = useMemo(
    () => miniReels(totalCards ? doneCards / totalCards : 0, accent),
    [doneCards, totalCards, accent],
  );
  const latinName = /^[\p{Script=Latin}\p{N}\p{P}\p{S}\s]*$/u.test(boardName);
  const sub = [
    typeLabel(boardType),
    backLabel,
    trackNo ? `track ${trackNo}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // "/" focuses the card filter; "N" records a new card (unless typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))
      )
        return;
      if (document.querySelector("[role=dialog], .modal-backdrop")) return;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if ((e.key === "n" || e.key === "N") && onNewCard) {
        e.preventDefault();
        onNewCard();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNewCard]);

  useEffect(() => {
    if (!toolsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!toolsRef.current?.contains(e.target as Node)) setToolsOpen(false);
    };
    const onEsc = (e: KeyboardEvent) =>
      e.key === "Escape" && setToolsOpen(false);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onEsc);
    };
  }, [toolsOpen]);

  const views = qaEnabled
    ? [...VIEWS, { key: "plans" as BoardViewMode, label: "QA" }]
    : VIEWS;

  return (
    <div className="mt-head" style={{ position: "relative", zIndex: 5 }}>
      <div style={{ position: "relative" }}>
        <div
          className="mt-deck"
          style={{ "--bc": accent } as React.CSSProperties}
        >
          <SvgArt as="div" className="mt-hart" svg={art} aria-hidden />
          <div className="mt-trim" aria-hidden>
            {stripes.map((c) => (
              <i key={c} style={{ background: c }} />
            ))}
          </div>
          <div className="mt-deck-row">
            <button
              type="button"
              className="mt-key ghost"
              onClick={onBack}
              title={backTitle}
            >
              <Icon icon={faChevronLeft} />
              {backLabel ?? "Back"}
            </button>

            <div className="mt-lbl">
              <span className="mt-stripes" aria-hidden>
                {stripes.map((c) => (
                  <i key={c} style={{ background: c }} />
                ))}
              </span>
              <span className="mt-side">{trackNo ? `A${trackNo}` : "A"}</span>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    minWidth: 0,
                  }}
                >
                  <span className={`mt-nm${latinName ? "" : " plain"}`}>
                    {boardName || "…"}
                  </span>
                  {stats.recording && <span className="mt-recl">REC</span>}
                  <span className="mt-len">
                    C-{String(totalCards).padStart(2, "0")}
                  </span>
                </div>
                <div className="mt-sub">{sub}</div>
              </div>
            </div>

            <div className="mt-scr">
              <div className="mt-scr-in">
                <div className="mt-cell">
                  <span className="k">{isCrm ? "Pipeline" : "Tape"}</span>
                  <div className="mt-reels">
                    <SvgArt
                      svg={reels}
                      style={{ display: "flex" }}
                      aria-hidden
                    />
                    {isCrm ? (
                      <span className="v" style={{ fontSize: 20 }}>
                        {formatMoney(crmTotal, currency)}
                      </span>
                    ) : (
                      <span className="v">
                        {doneCards}
                        <small>/{totalCards}</small>
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-cell wave">
                  <span className="k">Flow · 14 days</span>
                  <div className="legend" aria-hidden>
                    <b style={{ color: "#9aa67e" }}>Done</b>
                    <b style={{ color: "#ff6fd8" }}>Review</b>
                    <b style={{ color: "#ffb000" }}>Doing</b>
                    <b style={{ color: "#8a8f80" }}>To do</b>
                  </div>
                  <SvgArt
                    as="div"
                    svg={wave}
                    role="img"
                    aria-label="Card flow over the last 14 days"
                  />
                </div>
                <div className="mt-cell">
                  <span className="k">WIP</span>
                  <span className="v am">
                    {stats.wip}
                    {stats.wipLimit != null && <small>/{stats.wipLimit}</small>}
                  </span>
                </div>
                <div className="mt-cell hide-md">
                  <span className="k">Cycle</span>
                  <span className="v">
                    {stats.cycleDays != null ? stats.cycleDays.toFixed(1) : "—"}
                    {stats.cycleDays != null && <small>d</small>}
                  </span>
                </div>
                <div className="mt-cell">
                  <span className="k">Jams</span>
                  <span className={`v${stats.jams > 0 ? " rd" : ""}`}>
                    {stats.jams}
                  </span>
                </div>
              </div>
            </div>

            {crew.length > 0 && (
              <div
                className="mt-crew"
                title={crew.map((u) => u.name).join(", ")}
              >
                <span className="mt-avs">
                  {crew.slice(0, 3).map((u) => (
                    <span
                      key={u.id}
                      className="mt-av"
                      style={{ backgroundColor: avatarColor(u.id) }}
                    >
                      {initials(u.name)}
                    </span>
                  ))}
                </span>
                <span className="l">{crew.length} CREW</span>
              </div>
            )}

            <button
              type="button"
              className={`mt-key sq${toolsOpen ? " on" : ""}`}
              onClick={() => setToolsOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={toolsOpen}
              aria-label="Board tools"
              title="Tools"
            >
              <Icon icon={faEllipsis} />
            </button>
            {canManage && onOpenSettings && (
              <button
                type="button"
                className="mt-key sq"
                onClick={onOpenSettings}
                aria-label="Board settings"
                title="Settings"
              >
                <Icon icon={faGear} />
              </button>
            )}
            {onNewCard && (
              <button
                type="button"
                className="mt-key rec"
                onClick={onNewCard}
                title="New card (N)"
              >
                New card
              </button>
            )}
          </div>
        </div>

        {toolsOpen && (
          <div className="mt-tools" role="menu" ref={toolsRef}>
            {tools.map((t) => (
              <div key={t.key}>
                {t.divider && <hr />}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setToolsOpen(false);
                    t.onClick();
                  }}
                >
                  {t.label}
                </button>
              </div>
            ))}
            <hr />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setToolsOpen(false);
                onOpenCommand();
              }}
            >
              Commands{" "}
              <span className="mt-kbd" style={{ marginLeft: "auto" }}>
                ⌘K
              </span>
            </button>
          </div>
        )}
      </div>

      <div className="mt-tool">
        <div className="mt-search">
          <Icon icon={faMagnifyingGlass} className="ico" />
          <input
            ref={searchRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSearchQuery("");
                e.currentTarget.blur();
              }
            }}
            placeholder="Filter cards…"
            aria-label="Filter cards"
          />
          {!searchQuery && <kbd aria-hidden>/</kbd>}
        </div>
        <fieldset
          className="mt-chips"
          aria-label="Quick filters"
          style={{ border: 0, margin: 0, padding: 0 }}
        >
          {QUICK.map((q) => (
            <button
              key={q.key}
              type="button"
              className="mt-chip"
              aria-pressed={quick.has(q.key)}
              onClick={() => onToggleQuick(q.key)}
            >
              {q.dot && (
                <i
                  style={{ background: q.dot, boxShadow: `0 0 5px ${q.dot}` }}
                />
              )}
              {q.label} <b>{quickCounts[q.key]}</b>
            </button>
          ))}
          <button
            type="button"
            className="mt-chip"
            aria-pressed={filterOpen || filterActive}
            aria-expanded={filterOpen}
            onClick={onToggleFilter}
          >
            + Filter
          </button>
        </fieldset>
        <div className="mt-transport" role="tablist" aria-label="Board view">
          {views.map((v) => (
            <button
              key={v.key}
              type="button"
              role="tab"
              aria-selected={viewMode === v.key}
              onClick={() => onSelectView(v.key)}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
