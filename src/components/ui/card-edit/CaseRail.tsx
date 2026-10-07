"use client";

import { useEffect, useRef, useState } from "react";
import { HistoryLog } from "@/components/ui/card-edit/HistorySection";
import { avatarColor, initials } from "@/lib/ui";

const DAY = 86_400_000;

type Priority = "low" | "medium" | "high" | null;

function daysSince(iso?: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t)
    ? null
    : Math.max(0, Math.floor((Date.now() - t) / DAY));
}

function dueIn(due: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round(
    (new Date(`${due}T00:00:00`).getTime() - today.getTime()) / DAY,
  );
}

function Avatar({
  user,
  size = 30,
}: {
  user: { id: number; name: string };
  size?: number;
}) {
  return (
    <span
      className="mtx-av"
      style={{
        width: size,
        height: size,
        backgroundColor: avatarColor(user.id),
      }}
    >
      {initials(user.name)}
    </span>
  );
}

export interface CaseRailProps {
  isReadOnly: boolean;
  boardType: "kanban" | "scrum" | "crm";
  ticketKey?: string;
  // Readout
  sectionEnteredAt?: string | null;
  createdAt?: string | null;
  doneAt?: string | null;
  // Channel
  sections: { id: number; name: string }[];
  backlogSectionId?: number;
  sectionId: number;
  setSectionId: (v: number) => void;
  sectionCounts?: Record<number, number>;
  wipLimits?: Record<number, number | null>;
  // Playing
  users: { id: number; name: string }[];
  assignedUserId: number | null;
  setAssignedUserId: (v: number | null) => void;
  // Signals
  priority: Priority;
  setPriority: (v: Priority) => void;
  dueDate: string;
  setDueDate: (v: string) => void;
  blockedReason?: string;
  setBlockedReason?: (v: string) => void;
  // Board-type extras (CRM deal, sprint, links, docs, template) from PropertiesPanel
  extra?: React.ReactNode;
  // Recording log
  history?: React.ComponentProps<typeof HistoryLog>;
  // Keys
  dirty: boolean;
  onSave?: () => void;
  onArchive?: () => void;
  onClose: () => void;
}

