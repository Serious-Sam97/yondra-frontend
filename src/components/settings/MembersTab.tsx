"use client";

import { faMagnifyingGlass, faTrash } from "@fortawesome/free-solid-svg-icons";
import { useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import type {
  BoardInterface,
  BoardPermission,
  SharedUser,
} from "@/interfaces/BoardInterface";
import {
  getShareCandidates,
  shareBoardWithUser,
  unshareBoard,
  updateSharePermission,
} from "@/lib/api";
import {
  type Feedback,
  FeedbackBanner,
  PanelHeading,
  PERM_META,
  PermSegments,
  RingAvatar,
} from "./shared";

interface ShareCandidate {
  id: number;
  name: string;
  email: string;
  role: string;
  shared: boolean;
  permission?: BoardPermission;
}

interface Props {
  board: BoardInterface;
  onChange: (users: SharedUser[]) => void;
}

export default function MembersTab({ board, onChange }: Props) {
  const [members, setMembers] = useState<SharedUser[]>(board.shared_with ?? []);
  const [invitePermission, setInvitePermission] = useState<BoardPermission>(
    board.default_permission ?? "write",
  );
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [candidates, setCandidates] = useState<ShareCandidate[]>([]);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    getShareCandidates(board.id)
      .then((res: ShareCandidate[]) => {
        if (active) setCandidates(res ?? []);
      })
      .catch(() => {
        /* no parent project / not owner — silently hide the picker */
      });
    return () => {
      active = false;
    };
  }, [board.id]);

  const sync = (next: SharedUser[]) => {
    setMembers(next);
    onChange(next);
  };

  const addable = candidates.filter(
    (c) => !c.shared && !members.some((u) => u.id === c.id),
  );
  const q = search.trim().toLowerCase();
  const availableMembers = q
    ? addable.filter(
        (c) =>
          c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
      )
    : addable;

  const handleAddMember = async (member: ShareCandidate) => {
    setFeedback(null);
    setAddingId(member.id);
    try {
      const res = await shareBoardWithUser(
        board.id,
        member.id,
        invitePermission,
      );
      sync([...members, res.user]);
      setCandidates((prev) =>
        prev.map((c) => (c.id === member.id ? { ...c, shared: true } : c)),
      );
    } catch (err) {
      setFeedback({
        type: "error",
        message: (err as Error).message ?? "Failed to add member.",
      });
    } finally {
      setAddingId(null);
    }
  };

  const handleSetPermission = async (
    user: SharedUser,
    next: BoardPermission,
  ) => {
    setFeedback(null);
    sync(
      members.map((u) => (u.id === user.id ? { ...u, permission: next } : u)),
    );
    try {
      await updateSharePermission(board.id, user.id, next);
    } catch {
      setFeedback({
        type: "error",
        message: "Couldn't change that access level.",
      });
    }
  };

  const handleRemove = async (userId: number) => {
    setConfirmId(null);
    await unshareBoard(board.id, userId);
    sync(members.filter((u) => u.id !== userId));
  };

  return (
    <div className="glass-panel p-6 flex flex-col gap-4">
      <PanelHeading>Members</PanelHeading>

      {/* Permission legend */}
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
            ["owner", "manages sharing"],
            ["write", "edits cards"],
            ["read", "views only"],
          ] as const
        ).map(([p, desc]) => (
          <span
            key={p}
            className="flex items-center gap-1.5"
            style={{ fontSize: "9.5px", color: "var(--cf-text-muted)" }}
          >
            <span
              className="rounded-full"
              style={{
                width: 7,
                height: 7,
                background: PERM_META[p].color,
                boxShadow: `0 0 6px ${PERM_META[p].color}`,
              }}
            />
            <b
              className="cf-mono uppercase font-bold"
              style={{ color: "var(--cf-text)", letterSpacing: "0.1em" }}
            >
              {p}
            </b>{" "}
            {desc}
          </span>
        ))}
      </div>

      <FeedbackBanner feedback={feedback} />

      {/* Collaborators */}
      {members.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {members.map((user) => {
            const perm = (user.permission ?? "write") as BoardPermission;
            const meta = PERM_META[perm];
            return (
              <div
                key={user.id}
                className="flex items-center gap-3 rounded-xl px-2.5 py-2 relative"
                style={{ background: "#211f1b", border: "1px solid #38352e" }}
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
                <RingAvatar id={user.id} name={user.name} ring={meta.color} />
                <div className="flex-1 min-w-0">
                  <p
                    className="font-bold truncate"
                    style={{ fontSize: "12px", color: "var(--cf-text)" }}
                  >
                    {user.name}
                  </p>
                  <p
                    className="cf-mono truncate"
                    style={{ fontSize: "9px", color: "var(--cf-text-muted)" }}
                  >
                    {user.email}
                  </p>
                </div>
                {confirmId === user.id ? (
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
                      onClick={() => handleRemove(user.id)}
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
                    <PermSegments
                      value={perm}
                      onChange={(next) => handleSetPermission(user, next)}
                    />
                    <button
                      onClick={() => setConfirmId(user.id)}
                      aria-label={`Remove ${user.name}`}
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
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p
          className="cf-mono text-center py-3"
          style={{ fontSize: "10px", color: "var(--cf-text-dim)" }}
        >
          Not shared with anyone yet
        </p>
      )}

      {/* Add from the parent project's members */}
      {addable.length > 0 && (
        <div
          className="flex flex-col gap-2.5 pt-4"
          style={{ borderTop: "1px solid var(--cf-edge)" }}
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <label className="cf-label">Add from project</label>
            <PermSegments
              value={invitePermission}
              onChange={setInvitePermission}
            />
          </div>

          <div className="relative">
            <Icon
              icon={faMagnifyingGlass}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 12,
                color: "#5a6050",
              }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="glass-input cf-lcd w-full"
              style={{ fontSize: "12px", paddingLeft: 28 }}
            />
          </div>

          {availableMembers.length > 0 ? (
            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto -mx-1 px-1">
              {availableMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 rounded-xl px-2.5 py-2"
                  style={{ background: "#211f1b", border: "1px solid #38352e" }}
                >
                  <RingAvatar
                    id={member.id}
                    name={member.name}
                    ring="var(--cf-text-dim, #6f6a5c)"
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-bold truncate"
                      style={{ fontSize: "12px", color: "var(--cf-text)" }}
                    >
                      {member.name}
                    </p>
                    <p
                      className="cf-mono truncate"
                      style={{ fontSize: "9px", color: "var(--cf-text-muted)" }}
                    >
                      {member.email}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAddMember(member)}
                    disabled={addingId === member.id}
                    className="cf-mono uppercase font-bold rounded-md px-3 py-1.5 cursor-pointer transition-all duration-150 flex-shrink-0 disabled:opacity-50"
                    style={{
                      fontSize: "9px",
                      letterSpacing: "0.1em",
                      color: "var(--cf-phosphor)",
                      background: "rgba(154,166,126,0.16)",
                      border: "1px solid rgba(154,166,126,0.5)",
                      boxShadow: "0 0 8px rgba(154,166,126,0.4)",
                    }}
                    title={`Grant ${invitePermission} access`}
                  >
                    {addingId === member.id ? "…" : "+ Add"}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p
              className="cf-mono"
              style={{ fontSize: "10px", color: "var(--cf-text-dim)" }}
            >
              No matching members.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
