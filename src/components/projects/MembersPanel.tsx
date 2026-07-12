"use client";

import type { ProjectInterface } from "@/interfaces/ProjectInterface";
import Avatar from "./Avatar";

// Right-hand column: the project's crew roster, primary owner first. Each
// member sits on a bordered plate with their role as a chip — the owner's is
// lit amber. `onInvite` (managers only) opens the members settings tab.
export default function MembersPanel({
  project,
  onInvite,
}: {
  project: ProjectInterface;
  onInvite?: () => void;
}) {
  const members = [...(project.members ?? [])].sort((a, b) => {
    if (a.id === project.owner_id) return -1;
    if (b.id === project.owner_id) return 1;
    return 0;
  });

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center justify-between px-3.5 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--cf-edge)" }}
      >
        <p
          className="cf-label uppercase tracking-widest font-bold"
          style={{ fontSize: 11, color: "var(--cf-text-muted)" }}
        >
          Members
        </p>
        <span className="mp-count">{members.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {members.map((m) => {
          const isPrimary = m.id === project.owner_id;
          const role = isPrimary ? "owner" : (m.role ?? "member");
          return (
            <div key={m.id} className="mp-plate">
              <Avatar user={m} size={26} ring="#232220" />
              <p
                className="font-bold truncate flex-1 min-w-0"
                style={{ fontSize: 12.5, color: "var(--cf-text)" }}
              >
                {m.name}
              </p>
              <span className={`mp-chip${isPrimary ? " mp-chip--owner" : ""}`}>
                {role}
              </span>
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

      <div className="mp-vents flex-shrink-0" />
      {onInvite && (
        <div
          className="p-2.5 flex-shrink-0"
          style={{ borderTop: "1px solid var(--cf-edge)" }}
        >
          <button type="button" onClick={onInvite} className="mp-invite">
            + Invite member
          </button>
        </div>
      )}
    </div>
  );
}
