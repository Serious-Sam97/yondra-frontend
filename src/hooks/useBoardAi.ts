"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, startStandup } from "@/lib/api";
import { getEcho } from "@/lib/echo";

type BoardAiPayload = {
  scope?: string;
  board_id: number;
  request_id: string;
  delta?: string;
  text?: string;
  message?: string;
};
type IncomingEvent = { type: string; payload: BoardAiPayload };

// Board-level streamed AI (the standup / sprint summary). Subscribes to the SHARED
// private `board.{id}` channel and only accepts scope:'board' frames for the active
// run — so it never collides with the card-scoped useCardAi on the same channel. Only
// detaches its own handler; never leaves the channel.
export function useBoardAi(boardId: number | undefined, enabled: boolean) {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeId = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !boardId) return;

    const channel = getEcho().private(`board.${boardId}`);
    const handler = (e: IncomingEvent) => {
      if (e.payload.scope !== "board") return;
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
  }, [enabled, boardId]);

  const run = useCallback(async () => {
    if (!boardId || streaming) return;

    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    activeId.current = id; // arm the listener BEFORE the POST so no early token is lost
    setText("");
    setError(null);
    setStreaming(true);
    try {
      await startStandup(boardId, id);
    } catch (e) {
      activeId.current = null;
      setStreaming(false);
      setError(
        e instanceof ApiError && e.status === 503
          ? "AI assist isn't configured on this server."
          : "Couldn't start — try again.",
      );
    }
  }, [boardId, streaming]);

  return {
    text,
    streaming,
    error,
    run,
    hasRun: streaming || text !== "" || error !== null,
  };
}
