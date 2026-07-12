"use client";

import { useState } from "react";
import type { BoardType } from "@/interfaces/BoardInterface";
import type {
  ProjectBoard,
  ProjectInterface,
} from "@/interfaces/ProjectInterface";
import { BoardTypeFields } from "./BoardTypeFields";

// Payload produced by the board create/edit form. `id` is only set in edit mode.
// `type`/`currency` are only meaningful when creating (edit type lives in Settings).
export interface BoardFormData {
  id?: number;
  name: string;
  description: string;
  project_id: number;
  type?: BoardType;
  currency?: string;
}

// Board create/edit form. Shared by the project page (new + edit, with project-move)
// and the board page header (settings). The project-move <select> only appears when
// more than one owned project is passed.
export function BoardFormModal({
  board,
  projectId,
  projectColor,
  ownedProjects,
  onSave,
  onDelete,
  onClose,
}: {
  board: ProjectBoard | null;
  projectId: number;
  projectColor: string;
  ownedProjects: ProjectInterface[];
  onSave: (d: BoardFormData) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(board?.name ?? "");
  const [description, setDescription] = useState(board?.description ?? "");
  const [targetProjectId, setTargetProjectId] = useState<number>(projectId);
  const [boardType, setBoardType] = useState<BoardType>("kanban");
  const [currency, setCurrency] = useState("BRL");
  const [loading, setLoading] = useState(false);

  const isNew = !board;
  const targetProject = ownedProjects.find((p) => p.id === targetProjectId);
  const accentColor = targetProject?.color ?? projectColor;
  const moved = !isNew && targetProjectId !== projectId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await onSave({
      id: board?.id,
      name: name.trim(),
      description: description.trim() || "",
      project_id: targetProjectId,
      // Type/currency are only sent for new boards; existing boards change type in Settings.
      ...(isNew ? { type: boardType, currency } : {}),
    });
    setLoading(false);
  }

  return (
    <div className="aero-menu rounded-2xl p-7 w-[92vw] max-w-lg flex flex-col gap-6 relative">
      <span
        className="cf-screw"
        style={{ position: "absolute", top: 8, left: 8 }}
      />
      <span
        className="cf-screw"
        style={{ position: "absolute", top: 8, right: 8 }}
      />
      <span
        className="cf-screw"
        style={{ position: "absolute", bottom: 8, left: 8 }}
      />
      <span
        className="cf-screw"
        style={{ position: "absolute", bottom: 8, right: 8 }}
      />
      <div
        style={{ borderBottom: "1px solid var(--cf-edge, #4a463f)" }}
        className="pb-3.5 flex items-center gap-2.5"
      >
        <span
          className="cf-led"
          style={{
            backgroundColor: accentColor,
            boxShadow: `0 0 8px ${accentColor}`,
            width: 9,
            height: 9,
          }}
        />
        <p
          style={{ fontSize: "13px", color: "var(--cf-text-muted, #a39d8c)" }}
          className="cf-label uppercase tracking-[0.25em] font-bold"
        >
          {isNew ? "New Board" : "Board Settings"}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label
            style={{ fontSize: "12px", color: "var(--cf-text-muted, #a39d8c)" }}
            className="cf-label uppercase tracking-widest font-bold"
          >
            Name
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Board name…"
            className="glass-input cf-lcd text-base"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            style={{ fontSize: "12px", color: "var(--cf-text-muted, #a39d8c)" }}
            className="cf-label uppercase tracking-widest font-bold"
          >
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional…"
            rows={3}
            className="glass-input cf-lcd text-base resize-none"
          />
        </div>
        {isNew && (
          <BoardTypeFields
            type={boardType}
            currency={currency}
            onTypeChange={setBoardType}
            onCurrencyChange={setCurrency}
          />
        )}
        {ownedProjects.length > 1 && (
          <div className="flex flex-col gap-1.5">
            <label
              style={{
                fontSize: "12px",
                color: "var(--cf-text-muted, #a39d8c)",
              }}
              className="cf-label uppercase tracking-widest font-bold"
            >
              Project
            </label>
            <div className="flex items-center gap-2">
              <span
                className="cf-led flex-shrink-0"
                style={{
                  backgroundColor: accentColor,
                  boxShadow: `0 0 8px ${accentColor}`,
                  width: 9,
                  height: 9,
                }}
              />
              <select
                value={targetProjectId}
                onChange={(e) => setTargetProjectId(Number(e.target.value))}
                style={{ fontSize: "15px" }}
                className="glass-input cf-lcd flex-1 cursor-pointer"
              >
                {ownedProjects.map((p) => (
                  <option key={p.id} value={p.id} className="text-black">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            {moved && (
              <p
                style={{ fontSize: "11px", color: "var(--cf-amber, #ffb000)" }}
                className="cf-mono uppercase tracking-widest"
              >
                ↳ Will move to "{targetProject?.name}"
              </p>
            )}
          </div>
        )}
        <div
          className="flex items-center justify-between pt-3"
          style={{ borderTop: "1px solid var(--cf-edge, #4a463f)" }}
        >
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="aero-btn aero-btn--magenta uppercase tracking-widest font-bold px-5 py-2.5 text-[12px]"
            >
              Delete
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="aero-btn aero-btn--ghost uppercase tracking-widest font-bold px-5 py-2.5 text-[12px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="aero-btn aero-btn--cyan uppercase tracking-widest font-bold px-6 py-2.5 text-[12px]"
            >
              {loading ? "…" : moved ? "Move & Save" : "Save"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
