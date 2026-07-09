'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getEcho } from '@/lib/echo'
import { createTestPlan, getTestPlans } from '@/lib/api'
import type { TestPlan } from '@/interfaces/QAInterface'

type IncomingEvent = { type: string; payload: unknown }

// The board's test plans / suites, normalized by id + kept live. Cases link to plans
// by id (saved on the case), so this just supplies the list + a create action.
export function useTestPlans(boardId: number | undefined, enabled: boolean) {
  const [plansById, setPlansById] = useState<Record<number, TestPlan>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!enabled || !boardId) return
    let cancelled = false
    const controller = new AbortController()

    getTestPlans(boardId, controller.signal)
      .then((data) => {
        if (cancelled) return
        const map: Record<number, TestPlan> = {}
        for (const p of data?.plans ?? []) map[p.id] = p
        setPlansById(map)
      })
      .catch(() => {})

    const channel = getEcho().private(`board.${boardId}`)
    const handler = (e: IncomingEvent) => {
      if (e.type === 'qa.plan.updated') {
        const p = e.payload as TestPlan
        setPlansById((m) => ({ ...m, [p.id]: p }))
      } else if (e.type === 'qa.plan.deleted') {
        const id = (e.payload as { id: number }).id
        setPlansById((m) => {
          const n = { ...m }
          delete n[id]
          return n
        })
      }
    }
    channel.listen('.board.event', handler)

    return () => {
      cancelled = true
      controller.abort()
      channel.stopListening('.board.event', handler)
    }
  }, [enabled, boardId])

  const plans = useMemo(
    () => Object.values(plansById).sort((a, b) => a.name.localeCompare(b.name)),
    [plansById],
  )

  const create = useCallback(
    (name: string, description?: string) => {
      setBusy(true)
      return createTestPlan(boardId!, { name, description })
        .then((p: TestPlan) => {
          setPlansById((m) => ({ ...m, [p.id]: p }))
          return p
        })
        .finally(() => setBusy(false))
    },
    [boardId],
  )

  return { plansById, plans, busy, create }
}
