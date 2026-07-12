"use client";

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useState,
} from "react";
import type { SectionData } from "@/interfaces/BoardInterface";
import type { CardInterface } from "@/interfaces/CardInterface";
import {
  createSection,
  deleteSection,
  reorderSections,
  updateSection,
} from "@/lib/api";
import {
  demoCreateSection,
  demoDeleteSection,
  demoUpdateSection,
} from "@/lib/demoStorage";

interface UseBoardSectionsParams {
  boardId: number;
  isDemo: boolean;
  demoId: string;
  sections: SectionData[];
  setSections: Dispatch<SetStateAction<SectionData[]>>;
  setCards: Dispatch<SetStateAction<CardInterface[]>>;
  // Current render's backlog split (see Board's backlog derivation).
  backlogSection: SectionData | null;
  boardSections: SectionData[];
  reportSyncError: (message: string) => void;
}

// "Backlog" is reserved for the unique built-in backlog — users can't take that name.
const isReservedName = (n: string) => n.trim().toLowerCase() === "backlog";

// Section (column) management: add/rename/delete plus the add-section inline editor
// and delete-confirm modal state. "Backlog" is a reserved name (see isReservedName).
export function useBoardSections({
  boardId,
  isDemo,
  demoId,
  sections,
  setSections,
  setCards,
  backlogSection,
  boardSections,
  reportSyncError,
}: UseBoardSectionsParams) {
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [sectionError, setSectionError] = useState("");
  const [sectionToDelete, setSectionToDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // useCallback so every memoized Section shares one handler identity. `sections`
  // is a real dependency (the rollback name is read from it) — it changes when
  // columns change, never on unrelated Board re-renders like search keystrokes.
  const handleRenameSection = useCallback(
    async (sectionId: number, newName: string) => {
      if (isReservedName(newName)) return; // ignore — keep the old name
      const previousName = sections.find((s) => s.id === sectionId)?.name;
      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, name: newName } : s)),
      );
      try {
        if (isDemo) demoUpdateSection(demoId, sectionId, newName);
        else await updateSection(boardId, sectionId, { name: newName });
      } catch {
        setSections((prev) =>
          prev.map((s) =>
            s.id === sectionId ? { ...s, name: previousName ?? s.name } : s,
          ),
        );
        reportSyncError("Rename failed — change reverted");
      }
    },
    [isDemo, demoId, boardId, sections, setSections, reportSyncError],
  );

  const handleDeleteSection = async () => {
    if (!sectionToDelete) return;
    try {
      if (isDemo) demoDeleteSection(demoId, sectionToDelete.id);
      else await deleteSection(boardId, sectionToDelete.id);
    } catch {
      reportSyncError("Could not delete section — try again");
      setSectionToDelete(null);
      return;
    }
    setSections((prev) => prev.filter((s) => s.id !== sectionToDelete.id));
    setCards((prev) => prev.filter((c) => c.section_id !== sectionToDelete.id));
    setSectionToDelete(null);
  };

  const handleAddSection = async () => {
    const trimmed = newSectionName.trim();
    if (!trimmed) return;
    if (isReservedName(trimmed)) {
      setSectionError("“Backlog” is reserved");
      return;
    }
    let saved;
    try {
      saved = isDemo
        ? demoCreateSection(demoId, trimmed)
        : await createSection(boardId, trimmed);
    } catch {
      setSectionError("Could not create section — try again");
      return;
    }
    // Keep the reserved Backlog section pinned to the end — new columns go before it.
    // Dedupe by id: the `.board.event` self-echo may have already inserted `saved`
    // (the WS push can beat this POST's response), so re-add idempotently to avoid a
    // duplicate column that only clears on refresh.
    const bl = backlogSection;
    setSections((prev) => {
      const cleaned = prev.filter(
        (s) => s.id !== saved.id && (!bl || s.id !== bl.id),
      );
      return bl ? [...cleaned, saved, bl] : [...cleaned, saved];
    });
    // Persist the order so Backlog stays last on the backend too (demo storage handles this itself).
    if (bl && !isDemo)
      reorderSections(
        boardId,
        [...boardSections, saved, bl].map((s) => s.id),
      ).catch(() => {});
    setNewSectionName("");
    setIsAddingSection(false);
  };

  return {
    isAddingSection,
    setIsAddingSection,
    newSectionName,
    setNewSectionName,
    sectionError,
    setSectionError,
    sectionToDelete,
    setSectionToDelete,
    handleRenameSection,
    handleDeleteSection,
    handleAddSection,
  };
}
