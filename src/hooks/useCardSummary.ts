"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, summarizeCard } from "@/lib/api";
import { getEcho } from "@/lib/echo";

type AiPayload = {
  card_id: number;
  request_id: string;
  delta?: string;
  text?: string;
  message?: string;
};
type IncomingEvent = { type: string; payload: AiPayload };

// One-shot streamed AI summary of a card's thread (description + checklist + comments).
// Subscribes to the SHARED private `board.{id}` channel — like usePlanningSession, it
// only detaches its own handler and NEVER leaves the channel (Board owns it). Once a run
// is armed with a request_id, `ai.token` deltas append until `ai.done`. The request_id
// is minted in run() and set BEFORE the POST, so the filter is live before the first
// token can arrive.
export function useCardSummary(
  boardId: number | undefined,
  cardId: number | string | undefined,
  enabled: boolean,
) {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numericCardId = typeof cardId === "number" ? cardId : Number(cardId);
  // The active run's id — a ref so the socket handler reads the latest value without
  // re-subscribing on every token. Null between runs.
  const activeId = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !boardId || !numericCardId) return;

    const channel = getEcho().private(`board.${boardId}`);
    const handler = (e: IncomingEvent) => {
      if (e.payload.card_id !== numericCardId) return;
      if (e.payload.request_id !== activeId.current) return;
      if (e.type === "ai.token") {
        setText((prev) => prev + (e.payload.delta ?? ""));
      } else if (e.type === "ai.done") {
        if (e.payload.text) setText(e.payload.text);
        setStreaming(false);
        activeId.current = null;
      } else if (e.type === "ai.error") {
        setError(e.payload.message ?? "The summary failed.");
        setStreaming(false);
        activeId.current = null;
      }
    };
    channel.listen(".board.event", handler);

    return () => {
      channel.stopListening(".board.event", handler);
    };
  }, [enabled, boardId, numericCardId]);

  const run = useCallback(async () => {
    if (!boardId || !numericCardId || streaming) return;

    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    activeId.current = id; // arm the listener BEFORE the POST so no early token is lost
    setText("");
    setError(null);
    setStreaming(true);
    try {
      await summarizeCard(boardId, numericCardId, id);
    } catch (e) {
      activeId.current = null;
      setStreaming(false);
      setError(
        e instanceof ApiError && e.status === 503
          ? "AI assist isn't configured on this server."
          : "Couldn't start the summary — try again.",
      );
    }
  }, [boardId, numericCardId, streaming]);

  return { text, streaming, error, run, hasRun: streaming || text !== "" };
}
