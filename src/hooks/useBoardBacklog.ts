"use client";

import type { Dispatch, SetStateAction } from "react";
import type { SectionData } from "@/interfaces/BoardInterface";
import type { CardInterface } from "@/interfaces/CardInterface";
import { createCard, createSection, updateCard } from "@/lib/api";
import {
  demoCreateCard,
  demoCreateSection,
  demoUpdateCard,
} from "@/lib/demoStorage";

// Backlog tickets are cards parked in a reserved per-board section named "Backlog".
// It is identified by name (centralized here) so a future is_backlog flag is a 1-line swap.
// The backlog section is filtered out of every board view via Board's backlogSection split.
export const BACKLOG_NAME = "Backlog";

interface UseBoardBacklogParams {
  boardId: number;
  isDemo: boolean;
  demoId: string;
  // On scrum boards the "backlog" is the null-sprint pool (shown by SprintBacklog),
  // NOT the reserved "Backlog" section — so send/add/quick-create route through
  // sprint assignment instead, keeping a single shared backlog with the planning view.
  isScrum: boolean;
  activeSprintId: number | null;
  cards: CardInterface[];
  setCards: Dispatch<SetStateAction<CardInterface[]>>;
  setSections: Dispatch<SetStateAction<SectionData[]>>;
  backlogSection: SectionData | null;
  boardSections: SectionData[];
  doneSection: SectionData | undefined;
  closeCard: () => void;
  setSelectedCard: Dispatch<SetStateAction<CardInterface | null>>;
  setIsCardVisible: Dispatch<SetStateAction<boolean>>;
  setNewCardSectionId: Dispatch<SetStateAction<number | null>>;
  reportSyncError: (message: string) => void;
}

