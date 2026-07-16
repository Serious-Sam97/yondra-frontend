"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, type CrmChatMessage, startVortexChat } from "@/lib/api";
import { getEcho } from "@/lib/echo";

type UserAiPayload = {
  scope?: string;
  request_id: string;
  delta?: string;
  text?: string;
  message?: string;
};
type IncomingEvent = { type: string; payload: UserAiPayload };

// Vortex workspace chat — the user-scoped twin of useCrmChat. Multi-turn: keeps the
// running transcript and streams each reply over the caller's own private
// `App.Models.User.{id}` channel (shared with notifications), accepting only
// scope:'vortex-chat' frames for the active turn. Listens with `.listen`/`.stopListening`
// on the shared channel — never `leave()`s it, since useNotifications rides it too.
export function useVortexChat(userId: number | undefined, enabled: boolean) {
  const [messages, setMessages] = useState<CrmChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeId = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !userId) return;

    let channel: ReturnType<ReturnType<typeof getEcho>["private"]>;
    const handler = (e: IncomingEvent) => {
      if (e.payload.scope !== "vortex-chat") return;
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
    try {
      channel = getEcho().private(`App.Models.User.${userId}`);
      channel.listen(".user.event", handler);
    } catch {
      return; // Echo/Reverb not configured — chat simply won't stream
    }

    return () => {
      channel.stopListening(".user.event", handler);
    };
  }, [enabled, userId]);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!userId || streaming || question === "") return;

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
        await startVortexChat(id, next);
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
    [userId, streaming, messages],
  );

  return { messages, streamingText, streaming, error, send };
}
