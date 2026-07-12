"use client";

import { useEffect, useState } from "react";
import type { CardInterface, CardLink } from "@/interfaces/CardInterface";
import { addCardLink, deleteCardLink, refreshCardLink } from "@/lib/api";

interface UseCardLinksParams {
  isNew: boolean;
  isDemo: boolean;
  boardId?: number;
  card: CardInterface | null;
}

// GitHub PR/issue links for the card editor. The list is seeded by the editor's
// mount effect (via setLinks) from the card prop; live webhook updates arriving
// on the card prop are mirrored by the JSON.stringify effect below.
export function useCardLinks({
  isNew,
  isDemo,
  boardId,
  card,
}: UseCardLinksParams) {
  const [links, setLinks] = useState<CardLink[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Reflect live link changes (e.g. a webhook flipping a PR to merged) that arrive
  // on the card prop via the board's real-time event stream while the modal is open.
  useEffect(() => {
    if (card?.links) setLinks(card.links);
  }, [JSON.stringify(card?.links ?? [])]);

  const canUseLinks = !isNew && !isDemo && !!boardId && !!card?.id;

  const handleAddLink = async () => {
    const url = newLinkUrl.trim();
    if (!url || !canUseLinks) return;
    setLinkBusy(true);
    setLinkError(null);
    try {
      const updated = await addCardLink(boardId!, card!.id, url);
      setLinks(updated.links ?? []);
      setNewLinkUrl("");
    } catch {
      setLinkError("Enter a valid GitHub pull request or issue URL.");
    } finally {
      setLinkBusy(false);
    }
  };

  const handleRefreshLink = async (linkId: number) => {
    if (!canUseLinks) return;
    try {
      const updated = await refreshCardLink(boardId!, card!.id, linkId);
      setLinks(updated.links ?? []);
    } catch {
      /* keep current state on failure */
    }
  };

  const handleDeleteLink = async (linkId: number) => {
    if (!canUseLinks) return;
    setLinks((prev) => prev.filter((l) => l.id !== linkId)); // optimistic
    try {
      await deleteCardLink(boardId!, card!.id, linkId);
    } catch {
      setLinkError("Could not remove that link.");
    }
  };

  return {
    links,
    setLinks,
    newLinkUrl,
    setNewLinkUrl,
    linkBusy,
    linkError,
    canUseLinks,
    handleAddLink,
    handleRefreshLink,
    handleDeleteLink,
  };
}
