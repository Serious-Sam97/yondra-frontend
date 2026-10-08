"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, type CrmChatMessage, startVortexChat } from "@/lib/api";
import { getEcho } from "@/lib/echo";
import type { VortexMount } from "@/lib/vortex";

// An action Vortex PROPOSED (server-validated whitelist). Nothing runs until the
// user confirms; execution happens client-side through the normal authorized APIs.
export type VortexAction =
  | {
      kind: "create_project";
      name: string;
      description?: string;
      boards: Array<{ name: string; type: "kanban" | "scrum" | "crm" }>;
    }
  | {
      kind: "create_board";
      name: string;
      type: "kanban" | "scrum" | "crm";
      project_id?: number;
    }
  | {
      kind: "create_card";
      board_id: number;
      name: string;
      description?: string;
      column?: string;
      board_name?: string;
    }
  | {
      kind: "add_column";
      board_id: number;
      name: string;
      board_name?: string;
    }
  | {
      kind: "archive_board";
      board_id: number;
      board_name?: string;
    };

export interface VortexChatMessage extends CrmChatMessage {
  action?: VortexAction | null;
  // answered on this device (slash commands, riddles…) — never sent to the AI
  local?: boolean;
}

type UserAiPayload = {
  scope?: string;
  request_id: string;
  delta?: string;
  text?: string;
  message?: string;
  action?: VortexAction;
};
type IncomingEvent = { type: string; payload: UserAiPayload };

// Vortex workspace chat — the user-scoped twin of useCrmChat. Multi-turn: keeps the
// running transcript and streams each reply over the caller's own private
// `App.Models.User.{id}` channel (shared with notifications), accepting only
// scope:'vortex-chat' frames for the active turn. Listens with `.listen`/`.stopListening`
// on the shared channel — never `leave()`s it, since useNotifications rides it too.
// Each turn carries the CURRENT mounts, so ejecting/mounting mid-conversation takes
// effect on the very next question.
// The transcript is kept on this device (last 20 turns) so he remembers what you
// talked about yesterday. Cleared with clear().
const MEMORY_KEY = (userId: number) => `yd:vortex.chat.${userId}`;
const MEMORY_TURNS = 20;

export function useVortexChat(
  userId: number | undefined,
  enabled: boolean,
  mounts: VortexMount[] = [],
  onReply?: (text: string) => void,
) {
  const [messages, setMessages] = useState<VortexChatMessage[]>([]);
  const onReplyRef = useRef(onReply);
  onReplyRef.current = onReply;

  /* load the remembered transcript once we know who this is */
  useEffect(() => {
    if (!userId) return;
    try {
      const raw = JSON.parse(localStorage.getItem(MEMORY_KEY(userId)) ?? "[]");
      if (Array.isArray(raw))
        setMessages(
          raw.filter(
            (m): m is VortexChatMessage =>
              (m?.role === "user" || m?.role === "assistant") &&
              typeof m.content === "string",
          ),
        );
    } catch {
      // nothing remembered
    }
  }, [userId]);
  useEffect(() => {
    if (!userId) return;
    try {
      localStorage.setItem(
        MEMORY_KEY(userId),
        JSON.stringify(
          messages
            .slice(-MEMORY_TURNS)
            .map((m) => ({ role: m.role, content: m.content, local: m.local })),
        ),
      );
    } catch {
      // storage full / blocked
    }
  }, [messages, userId]);
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
          {
            role: "assistant",
            content: finalText,
            action: e.payload.action ?? null,
          },
        ]);
        setStreamingText("");
        setStreaming(false);
        activeId.current = null;
        onReplyRef.current?.(finalText);
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
    async (text: string, style: string[] = []) => {
      const question = text.trim();
      if (!userId || streaming || question === "") return;

      const next: VortexChatMessage[] = [
        ...messages,
        { role: "user", content: question },
      ];
      // the AI only sees the real conversation, not local command chatter
      const forAi: CrmChatMessage[] = next
        .filter((m) => !m.local)
        .slice(-30)
        .map((m) => ({ role: m.role, content: m.content }));

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
        await startVortexChat(
          id,
          forAi,
          mounts.map((m) => ({ type: m.type, id: m.id })),
          style,
        );
      } catch (e) {
        activeId.current = null;
        setStreaming(false);
        if (e instanceof ApiError && e.status === 422) {
          // Almost always a stale mount (deleted / access revoked) — surface the
          // server's eject-it message.
          let msg = "A mounted context is no longer accessible — eject it.";
          try {
            msg = (JSON.parse(e.body) as { message?: string }).message ?? msg;
          } catch {}
          setError(msg);
        } else {
          setError(
            e instanceof ApiError && e.status === 503
              ? "AI assist isn't configured on this server."
              : "Couldn't send — try again.",
          );
        }
      }
    },
    [userId, streaming, messages, mounts],
  );

  /** Add a local-only line from him (slash commands answered without the AI). */
  const say = useCallback((content: string, asUser?: string) => {
    setMessages((prev) => [
      ...prev,
      ...(asUser
        ? [{ role: "user" as const, content: asUser, local: true }]
        : []),
      { role: "assistant" as const, content, local: true },
    ]);
  }, []);
  const clear = useCallback(() => setMessages([]), []);

  return { messages, streamingText, streaming, error, send, say, clear };
}
