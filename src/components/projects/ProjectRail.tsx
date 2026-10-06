"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  faAnglesLeft,
  faAnglesRight,
  faArrowLeft,
  faMagnifyingGlass,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import type {
  ProjectBoard,
  ProjectInterface,
} from "@/interfaces/ProjectInterface";
import {
  boardColor,
  boardFlow,
  boardProgress,
  isLatinName,
  isRecording,
  timeAgo,
} from "@/lib/ui";

// Drop-target ID for a project spine; the page's handleDragEnd parses this to
// move the dragged board into project <id> (YON-125).
export const projectDropId = (projectId: number) => `proj-${projectId}`;

// The open project's track list stops here, then shows "+n more".
const MAX_TRACKS = 8;

// Wraps a spine as a board drop-zone. Only rendered for *other* owned projects
// while board-dragging is enabled, so useDroppable always runs inside the page
// DndContext.
function DroppableSpine({
  projectId,
  children,
}: {
  projectId: number;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: projectDropId(projectId) });
  return (
    <div ref={setNodeRef} className={isOver ? "pr-drop is-over" : "pr-drop"}>
      {children}
    </div>
  );
}

function projectStats(boards: ProjectBoard[]) {
  let done = 0,
    total = 0,
    live = false;
  const flow = { todo: 0, doing: 0, done: 0 };
  for (const b of boards) {
    const bp = boardProgress(b);
    done += bp.done;
    total += bp.total;
    const f = boardFlow(b);
    flow.todo += f.todo;
    flow.doing += f.doing;
    flow.done += f.done;
    if (!live && isRecording(b)) live = true;
  }
  return {
    pct:
      boards.length === 0
        ? null
        : total > 0
          ? Math.round((done / total) * 100)
          : 0,
    done,
    total,
    live,
    flow,
  };
}

// A project as a cassette spine: colour band with its initial, name, board
// count + tape length, and a progress line along the bottom edge. The open
// project is pulled out of the shelf with a cream label.
function Spine({
  project,
  boards,
  active,
  collapsed,
  isMember,
  onClick,
}: {
  project: ProjectInterface;
  boards: ProjectBoard[];
  active: boolean;
  collapsed: boolean;
  isMember?: boolean;
  onClick: () => void;
}) {
  const { pct, total, live } = projectStats(boards);
  const count = project.boards_count ?? boards.length;
  const initial = (project.name.trim()[0] ?? "?").toUpperCase();
  const label = `${project.name}: ${count} board${count !== 1 ? "s" : ""}${pct !== null ? `, ${pct}% done` : ""}${live ? ", active now" : ""}`;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-label={label}
      title={collapsed ? project.name : undefined}
      className={`pr-spine${active ? " active" : ""}`}
      style={{ "--ac": project.color } as React.CSSProperties}
    >
      <span className="pr-band" aria-hidden>
        {initial}
      </span>
      {live && <span className="pr-live" aria-hidden />}
      {!collapsed && (
        <>
          <span className="pr-lbl" aria-hidden>
            <span
              className={`pr-nm${active && isLatinName(project.name) ? " cf-marker" : ""}`}
            >
              {project.name}
            </span>
            <span className="pr-meta">
              {count} board{count !== 1 ? "s" : ""}
              {active
                ? pct !== null
                  ? ` · ${pct}% done`
                  : ""
                : ` · C${total}`}
              {isMember ? " · shared" : ""}
            </span>
          </span>
          <span className="pr-len" aria-hidden>
            {active ? `C${total}` : pct !== null ? `${pct}%` : "—"}
          </span>
          {!active && pct !== null && (
            <span className="pr-tape" aria-hidden>
              <i style={{ width: `${pct}%` }} />
            </span>
          )}
        </>
      )}
    </button>
  );
}