// Backlog + scrum-planning handlers: promote/park tickets, quick-create, and
// sprint assignment (Backlog view). Also owns the optimistic cross-section move.
export function useBoardBacklog({
  boardId,
  isDemo,
  demoId,
  isScrum,
  activeSprintId,
  cards,
  setCards,
  setSections,
  backlogSection,
  boardSections,
  doneSection,
  closeCard,
  setSelectedCard,
  setIsCardVisible,
  setNewCardSectionId,
  reportSyncError,
}: UseBoardBacklogParams) {
  const ensureBacklogSection = async () => {
    if (backlogSection) return backlogSection;
    const saved = isDemo
      ? demoCreateSection(demoId, BACKLOG_NAME)
      : await createSection(boardId, BACKLOG_NAME);
    setSections((prev) => [...prev, saved]);
    return saved;
  };

  // Optimistically move a card to another section (appended to the end); roll back and report if the server rejects it.
  const moveCard = (cardId: number | string, sectionId: number) => {
    const prevCard = cards.find((c) => c.id === cardId);
    const previousSectionId = prevCard?.section_id;
    const previousPosition = prevCard?.position;
    const newPosition =
      Math.max(
        -1,
        ...cards
          .filter((c) => c.section_id === sectionId)
          .map((c) => c.position ?? 0),
      ) + 1;
    const movingToDone = sectionId === doneSection?.id;
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              section_id: sectionId,
              position: newPosition,
              done_at: movingToDone
                ? (c.done_at ?? new Date().toISOString())
                : null,
            }
          : c,
      ),
    );
    if (isDemo) {
      demoUpdateCard(demoId, cardId as number, { section_id: sectionId });
      return;
    }
    updateCard(boardId, cardId, {
      section_id: sectionId,
      position: newPosition,
    }).catch(() => {
      if (previousSectionId !== undefined) {
        setCards((prev) =>
          prev.map((c) =>
            c.id === cardId
              ? {
                  ...c,
                  section_id: previousSectionId,
                  position: previousPosition,
                }
              : c,
          ),
        );
      }
      reportSyncError("Move failed — change reverted");
    });
  };

  // Optimistically set a card's sprint (null = product backlog); roll back on error.
  const assignSprint = (cardId: number | string, sprintId: number | null) => {
    const prevCard = cards.find((c) => c.id === cardId);
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, sprint_id: sprintId } : c)),
    );
    if (isDemo) {
      demoUpdateCard(demoId, cardId as number, { sprint_id: sprintId });
      return;
    }
    updateCard(boardId, cardId, { sprint_id: sprintId }).catch(() => {
      setCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? { ...c, sprint_id: prevCard?.sprint_id ?? null }
            : c,
        ),
      );
      reportSyncError("Could not move ticket — change reverted");
    });
  };

  // Promote a backlog ticket onto the board.
  // Scrum: pull it into the active sprint (sprint_id), keeping its column.
  // Other: move it into the first/leftmost column (their "To Do").
  const handleAddToBoard = (card: CardInterface) => {
    if (!card) return;
    if (isScrum) {
      if (activeSprintId == null) {
        reportSyncError("Start a sprint first, then add tickets to it");
        return;
      }
      assignSprint(card.id, activeSprintId);
      closeCard();
      return;
    }
    const target = boardSections[0];
    if (!target) return;
    moveCard(card.id, target.id);
    closeCard();
  };

  // Send a board card back to the backlog.
  // Scrum: remove it from its sprint (sprint_id = null) so it lands in the shared
  // sprint backlog. Other: park it in the reserved "Backlog" section.
  const handleSendToBacklog = async (card: CardInterface) => {
    if (!card) return;
    if (isScrum) {
      assignSprint(card.id, null);
      closeCard();
      return;
    }
    let bl;
    try {
      bl = await ensureBacklogSection();
    } catch {
      reportSyncError("Could not reach the backlog — try again");
      return;
    }
    moveCard(card.id, bl.id);
    closeCard();
  };

  // Quick-add: create a backlog ticket instantly from just a name.
  const handleQuickCreateBacklog = async (cardName: string) => {
    try {
      const bl = await ensureBacklogSection();
      const saved = isDemo
        ? demoCreateCard(demoId, {
            section_id: bl.id,
            name: cardName,
            description: "",
          })
        : await createCard(boardId, {
            section_id: bl.id,
            name: cardName,
            description: "",
          });
      setCards((prev) =>
        prev.some((c) => c.id === saved.id) ? prev : [...prev, saved],
      );
    } catch {
      reportSyncError("Could not create ticket — try again");
    }
  };

  // --- Scrum planning (Backlog view) ---

  // Assign a ticket to a sprint (or back to the product backlog: sprintId = null).
  const handleAssignSprint = (cardId: number, sprintId: number | null) =>
    assignSprint(cardId, sprintId);

  // Quick-create a ticket in the planning backlog, into the given sprint (or backlog).
  const handleScrumQuickCreate = async (
    cardName: string,
    sprintId: number | null,
  ) => {
    const section = boardSections[0];
    if (!section) return;
    try {
      const saved = isDemo
        ? demoCreateCard(demoId, {
            section_id: section.id,
            name: cardName,
            description: "",
            sprint_id: sprintId,
          })
        : await createCard(boardId, {
            section_id: section.id,
            name: cardName,
            description: "",
            sprint_id: sprintId,
          });
      setCards((prev) =>
        prev.some((c) => c.id === saved.id) ? prev : [...prev, saved],
      );
    } catch {
      reportSyncError("Could not create ticket — try again");
    }
  };

  // Full editor: open CardEdit for a new card pre-seeded to the backlog section.
  const handleOpenBacklogEditor = async () => {
    try {
      const bl = await ensureBacklogSection();
      setNewCardSectionId(bl.id);
    } catch {
      reportSyncError("Could not reach the backlog — try again");
      return;
    }
    setSelectedCard(null);
    setIsCardVisible(true);
  };

  return {
    ensureBacklogSection,
    moveCard,
    handleAddToBoard,
    handleSendToBacklog,
    handleQuickCreateBacklog,
    handleAssignSprint,
    handleScrumQuickCreate,
    handleOpenBacklogEditor,
  };
}
