"use client";

import { type Dispatch, type SetStateAction, useState } from "react";
import type { CardInterface } from "@/interfaces/CardInterface";
import type { TagInterface } from "@/interfaces/TagInterface";
import { createTag, deleteTag } from "@/lib/api";
import { demoCreateTag, demoDeleteTag } from "@/lib/demoStorage";

export const TAG_PALETTE = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

interface UseBoardTagsParams {
  boardId: number;
  isDemo: boolean;
  demoId: string;
  setTags: Dispatch<SetStateAction<TagInterface[]>>;
  setCards: Dispatch<SetStateAction<CardInterface[]>>;
  filterTagId: number | null;
  setFilterTagId: Dispatch<SetStateAction<number | null>>;
  reportSyncError: (message: string) => void;
}

// Tag management: the tags modal's open/draft state plus create/delete handlers.
// Deleting a tag also strips it from every card and clears an active tag filter.
export function useBoardTags({
  boardId,
  isDemo,
  demoId,
  setTags,
  setCards,
  filterTagId,
  setFilterTagId,
  reportSyncError,
}: UseBoardTagsParams) {
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_PALETTE[0]);

  const handleCreateTag = async () => {
    const trimmed = newTagName.trim();
    if (!trimmed) return;
    try {
      const saved = isDemo
        ? demoCreateTag(demoId, trimmed, newTagColor)
        : await createTag(boardId, { name: trimmed, color: newTagColor });
      setTags((prev) => [...prev, saved]);
      setNewTagName("");
      setNewTagColor(TAG_PALETTE[0]);
    } catch {
      reportSyncError("Could not create tag — try again");
    }
  };

  const handleDeleteTag = async (tagId: number) => {
    try {
      if (isDemo) demoDeleteTag(demoId, tagId);
      else await deleteTag(boardId, tagId);
    } catch {
      reportSyncError("Could not delete tag — try again");
      return;
    }
    setTags((prev) => prev.filter((t) => t.id !== tagId));
    setCards((prev) =>
      prev.map((c) => ({
        ...c,
        tags: (c.tags ?? []).filter((t) => t.id !== tagId),
      })),
    );
    if (filterTagId === tagId) setFilterTagId(null);
  };

  return {
    isTagsOpen,
    setIsTagsOpen,
    newTagName,
    setNewTagName,
    newTagColor,
    setNewTagColor,
    handleCreateTag,
    handleDeleteTag,
  };
}
