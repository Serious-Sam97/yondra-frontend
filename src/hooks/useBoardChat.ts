"use client";

import { useRef, useState } from "react";

export interface ChatMessage {
  id: number;
  body: string;
  created_at: string;
  user: { id: number; name: string };
}

interface UseBoardChatParams {
  boardId: number;
  reportSyncError: (message: string) => void;
}

// Board chat state + handlers. History is fetched lazily on first open and merged
// with anything the realtime channel already delivered (dedupe by id, sort by time).
// `setChatMessages` is exposed so the realtime hook can reconcile message events.
export function useBoardChat({ boardId, reportSyncError }: UseBoardChatParams) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatLoadedRef = useRef(false);

  const handleOpenChat = async () => {
    setIsChatOpen(true);
    if (!chatLoadedRef.current) {
      chatLoadedRef.current = true;
      const { getBoardMessages } = await import("@/lib/api");
      const data = await getBoardMessages(boardId).catch(() => []);
      setChatMessages((prev) => {
        const fetched: ChatMessage[] = Array.isArray(data) ? data : [];
        const merged = [
          ...fetched,
          ...prev.filter((m) => !fetched.some((f) => f.id === m.id)),
        ];
        return merged.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
      });
    }
  };

  const handleChatSend = async (body: string) => {
    try {
      const { createBoardMessage } = await import("@/lib/api");
      const msg = await createBoardMessage(boardId, body);
      setChatMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
      );
    } catch {
      reportSyncError("Message not sent — try again");
    }
  };

  const handleChatDelete = async (messageId: number) => {
    const { deleteBoardMessage } = await import("@/lib/api");
    await deleteBoardMessage(boardId, messageId).catch(() => {});
    setChatMessages((prev) => prev.filter((m) => m.id !== messageId));
  };

  return {
    isChatOpen,
    setIsChatOpen,
    chatMessages,
    setChatMessages,
    handleOpenChat,
    handleChatSend,
    handleChatDelete,
  };
}
