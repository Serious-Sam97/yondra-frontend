"use client";

import type { ProjectInterface } from "@/interfaces/ProjectInterface";
import Avatar from "./Avatar";

// Right-hand column: the project's member roster, primary owner first.
export default function MembersPanel({
  project,
}: {
  project: ProjectInterface;
}) {
  const members = [...(project.members ?? [])].sort((a, b) => {
    if (a.id === project.owner_id) return -1;
    if (b.id === project.owner_id) return 1;
    return 0;
  });

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--cf-edge)" }}
      >
        <div className="flex items-center gap-2">
          <p
            className="cf-label uppercase tracking-widest font-bold"
            style={{ fontSize: 11, color: "var(--cf-text-muted)" }}
          >
            Members
          </p>
          <span
            className="cf-mono font-bold rounded-full"
            style={{
              fontSize: 10,
              color: "var(--cf-ink)",
              background: "var(--cf-phosphor)",
              padding: "1px 7px",
            }}
          >
            {members.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {members.map((m) => {
          const isPrimary = m.id === project.owner_id;
          const role = isPrimary ? "owner" : (m.role ?? "member");
          return (
            <div
              key={m.id}
              className="flex items-center gap-2.5 px-4 py-2.5"
              style={{ borderBottom: "1px solid rgba(74,70,63,0.4)" }}
            >
              <Avatar user={m} size={26} />
              <div className="flex-1 min-w-0">
                <p
                  className="font-bold truncate"
                  style={{ fontSize: 12.5, color: "var(--cf-text)" }}
                >
                  {m.name}
                </p>
                <p
                  className="cf-mono uppercase tracking-wide"
                  style={{ fontSize: 9.5, color: "var(--cf-text-muted)" }}
                >
                  {role}
                </p>
              </div>
            </div>
          );
        })}
        {members.length === 0 && (
          <p
            className="cf-mono text-center py-6"
            style={{ fontSize: 11, color: "var(--cf-text-dim)" }}
          >
            No members yet
          </p>
        )}
      </div>
    </div>
  );
}
