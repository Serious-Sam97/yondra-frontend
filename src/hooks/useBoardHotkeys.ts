"use client";

import { type Dispatch, type SetStateAction, useEffect } from "react";
import type { BoardViewMode } from "@/components/ui/BoardTopBar";
import type { CardInterface } from "@/interfaces/CardInterface";

interface UseBoardHotkeysParams {
  isReadOnly: boolean;
  viewMode: BoardViewMode;
  // Every modal, panel, drawer, or inline editor that can be open — any of them
  // open means the board is "busy" and the bare "C" shortcut must not fire.
  isCardVisible: boolean;
  isTagsOpen: boolean;
  isActivityOpen: boolean;
  isArchivedOpen: boolean;
  isBgOpen: boolean;
  settingsOpen: boolean;
  isChatOpen: boolean;
  isToolbarOpen: boolean;
  isCommandOpen: boolean;
  isAddingSection: boolean;
  sectionToDelete: { id: number; name: string } | null;
  cardToDelete: CardInterface | null;
  setIsCommandOpen: Dispatch<SetStateAction<boolean>>;
  setNewCardSectionId: Dispatch<SetStateAction<number | null>>;
  setIsCardVisible: Dispatch<SetStateAction<boolean>>;
}

// Global board keyboard shortcuts: Cmd/Ctrl+K toggles the command palette,
// bare "C" opens the new-card editor (board/list views only, never while typing).
export function useBoardHotkeys({
  isReadOnly,
  viewMode,
  isCardVisible,
  isTagsOpen,
  isActivityOpen,
  isArchivedOpen,
  isBgOpen,
  settingsOpen,
  isChatOpen,
  isToolbarOpen,
  isCommandOpen,
  isAddingSection,
  sectionToDelete,
  cardToDelete,
  setIsCommandOpen,
  setNewCardSectionId,
  setIsCardVisible,
}: UseBoardHotkeysParams) {
  useEffect(() => {
    const isTyping = (el: HTMLElement | null) =>
      !!el &&
      (el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.tagName === "SELECT" ||
        el.isContentEditable);

    const handleGlobalEvent = (event: KeyboardEvent) => {
      // Any modal, panel, drawer, or inline editor that's open → the board is "busy".
      const anyOpen =
        isCardVisible ||
        isTagsOpen ||
        isActivityOpen ||
        isArchivedOpen ||
        isBgOpen ||
        settingsOpen ||
        isChatOpen ||
        isToolbarOpen ||
        isCommandOpen ||
        isAddingSection ||
        sectionToDelete !== null ||
        cardToDelete !== null;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsCommandOpen((v) => !v);
        return;
      }

      // "C" to create a card — only on the board / list views, when nothing else is
      // open, never while typing in a field, and not as part of a Cmd/Ctrl+C (copy).
      if (
        event.key.toLowerCase() === "c" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isReadOnly &&
        !anyOpen &&
        (viewMode === "kanban" || viewMode === "list") &&
        !isTyping(event.target as HTMLElement | null) &&
        !isTyping(document.activeElement as HTMLElement | null)
      ) {
        // Stop the browser from typing the "c" into the (about-to-autofocus) name field.
        event.preventDefault();
        setNewCardSectionId(null);
        setIsCardVisible(true);
      }
    };
    window.addEventListener("keydown", handleGlobalEvent);
    return () => window.removeEventListener("keydown", handleGlobalEvent);
  }, [
    isReadOnly,
    viewMode,
    isCardVisible,
    isTagsOpen,
    isActivityOpen,
    isArchivedOpen,
    isBgOpen,
    settingsOpen,
    isChatOpen,
    isToolbarOpen,
    isCommandOpen,
    isAddingSection,
    sectionToDelete,
    cardToDelete,
  ]);
}
