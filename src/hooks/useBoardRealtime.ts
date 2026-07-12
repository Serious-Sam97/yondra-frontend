"use client";

import type Echo from "laravel-echo";
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
} from "react";
import type { SectionData } from "@/interfaces/BoardInterface";
import type { CardInterface } from "@/interfaces/CardInterface";
import type { SprintInterface } from "@/interfaces/SprintInterface";
import { getEcho } from "@/lib/echo";
import type { ChatMessage } from "./useBoardChat";

// Payloads broadcast on the private board channel as `.board.event`.
export type BoardEventPayload =
  | {
      type: "card.created" | "card.updated" | "card.restored";
      payload: CardInterface;
    }
  | { type: "card.deleted"; payload: { id: number | string } }
  // One batched event per reorder (replaces N card.updated broadcasts): each
  // entry carries exactly the fields a client must merge to converge. Stale
  // clients (older Capacitor builds) still listening only for 'card.updated'
  // won't converge on reorder until refreshed — acceptable, single-developer app.
  | {
      type: "cards.reordered";
      payload: {
        cards: Pick<
          CardInterface,
          "id" | "section_id" | "position" | "done_at" | "section_entered_at"
        >[];
      };
    }
  // One batched event when completing a sprint re-homes its unfinished cards.
  | {
      type: "cards.sprint_changed";
      payload: { cards: Pick<CardInterface, "id" | "sprint_id">[] };
    }
  | { type: "section.created" | "section.updated"; payload: SectionData }
  | { type: "section.deleted"; payload: { id: number } }
  | { type: "sections.reordered"; payload: { section_ids: number[] } }
  | { type: "sprint.created" | "sprint.updated"; payload: SprintInterface }
  | { type: "sprint.deleted"; payload: { id: number } }
  | { type: "message.created"; payload: ChatMessage }
  | { type: "message.deleted"; payload: { id: number } };

interface UseBoardRealtimeParams {
  boardId: number;
  isDemo: boolean;
  currentUserId: number;
  setCards: Dispatch<SetStateAction<CardInterface[]>>;
  setSections: Dispatch<SetStateAction<SectionData[]>>;
  setSprints: Dispatch<SetStateAction<SprintInterface[]>>;
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
}

// Realtime board sync: subscribes to the private `board.{id}` channel and reconciles
// card/section/sprint/chat state from broadcast events. While a card is being dragged
// we must NOT mutate the sortable lists, or dnd-kit re-measures mid-drag and loops
// (React #185) — the drag handlers set `isDraggingRef`, events that land during a drag
// are queued, and `flushPendingBoardEvents` replays them once the drag settles.
export function useBoardRealtime({
  boardId,
  isDemo,
  currentUserId,
  setCards,
  setSections,
  setSprints,
  setChatMessages,
}: UseBoardRealtimeParams) {
  const chatChannelRef = useRef<ReturnType<Echo<"reverb">["private"]> | null>(
    null,
  );
  const isDraggingRef = useRef(false);
  const pendingBoardEventsRef = useRef<BoardEventPayload[]>([]);

  // Apply one realtime board event to local state. Kept as a stable callback so the drag
  // handlers can also replay queued events after a drag finishes.
  const applyBoardEvent = useCallback((e: BoardEventPayload) => {
    switch (e.type) {
      case "card.created":
        setCards((prev) =>
          prev.some((c) => c.id === e.payload.id) ? prev : [...prev, e.payload],
        );
        break;
      case "card.updated":
        setCards((prev) =>
          prev.map((c) => (c.id === e.payload.id ? { ...c, ...e.payload } : c)),
        );
        break;
      case "card.deleted":
        setCards((prev) => prev.filter((c) => c.id !== e.payload.id));
        break;
      // Batched merges — same semantics as the N individual card.updated events
      // they replace. They flow through the same during-drag queue/replay path
      // as every other event (see the .listen handler below).
      case "cards.reordered":
      case "cards.sprint_changed": {
        const byId = new Map(e.payload.cards.map((u) => [u.id, u]));
        setCards((prev) =>
          prev.map((c) => {
            const patch = byId.get(c.id);
            return patch ? { ...c, ...patch } : c;
          }),
        );
        break;
      }
      case "card.restored":
        setCards((prev) =>
          prev.some((c) => c.id === e.payload.id) ? prev : [...prev, e.payload],
        );
        break;
      case "section.created":
        setSections((prev) =>
          prev.some((s) => s.id === e.payload.id) ? prev : [...prev, e.payload],
        );
        break;
      case "section.updated":
        setSections((prev) =>
          prev.map((s) => (s.id === e.payload.id ? { ...s, ...e.payload } : s)),
        );
        break;
      case "section.deleted":
        setSections((prev) => prev.filter((s) => s.id !== e.payload.id));
        setCards((prev) => prev.filter((c) => c.section_id !== e.payload.id));
        break;
      case "sections.reordered": {
        const ids: number[] = e.payload.section_ids;
        setSections((prev) => {
          const map = new Map(prev.map((s) => [s.id, s]));
          const sorted = ids
            .map((id) => map.get(id))
            .filter(Boolean) as typeof prev;
          const rest = prev.filter((s) => !ids.includes(s.id));
          return [...sorted, ...rest];
        });
        break;
      }
      case "sprint.created":
        setSprints((prev) =>
          prev.some((s) => s.id === e.payload.id) ? prev : [...prev, e.payload],
        );
        break;
      case "sprint.updated":
        setSprints((prev) => {
          // A sprint becoming active deactivates the others (single-active invariant).
          const next = prev.map((s) =>
            s.id === e.payload.id ? { ...s, ...e.payload } : s,
          );
          return e.payload.is_active
            ? next.map((s) =>
                s.id === e.payload.id ? s : { ...s, is_active: false },
              )
            : next;
        });
        break;
      case "sprint.deleted":
        setSprints((prev) => prev.filter((s) => s.id !== e.payload.id));
        break;
      case "message.created":
        setChatMessages((prev) =>
          prev.some((m) => m.id === e.payload.id) ? prev : [...prev, e.payload],
        );
        break;
      case "message.deleted":
        setChatMessages((prev) => prev.filter((m) => m.id !== e.payload.id));
        break;
    }
  }, []);

  // Replay any board events that were queued while a drag was in progress.
  const flushPendingBoardEvents = useCallback(() => {
    if (pendingBoardEventsRef.current.length === 0) return;
    const queued = pendingBoardEventsRef.current;
    pendingBoardEventsRef.current = [];
    queued.forEach(applyBoardEvent);
  }, [applyBoardEvent]);

  useEffect(() => {
    if (isDemo || boardId === 0 || currentUserId === 0) return;

    const echo = getEcho();
    const channel = echo.private(`board.${boardId}`);
    chatChannelRef.current = channel;

    channel.listen(".board.event", (e: BoardEventPayload) => {
      // Never mutate the board while dragging — queue and replay on drop/cancel.
      if (isDraggingRef.current) {
        pendingBoardEventsRef.current.push(e);
        return;
      }
      applyBoardEvent(e);
    });

    return () => {
      echo.leave(`board.${boardId}`);
      chatChannelRef.current = null;
    };
  }, [boardId, isDemo, currentUserId, applyBoardEvent]);

  return { isDraggingRef, flushPendingBoardEvents };
}