// The open project's boards as a J-card track list (A1, A2…), each one a
// shortcut straight into the board.
function TrackList({
  project,
  boards,
  onOpenBoard,
}: {
  project: ProjectInterface;
  boards: ProjectBoard[];
  onOpenBoard: (id: number) => void;
}) {
  const shown = boards.slice(0, MAX_TRACKS);
  const extra = boards.length - shown.length;
  return (
    <div className="pr-tracks">
      <div className="pr-tracks-h">Side A · tracks</div>
      {boards.length === 0 && <div className="pr-tracks-empty">Blank tape</div>}
      {shown.map((b, i) => {
        const { pct, total } = boardProgress(b);
        return (
          <button
            key={b.id}
            type="button"
            className="pr-tr"
            onClick={() => onOpenBoard(b.id)}
            aria-label={`Open ${b.name}, ${total ? `${pct}% done` : "empty"}`}
          >
            <span className="no">A{i + 1}</span>
            <i
              className="dot"
              style={{ background: boardColor(b, project.color) }}
            />
            <span className="tn">{b.name}</span>
            {isRecording(b) && <span className="rec" />}
            <span className={`tp${total === 0 ? " zero" : ""}`}>
              {total === 0 ? "—" : `${pct}%`}
            </span>
          </button>
        );
      })}
      {extra > 0 && <div className="pr-more">+{extra} more on the deck</div>}
    </div>
  );
}

// Bottom readout for the open project: little reels sized by its flow, the
// most recently touched board, a level meter and this week's throughput.
function NowPlaying({
  project,
  boards,
}: {
  project: ProjectInterface;
  boards: ProjectBoard[];
}) {
  const { done, total, flow, live } = projectStats(boards);
  const latest = useMemo(
    () =>
      boards
        .filter((b) => b.last_activity_at)
        .sort(
          (a, b) =>
            new Date(b.last_activity_at ?? 0).getTime() -
            new Date(a.last_activity_at ?? 0).getTime(),
        )[0],
    [boards],
  );
  const segs = 30;
  const d = total ? Math.round((flow.done / total) * segs) : 0;
  const g = total
    ? Math.min(segs - d, Math.round((flow.doing / total) * segs))
    : 0;
  const rem = total ? (flow.todo + flow.doing) / total : 0;
  const fin = total ? flow.done / total : 0;
  const week = project.throughput
    ? project.throughput.slice(-7).reduce((s, v) => s + v, 0)
    : null;

  return (
    <section className="pr-now" aria-label="Now playing">
      <div className="pr-now-k">
        <span>Now playing</span>
        {live && <b>Rec</b>}
      </div>
      <div className="pr-now-deck">
        {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative; the meter below carries the numbers */}
        <svg className="pr-now-win" viewBox="0 0 76 30" aria-hidden>
          <rect width="76" height="30" fill="#0a0b09" />
          {total > 0 && (
            <>
              <circle
                cx="18"
                cy="15"
                r={5 + 7 * Math.sqrt(rem)}
                fill="#2e1f14"
                stroke="#4b3220"
                strokeWidth=".6"
              />
              <circle
                cx="58"
                cy="15"
                r={5 + 7 * Math.sqrt(fin)}
                fill="#2e1f14"
                stroke={project.color}
                strokeOpacity=".6"
                strokeWidth=".6"
              />
            </>
          )}
          <circle cx="18" cy="15" r="5" fill="#e9e2cc" />
          <circle cx="18" cy="15" r="2.4" fill="#0a0b09" />
          <circle cx="58" cy="15" r="5" fill="#e9e2cc" />
          <circle cx="58" cy="15" r="2.4" fill="#0a0b09" />
        </svg>
        <div className="min-w-0">
          <div
            className={`pr-now-nm${isLatinName(project.name) ? " cf-marker" : ""}`}
          >
            {project.name}
          </div>
          <div className="pr-now-sub">
            {latest?.last_activity_at
              ? `${latest.name} · ${timeAgo(latest.last_activity_at)}`
              : "no activity yet"}
          </div>
        </div>
      </div>
      <div
        className="pr-now-vu"
        role="img"
        aria-label={`${done} of ${total} cards done`}
      >
        {Array.from({ length: segs }, (_, i) => (
          <i
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed segments
            key={i}
            className={i < d ? "d" : i < d + g ? "g" : ""}
          />
        ))}
      </div>
      <div className="pr-now-row">
        <span>
          {done}/{total} done
        </span>
        {week !== null && <span className="wk">▲ {week}/wk</span>}
      </div>
    </section>
  );
}