// Right rail of the open card ("spec sheet"): amber readout, channel selector,
// the assignee, signals, recording log and the transport keys
// (design/card-open-dark-graphite.png).
export function CaseRail({
  isReadOnly,
  boardType,
  ticketKey,
  sectionEnteredAt,
  createdAt,
  doneAt,
  sections,
  backlogSectionId,
  sectionId,
  setSectionId,
  sectionCounts,
  wipLimits,
  users,
  assignedUserId,
  setAssignedUserId,
  priority,
  setPriority,
  dueDate,
  setDueDate,
  blockedReason,
  setBlockedReason,
  extra,
  history,
  dirty,
  onSave,
  onArchive,
  onClose,
}: CaseRailProps) {
  const [pickOpen, setPickOpen] = useState(false);
  const pickRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!pickOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!pickRef.current?.contains(e.target as Node)) setPickOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [pickOpen]);

  const channels = sections.filter((s) => s.id !== backlogSectionId);
  const inChannel = daysSince(sectionEnteredAt);
  const age = daysSince(createdAt);
  const due = dueDate ? dueIn(dueDate) : null;
  const assignee = users.find((u) => u.id === assignedUserId) ?? null;
  const jammed = !!blockedReason?.trim();

  return (
    <div className="mtx-rail-in">
      <section className="mtx-panel">
        <div className="ph">
          <span>Deck readout</span>
          <span>{ticketKey}</span>
        </div>
        <div className="mtx-vfd">
          <div>
            <span>{boardType === "crm" ? "In stage" : "In channel"}</span>
            <b>
              {inChannel ?? "—"}
              {inChannel != null && <small>d</small>}
            </b>
          </div>
          <div>
            <span>Age</span>
            <b>
              {age ?? "—"}
              {age != null && <small>d</small>}
            </b>
          </div>
          <div>
            <span>Due</span>
            <b className={due != null && due < 0 && !doneAt ? "r" : undefined}>
              {doneAt ? "✓" : due == null ? "—" : due > 0 ? `+${due}` : due}
              {due != null && !doneAt && <small>d</small>}
            </b>
          </div>
        </div>
      </section>

      <section className="mtx-panel">
        <div className="ph">
          <span>{boardType === "crm" ? "Pipeline" : "Channel"}</span>
          <span>{channels.length} ch</span>
        </div>
        <div className="mtx-chan" role="radiogroup" aria-label="Column">
          {channels.map((s, i) => {
            const n = sectionCounts?.[s.id];
            const lim = wipLimits?.[s.id];
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={s.id === sectionId}
                disabled={isReadOnly}
                onClick={() => setSectionId(s.id)}
              >
                <i aria-hidden />
                CH{i + 1} · {s.name}
                {n != null && (
                  <span>
                    {n}
                    {lim ? `/${lim}` : ""}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mtx-panel">
        <div className="ph">
          <span>Playing</span>
          <span>assignee</span>
        </div>
        <div className="mtx-who-wrap" ref={pickRef}>
          <button
            type="button"
            className={`mtx-who${assignee ? "" : " empty"}`}
            disabled={isReadOnly}
            onClick={() => setPickOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={pickOpen}
          >
            {assignee ? <Avatar user={assignee} /> : <i aria-hidden />}
            <span className="nm">
              {assignee ? assignee.name : "Open · nobody playing"}
            </span>
            {!isReadOnly && (
              <span className="sw">{assignee ? "swap" : "assign"}</span>
            )}
          </button>
          {pickOpen && (
            <div className="mtx-pick" role="listbox" aria-label="Assignee">
              <button
                type="button"
                role="option"
                aria-selected={assignedUserId == null}
                onClick={() => {
                  setAssignedUserId(null);
                  setPickOpen(false);
                }}
              >
                <i aria-hidden className="none" />
                Unassigned
              </button>
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  role="option"
                  aria-selected={u.id === assignedUserId}
                  onClick={() => {
                    setAssignedUserId(u.id);
                    setPickOpen(false);
                  }}
                >
                  <Avatar user={u} size={22} />
                  {u.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mtx-panel">
        <div className="ph">
          <span>Signals</span>
        </div>
        <div className="mtx-seg" role="radiogroup" aria-label="Priority">
          {(["low", "medium", "high"] as const).map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={priority === p}
              disabled={isReadOnly}
              onClick={() => setPriority(priority === p ? null : p)}
            >
              {p === "medium" ? "Med" : p}
            </button>
          ))}
        </div>
        <div className="mtx-row">
          <label
            className={`mtx-fld${due != null && due < 0 && !doneAt ? " late" : ""}`}
          >
            <small>Due</small>
            <input
              type="date"
              value={dueDate}
              disabled={isReadOnly}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>
        </div>
        {setBlockedReason && blockedReason !== undefined && (
          <label className={`mtx-jam${jammed ? " on" : ""}`}>
            <i aria-hidden />
            <input
              type="text"
              value={blockedReason}
              maxLength={160}
              disabled={isReadOnly}
              placeholder="Not jammed · flowing"
              aria-label="Jam reason"
              onChange={(e) => setBlockedReason(e.target.value)}
            />
            {jammed && !isReadOnly && (
              <button type="button" onClick={() => setBlockedReason("")}>
                Unjam
              </button>
            )}
          </label>
        )}
      </section>

      {extra && <div className="mtx-extra">{extra}</div>}

      {history && (
        <section className="mtx-panel">
          <div className="ph">
            <span>Recording log</span>
            <span>history</span>
          </div>
          <HistoryLog {...history} />
        </section>
      )}

      <div className="mtx-keys">
        <button
          type="button"
          className="mtx-ky x"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
        {onArchive && !isReadOnly && (
          <button type="button" className="mtx-ky" onClick={onArchive}>
            Archive
          </button>
        )}
        {onSave && !isReadOnly && (
          <button
            type="button"
            className="mtx-ky save"
            onClick={onSave}
            title={dirty ? "You have unsaved changes" : "All changes saved"}
          >
            <span className={`led${dirty ? " on" : ""}`} aria-hidden />
            Save
          </button>
        )}
      </div>
    </div>
  );
}
