"use client";

import { useEffect, useState } from "react";
import type { CardInterface } from "@/interfaces/CardInterface";
import { getWhatsappThread, sendWhatsappReply } from "@/lib/api";
import { getEcho } from "@/lib/echo";

export interface WaMessage {
  id: number;
  direction: "in" | "out";
  body: string | null;
  status: string | null;
  type: string;
  created_at: string;
  sent_by?: { id: number; name: string } | null;
}

export interface WaConversation {
  id: number;
  wa_phone: string;
  contact_name: string | null;
  window_open: boolean;
  messages: WaMessage[];
}

interface UseWhatsappThreadParams {
  isNew: boolean;
  isDemo: boolean;
  boardId?: number;
  card: CardInterface | null;
  // The card id held in the editor's form state (0 until a saved card loads).
  id: number | string;
}

// WhatsApp thread for the card editor (card #54/#55): load the conversation on
// open, then subscribe to the board channel so inbound messages + delivery-status
// ticks stream in live. Cleanup detaches ONLY this listener — Board owns the
// board.{id} channel (same rule as useSentinelCard).
export function useWhatsappThread({
  isNew,
  isDemo,
  boardId,
  card,
  id,
}: UseWhatsappThreadParams) {
  const [waThread, setWaThread] = useState<WaConversation | null>(null);
  const [newWaReply, setNewWaReply] = useState("");
  const [waSending, setWaSending] = useState(false);
  const [waError, setWaError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew || isDemo || !boardId || !card?.id) return;

    getWhatsappThread(boardId, card.id)
      .then((data) => {
        const conv = data?.conversation;
        if (conv) {
          setWaThread({ ...conv, window_open: !!data.window_open });
        }
      })
      .catch(() => {});

    let echo: ReturnType<typeof getEcho> | null = null;
    const channel = `board.${boardId}`;
    const handleBoardEvent = (e: {
      type?: string;
      payload?: { card_id?: number; message?: WaMessage };
    }) => {
      if (e?.payload?.card_id !== card.id || !e.payload.message) return;
      const msg = e.payload.message;
      if (e.type === "whatsapp.message.created") {
        setWaThread((prev) =>
          prev
            ? prev.messages.some((m) => m.id === msg.id)
              ? prev
              : { ...prev, messages: [...prev.messages, msg] }
            : prev,
        );
      } else if (e.type === "whatsapp.message.updated") {
        setWaThread((prev) =>
          prev
            ? {
                ...prev,
                messages: prev.messages.map((m) =>
                  m.id === msg.id ? { ...m, status: msg.status } : m,
                ),
              }
            : prev,
        );
      }
    };
    try {
      echo = getEcho();
      echo.private(channel).listen(".board.event", handleBoardEvent);
    } catch {
      // Echo/Reverb not configured here — the initial fetch still shows history.
    }
    return () => {
      // Detach only this listener — Board owns the board.{id} channel; echo.leave()
      // here would kill all realtime board updates (same rule as useSentinelCard).
      echo?.private(channel).stopListening(".board.event", handleBoardEvent);
    };
  }, []);

  const handleSendWaReply = async () => {
    const body = newWaReply.trim();
    if (!body || !boardId || !id || waSending) return;
    setWaSending(true);
    setWaError(null);
    try {
      const msg = await sendWhatsappReply(boardId, id, body);
      // The live board event also appends this; guard against a duplicate.
      setWaThread((prev) =>
        prev && !prev.messages.some((m) => m.id === msg.id)
          ? { ...prev, messages: [...prev.messages, msg] }
          : prev,
      );
      setNewWaReply("");
    } catch (e) {
      setWaError(e instanceof Error ? e.message : "Could not send — try again");
    } finally {
      setWaSending(false);
    }
  };

  return {
    waThread,
    newWaReply,
    setNewWaReply,
    waSending,
    waError,
    handleSendWaReply,
  };
}
