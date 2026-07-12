"use client";

import { type Dispatch, type SetStateAction, useState } from "react";
import type { CardInterface } from "@/interfaces/CardInterface";
import { deleteCard, getArchivedCards, restoreCard } from "@/lib/api";
import {
  demoArchiveCard,
  demoRestoreCard,
  loadDemoArchivedCards,
} from "@/lib/demoStorage";

interface UseBoardArchiveParams {
  boardId: number;
  isDemo: boolean;
  demoId: string;
  setCards: Dispatch<SetStateAction<CardInterface[]>>;
  closeCard: () => void;
  reportSyncError: (message: string) => void;
}

// Card archive: the archive-confirm modal (cardToDelete), the archived-cards
// browser (paginated, 25 per page, accumulated across "load more"), and
// archive/restore handlers.
export function useBoardArchive({
  boardId,
  isDemo,
  demoId,
  setCards,
  closeCard,
  reportSyncError,
}: UseBoardArchiveParams) {
  const [isArchivedOpen, setIsArchivedOpen] = useState(false);
  const [archivedCards, setArchivedCards] = useState<CardInterface[]>([]);
  const [archivedPage, setArchivedPage] = useState(1);
  const [hasMoreArchived, setHasMoreArchived] = useState(false);
  const [loadingMoreArchived, setLoadingMoreArchived] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<CardInterface | null>(null);

  const handleArchiveCard = async () => {
    if (!cardToDelete) return;
    try {
      if (isDemo) demoArchiveCard(demoId, cardToDelete.id as number);
      else await deleteCard(boardId, cardToDelete.id);
    } catch {
      reportSyncError("Could not archive card — try again");
      setCardToDelete(null);
      return;
    }
    setCards((prev) => prev.filter((c) => c.id !== cardToDelete.id));
    setCardToDelete(null);
    closeCard();
  };

  const handleOpenArchived = async () => {
    setIsArchivedOpen(true);
    if (isDemo) {
      setArchivedCards(loadDemoArchivedCards(demoId));
      setHasMoreArchived(false);
    } else {
      const page = await getArchivedCards(boardId).catch(() => null);
      setArchivedCards(page?.data ?? []);
      setArchivedPage(page?.meta.current_page ?? 1);
      setHasMoreArchived(page?.links.next != null);
    }
  };

  const handleLoadMoreArchived = async () => {
    if (isDemo || loadingMoreArchived) return;
    setLoadingMoreArchived(true);
    try {
      const page = await getArchivedCards(boardId, archivedPage + 1);
      setArchivedCards((prev) => {
        // Restores/archives since page 1 shift the windows — never render a
        // card twice.
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...page.data.filter((c) => !seen.has(c.id))];
      });
      setArchivedPage(page.meta.current_page);
      setHasMoreArchived(page.links.next != null);
    } catch {
      reportSyncError("Could not load more archived cards — try again");
    } finally {
      setLoadingMoreArchived(false);
    }
  };

  const handleRestoreCard = async (card: CardInterface) => {
    try {
      if (isDemo) demoRestoreCard(demoId, card.id as number);
      else await restoreCard(boardId, card.id);
    } catch {
      reportSyncError("Could not restore card — try again");
      return;
    }
    setArchivedCards((prev) => prev.filter((c) => c.id !== card.id));
    setCards((prev) => [...prev, { ...card, archived_at: null }]);
  };

  return {
    isArchivedOpen,
    setIsArchivedOpen,
    archivedCards,
    hasMoreArchived,
    loadingMoreArchived,
    handleLoadMoreArchived,
    cardToDelete,
    setCardToDelete,
    handleArchiveCard,
    handleOpenArchived,
    handleRestoreCard,
  };
}
