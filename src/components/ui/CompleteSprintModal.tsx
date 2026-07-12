"use client";

import {
  faCircleCheck,
  faFlagCheckered,
} from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";
import Icon from "@/components/ui/Icon";
import type { CardInterface } from "@/interfaces/CardInterface";
import type { SprintInterface } from "@/interfaces/SprintInterface";
import { toNumber } from "@/lib/currency";

// Jira-style complete-sprint dialog: summarizes done vs not-done, then asks where the
// incomplete tickets should go (backlog / new sprint / an existing future sprint).
export function CompleteSprintModal({
  sprint,
  cards,
  futureSprints,
  onConfirm,
  onClose,
}: {
  sprint: SprintInterface;
  cards: CardInterface[];
  futureSprints: SprintInterface[];
  onConfirm: (data: {
    move_to: string;
    new_sprint_name?: string;
  }) => Promise<void>;
  onClose: () => void;
}) {
  const done = cards.filter((c) => c.done_at);
  const open = cards.filter((c) => !c.done_at);
  const donePts = done.reduce((s, c) => s + toNumber(c.story_points), 0);
  const openPts = open.reduce((s, c) => s + toNumber(c.story_points), 0);
  const pct = cards.length ? Math.round((done.length / cards.length) * 100) : 0;

  // 'backlog' | 'new' | '<future sprint id>'
  const [moveTo, setMoveTo] = useState<string>("backlog");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (busy) return;
    if (moveTo === "new" && !newName.trim()) return;
    setBusy(true);
    try {
      await onConfirm({
        move_to: moveTo,
        new_sprint_name: moveTo === "new" ? newName.trim() : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const Radio = ({ value, label }: { value: string; label: string }) => (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="radio"
        name="move_to"
        checked={moveTo === value}
        onChange={() => setMoveTo(value)}
      />
      <span
        className="cf-mono"
        style={{ fontSize: "12px", color: "var(--cf-text)" }}
      >
        {label}
      </span>
    </label>
  );

  return (
    <div className="aero-menu rounded-2xl p-6 w-[90vw] max-w-md flex flex-col gap-5">
      <div
        className="flex items-center gap-2 pb-3"
        style={{ borderBottom: "1px solid var(--cf-edge)" }}
      >
        <Icon icon={faFlagCheckered} style={{ color: "var(--cf-phosphor)" }} />
        <p
          className="cf-label uppercase tracking-[0.25em] font-bold"
          style={{ fontSize: "10px", color: "var(--cf-text-muted)" }}
        >
          Complete {sprint.name}
        </p>
      </div>

      {/* Summary */}
      <div className="flex gap-3">
        <div
          className="flex-1 glass-panel rounded-lg px-3 py-3 flex flex-col items-center gap-1"
          style={{ borderTop: "2px solid var(--cf-phosphor)" }}
        >
          <p
            className="font-bold tabular-nums leading-none"
            style={{ fontSize: "26px", color: "var(--cf-phosphor)" }}
          >
            {done.length}
          </p>
          <p
            className="cf-mono uppercase tracking-widest text-center"
            style={{ fontSize: "8px", color: "var(--cf-text-muted)" }}
          >
            Done · {donePts} pts
          </p>
        </div>
        <div
          className="flex-1 glass-panel rounded-lg px-3 py-3 flex flex-col items-center gap-1"
          style={{ borderTop: "2px solid var(--cf-amber)" }}
        >
          <p
            className="font-bold tabular-nums leading-none"
            style={{ fontSize: "26px", color: "var(--cf-amber)" }}
          >
            {open.length}
          </p>
          <p
            className="cf-mono uppercase tracking-widest text-center"
            style={{ fontSize: "8px", color: "var(--cf-text-muted)" }}
          >
            Open · {openPts} pts
          </p>
        </div>
        <div
          className="flex-1 glass-panel rounded-lg px-3 py-3 flex flex-col items-center gap-1"
          style={{ borderTop: "2px solid var(--cf-cyan)" }}
        >
          <p
            className="font-bold tabular-nums leading-none"
            style={{ fontSize: "26px", color: "var(--cf-cyan)" }}
          >
            {pct}%
          </p>
          <p
            className="cf-mono uppercase tracking-widest text-center"
            style={{ fontSize: "8px", color: "var(--cf-text-muted)" }}
          >
            Complete
          </p>
        </div>
      </div>

      {/* Where do incomplete tickets go */}
      {open.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p
            className="cf-mono uppercase tracking-widest font-bold"
            style={{ fontSize: "9px", color: "var(--cf-text-muted)" }}
          >
            Move {open.length} incomplete ticket{open.length !== 1 ? "s" : ""}{" "}
            to
          </p>
          <Radio value="backlog" label="Backlog" />
          <Radio value="new" label="A new sprint" />
          {moveTo === "new" && (
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New sprint name…"
              className="glass-input cf-lcd text-sm ml-6"
              style={{ maxWidth: 260 }}
            />
          )}
          {futureSprints.map((fs) => (
            <Radio key={fs.id} value={String(fs.id)} label={fs.name} />
          ))}
        </div>
      ) : (
        <p
          className="cf-mono flex items-center gap-2"
          style={{ fontSize: "11px", color: "var(--cf-phosphor)" }}
        >
          <Icon icon={faCircleCheck} style={{ fontSize: 14 }} /> Every ticket is
          done — nice work.
        </p>
      )}

      <div
        className="flex justify-end gap-3 pt-2"
        style={{ borderTop: "1px solid var(--cf-edge)" }}
      >
        <button
          onClick={onClose}
          className="aero-btn aero-btn--ghost text-[10px] uppercase tracking-widest font-bold px-4 py-2 cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={confirm}
          disabled={busy || (moveTo === "new" && !newName.trim())}
          className="aero-btn aero-btn--cyan text-[10px] uppercase tracking-widest font-bold px-5 py-2 cursor-pointer disabled:opacity-50"
        >
          {busy ? "…" : "Complete sprint"}
        </button>
      </div>
    </div>
  );
}
