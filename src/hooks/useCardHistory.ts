"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CardActivity } from "@/interfaces/CardInterface";
import { getCardHistory } from "@/lib/api";
import { getEcho } from "@/lib/echo";

interface UseCardHistoryParams {
  boardId?: number;
  cardId?: number | string | null;
  // Fetch lazily: only once the History section/tab is actually shown.
  enabled: boolean;
}

// Fold a fresh first page into what's loaded: fresh entries win, already-loaded
// older pages are kept below them (ids are monotonic, so "older" = smaller id).
function mergeFresh(
  fresh: CardActivity[],
  prev: CardActivity[],
): CardActivity[] {
  const freshIds = fresh.flatMap((e) => (e.id === null ? [] : [e.id]));
  const oldestFresh = freshIds.length ? Math.min(...freshIds) : Infinity;
  const hasSynthetic = fresh.some((e) => e.id === null);
  return [
    ...fresh,
    ...prev.filter((e) => (e.id === null ? !hasSynthetic : e.id < oldestFresh)),
  ];
}

// A card's History tab. Live updates arrive as a lightweight `card.activity` nudge
// on the board channel ({ card_ids }) — on a hit we refetch the first page. Detach
// only our handler on cleanup; the board owns the channel.
export function useCardHistory({
  boardId,
  cardId,
  enabled,
}: UseCardHistoryParams) {
  const [entries, setEntries] = useState<CardActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = enabled && !!boardId && cardId != null;

  const refreshFirstPage = useCallback(() => {
    if (!boardId || cardId == null) return Promise.resolve();
    return getCardHistory(boardId, cardId)
      .then((p) => {
        const data = Array.isArray(p.data) ? p.data : [];
        setEntries((prev) => mergeFresh(data, prev));
        // Once older pages are loaded, their paging state stays authoritative.
        if (page <= 1) setHasMore(p.next_page_url !== null);
        setError(null);
      })
      .catch(() => setError("Couldn't load history."));
  }, [boardId, cardId, page]);

  // First load, the first time the section becomes visible.
  useEffect(() => {
    if (!active || loaded) return;
    setLoading(true);
    refreshFirstPage().finally(() => {
      setLoading(false);
      setLoaded(true);
    });
  }, [active, loaded, refreshFirstPage]);

  const loadOlder = useCallback(() => {
    if (!boardId || cardId == null || !hasMore || loadingOlder) return;
    setLoadingOlder(true);
    getCardHistory(boardId, cardId, page + 1)
      .then((p) => {
        const data = Array.isArray(p.data) ? p.data : [];
        setEntries((prev) => {
          const seen = new Set(prev.map((e) => e.id));
          return [...prev, ...data.filter((e) => !seen.has(e.id))];
        });
        setPage(p.current_page);
        setHasMore(p.next_page_url !== null);
      })
      .catch(() => setError("Couldn't load older history."))
      .finally(() => setLoadingOlder(false));
  }, [boardId, cardId, hasMore, loadingOlder, page]);

  // Live: refetch (debounced — one save can nudge more than once) when this card changes.
  const refreshRef = useRef(refreshFirstPage);
  refreshRef.current = refreshFirstPage;
  useEffect(() => {
    if (!loaded || !boardId || cardId == null) return;
    const id = Number(cardId);
    let timer: ReturnType<typeof setTimeout> | null = null;
    const handler = (e: { type: string; payload: { card_ids?: number[] } }) => {
      if (e.type !== "card.activity" || !e.payload.card_ids?.includes(id))
        return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => refreshRef.current(), 300);
    };

    let channel: ReturnType<ReturnType<typeof getEcho>["private"]> | null =
      null;
    try {
      channel = getEcho().private(`board.${boardId}`);
      channel.listen(".board.event", handler);
    } catch {
      // Echo/Reverb not configured — history still loads, just not live.
    }
    return () => {
      if (timer) clearTimeout(timer);
      channel?.stopListening(".board.event", handler);
    };
  }, [loaded, boardId, cardId]);

  return { entries, loading, loaded, hasMore, loadingOlder, loadOlder, error };
}
