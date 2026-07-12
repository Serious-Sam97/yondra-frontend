"use client";

import type { Subtask } from "@/hooks/useCardSubtasks";

interface SubtasksSectionProps {
  subtasks: Subtask[];
  loadingSubtasks: boolean;
  newSubtaskName: string;
  setNewSubtaskName: (v: string) => void;
  handleAddSubtask: () => void;
  handleToggleSubtask: (s: Subtask) => void;
  doneSubtasks: number;
  isReadOnly: boolean;
}

// Presentational subtasks tab/section of the card editor — state and mutations
// live in useCardSubtasks (called from CardEdit) and arrive via props.
export function SubtasksSection({
  subtasks,
  loadingSubtasks,
  newSubtaskName,
  setNewSubtaskName,
  handleAddSubtask,
  handleToggleSubtask,
  doneSubtasks,
  isReadOnly,
}: SubtasksSectionProps) {
  return (
    <div className="flex flex-col gap-2">
      {loadingSubtasks && (
        <p
          style={{ fontSize: "12px", color: "var(--cf-text-muted)" }}
          className="cf-mono text-center py-4"
        >
          Loading...
        </p>
      )}
      {!loadingSubtasks && subtasks.length === 0 && (
        <p
          style={{ fontSize: "12px", color: "var(--cf-text-muted)" }}
          className="cf-mono text-center py-4"
        >
          No subtasks yet.
        </p>
      )}
      {subtasks.map((s) => (
        <div key={s.id} className="flex items-center gap-2">
          <div key={`${s.id}-${s.is_done}`} className="check-pop flex-shrink-0">
            <input
              type="checkbox"
              checked={s.is_done}
              disabled={isReadOnly}
              onChange={() => handleToggleSubtask(s)}
              className="cursor-pointer accent-[var(--cf-phosphor)] w-4 h-4 disabled:cursor-not-allowed"
            />
          </div>
          <span
            style={{
              color: s.is_done ? "var(--cf-text-muted)" : "var(--cf-text)",
              textDecoration: s.is_done ? "line-through" : "none",
              fontSize: "13px",
              flex: 1,
              transition: "color 200ms ease",
            }}
          >
            {s.name}
          </span>
        </div>
      ))}

      {/* Progress bar */}
      {subtasks.length > 0 && (
        <div className="flex items-center gap-2 mt-1">
          <div
            className="flex-1 h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--cf-screen)" }}
          >
            <div
              style={{
                width: `${(doneSubtasks / subtasks.length) * 100}%`,
                backgroundColor: "var(--cf-phosphor)",
                boxShadow: "0 0 6px var(--cf-phosphor)",
              }}
              className="h-full rounded-full transition-all duration-300"
            />
          </div>
          <span
            style={{ fontSize: "10px", color: "var(--cf-text-muted)" }}
            className="cf-mono"
          >
            {doneSubtasks}/{subtasks.length}
          </span>
        </div>
      )}

      {/* Add subtask */}
      {!isReadOnly && (
        <div className="flex gap-2 mt-2">
          <input
            value={newSubtaskName}
            onChange={(e) => setNewSubtaskName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddSubtask();
            }}
            placeholder="Add subtask..."
            style={{ fontSize: "12px" }}
            className="glass-input flex-1 px-2 py-1.5"
          />
          <button
            onClick={handleAddSubtask}
            style={{ fontSize: "11px" }}
            className="aero-btn aero-btn--cyan px-3 py-1.5 font-bold cursor-pointer"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
