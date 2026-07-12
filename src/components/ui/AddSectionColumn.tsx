"use client";

import type { Dispatch, SetStateAction } from "react";

interface AddSectionColumnProps {
  isAddingSection: boolean;
  setIsAddingSection: Dispatch<SetStateAction<boolean>>;
  newSectionName: string;
  setNewSectionName: Dispatch<SetStateAction<string>>;
  sectionError: string;
  setSectionError: Dispatch<SetStateAction<string>>;
  onAddSection: () => void;
}

// The "+ Add section" pseudo-column at the end of the kanban board: a dashed
// button that flips into an inline name editor. State lives in the parent so
// the keyboard shortcuts can treat an in-progress add as "board busy".
export function AddSectionColumn({
  isAddingSection,
  setIsAddingSection,
  newSectionName,
  setNewSectionName,
  sectionError,
  setSectionError,
  onAddSection,
}: AddSectionColumnProps) {
  return (
    <div className="flex flex-col w-64 flex-shrink-0">
      {isAddingSection ? (
        <div className="flex flex-col gap-2">
          <input
            autoFocus
            value={newSectionName}
            onChange={(e) => {
              setNewSectionName(e.target.value);
              if (sectionError) setSectionError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") onAddSection();
              if (e.key === "Escape") {
                setIsAddingSection(false);
                setNewSectionName("");
                setSectionError("");
              }
            }}
            placeholder="Section name..."
            className="glass-input cf-mono text-xs uppercase tracking-widest px-3 py-2 w-full"
          />
          {sectionError && (
            <p
              className="cf-mono text-[10px]"
              style={{ color: "var(--cf-red)" }}
            >
              {sectionError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={onAddSection}
              className="aero-btn aero-btn--cyan flex-1 text-xs uppercase tracking-widest font-bold py-1.5 cursor-pointer"
            >
              Add
            </button>
            <button
              onClick={() => {
                setIsAddingSection(false);
                setNewSectionName("");
                setSectionError("");
              }}
              className="aero-btn aero-btn--ghost flex-1 text-xs uppercase tracking-widest py-1.5 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAddingSection(true)}
          style={{
            borderColor: "var(--cf-edge)",
            color: "var(--cf-text-muted)",
          }}
          className="cf-mono flex items-center justify-center gap-2 text-xs uppercase tracking-widest border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer w-full transition-colors hover:opacity-100"
        >
          <span className="text-lg leading-none">+</span> Add section
        </button>
      )}
    </div>
  );
}
