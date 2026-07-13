"use client";

import type { Subtask } from "@/hooks/useCardSubtasks";

interface SubtasksSectionProps {
  subtasks: Subtask[];
  loadingSubtasks: boolean;
  newSubtaskName: string;
  setNewSubtaskName: (v: string) => void;
  handleAddSubtask: () => void;
  handleMarkDone: (s: Subtask) => void;
  isSubtaskDone: (s: Subtask) => boolean;
  doneSubtasks: number;
  isReadOnly: boolean;
  // Open a subtask as its own card (subtasks are first-class board cards).
  onOpenSubtask: (s: Subtask) => void;
  // AI "Break down" — generates subtasks from the card and creates them.
  aiBreakdown: () => void;
  aiBreaking: boolean;
  aiRationale: string | null;
  aiError: string | null;
  canAiBreakdown: boolean;
}

const LCD_SEGMENTS = 12;
const initial = (name?: string | null) =>
  (name ?? "?").trim().charAt(0).toUpperCase() || "?";
const shortDate = (d: string) =>
  new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });

// Subtasks are real board cards under this epic. The list mirrors the checklist's clean
// look (LCD progress + hover rows + ghost add-row) but each row is richer: a done tick,
// ticket key, name that opens the card, and due / assignee on the right.
export function SubtasksSection({
  subtasks,
  loadingSubtasks,
  newSubtaskName,
  setNewSubtaskName,
  handleAddSubtask,
  handleMarkDone,
  isSubtaskDone,
  doneSubtasks,
  isReadOnly,
  onOpenSubtask,
  aiBreakdown,
  aiBreaking,
  aiRationale,
  aiError,
  canAiBreakdown,
}: SubtasksSectionProps) {
  const litSegments =
    subtasks.length > 0
      ? Math.round((doneSubtasks / subtasks.length) * LCD_SEGMENTS)
      : 0;

  return (
    <div className="flex flex-col gap-1">
      {/* AI break-down affordance */}
      {!isReadOnly && canAiBreakdown && (
        <div className="flex flex-col gap-1 mb-1">
          <button
            type="button"
            onClick={aiBreakdown}
            disabled={aiBreaking}
            className="ai-btn self-start"
          >
            {aiBreaking ? "Breaking down…" : "Break down"}
          </button>
          {aiRationale && (
            <p style={{ fontSize: "11px", color: "var(--cf-text-muted)" }} className="cf-mono">
              {aiRationale}
            </p>
          )}
          {aiError && (
            <p style={{ fontSize: "11px", color: "var(--cf-amber)" }} className="cf-mono">
              {aiError}
            </p>
          )}
        </div>
      )}

      {/* Segmented LCD progress bar */}
      {subtasks.length > 0 && (
        <div className="flex gap-[3px] mb-2">
          {Array.from({ length: LCD_SEGMENTS }, (_, i) => {
            const on = i < litSegments;
            return (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length decorative segments
                key={i}
                className="flex-1 rounded-[1px] transition-colors duration-300"
                style={{
                  height: 5,
                  background: on ? "var(--cf-phosphor)" : "rgba(0,0,0,0.4)",
                  boxShadow: on
                    ? "0 0 5px color-mix(in srgb, var(--cf-phosphor) 60%, transparent)"
                    : "inset 0 1px 2px rgba(0,0,0,0.5)",
                }}
              />
            );
          })}
        </div>
      )}

      {loadingSubtasks && (
        <p style={{ fontSize: "12px", color: "var(--cf-text-muted)" }} className="cf-mono text-center py-3">
          Loading…
        </p>
      )}
      {!loadingSubtasks && subtasks.length === 0 && (
        <p style={{ fontSize: "12px", color: "var(--cf-text-muted)" }} className="cf-mono text-center py-3">
          No subtasks yet.
        </p>
      )}

      {subtasks.map((s) => {
        const done = isSubtaskDone(s);
        return (
          <div
            key={s.id}
            className="flex items-center gap-2.5 group rounded-md px-1 py-1.5 hover:bg-white/[0.02]"
          >
            <div key={`${s.id}-${done}`} className="check-pop flex-shrink-0">
              <input
                type="checkbox"
                checked={done}
                disabled={isReadOnly || done}
                onChange={() => handleMarkDone(s)}
                title={done ? "Done" : "Mark done"}
                className="cursor-pointer accent-[var(--cf-phosphor)] w-4 h-4 disabled:cursor-default"
              />
            </div>

            {s.ticket_key && (
              <span
                className="cf-mono flex-shrink-0"
                style={{ fontSize: "9px", color: "var(--cf-text-muted)", letterSpacing: "0.06em" }}
              >
                {s.ticket_key}
              </span>
            )}

            <button
              type="button"
              onClick={() => onOpenSubtask(s)}
              className="flex-1 min-w-0 text-left truncate group-hover:underline"
              style={{
                fontSize: "13px",
                color: done ? "var(--cf-text-dim)" : "var(--cf-text)",
                textDecoration: done ? "line-through" : "none",
                transition: "color 200ms ease",
              }}
            >
              {s.name}
            </button>

            {s.due_date && (
              <span
                className="cf-mono flex-shrink-0"
                style={{ fontSize: "10px", color: "var(--cf-text-muted)" }}
              >
                {shortDate(s.due_date)}
              </span>
            )}

            {s.assigned_user && (
              <span
                className="flex-shrink-0 inline-flex items-center justify-center rounded-full font-bold"
                title={s.assigned_user.name}
                style={{
                  width: 18,
                  height: 18,
                  fontSize: "9px",
                  background: "var(--cf-edge)",
                  color: "var(--cf-text)",
                }}
              >
                {initial(s.assigned_user.name)}
              </span>
            )}
          </div>
        );
      })}

      {/* Inline ghost add-row — Enter keeps appending */}
      {!isReadOnly && (
        <div className="flex items-center gap-2.5 px-1 py-1.5">
          <span
            className="flex-shrink-0 w-4 h-4 rounded-[3px] flex items-center justify-center"
            style={{
              border: "1px dashed var(--cf-edge)",
              color: "var(--cf-text-dim)",
              fontSize: "11px",
              lineHeight: 1,
            }}
          >
            +
          </span>
          <input
            value={newSubtaskName}
            onChange={(e) => setNewSubtaskName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddSubtask();
            }}
            placeholder={
              subtasks.length === 0
                ? "Add a subtask… press Enter to keep adding"
                : "Add subtask…"
            }
            style={{
              fontSize: "13px",
              color: "var(--cf-text)",
              caretColor: "var(--cf-phosphor)",
            }}
            className="flex-1 bg-transparent focus:outline-none placeholder:text-[var(--cf-text-dim)]"
          />
          {newSubtaskName.trim() !== "" && (
            <button
              onClick={handleAddSubtask}
              style={{ fontSize: "10px" }}
              className="aero-btn aero-btn--cyan px-2.5 py-0.5 font-bold cursor-pointer flex-shrink-0"
            >
              Add
            </button>
          )}
        </div>
      )}
    </div>
  );
}
