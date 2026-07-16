"use client";

import {
  faCheck,
  faLock,
  faPen,
  faPlus,
  faTrash,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";
import Icon from "@/components/ui/Icon";
import type { BoardInterface } from "@/interfaces/BoardInterface";
import type { TagInterface } from "@/interfaces/TagInterface";
import { createTag, deleteTag, updateTag } from "@/lib/api";
import { type Feedback, FeedbackBanner, PanelHeading } from "./shared";

const TAG_PALETTE = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

function Swatches({
  value,
  onPick,
}: {
  value: string;
  onPick: (c: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TAG_PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onPick(c)}
          aria-label={`Pick ${c}`}
          className="rounded-full cursor-pointer transition-transform hover:scale-110"
          style={{
            width: 20,
            height: 20,
            background: c,
            border:
              value === c
                ? "2px solid var(--cf-text)"
                : "2px solid transparent",
            boxShadow: value === c ? `0 0 8px ${c}` : undefined,
          }}
        />
      ))}
    </div>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="cf-mono uppercase"
      style={{
        fontSize: "9px",
        letterSpacing: "0.18em",
        color: "var(--cf-text-dim)",
      }}
    >
      {children}
    </span>
  );
}

interface Props {
  board: BoardInterface;
  onChange: (tags: TagInterface[]) => void;
}