export default function ProjectRail({
  owned,
  member,
  activeId,
  activeProject,
  collapsed = false,
  onToggleCollapsed,
  onBack,
  onSelect,
  onOpenBoard,
  onNewProject,
  enableBoardDrop = false,
}: {
  owned: ProjectInterface[];
  member: ProjectInterface[];
  activeId: number;
  // The fully loaded open project (show payload): fresher boards + throughput
  // than the index copy in `owned` / `member`.
  activeProject?: ProjectInterface | null;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onBack: () => void;
  onSelect: (id: number) => void;
  onOpenBoard: (id: number) => void;
  onNewProject: () => void;
  // When true, non-active owned spines become board drop targets (YON-125).
  enableBoardDrop?: boolean;
}) {
  const activeIsShared = member.some((p) => p.id === activeId);
  const [tab, setTab] = useState<"owned" | "member">(
    activeIsShared ? "member" : "owned",
  );
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Follow the open project into its tab when navigating between projects.
  useEffect(() => {
    setTab(activeIsShared ? "member" : "owned");
  }, [activeIsShared]);

  // "P" focuses the library search (unless typing somewhere already).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "p" || e.metaKey || e.ctrlKey || e.altKey)
        return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))
      )
        return;
      if (collapsed) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [collapsed]);

  const boardsOf = (p: ProjectInterface): ProjectBoard[] => {
    const src =
      p.id === activeId && activeProject?.boards
        ? activeProject.boards
        : (p.boards ?? []);
    return [...src].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  };

  const q = query.trim().toLowerCase();
  const list = (tab === "owned" ? owned : member).filter((p) =>
    p.name.toLowerCase().includes(q),
  );
  const current =
    activeProject ?? [...owned, ...member].find((p) => p.id === activeId);

  const spine = (p: ProjectInterface) => {
    const active = p.id === activeId;
    const isMember = tab === "member";
    const el = (
      <Spine
        project={p}
        boards={boardsOf(p)}
        active={active}
        collapsed={collapsed}
        isMember={isMember}
        onClick={() => onSelect(p.id)}
      />
    );
    const wrapped =
      enableBoardDrop && !active && !isMember ? (
        <DroppableSpine projectId={p.id}>{el}</DroppableSpine>
      ) : (
        el
      );
    return (
      <div key={p.id} className="pr-item">
        {wrapped}
        {active && !collapsed && current && (
          <TrackList
            project={current}
            boards={boardsOf(p)}
            onOpenBoard={onOpenBoard}
          />
        )}
      </div>
    );
  };

  return (
    <div className={`pr${collapsed ? " is-collapsed" : ""}`}>
      <div className="pr-top">
        <button
          type="button"
          onClick={onBack}
          className="pr-key pr-back"
          aria-label="All projects"
          title={collapsed ? "All projects" : undefined}
        >
          <Icon icon={faArrowLeft} style={{ fontSize: 10 }} />
          {!collapsed && <span>All projects</span>}
        </button>
        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="pr-key pr-collapse"
            aria-label={
              collapsed ? "Expand project shelf" : "Collapse project shelf"
            }
            aria-expanded={!collapsed}
          >
            <Icon
              icon={collapsed ? faAnglesRight : faAnglesLeft}
              style={{ fontSize: 10 }}
            />
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="pr-lib">
          <div className="pr-lib-h">
            <span>Library</span>
            <b>{String(owned.length + member.length).padStart(2, "0")}</b>
          </div>
          <div className="pr-search">
            <Icon
              icon={faMagnifyingGlass}
              className="pr-search-ico"
              style={{ fontSize: 10 }}
            />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setQuery("");
                  e.currentTarget.blur();
                }
              }}
              placeholder="Find a tape…"
              aria-label="Find a project"
            />
            {!query && <kbd aria-hidden>P</kbd>}
          </div>
          <div className="pr-tabs" role="tablist" aria-label="Project shelves">
            {(
              [
                ["owned", "Yours", owned.length],
                ["member", "Shared", member.length],
              ] as const
            ).map(([key, label, n]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
              >
                {label} <b>{String(n).padStart(2, "0")}</b>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="pr-list overflow-y-auto">
        {(collapsed ? [...owned, ...member] : list).map(spine)}
        {!collapsed && list.length === 0 && (
          <p className="pr-empty">
            {q
              ? `No tapes match “${query.trim()}”.`
              : tab === "member"
                ? "Nothing shared with you yet."
                : "No projects yet."}
          </p>
        )}
      </div>

      {!collapsed && current && (
        <NowPlaying project={current} boards={boardsOf(current)} />
      )}

      <div className="pr-foot">
        <button
          type="button"
          onClick={onNewProject}
          className="pr-newkey"
          aria-label="New project"
          title={collapsed ? "New project" : undefined}
        >
          <Icon
            icon={faPlus}
            className="pr-newkey-plus"
            style={{ fontSize: 11 }}
          />
          {!collapsed && "New project"}
        </button>
      </div>
    </div>
  );
}
