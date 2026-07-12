"use client";

import type { ChecklistItem } from "@/interfaces/CardInterface";

interface ChecklistSectionProps {
  checklistItems: ChecklistItem[];
  newChecklistText: string;
  setNewChecklistText: (v: string) => void;
  handleAddChecklistItem: () => void;
  handleToggleItem: (item: ChecklistItem) => void;
  handleDeleteItem: (item: ChecklistItem) => void;
  doneCount: number;
  isReadOnly: boolean;
}

const LCD_SEGMENTS = 12;

// Presentational checklist tab/section of the card editor — state and mutations
// live in useCardChecklist (called from CardEdit) and arrive via props.
export function ChecklistSection({
  checklistItems,
  newChecklistText,
  setNewChecklistText,
  handleAddChecklistItem,
  handleToggleItem,
  handleDeleteItem,
  doneCount,
  isReadOnly,
}: ChecklistSectionProps) {
  const litSegments =
    checklistItems.length > 0
      ? Math.round((doneCount / checklistItems.length) * LCD_SEGMENTS)
      : 0;

  return (
    <div className="flex flex-col gap-1">
      {/* Segmented LCD progress bar — completion at a glance */}
      {checklistItems.length > 0 && (
        <div className="flex gap-[3px] mb-2">
          {Array.from({ length: LCD_SEGMENTS }, (_, i) => {
            const on = i < litSegments;
            return (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length decorative segments, index IS the identity
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

      {checklistItems.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-2.5 group rounded-md px-1 py-1.5 hover:bg-white/[0.02]"
        >
          {/* key changes on toggle → React remounts → check-pop replays */}
          <div
            key={`${item.id}-${item.is_done}`}
            className="check-pop flex-shrink-0"
          >
            <input
              type="checkbox"
              checked={item.is_done}
              disabled={isReadOnly}
              onChange={() => handleToggleItem(item)}
              className="cursor-pointer accent-[var(--cf-phosphor)] w-4 h-4 disabled:cursor-not-allowed"
            />
          </div>
          <span
            style={{
              color: item.is_done ? "var(--cf-text-dim)" : "var(--cf-text)",
              textDecoration: item.is_done ? "line-through" : "none",
              fontSize: "13px",
              flex: 1,
              transition: "color 200ms ease, text-decoration-color 200ms ease",
            }}
          >
            {item.text}
          </span>
          {!isReadOnly && (
            <button
              onClick={() => handleDeleteItem(item)}
              style={{ fontSize: "10px", color: "var(--cf-text-muted)" }}
              className="opacity-0 group-hover:opacity-100 hover:text-[var(--cf-red)] cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      ))}

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
            value={newChecklistText}
            onChange={(e) => setNewChecklistText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddChecklistItem();
            }}
            placeholder={
              checklistItems.length === 0
                ? "Add an item… press Enter to keep adding"
                : "Add item…"
            }
            style={{
              fontSize: "13px",
              color: "var(--cf-text)",
              caretColor: "var(--cf-phosphor)",
            }}
            className="flex-1 bg-transparent focus:outline-none placeholder:text-[var(--cf-text-dim)]"
          />
          {newChecklistText.trim() !== "" && (
            <button
              onClick={handleAddChecklistItem}
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
