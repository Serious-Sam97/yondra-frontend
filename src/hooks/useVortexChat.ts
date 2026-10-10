"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  type CrmChatMessage,
  startVortexChat,
  type VortexPersonaState,
} from "@/lib/api";
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
      /** G-06 · a split: create it as a subtask of this card */
      parent_card_id?: number;
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
    }
  // G-02 · card-level actions (each one still through the user's own endpoints)
  | {
      kind: "move_card";
      board_id: number;
      card_id: number;
      column: string;
      card_name?: string;
      board_name?: string;
    }
  | {
      kind: "rename_card";
      board_id: number;
      card_id: number;
      name: string;
      card_name?: string;
      board_name?: string;
    }
  | {
      kind: "set_due";
      board_id: number;
      card_id: number;
      due: string | null;
      card_name?: string;
      board_name?: string;
    }
  | {
      kind: "assign_card";
      board_id: number;
      card_id: number;
      user_name: string;
      card_name?: string;
      board_name?: string;
    }
  | {
      kind: "add_label";
      board_id: number;
      card_id: number;
      label: string;
      card_name?: string;
      board_name?: string;
    }
  | {
      kind: "add_comment";
      board_id: number;
      card_id: number;
      text: string;
      card_name?: string;
      board_name?: string;
    }
  | {
      kind: "set_description";
      board_id: number;
      card_id: number;
      description: string;
      card_name?: string;
      board_name?: string;
    }
  | {
      kind: "archive_card";
      board_id: number;
      card_id: number;
      card_name?: string;
      board_name?: string;
    }
  // G-10 · a reminder he delivers later
  | { kind: "remind"; text: string; at: string };

/** How a message is staged on the answering machine (all optional, all local). */
export interface VortexMessageMeta {
  /** he typed, deleted and retyped before sending */
  retyped?: boolean;
  /** printed on cheap thermal paper: fades after being read (A-10) */
  fade?: boolean;
  faded?: boolean;
  /** delivered as a microcassette voice tape (A-13) */
  tape?: boolean;
  /** someone else on the line: the rewinding thing or the static child (A-19) */
  other?: "rewinder" | "child" | "void";
  /** printed just before this reply: another voice, or his hesitant "no." (A-07/A-19) */
  interject?: {
    kind: "rewinder" | "child" | "no";
    text: string;
    after?: string;
  };
  /** he knew you'd ask: the whole strip prints at once (A-07) */
  instant?: boolean;
  /** a recording left on the machine while you were away (A-20) */
  recording?: { from: string; at: number };
  /** this turn was answered with the mask off (crisis) */
  serious?: boolean;
  /** the riddle/game/command chatter answered on this device */
  system?: boolean;
}

export interface VortexChatMessage extends CrmChatMessage {
  action?: VortexAction | null;
  /** G-02 · a batch contract (several actions, signed together) */
  actions?: VortexAction[];
  /** G-15 · the devil's contract */
  faust?: boolean;
  // answered on this device (slash commands, riddles…) — never sent to the AI
  local?: boolean;
  /** epoch ms — lets him bring up "yesterday" */
  at?: number;
  meta?: VortexMessageMeta;
}

type UserAiPayload = {
  scope?: string;
  request_id: string;
  delta?: string;
  text?: string;
  message?: string;
  action?: VortexAction;
  actions?: VortexAction[];
  faust?: boolean;
  serious?: boolean;
};
type IncomingEvent = { type: string; payload: UserAiPayload };

export interface SendOptions {
  /** what the AI should see as this turn, when it differs from what's shown */
  aiText?: string;
  /** staging decided before the reply arrives (fade, voice tape…) */
  meta?: VortexMessageMeta;
}

// Vortex workspace chat — the user-scoped twin of useCrmChat. Multi-turn: keeps the
// running transcript and streams each reply over the caller's own private
// `App.Models.User.{id}` channel (shared with notifications), accepting only
// scope:'vortex-chat' frames for the active turn. Listens with `.listen`/`.stopListening`
// on the shared channel — never `leave()`s it, since useNotifications rides it too.
// Each turn carries the CURRENT mounts and his persona state, so ejecting/mounting
// or a mood change takes effect on the very next question.
// The transcript is kept on this device (last 40 turns) so he remembers what you
// talked about yesterday. Cleared with clear().
const MEMORY_KEY = (userId: number) => `yd:vortex.chat.${userId}`;
const MEMORY_TURNS = 40;
// mirror the backend's validation of messages[] (AiAssistController)
const MAX_TURNS = 30;
const MAX_CHARS = 4000;

