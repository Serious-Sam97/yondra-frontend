"use client";

import { useEffect, useState } from "react";
import type { CardInterface } from "@/interfaces/CardInterface";
import {
  ApiError,
  createSubtask,
  getSubtasks,
  suggestSubtasks,
  updateCard,
  updateSubtask,
} from "@/lib/api";
import {
  demoCreateSubtask,
  demoGetSubtasks,
  demoToggleSubtask,
} from "@/lib/demoStorage";
import { hapticDone } from "@/lib/haptics";
import { playComplete } from "@/lib/sound";

// A subtask is a real board card; the epic list surfaces these fields. id/name/is_done
// are always present; the rest arrive from the API (absent in demo storage).
export interface Subtask {
  id: number;
  name: string;
  is_done: boolean;
  section_id?: number;
  done_at?: string | null;
  assigned_user?: { id: number; name: string } | null;
  due_date?: string | null;
  priority?: "low" | "medium" | "high" | null;
  ticket_key?: string;
}

interface UseCardSubtasksParams {
  isNew: boolean;
  isDemo: boolean;
  demoId: string;
  boardId?: number;
  card: CardInterface | null;
  // The card id held in the editor's form state (0 until a saved card loads).
  id: number | string;
  // The board's done column — "mark done" moves the subtask here (unifies completion).
  // Undefined on boards with no done column: fall back to the legacy is_done flag.
  doneSectionId?: number;
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
  doneSectionId,
  reportActionError,
}: UseCardSubtasksParams) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskName, setNewSubtaskName] = useState("");
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);
  // AI "Break down" — generates subtask titles, then creates them as child cards.
  const [aiBreaking, setAiBreaking] = useState(false);
  const [aiRationale, setAiRationale] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

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
      setSubtasks((prev) => [...prev, { ...s, is_done: s.is_done ?? false }]);
    }
    setNewSubtaskName("");
  };

  // Create several subtasks from a list of titles (used by the AI breakdown). Sequential
  // so positions stay stable; each is appended optimistically as it lands.
  const addSubtasks = async (names: string[]) => {
    for (const raw of names) {
      const n = raw.trim();
      if (!n) continue;
      if (isDemo) {
        const s = demoCreateSubtask(demoId, id as number, { name: n });
        setSubtasks((prev) => [
          ...prev,
          { id: s.id, name: s.name, is_done: false },
        ]);
      } else if (boardId && id) {
        try {
          const s = await createSubtask(boardId, id, { name: n });
          setSubtasks((prev) => [...prev, { ...s, is_done: s.is_done ?? false }]);
        } catch {
          reportActionError("Could not add a subtask — try again");
        }
      }
    }
  };

  // Only offered on a saved, live (non-demo) card the user can write to.
  const canAiBreakdown = !isNew && !isDemo && !!boardId && !!id;

  const aiBreakdown = async () => {
    if (!boardId || !id || aiBreaking) return;
    setAiBreaking(true);
    setAiError(null);
    setAiRationale(null);
    try {
      const res = await suggestSubtasks(boardId, id);
      if (res.subtasks?.length) {
        await addSubtasks(res.subtasks);
        setAiRationale(res.rationale || null);
      } else {
        setAiError(
          res.rationale || "Not enough detail to break this card down.",
        );
      }
    } catch (e) {
      setAiError(
        e instanceof ApiError && e.status === 503
          ? "AI assist isn't configured on this server."
          : "Couldn't break this down — try again.",
      );
    } finally {
      setAiBreaking(false);
    }
  };

  const isSubtaskDone = (s: Subtask) => !!s.done_at || s.is_done;

  // "Mark done" moves the subtask into the board's done column (so done_at sticks —
  // a bare done_at is wiped by any later column move). Boards with no done column, and
  // demo mode, fall back to the legacy is_done flag. One-way from the list; reopen a
  // subtask by opening its card and moving its column.
  const handleMarkDone = async (s: Subtask) => {
    if (isSubtaskDone(s)) return;
    playComplete();
    hapticDone();

    if (isDemo) {
      setSubtasks((prev) =>
        prev.map((i) => (i.id === s.id ? { ...i, is_done: true } : i)),
      );
      demoToggleSubtask(demoId, s.id);
      return;
    }
    if (!boardId || !id) return;

    if (doneSectionId) {
      setSubtasks((prev) =>
        prev.map((i) =>
          i.id === s.id
            ? { ...i, done_at: new Date().toISOString(), section_id: doneSectionId }
            : i,
        ),
      );
      updateCard(boardId, s.id, { section_id: doneSectionId }).catch(() => {
        setSubtasks((prev) =>
          prev.map((i) =>
            i.id === s.id ? { ...i, done_at: null, section_id: s.section_id } : i,
          ),
        );
        reportActionError("Change not saved — reverted");
      });
    } else {
      setSubtasks((prev) =>
        prev.map((i) => (i.id === s.id ? { ...i, is_done: true } : i)),
      );
      updateSubtask(boardId, id, s.id, { is_done: true }).catch(() => {
        setSubtasks((prev) =>
          prev.map((i) => (i.id === s.id ? { ...i, is_done: false } : i)),
        );
        reportActionError("Change not saved — reverted");
      });
    }
  };

  const doneSubtasks = subtasks.filter(isSubtaskDone).length;

  return {
    subtasks,
    newSubtaskName,
    setNewSubtaskName,
    loadingSubtasks,
    handleAddSubtask,
    handleMarkDone,
    isSubtaskDone,
    doneSubtasks,
    // AI breakdown
    aiBreakdown,
    aiBreaking,
    aiRationale,
    aiError,
    canAiBreakdown,
  };
}
