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

// "Channel strip": the active project is a powered-on channel in the same
// anodized material as the board cards; idle channels sit flat with a dimmed
// LED in their project colour.
function ChannelTab({
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
    <button
      type="button"
      onClick={onClick}
      className={`pr-chan${active ? " active" : ""}`}
      style={{ "--pr-ac": project.color } as React.CSSProperties}
    >
      <span className="pr-chan-rail" />
      <span className="flex items-center gap-2.5 py-2 pl-3 pr-2.5">
        <span className="pr-chan-led" />
        <span className="flex-1 min-w-0">
          <span
            className="block font-bold truncate leading-tight"
            style={{
              fontSize: 12.5,
              color: active ? "var(--cf-cream)" : "var(--cf-text-muted)",
            }}
          >
            {project.name}
          </span>
          <span
            className="cf-mono flex items-center gap-1.5"
            style={{
              fontSize: 9,
              marginTop: 3,
              color: active ? "rgba(232,228,214,0.6)" : "var(--cf-text-dim)",
            }}
          >
            <span className="truncate">
              {count} board{count !== 1 ? "s" : ""}
              {isMember ? " · member" : ""}
            </span>
            {pct !== null && (
              <>
                <span
                  className="flex-shrink-0 rounded-sm overflow-hidden"
                  style={{
                    width: 34,
                    height: 3,
                    background: active ? "rgba(0,0,0,0.45)" : "#14130e",
                    boxShadow: "inset 0 1px 1px rgba(0,0,0,0.7)",
                  }}
                >
                  <span
                    className="block h-full rounded-sm"
                    style={{
                      width: `${Math.max(pct, 2)}%`,
                      background: "var(--cf-phosphor)",
                    }}
                  />
                </span>
                <span className="flex-shrink-0">{pct}%</span>
              </>
            )}
          </span>
        </span>
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
              className="cf-label px-3 pt-3 pb-1.5 uppercase tracking-widest"
              style={{ fontSize: 10, color: "var(--cf-text-muted)" }}
            >
              Yours
            </p>
            {owned.map((p) => (
              <ChannelTab
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
              <ChannelTab
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
