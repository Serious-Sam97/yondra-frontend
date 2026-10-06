"use client";

import { useDroppable } from "@dnd-kit/core";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import Icon from "@/components/ui/Icon";
import type { ProjectInterface } from "@/interfaces/ProjectInterface";
import { boardProgress, isLatinName, isRecording } from "@/lib/ui";

// Drop-target ID for a project channel; the page's handleDragEnd parses this to
// move the dragged board into project <id> (YON-125).
export const projectDropId = (projectId: number) => `proj-${projectId}`;

// Wraps a channel as a board drop-zone. Only rendered for *other* projects while
// board-dragging is enabled, so useDroppable always runs inside the page DndContext.
function DroppableChannel({
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

function projectStats(p: ProjectInterface): {
  pct: number | null;
  cards: number;
  live: boolean;
} {
  const boards = p.boards ?? [];
  let done = 0,
    total = 0,
    live = false;
  for (const b of boards) {
    const bp = boardProgress(b);
    done += bp.done;
    total += bp.total;
    if (!live && isRecording(b)) live = true;
  }
  return {
    pct:
      boards.length === 0
        ? null
        : total > 0
          ? Math.round((done / total) * 100)
          : 0,
    cards: total,
    live,
  };
}

// "Tape shelf": each project is a cassette spine with a colour band. The
// active one is pulled out of the shelf with a cream label and a lit band;
// a red dot marks projects with a board that changed in the last hour.
function Spine({
  project,
  active,
  isMember,
  onClick,
}: {
  project: ProjectInterface;
  active: boolean;
  isMember?: boolean;
  onClick: () => void;
}) {
  const { pct, cards, live } = projectStats(project);
  const count = project.boards_count ?? project.boards?.length ?? 0;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-label={`${project.name}: ${count} board${count !== 1 ? "s" : ""}${pct !== null ? `, ${pct}% done` : ""}${live ? ", active now" : ""}`}
      className={`pr-spine${active ? " active" : ""}`}
      style={{ "--pr-ac": project.color } as React.CSSProperties}
    >
      <span className="pr-spine-band" aria-hidden />
      {live && <span className="pr-spine-live" aria-hidden />}
      <span className="pr-spine-label" aria-hidden>
        <span
          className={`pr-spine-name${active && isLatinName(project.name) ? " cf-marker" : ""}`}
        >
          {project.name}
        </span>
        <span className="pr-spine-meta">
          <span className="truncate">
            {count} board{count !== 1 ? "s" : ""}
            {isMember ? " · member" : ""}
          </span>
          {pct !== null && (
            <>
              <span className="pr-mini">
                <i style={{ width: `${Math.max(pct, 2)}%` }} />
              </span>
              <span className="flex-shrink-0">{pct}%</span>
            </>
          )}
        </span>
      </span>
      <span className="pr-spine-len" aria-hidden>
        C{cards}
      </span>
    </button>
  );
}

export default function ProjectRail({
  owned,
  member,
  activeId,
  onSelect,
  onNewProject,
  enableBoardDrop = false,
}: {
  owned: ProjectInterface[];
  member: ProjectInterface[];
  activeId: number;
  onSelect: (id: number) => void;
  onNewProject: () => void;
  // When true, non-active owned channels become board drop targets (YON-125).
  enableBoardDrop?: boolean;
}) {
  // A board can only be dropped onto another project the user owns (the move
  // reuses updateBoard, which the backend gates on board ownership).
  const channel = (p: ProjectInterface, isMember?: boolean) => {
    const active = p.id === activeId;
    const tab = (
      <Spine
        project={p}
        active={active}
        isMember={isMember}
        onClick={() => onSelect(p.id)}
      />
    );
    return enableBoardDrop && !active && !isMember ? (
      <DroppableChannel key={p.id} projectId={p.id}>
        {tab}
      </DroppableChannel>
    ) : (
      <span key={p.id}>{tab}</span>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pb-2">
        {owned.length > 0 && (
          <>
            <div className="pr-shelf-h">
              <span>Tape shelf · yours</span>
              <b>{String(owned.length).padStart(2, "0")}</b>
            </div>
            <div className="pr-shelf">{owned.map((p) => channel(p))}</div>
          </>
        )}
        {member.length > 0 && (
          <>
            <div className="pr-shelf-h">
              <span>Shared with you</span>
              <b>{String(member.length).padStart(2, "0")}</b>
            </div>
            <div className="pr-shelf">
              {member.map((p) => channel(p, true))}
            </div>
          </>
        )}
      </div>
      <div className="pr-foot">
        <button type="button" onClick={onNewProject} className="pr-newkey">
          <Icon
            icon={faPlus}
            className="pr-newkey-plus"
            style={{ fontSize: 11 }}
          />
          New project
        </button>
      </div>
    </div>
  );
}
