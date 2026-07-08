"use client";

import { faLock, faTrash } from "@fortawesome/free-solid-svg-icons";
import { useEffect, useState } from "react";
import {
  type Feedback,
  FeedbackBanner,
  PanelHeading,
  RingAvatar,
} from "@/components/settings/shared";
import Icon from "@/components/ui/Icon";
import type {
  ProjectInterface,
  ProjectMember,
} from "@/interfaces/ProjectInterface";
import {
  addProjectMember,
  getProjectMemberCandidates,
  removeProjectMember,
  updateProjectMember,
} from "@/lib/api";
import { type ProjectRole, ROLE_META, RoleSegments } from "./roles";

interface Candidate {
  id: number;
  name: string;
  email: string;
}

interface Props {
  project: ProjectInterface;
  currentUserId?: number;
  onChange: (project: ProjectInterface) => void;
}

export default function MembersTab({
  project,
  currentUserId,
  onChange,
}: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ProjectRole>("member");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [loading, setLoading] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [addingId, setAddingId] = useState<number | null>(null);

  const members = [...(project.members ?? [])].sort((a, b) => {
    if (a.id === project.owner_id) return -1;
    if (b.id === project.owner_id) return 1;
    return (
      ROLE_META[(a.role ?? "member") as ProjectRole].rank -
      ROLE_META[(b.role ?? "member") as ProjectRole].rank
    );
  });

  const myRole = members.find((m) => m.id === currentUserId)?.role as
    | ProjectRole
    | undefined;
  const canManage =
    project.can_manage === true ||
    project.owner_id === currentUserId ||
    myRole === "owner";

  // Live user search for the "add member" picker (debounced).
  useEffect(() => {
    if (!canManage) return;
    let active = true;
    const t = setTimeout(() => {
      getProjectMemberCandidates(project.id, search)
        .then((res: Candidate[]) => {
          if (active) setCandidates(res ?? []);
        })
        .catch(() => {
          if (active) setCandidates([]);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [search, project.id, canManage, project.members]);

  const availableCandidates = candidates.filter(
    (c) => !members.some((m) => m.id === c.id),
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setFeedback(null);
    try {
      const updated = await addProjectMember(project.id, email.trim(), role);
      onChange(updated);
      setEmail("");
    } catch {
      setFeedback({
        type: "error",
        message:
          "That email isn't a Yondra user, or they're already on the project.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCandidate = async (c: Candidate) => {
    setAddingId(c.id);
    setFeedback(null);
    try {
      const updated = await addProjectMember(project.id, c.email, role);
      onChange(updated);
    } catch {
      setFeedback({ type: "error", message: "Could not add that member." });
    } finally {
      setAddingId(null);
    }
  };

  const handleRole = async (memberId: number, next: ProjectRole) => {
    setFeedback(null);
    try {
      onChange(await updateProjectMember(project.id, memberId, next));
    } catch {
      setFeedback({
        type: "error",
        message:
          "Couldn't change that role. The primary owner can't be demoted.",
      });
    }
  };

  const handleRemove = async (memberId: number) => {
    setConfirmId(null);
    await removeProjectMember(project.id, memberId);
    onChange({
      ...project,
      members: (project.members ?? []).filter((x) => x.id !== memberId),
    });
  };

  return (
    <div className="glass-panel p-6 flex flex-col gap-4">
      <PanelHeading>Members</PanelHeading>

      {/* Role legend */}
      <div
        className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-lg px-3 py-2"
        style={{
          background: "var(--cf-screen, #0d1410)",
          border: "1px solid #14130f",
          boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5)",
        }}
      >
        {(
          [
            ["owner", "manages people"],
            ["member", "edits boards"],
            ["viewer", "reads only"],
          ] as const
        ).map(([r, desc]) => (
          <span
            key={r}
            className="flex items-center gap-1.5"
            style={{ fontSize: "9.5px", color: "var(--cf-text-muted)" }}
          >
            <span
              className="rounded-full"
              style={{
                width: 7,
                height: 7,
                background: ROLE_META[r].color,
                boxShadow: `0 0 6px ${ROLE_META[r].color}`,
              }}
            />
            <b
              className="cf-mono uppercase font-bold"
              style={{ color: "var(--cf-text)", letterSpacing: "0.1em" }}
            >
              {r}
            </b>{" "}
            {desc}
          </span>
        ))}
      </div>

      <FeedbackBanner feedback={feedback} />

      <div className="flex flex-col gap-1.5">
        {members.map((m: ProjectMember) => {
          const mRole = (m.role ?? "member") as ProjectRole;
          const meta = ROLE_META[mRole];
          const isPrimary = m.id === project.owner_id;
          const isMe = m.id === currentUserId;
          const editable = canManage && !isPrimary;
          return (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-xl px-2.5 py-2 relative"
              style={{
                background: "#211f1b",
                border: `1px solid ${isMe ? "#514b3f" : "#38352e"}`,
              }}
            >
              <span
                className="rounded-r-sm"
                style={{
                  position: "absolute",
                  left: 0,
                  top: 9,
                  bottom: 9,
                  width: 3,
                  background: meta.color,
                  boxShadow: `0 0 8px ${meta.color}`,
                }}
              />
              <RingAvatar id={m.id} name={m.name} ring={meta.color} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className="font-bold truncate"
                    style={{ fontSize: "12px", color: "var(--cf-text)" }}
                  >
                    {m.name}
                  </p>
                  {isMe && (
                    <span
                      className="flex-shrink-0"
                      style={{
                        fontSize: "8px",
                        letterSpacing: "0.14em",
                        color: "var(--cf-cyan)",
                        border: "1px solid rgba(111,224,255,0.5)",
                        borderRadius: 4,
                        padding: "1px 5px",
                      }}
                    >
                      YOU
                    </span>
                  )}
                </div>
                <p
                  className="cf-mono truncate"
                  style={{ fontSize: "9px", color: "var(--cf-text-muted)" }}
                >
                  {m.email}
                </p>
              </div>

              {isPrimary ? (
                <div className="flex flex-col items-end flex-shrink-0">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-md uppercase font-bold"
                    style={{
                      fontSize: "9px",
                      letterSpacing: "0.14em",
                      color: meta.color,
                      background: meta.bg,
                      border: `1px solid ${meta.border}`,
                      padding: "4px 9px",
                    }}
                  >
                    <Icon
                      icon={faLock}
                      style={{ fontSize: "9px", opacity: 0.85 }}
                    />{" "}
                    owner
                  </span>
                  <span
                    style={{
                      fontSize: "8px",
                      letterSpacing: "0.1em",
                      color: "var(--cf-text-dim)",
                      marginTop: 3,
                    }}
                  >
                    Primary · locked
                  </span>
                </div>
              ) : editable ? (
                confirmId === m.id ? (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span
                      className="uppercase"
                      style={{
                        fontSize: "9px",
                        letterSpacing: "0.1em",
                        color: "var(--cf-red)",
                      }}
                    >
                      Remove?
                    </span>
                    <button
                      onClick={() => handleRemove(m.id)}
                      className="cf-mono uppercase rounded-md px-2 py-1 cursor-pointer"
                      style={{
                        fontSize: "9px",
                        letterSpacing: "0.1em",
                        background: "rgba(255,90,77,0.16)",
                        border: "1px solid rgba(255,90,77,0.55)",
                        color: "var(--cf-red)",
                      }}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className="cf-mono uppercase rounded-md px-2 py-1 cursor-pointer"
                      style={{
                        fontSize: "9px",
                        letterSpacing: "0.1em",
                        border: "1px solid var(--cf-edge)",
                        color: "var(--cf-text-muted)",
                      }}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <RoleSegments
                      value={mRole}
                      onChange={(next) => handleRole(m.id, next)}
                    />
                    <button
                      onClick={() => setConfirmId(m.id)}
                      aria-label={`Remove ${m.name}`}
                      title="Remove"
                      className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer transition-colors"
                      style={{ color: "var(--cf-text-dim)" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "var(--cf-red)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "var(--cf-text-dim)")
                      }
                    >
                      <Icon icon={faTrash} style={{ fontSize: "11px" }} />
                    </button>
                  </div>
                )
              ) : (
                <span
                  className="uppercase font-bold rounded-md flex-shrink-0"
                  style={{
                    fontSize: "9px",
                    letterSpacing: "0.14em",
                    color: meta.color,
                    background: meta.bg,
                    border: `1px solid ${meta.border}`,
                    padding: "4px 9px",
                  }}
                >
                  {mRole}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {canManage && (
        <>
          {/* Search & add existing users */}
          <div
            className="flex flex-col gap-1.5 pt-3 border-t"
            style={{ borderColor: "var(--cf-edge)" }}
          >
            <label className="cf-label">Add member</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users by name or email…"
              className="glass-input cf-lcd w-full"
              style={{ fontSize: "12px" }}
            />
            {availableCandidates.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-1 max-h-52 overflow-y-auto -mx-1 px-1">
                {availableCandidates.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 rounded-xl px-2.5 py-2"
                    style={{
                      background: "#211f1b",
                      border: "1px solid #38352e",
                    }}
                  >
                    <RingAvatar
                      id={c.id}
                      name={c.name}
                      ring="var(--cf-text-dim, #6f6a5c)"
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-bold truncate"
                        style={{ fontSize: "12px", color: "var(--cf-text)" }}
                      >
                        {c.name}
                      </p>
                      <p
                        className="cf-mono truncate"
                        style={{
                          fontSize: "9px",
                          color: "var(--cf-text-muted)",
                        }}
                      >
                        {c.email}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAddCandidate(c)}
                      disabled={addingId === c.id}
                      className="cf-mono uppercase font-bold rounded-md px-3 py-1.5 cursor-pointer transition-all duration-150 flex-shrink-0 disabled:opacity-50"
                      style={{
                        fontSize: "9px",
                        letterSpacing: "0.1em",
                        color: "var(--cf-phosphor)",
                        background: "rgba(154,166,126,0.16)",
                        border: "1px solid rgba(154,166,126,0.5)",
                      }}
                      title={`Add as ${role}`}
                    >
                      {addingId === c.id ? "…" : "+ Add"}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {search.trim() && availableCandidates.length === 0 && (
              <p
                className="cf-mono"
                style={{ fontSize: "10px", color: "var(--cf-text-dim)" }}
              >
                No matching users.
              </p>
            )}
          </div>

          {/* Invite by email */}
          <form
            onSubmit={handleAdd}
            className="flex flex-col gap-2.5 pt-4"
            style={{ borderTop: "1px solid var(--cf-edge)" }}
          >
            <label className="cf-label">Invite by email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="glass-input cf-lcd w-full"
              style={{ fontSize: "12px" }}
            />
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <RoleSegments value={role} onChange={setRole} />
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="aero-btn aero-btn--cyan uppercase tracking-widest font-bold px-4 py-1.5 text-[10px] disabled:opacity-50"
              >
                {loading ? "…" : "Send invite"}
              </button>
            </div>
            <span style={{ fontSize: "9.5px", color: "var(--cf-text-dim)" }}>
              New role applies to both search-add and email invite.
            </span>
          </form>
        </>
      )}
    </div>
  );
}
