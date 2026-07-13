"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PlanningEventPayload,
  PlanningSnapshot,
} from "@/interfaces/PlanningInterface";
import {
  ApiError,
  applyPlanning,
  getPlanning,
  joinPlanning,
  leavePlanning,
  pingPlanning,
  resetPlanning,
  revealPlanning,
  timerPlanning,
  votePlanning,
} from "@/lib/api";
import { getEcho } from "@/lib/echo";

type IncomingEvent = { type: string; payload: PlanningEventPayload };

// An estimate committed to the card — consumers react to this *event* (not to
// applied_value itself, which is just the card's current story_points).
export type PlanningApplied = { value: number | null; at: string };

const HEARTBEAT_MS = 25_000;

function isCleared(
  p: PlanningEventPayload,
): p is { card_id: number; board_id: number; cleared: true } {
  return (p as { cleared?: boolean }).cleared === true;
}

// Only accept a well-formed snapshot; anything else (null, {}, an error shape,
// or apiFetch's `{}` fallback for a non-JSON body) means "no active session".
function normalize(data: unknown): PlanningSnapshot | null {
  return data &&
    typeof data === "object" &&
    Array.isArray((data as PlanningSnapshot).participants)
    ? (data as PlanningSnapshot)
    : null;
}

function friendlyError(e: unknown): string {
  if (e instanceof ApiError) {
    try {
      const message = (JSON.parse(e.body) as { message?: string }).message;
      if (message) return message;
    } catch {
      // fall through to the generic message
    }
  }
  return "That didn't go through — try again.";
}

// Live Planning Poker session for one card. Fetches the current snapshot, then
// listens on the SHARED private `board.{id}` channel for `planning.updated` events
// scoped to this card. Cleanup only detaches its own listener — it must never call
// `echo.leave`, which would tear down the Board component's subscription too.
export function usePlanningSession(
  boardId: number | undefined,
  cardId: number | string | undefined,
  enabled: boolean,
  currentUserId?: number,
) {
  const [snapshot, setSnapshot] = useState<PlanningSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<PlanningApplied | null>(null);

  const numericCardId = typeof cardId === "number" ? cardId : Number(cardId);

  // Mirror of the latest snapshot, so commit() can diff without re-subscribing.
  const snapRef = useRef<PlanningSnapshot | null>(null);

  // Single write path for snapshots (HTTP + socket). Carries my_value across
  // broadcast snapshots (which omit it) within the same round, and surfaces an
  // `applied` event when applied_at advances.
  const commit = useCallback((incoming: PlanningSnapshot | null) => {
    const prev = snapRef.current;
    let next = incoming;
    if (
      next &&
      prev &&
      prev.round === next.round &&
      next.my_value === undefined
    ) {
      next = { ...next, my_value: prev.my_value };
    }
    // Only surface `applied` when applied_at ADVANCES from a known prior snapshot.
    // The first snapshot may already carry an applied_at from a past apply — that's
    // just the loaded baseline (already reflected in the card's story_points), not a
    // fresh apply, so it must not trigger the mirror-into-points + dirty side effect
    // that would mark a freshly-opened card dirty.
    if (next?.applied_at && prev && next.applied_at !== prev.applied_at) {
      setApplied({ value: next.applied_value ?? null, at: next.applied_at });
    }
    snapRef.current = next;
    setSnapshot(next);
  }, []);

  useEffect(() => {
    if (!enabled || !boardId || !numericCardId) return;
    let cancelled = false;
    const controller = new AbortController();

    setLoading(true);
    getPlanning(boardId, numericCardId, controller.signal)
      .then((data) => {
        if (!cancelled) commit(normalize(data));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const channel = getEcho().private(`board.${boardId}`);
    const handler = (e: IncomingEvent) => {
      if (e.type !== "planning.updated") return;
      if (e.payload.card_id !== numericCardId) return;
      commit(isCleared(e.payload) ? null : normalize(e.payload));
    };
    channel.listen(".board.event", handler);

    return () => {
      cancelled = true;
      controller.abort();
      // Detach ONLY our handler — do not leave the channel (Board owns it).
      channel.stopListening(".board.event", handler);
    };
  }, [enabled, boardId, numericCardId, commit]);

  // Presence heartbeat — while I'm seated, ping so the server knows I'm alive
  // (silent non-voters get swept from the round). Fires immediately when the tab
  // regains focus so a sleeping laptop resyncs at once.
  const seated =
    !!currentUserId &&
    !!snapshot?.participants.some((p) => p.user_id === currentUserId);
  useEffect(() => {
    if (!enabled || !boardId || !numericCardId || !seated) return;
    let cancelled = false;

    const tick = () => {
      pingPlanning(boardId, numericCardId)
        .then((data) => {
          if (!cancelled) commit(normalize(data));
        })
        .catch(() => {}); // a missed heartbeat is not an error worth surfacing
    };
    const interval = setInterval(tick, HEARTBEAT_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, boardId, numericCardId, seated, commit]);

  // Errors are transient — show, then clear.
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(t);
  }, [error]);

  // Wrap each action so a failing call surfaces instead of silently wedging the
  // UI. A 404 means the session vanished under us (everyone left / swept) — resync
  // to "no session" rather than erroring. fn resolves `unknown` because apply
  // answers with the bare card (not a snapshot) when no session exists.
  const run = useCallback(
    async (fn: () => Promise<unknown>) => {
      setBusy(true);
      setError(null);
      try {
        const next = normalize(await fn());
        commit(next);
        return next;
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
          commit(null);
          setError("This session has ended.");
        } else {
          setError(friendlyError(e));
        }
        return null;
      } finally {
        setBusy(false);
      }
    },
    [commit],
  );

  const join = useCallback(
    (opts: { deck?: string; spectator?: boolean } = {}) =>
      run(() => joinPlanning(boardId!, numericCardId, opts)),
    [run, boardId, numericCardId],
  );
  const leave = useCallback(
    () => run(() => leavePlanning(boardId!, numericCardId)),
    [run, boardId, numericCardId],
  );
  const vote = useCallback(
    (value: string) => run(() => votePlanning(boardId!, numericCardId, value)),
    [run, boardId, numericCardId],
  );
  const reveal = useCallback(
    () => run(() => revealPlanning(boardId!, numericCardId)),
    [run, boardId, numericCardId],
  );
  const reset = useCallback(
    () => run(() => resetPlanning(boardId!, numericCardId)),
    [run, boardId, numericCardId],
  );
  const apply = useCallback(
    (value: number) => run(() => applyPlanning(boardId!, numericCardId, value)),
    [run, boardId, numericCardId],
  );
  const timer = useCallback(
    (seconds: number) =>
      run(() => timerPlanning(boardId!, numericCardId, seconds)),
    [run, boardId, numericCardId],
  );

  return {
    snapshot,
    loading,
    busy,
    error,
    applied,
    join,
    leave,
    vote,
    reveal,
    reset,
    apply,
    timer,
  };
}