export default function TagsTab({ board, onChange }: Props) {
  const [tags, setTags] = useState<TagInterface[]>(board.tags ?? []);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(TAG_PALETTE[0]);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState(TAG_PALETTE[0]);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const channelTags = tags.filter((t) => t.kind === "channel");
  const customTags = tags.filter((t) => t.kind !== "channel");

  const sync = (next: TagInterface[]) => {
    setTags(next);
    onChange(next);
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setFeedback(null);
    try {
      const saved: TagInterface = await createTag(board.id, {
        name,
        color: newColor,
      });
      sync([...tags, saved]);
      setNewName("");
      setNewColor(TAG_PALETTE[0]);
    } catch {
      setFeedback({ type: "error", message: "Could not create tag." });
    }
  };

  const startEdit = (tag: TagInterface) => {
    setEditId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  const handleSaveEdit = async () => {
    if (editId == null) return;
    const editing = tags.find((t) => t.id === editId);
    const isChannel = editing?.kind === "channel";
    // Channel tags have locked names — only the colour is editable.
    const name = isChannel ? (editing?.name ?? "") : editName.trim();
    if (!name) return;
    const prev = tags;
    const next = tags.map((t) =>
      t.id === editId ? { ...t, name, color: editColor } : t,
    );
    sync(next);
    setEditId(null);
    try {
      await updateTag(
        board.id,
        editId,
        isChannel ? { color: editColor } : { name, color: editColor },
      );
    } catch {
      sync(prev);
      setFeedback({ type: "error", message: "Could not update tag." });
    }
  };

  const handleDelete = async (id: number) => {
    const prev = tags;
    sync(tags.filter((t) => t.id !== id));
    setConfirmId(null);
    try {
      await deleteTag(board.id, id);
    } catch {
      sync(prev);
      setFeedback({ type: "error", message: "Could not delete tag." });
    }
  };

  const renderTag = (tag: TagInterface) => {
    const isChannel = tag.kind === "channel";
    return (
      <div
        key={tag.id}
        className="flex flex-col gap-2 rounded-xl px-3 py-2.5"
        style={{ background: "#211f1b", border: "1px solid #38352e" }}
      >
        {editId === tag.id ? (
          <>
            <div className="flex items-center gap-2">
              <span
                className="rounded-full flex-shrink-0"
                style={{
                  width: 12,
                  height: 12,
                  background: editColor,
                  boxShadow: `0 0 6px ${editColor}`,
                }}
              />
              {isChannel ? (
                <span
                  className="flex-1 truncate font-bold inline-flex items-center gap-1.5"
                  style={{ fontSize: "12px", color: "var(--cf-text)" }}
                >
                  {tag.name}
                  <Icon
                    icon={faLock}
                    style={{ fontSize: "9px", color: "var(--cf-text-dim)" }}
                  />
                </span>
              ) : (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit();
                    if (e.key === "Escape") setEditId(null);
                  }}
                  className="glass-input cf-lcd text-sm flex-1 py-1"
                />
              )}
              <button
                onClick={handleSaveEdit}
                aria-label="Save tag"
                className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer"
                style={{
                  background: "rgba(154,166,126,0.16)",
                  border: "1px solid rgba(154,166,126,0.5)",
                  color: "var(--cf-phosphor)",
                }}
              >
                <Icon icon={faCheck} style={{ fontSize: "10px" }} />
              </button>
              <button
                onClick={() => setEditId(null)}
                aria-label="Cancel"
                className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer"
                style={{
                  border: "1px solid var(--cf-edge)",
                  color: "var(--cf-text-muted)",
                }}
              >
                <Icon icon={faXmark} style={{ fontSize: "10px" }} />
              </button>
            </div>
            <Swatches value={editColor} onPick={setEditColor} />
          </>
        ) : (
          <div className="flex items-center gap-3">
            <span
              className="rounded-full flex-shrink-0"
              style={{
                width: 12,
                height: 12,
                background: tag.color,
                boxShadow: `0 0 6px ${tag.color}`,
              }}
            />
            <span
              className="flex-1 truncate font-bold inline-flex items-center gap-1.5"
              style={{ fontSize: "12px", color: "var(--cf-text)" }}
            >
              {tag.name}
              {isChannel && (
                <Icon
                  icon={faLock}
                  title="Built-in channel — name locked"
                  style={{ fontSize: "9px", color: "var(--cf-text-dim)" }}
                />
              )}
            </span>
            {confirmId === tag.id ? (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span
                  className="uppercase"
                  style={{
                    fontSize: "9px",
                    letterSpacing: "0.1em",
                    color: "var(--cf-red)",
                  }}
                >
                  Delete?
                </span>
                <button
                  onClick={() => handleDelete(tag.id)}
                  aria-label="Confirm"
                  className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer"
                  style={{
                    background: "rgba(255,90,77,0.16)",
                    border: "1px solid rgba(255,90,77,0.55)",
                    color: "var(--cf-red)",
                  }}
                >
                  <Icon icon={faCheck} style={{ fontSize: "10px" }} />
                </button>
                <button
                  onClick={() => setConfirmId(null)}
                  aria-label="Cancel"
                  className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer"
                  style={{
                    border: "1px solid var(--cf-edge)",
                    color: "var(--cf-text-muted)",
                  }}
                >
                  <Icon icon={faXmark} style={{ fontSize: "10px" }} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => startEdit(tag)}
                  aria-label={`Edit ${tag.name}`}
                  title={isChannel ? "Recolour" : "Edit"}
                  className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer"
                  style={{ color: "var(--cf-text-dim)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--cf-cyan)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--cf-text-dim)")
                  }
                >
                  <Icon icon={faPen} style={{ fontSize: "10px" }} />
                </button>
                {!isChannel && (
                  <button
                    onClick={() => setConfirmId(tag.id)}
                    aria-label={`Delete ${tag.name}`}
                    title="Delete"
                    className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer"
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
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="glass-panel p-6 flex flex-col gap-5">
      <PanelHeading>Tags</PanelHeading>
      <FeedbackBanner feedback={feedback} />

      {tags.length === 0 && (
        <p
          className="cf-mono text-center py-3"
          style={{ fontSize: "10px", color: "var(--cf-text-dim)" }}
        >
          No tags yet.
        </p>
      )}

      {channelTags.length > 0 && (
        <div className="flex flex-col gap-2">
          <GroupLabel>Channel · built-in</GroupLabel>
          {channelTags.map(renderTag)}
        </div>
      )}

      {customTags.length > 0 && (
        <div className="flex flex-col gap-2">
          <GroupLabel>Custom</GroupLabel>
          {customTags.map(renderTag)}
        </div>
      )}

      {/* Create tag */}
      <div
        className="flex flex-col gap-3 pt-3 border-t"
        style={{ borderColor: "var(--cf-edge)" }}
      >
        <label className="cf-label">New custom tag</label>
        <div className="flex items-center gap-2">
          <span
            className="rounded-full flex-shrink-0"
            style={{
              width: 12,
              height: 12,
              background: newColor,
              boxShadow: `0 0 6px ${newColor}`,
            }}
          />
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            maxLength={50}
            placeholder="Tag name…"
            className="glass-input cf-lcd text-sm flex-1"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="aero-btn aero-btn--cyan px-4 py-2 inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <Icon icon={faPlus} style={{ fontSize: "10px" }} /> Add
          </button>
        </div>
        <Swatches value={newColor} onPick={setNewColor} />
      </div>
    </div>
  );
}
