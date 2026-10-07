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
  // Number the next channel would get (sections + 1).
  channelNo?: number;
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
  channelNo = 1,
}: AddSectionColumnProps) {
  const cancel = () => {
    setIsAddingSection(false);
    setNewSectionName("");
    setSectionError("");
  };
  // Empty rack slot at the end of the board: "CHn + Add channel".
  return isAddingSection ? (
    <div className="mt-add-channel" style={{ cursor: "default" }}>
      <b>CH{channelNo}</b>
      <input
        // biome-ignore lint/a11y/noAutofocus: inline editor opens focused
        autoFocus
        value={newSectionName}
        onChange={(e) => {
          setNewSectionName(e.target.value);
          if (sectionError) setSectionError("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") onAddSection();
          if (e.key === "Escape") cancel();
        }}
        placeholder="Channel name…"
        aria-label="New channel name"
      />
      {sectionError && (
        <span
          style={{
            color: "var(--cf-red)",
            letterSpacing: "0.04em",
            textTransform: "none",
          }}
        >
          {sectionError}
        </span>
      )}
      <span style={{ display: "flex", gap: 6, width: "100%" }}>
        <button
          type="button"
          className="mt-key"
          style={{ flex: 1, height: 26 }}
          onClick={onAddSection}
        >
          Add
        </button>
        <button
          type="button"
          className="mt-key ghost"
          style={{ flex: 1, height: 26 }}
          onClick={cancel}
        >
          Cancel
        </button>
      </span>
    </div>
  ) : (
    <button
      type="button"
      className="mt-add-channel"
      onClick={() => setIsAddingSection(true)}
    >
      <b>CH{channelNo}</b>+ Add channel
    </button>
  );
}
