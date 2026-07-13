"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type AiAction, type AiParams, ApiError, runCardAi } from "@/lib/api";
import { getEcho } from "@/lib/echo";

type AiPayload = {
  card_id: number;
  request_id: string;
  action?: AiAction;
  delta?: string;
  text?: string;
  message?: string;
};
type IncomingEvent = { type: string; payload: AiPayload };

// Generic streamed AI action for one card (summarize, describe, checklist, tests, reply,
// rewrite). Subscribes to the SHARED private `board.{id}` channel — like usePlanningSession,
// it only detaches its own handler and NEVER leaves the channel (Board owns it). Each run
// mints a request_id and arms the filter BEFORE the POST, so no early token is lost; two
// hook instances on the same card don't cross-talk because request_ids are unique.
export function useCardAi(
  boardId: number | undefined,
  cardId: number | string | undefined,
  enabled: boolean,
) {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<AiAction | null>(null);

  const numericCardId = typeof cardId === "number" ? cardId : Number(cardId);
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
        setError(e.payload.message ?? "That didn't work.");
        setStreaming(false);
        activeId.current = null;
      }
    };
    channel.listen(".board.event", handler);

    return () => {
      channel.stopListening(".board.event", handler);
    };
  }, [enabled, boardId, numericCardId]);

  const run = useCallback(
    async (
      nextAction: AiAction,
      params?: Omit<AiParams, "request_id">,
    ): Promise<void> => {
      if (!boardId || !numericCardId || streaming) return;

      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      activeId.current = id; // arm the listener BEFORE the POST so no early token is lost
      setAction(nextAction);
      setText("");
      setError(null);
      setStreaming(true);
      try {
        await runCardAi(boardId, numericCardId, nextAction, {
          request_id: id,
          ...params,
        });
      } catch (e) {
        activeId.current = null;
        setStreaming(false);
        setError(
          e instanceof ApiError && e.status === 503
            ? "AI assist isn't configured on this server."
            : "Couldn't start — try again.",
        );
      }
    },
    [boardId, numericCardId, streaming],
  );

  const reset = useCallback(() => {
    activeId.current = null;
    setText("");
    setError(null);
    setAction(null);
    setStreaming(false);
  }, []);

  return {
    text,
    streaming,
    error,
    action,
    run,
    reset,
    hasRun: streaming || text !== "" || error !== null,
  };
}
