'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getEcho } from '@/lib/echo'
import {
  applyPlanning,
  getPlanning,
  joinPlanning,
  leavePlanning,
  resetPlanning,
  revealPlanning,
  votePlanning,
} from '@/lib/api'
import type {
  PlanningEventPayload,
  PlanningSnapshot,
} from '@/interfaces/PlanningInterface'

type IncomingEvent = { type: string; payload: PlanningEventPayload }

function isCleared(
  p: PlanningEventPayload,
): p is { card_id: number; board_id: number; cleared: true } {
  return (p as { cleared?: boolean }).cleared === true
}

// Only accept a well-formed snapshot; anything else (null, {}, an error shape,
// or apiFetch's `{}` fallback for a non-JSON body) means "no active session".
function normalize(data: unknown): PlanningSnapshot | null {
  return data &&
    typeof data === 'object' &&
    Array.isArray((data as PlanningSnapshot).participants)
    ? (data as PlanningSnapshot)
    : null
}

// Live Planning Poker session for one card. Fetches the current snapshot, then
// listens on the SHARED private `board.{id}` channel for `planning.updated` events
// scoped to this card. Cleanup only detaches its own listener — it must never call
// `echo.leave`, which would tear down the Board component's subscription too.
export function usePlanningSession(
  boardId: number | undefined,
  cardId: number | string | undefined,
  enabled: boolean,
) {
  const [snapshot, setSnapshot] = useState<PlanningSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  const numericCardId =
    typeof cardId === 'number' ? cardId : Number(cardId)

  useEffect(() => {
    if (!enabled || !boardId || !numericCardId) return
    let cancelled = false
    const controller = new AbortController()

    setLoading(true)
    getPlanning(boardId, numericCardId, controller.signal)
      .then((data) => {
        if (!cancelled) setSnapshot(normalize(data))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    const channel = getEcho().private(`board.${boardId}`)
    const handler = (e: IncomingEvent) => {
      if (e.type !== 'planning.updated') return
      if (e.payload.card_id !== numericCardId) return
      setSnapshot(isCleared(e.payload) ? null : normalize(e.payload))
    }
    channel.listen('.board.event', handler)

    return () => {
      cancelled = true
      controller.abort()
      // Detach ONLY our handler — do not leave the channel (Board owns it).
      channel.stopListening('.board.event', handler)
    }
  }, [enabled, boardId, numericCardId])

  // Wrap each action so a failing call doesn't wedge the UI; the returned snapshot
  // updates state immediately for the actor (others get it over the socket).
  const run = useCallback(
    async (fn: () => Promise<PlanningSnapshot | null>) => {
      setBusy(true)
      try {
        const next = normalize(await fn())
        setSnapshot(next)
        return next
      } finally {
        setBusy(false)
      }
    },
    [],
  )

  const join = useCallback(
    () => run(() => joinPlanning(boardId!, numericCardId)),
    [run, boardId, numericCardId],
  )
  const leave = useCallback(
    () => run(() => leavePlanning(boardId!, numericCardId)),
    [run, boardId, numericCardId],
  )
  const vote = useCallback(
    (value: string) => run(() => votePlanning(boardId!, numericCardId, value)),
    [run, boardId, numericCardId],
  )
  const reveal = useCallback(
    () => run(() => revealPlanning(boardId!, numericCardId)),
    [run, boardId, numericCardId],
  )
  const reset = useCallback(
    () => run(() => resetPlanning(boardId!, numericCardId)),
    [run, boardId, numericCardId],
  )
  const apply = useCallback(
    (value: number) => run(() => applyPlanning(boardId!, numericCardId, value)),
    [run, boardId, numericCardId],
  )

  return { snapshot, loading, busy, join, leave, vote, reveal, reset, apply }
}
