"use client";

import { useEffect, useState } from "react";
import type { CardInterface } from "@/interfaces/CardInterface";
import { createSubtask, getSubtasks, updateSubtask } from "@/lib/api";
import {
  demoCreateSubtask,
  demoGetSubtasks,
  demoToggleSubtask,
} from "@/lib/demoStorage";
import { hapticDone } from "@/lib/haptics";
import { playComplete } from "@/lib/sound";

export interface Subtask {
  id: number;
  name: string;
  is_done: boolean;
}

interface UseCardSubtasksParams {
  isNew: boolean;
  isDemo: boolean;
  demoId: string;
  boardId?: number;
  card: CardInterface | null;
  // The card id held in the editor's form state (0 until a saved card loads).
  id: number | string;
  reportActionError: (message: string) => void;
}

// Subtasks for the card editor: loaded on open (demo storage or API), with
// optimistic toggle + rollback on failure.
export function useCardSubtasks({
  isNew,
  isDemo,
  demoId,
  boardId,
  card,
  id,
  reportActionError,
}: UseCardSubtasksParams) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskName, setNewSubtaskName] = useState("");
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);

  useEffect(() => {
    if (!isNew && card?.id) {
      setLoadingSubtasks(true);
      if (isDemo) {
        setSubtasks(
          demoGetSubtasks(demoId, card.id as number).map((s) => ({
            id: s.id,
            name: s.name,
            is_done: s.is_done ?? false,
          })),
        );
        setLoadingSubtasks(false);
      } else if (boardId) {
        getSubtasks(boardId, card.id)
          .then((data) => setSubtasks(Array.isArray(data) ? data : []))
          .catch(() => {})
          .finally(() => setLoadingSubtasks(false));
      }
    }
  }, []);

  const handleAddSubtask = async () => {
    const n = newSubtaskName.trim();
    if (!n) return;
    if (isDemo) {
      const s = demoCreateSubtask(demoId, id as number, { name: n });
      setSubtasks((prev) => [
        ...prev,
        { id: s.id, name: s.name, is_done: false },
      ]);
    } else if (boardId && id) {
      let s;
      try {
        s = await createSubtask(boardId, id, { name: n });
      } catch {
        // Keep what the user typed so they can retry.
        reportActionError("Could not add subtask — try again");
        return;
      }
      setSubtasks((prev) => [
        ...prev,
        { id: s.id, name: s.name, is_done: s.is_done ?? false },
      ]);
    }
    setNewSubtaskName("");
  };

  const handleToggleSubtask = async (s: Subtask) => {
    if (!s.is_done) {
      playComplete();
      hapticDone();
    }
    setSubtasks((prev) =>
      prev.map((i) => (i.id === s.id ? { ...i, is_done: !i.is_done } : i)),
    );
    if (isDemo) {
      demoToggleSubtask(demoId, s.id);
    } else if (boardId && id) {
      updateSubtask(boardId, id, s.id, { is_done: !s.is_done }).catch(() => {
        setSubtasks((prev) =>
          prev.map((i) => (i.id === s.id ? { ...i, is_done: s.is_done } : i)),
        );
        reportActionError("Change not saved — reverted");
      });
    }
  };

  const doneSubtasks = subtasks.filter((s) => s.is_done).length;

  return {
    subtasks,
    newSubtaskName,
    setNewSubtaskName,
    loadingSubtasks,
    handleAddSubtask,
    handleToggleSubtask,
    doneSubtasks,
  };
}
