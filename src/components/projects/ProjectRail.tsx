"use client";

import { faPlus } from "@fortawesome/free-solid-svg-icons";
import Icon from "@/components/ui/Icon";
import type { ProjectInterface } from "@/interfaces/ProjectInterface";
import { boardProgress } from "@/lib/ui";

function projectPct(p: ProjectInterface): number | null {
  const boards = p.boards ?? [];
  if (boards.length === 0) return null;
  let done = 0,
    total = 0;
  for (const b of boards) {
    const bp = boardProgress(b);
    done += bp.done;
    total += bp.total;
  }
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

function FolderTab({
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
  const pct = projectPct(project);
  const count = project.boards_count ?? project.boards?.length ?? 0;
  return (
    <button onClick={onClick} className="w-full text-left focus:outline-none">
      <div
        className="flex items-center gap-2.5 px-2 py-2 border-l-[3px] rounded-r-lg transition-colors duration-100 cursor-pointer"
        style={{
          borderLeftColor: active ? project.color : "transparent",
          background: active ? "#2f2d27" : "transparent",
          boxShadow: active
            ? "inset 0 0 0 1px var(--cf-edge), 0 0 14px rgba(111,224,255,0.10)"
            : undefined,
        }}
      >
        <span
          className="cf-led flex-shrink-0"
          style={{
            background: project.color,
            boxShadow: `0 0 6px ${project.color}`,
          }}
        />
        <div
          className="cf-mono rounded-md flex items-center justify-center font-bold flex-shrink-0 border"
          style={{
            width: 24,
            height: 24,
            fontSize: 12,
            background: "#211f1b",
            color: "var(--cf-text)",
            borderColor: "var(--cf-edge)",
          }}
        >
          {project.name[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="font-bold truncate leading-tight"
            style={{
              fontSize: 11,
              color: active ? "var(--cf-text)" : "var(--cf-text-muted)",
            }}
          >
            {project.name}
          </p>
          <p
            className="cf-mono truncate"
            style={{ fontSize: 8, color: "var(--cf-text-dim)" }}
          >
            {count} board{count !== 1 ? "s" : ""}
            {pct !== null ? ` · ${pct}%` : ""}
            {isMember ? " · member" : ""}
          </p>
        </div>
      </div>
    </button>
  );
}

export default function ProjectRail({
  owned,
  member,
  activeId,
  onSelect,
  onNewProject,
}: {
  owned: ProjectInterface[];
  member: ProjectInterface[];
  activeId: number;
  onSelect: (id: number) => void;
  onNewProject: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto py-1">
        {owned.length > 0 && (
          <>
            <p
              className="cf-label px-3 pt-3 pb-1 uppercase tracking-widest"
              style={{ fontSize: 8, color: "var(--cf-text-muted)" }}
            >
              Yours
            </p>
            {owned.map((p) => (
              <FolderTab
                key={p.id}
                project={p}
                active={p.id === activeId}
                onClick={() => onSelect(p.id)}
              />
            ))}
          </>
        )}
        {member.length > 0 && (
          <>
            <p
              className="cf-label px-3 pt-4 pb-1 uppercase tracking-widest"
              style={{ fontSize: 8, color: "var(--cf-text-muted)" }}
            >
              Shared
            </p>
            {member.map((p) => (
              <FolderTab
                key={p.id}
                project={p}
                active={p.id === activeId}
                isMember
                onClick={() => onSelect(p.id)}
              />
            ))}
          </>
        )}
      </div>
      <div className="p-2.5" style={{ borderTop: "1px solid var(--cf-edge)" }}>
        <button
          onClick={onNewProject}
          className="aero-btn aero-btn--cyan w-full uppercase tracking-widest font-bold px-3 py-2.5 text-[9px] inline-flex items-center justify-center gap-1.5"
        >
          <Icon icon={faPlus} style={{ fontSize: 10 }} /> New project
        </button>
      </div>
    </div>
  );
}
