"use client";

import { useState } from "react";
import type { ChecklistItem } from "@/interfaces/CardInterface";
import {
  createChecklistItem,
  deleteChecklistItem,
  updateChecklistItem,
} from "@/lib/api";
import {
  demoCreateChecklistItem,
  demoDeleteChecklistItem,
  demoUpdateChecklistItem,
} from "@/lib/demoStorage";
import { hapticDone } from "@/lib/haptics";
import { playComplete } from "@/lib/sound";

interface UseCardChecklistParams {
  isNew: boolean;
  isDemo: boolean;
  demoId: string;
  boardId?: number;
  // The card id held in the editor's form state (0 until a saved card loads).
  id: number | string;
  reportActionError: (message: string) => void;
}

// Checklist state + mutations for the card editor. Items are seeded by the
// editor's mount effect (via setChecklistItems) from the card prop; unsaved new
// cards keep items purely local until submit.
export function useCardChecklist({
  isNew,
  isDemo,
  demoId,
  boardId,
  id,
  reportActionError,
}: UseCardChecklistParams) {
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState("");

  const handleAddChecklistItem = async () => {
    const text = newChecklistText.trim();
    if (!text) return;
    if (isDemo) {
      const item = demoCreateChecklistItem(demoId, id as number, text);
      setChecklistItems((prev) => [...prev, item]);
    } else if (boardId && id) {
      let item;
      try {
        item = await createChecklistItem(boardId, id, text);
      } catch {
        // Keep what the user typed so they can retry.
        reportActionError("Could not add item — try again");
        return;
      }
      setChecklistItems((prev) => [...prev, item]);
    } else {
      setChecklistItems((prev) => [
        ...prev,
        { id: Date.now(), text, is_done: false, position: prev.length },
      ]);
    }
    setNewChecklistText("");
  };

  const handleToggleItem = async (item: ChecklistItem) => {
    const updated = { ...item, is_done: !item.is_done };
    if (updated.is_done) {
      playComplete();
      hapticDone();
    }
    setChecklistItems((prev) =>
      prev.map((i) => (i.id === item.id ? updated : i)),
    );
    if (!isNew) {
      if (isDemo)
        demoUpdateChecklistItem(demoId, id as number, item.id, {
          is_done: updated.is_done,
        });
      else if (boardId)
        updateChecklistItem(boardId, id, item.id, {
          is_done: updated.is_done,
        }).catch(() => {
          setChecklistItems((prev) =>
            prev.map((i) =>
              i.id === item.id ? { ...i, is_done: item.is_done } : i,
            ),
          );
          reportActionError("Change not saved — reverted");
        });
    }
  };

  const handleDeleteItem = async (item: ChecklistItem) => {
    setChecklistItems((prev) => prev.filter((i) => i.id !== item.id));
    if (!isNew) {
      if (isDemo) demoDeleteChecklistItem(demoId, id as number, item.id);
      else if (boardId)
        deleteChecklistItem(boardId, id, item.id).catch(() => {
          setChecklistItems((prev) => [...prev, item]);
          reportActionError("Could not delete item — restored");
        });
    }
  };

  const doneCount = checklistItems.filter((i) => i.is_done).length;

  return {
    checklistItems,
    setChecklistItems,
    newChecklistText,
    setNewChecklistText,
    handleAddChecklistItem,
    handleToggleItem,
    handleDeleteItem,
    doneCount,
  };
}
