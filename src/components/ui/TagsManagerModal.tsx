"use client";

import type { Dispatch, SetStateAction } from "react";
import Modal from "@/components/shared/Modal";
import { TAG_PALETTE } from "@/hooks/useBoardTags";
import type { TagInterface } from "@/interfaces/TagInterface";

interface TagsManagerModalProps {
  tags: TagInterface[];
  isReadOnly: boolean;
  newTagName: string;
  setNewTagName: Dispatch<SetStateAction<string>>;
  newTagColor: string;
  setNewTagColor: Dispatch<SetStateAction<string>>;
  onCreateTag: () => void;
  onDeleteTag: (tagId: number) => void;
  onClose: () => void;
}

// Board tags modal: list/delete existing tags and create new ones from the
// fixed palette. Draft state lives in the parent so it survives close/reopen.
export function TagsManagerModal({
  tags,
  isReadOnly,
  newTagName,
  setNewTagName,
  newTagColor,
  setNewTagColor,
  onCreateTag,
  onDeleteTag,
  onClose,
}: TagsManagerModalProps) {
  return (
    <Modal onClose={onClose}>
      <div className="aero-menu p-6 w-[95vw] max-w-sm flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <p
            className="cf-mono text-xs uppercase tracking-widest"
            style={{ color: "var(--cf-phosphor)" }}
          >
            Board tags
          </p>
          <button
            onClick={onClose}
            className="cursor-pointer transition-colors"
            style={{ color: "var(--cf-text-muted)" }}
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
          {tags.length === 0 && (
            <p
              className="cf-mono text-xs text-center py-3"
              style={{ color: "var(--cf-text-muted)" }}
            >
              No tags yet. Create one below.
            </p>
          )}
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between rounded-lg px-3 py-2.5"
              style={{ background: "var(--cf-graphite)" }}
            >
              <div className="flex items-center gap-2">
                <div
                  style={{ backgroundColor: tag.color }}
                  className="w-3 h-3 rounded-full flex-shrink-0"
                />
                <span
                  style={{ color: tag.color }}
                  className="cf-mono text-sm font-bold uppercase tracking-wide"
                >
                  {tag.name}
                </span>
              </div>
              {!isReadOnly && (
                <button
                  onClick={() => onDeleteTag(tag.id)}
                  className="text-xs cursor-pointer transition-colors ml-2 hover:opacity-100"
                  style={{ color: "var(--cf-text-muted)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "var(--cf-red)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "var(--cf-text-muted)")
                  }
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {!isReadOnly && (
          <div
            className="flex flex-col gap-3 border-t pt-4"
            style={{ borderColor: "var(--cf-edge)" }}
          >
            <input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onCreateTag();
              }}
              placeholder="Tag name..."
              className="glass-input cf-mono text-sm px-3 py-2 w-full"
            />
            <div className="flex gap-2 flex-wrap">
              {TAG_PALETTE.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewTagColor(color)}
                  style={{ backgroundColor: color }}
                  className={`w-7 h-7 rounded-full cursor-pointer border border-[var(--cf-edge)] ${newTagColor === color ? "ring-2 ring-[var(--cf-phosphor)] ring-offset-2 ring-offset-[var(--cf-ink)] scale-110" : "opacity-70 hover:opacity-100"}`}
                />
              ))}
            </div>
            <button
              onClick={onCreateTag}
              disabled={!newTagName.trim()}
              className="aero-btn aero-btn--cyan text-xs uppercase tracking-widest font-bold py-2 cursor-pointer"
            >
              + Create tag
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
