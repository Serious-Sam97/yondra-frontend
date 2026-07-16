"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, type CrmChatMessage, startCrmChat } from "@/lib/api";
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

// Board-level CRM assistant chat (YON-69). Multi-turn: keeps the running transcript and
// streams each reply over the SHARED private `board.{id}` channel, accepting only
// scope:'crm-chat' frames for the active turn — so it never collides with the standup's
// scope:'board' frames or the card-scoped useCardAi on the same channel. Only detaches
// its own handler; never leaves the channel.
export function useCrmChat(boardId: number | undefined, enabled: boolean) {
  const [messages, setMessages] = useState<CrmChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeId = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !boardId) return;

    const channel = getEcho().private(`board.${boardId}`);
    const handler = (e: IncomingEvent) => {
      if (e.payload.scope !== "crm-chat") return;
      if (e.payload.request_id !== activeId.current) return;
      if (e.type === "ai.token") {
        setStreamingText((prev) => prev + (e.payload.delta ?? ""));
      } else if (e.type === "ai.done") {
        const finalText = e.payload.text ?? "";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: finalText },
        ]);
        setStreamingText("");
        setStreaming(false);
        activeId.current = null;
      } else if (e.type === "ai.error") {
        setError(e.payload.message ?? "That didn't work.");
        setStreamingText("");
        setStreaming(false);
        activeId.current = null;
      }
    };
    channel.listen(".board.event", handler);

    return () => {
      channel.stopListening(".board.event", handler);
    };
  }, [enabled, boardId]);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!boardId || streaming || question === "") return;

      const next: CrmChatMessage[] = [
        ...messages,
        { role: "user", content: question },
      ];

      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      activeId.current = id; // arm the listener BEFORE the POST so no early token is lost
      setMessages(next);
      setStreamingText("");
      setError(null);
      setStreaming(true);
      try {
        await startCrmChat(boardId, id, next);
      } catch (e) {
        activeId.current = null;
        setStreaming(false);
        setError(
          e instanceof ApiError && e.status === 503
            ? "AI assist isn't configured on this server."
            : "Couldn't send — try again.",
        );
      }
    },
    [boardId, streaming, messages],
  );

  return { messages, streamingText, streaming, error, send };
}