export function useVortexChat(
  userId: number | undefined,
  enabled: boolean,
  mounts: VortexMount[] = [],
  onReply?: (text: string, msg: VortexChatMessage) => void,
) {
  const [messages, setMessages] = useState<VortexChatMessage[]>([]);
  const onReplyRef = useRef(onReply);
  onReplyRef.current = onReply;
  const pendingMeta = useRef<VortexMessageMeta | undefined>(undefined);

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
              typeof m.content === "string" &&
              // heals transcripts saved before blank replies were guarded
              m.content.trim() !== "",
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
          messages.slice(-MEMORY_TURNS).map((m) => ({
            role: m.role,
            content: m.content,
            local: m.local,
            at: m.at,
            meta: m.meta,
          })),
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
        const finalText =
          (e.payload.text ?? "").trim() ||
          (e.payload.action
            ? "fine. sign below."
            : "the tape ate my answer. *kkzzt* ask again.");
        const serious = e.payload.serious === true;
        const msg: VortexChatMessage = {
          role: "assistant",
          content: finalText,
          action: e.payload.action ?? null,
          actions:
            e.payload.actions ??
            (e.payload.action ? [e.payload.action] : undefined),
          faust: e.payload.faust === true,
          at: Date.now(),
          meta: serious
            ? { serious: true }
            : pendingMeta.current && { ...pendingMeta.current },
        };
        pendingMeta.current = undefined;
        setMessages((prev) => [...prev, msg]);
        setStreamingText("");
        setStreaming(false);
        activeId.current = null;
        onReplyRef.current?.(finalText, msg);
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
    async (
      text: string,
      style: string[] = [],
      persona?: VortexPersonaState,
      opts: SendOptions = {},
    ) => {
      const question = text.trim();
      if (!userId || streaming || question === "") return;

      const next: VortexChatMessage[] = [
        ...messages,
        { role: "user", content: question, at: Date.now() },
      ];
      // the AI only sees the real conversation, not local command chatter
      // The server validates every turn (non-empty, ≤4000 chars, ≤30 turns):
      // never replay a blank or oversized message.
      const forAi: CrmChatMessage[] = next
        .filter((m) => !m.local && m.content.trim() !== "")
        .slice(-MAX_TURNS)
        .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
      if (opts.aiText && forAi.length > 0)
        forAi[forAi.length - 1] = {
          role: "user",
          content: opts.aiText.slice(0, MAX_CHARS),
        };
      // the API wants alternating turns that start with the user
      while (forAi.length > 0 && forAi[0].role !== "user") forAi.shift();

      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      activeId.current = id; // arm the listener BEFORE the POST so no early token is lost
      pendingMeta.current = opts.meta;
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
          persona,
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
              ? "no signal. the AI isn't configured on this server."
              : "the tape snapped. try again.",
          );
        }
      }
    },
    [userId, streaming, messages, mounts],
  );

  /** Add a local-only line from him (slash commands answered without the AI). */
  const say = useCallback(
    (content: string, asUser?: string, meta?: VortexMessageMeta) => {
      const at = Date.now();
      setMessages((prev) => [
        ...prev,
        ...(asUser
          ? [{ role: "user" as const, content: asUser, local: true, at }]
          : []),
        { role: "assistant" as const, content, local: true, at, meta },
      ]);
    },
    [],
  );
  /** A contract he drew up himself (blocker pokes, reviews…): a local message with actions. */
  const propose = useCallback((content: string, actions: VortexAction[]) => {
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant" as const,
        content,
        local: true,
        at: Date.now(),
        action: actions[0] ?? null,
        actions,
      },
    ]);
  }, []);
  /** Put your line on the tape without asking him anything (he's ignoring you). */
  const note = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      { role: "user", content, local: true, at: Date.now() },
    ]);
  }, []);
  /** Update one message's staging (e.g. a thermal strip that faded). */
  const patch = useCallback((index: number, meta: VortexMessageMeta) => {
    setMessages((prev) =>
      prev.map((m, i) =>
        i === index ? { ...m, meta: { ...m.meta, ...meta } } : m,
      ),
    );
  }, []);
  const clear = useCallback(() => setMessages([]), []);

  return {
    messages,
    streamingText,
    streaming,
    error,
    send,
    say,
    propose,
    note,
    patch,
    clear,
  };
}
