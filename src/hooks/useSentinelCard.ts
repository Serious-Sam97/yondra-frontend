'use client'

import { useCallback, useEffect, useState } from 'react'
import { getEcho } from '@/lib/echo'
import {
  createTestCase,
  createTestRun,
  deleteTestCase,
  generateCiToken as apiGenerateCiToken,
  getQa,
  linkBug as apiLinkBug,
  setCaseVerdict,
  updateTestCase,
} from '@/lib/api'
import type { TestCase, Verdict } from '@/interfaces/QAInterface'

type IncomingEvent = { type: string; payload: unknown }

const isCase = (p: unknown): p is TestCase =>
  !!p && typeof p === 'object' && Array.isArray((p as TestCase).runs)

function sortCases(list: TestCase[]): TestCase[] {
  return [...list].sort((a, b) => a.position - b.position || a.id - b.id)
}

// Per-card QA session: N test cases (each with N runs). Fetches the card's cases,
// then listens on the SHARED private board.{id} channel for qa.* events scoped to
// this card. Cleanup detaches only its own listener (never echo.leave — Board owns it).
export function useSentinelCard(
  boardId: number | undefined,
  cardId: number | string | undefined,
  enabled: boolean,
) {
  const [cases, setCases] = useState<TestCase[]>([])
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  const numericCardId = typeof cardId === 'number' ? cardId : Number(cardId)

  const upsert = useCallback((c: TestCase) => {
    setCases((prev) => {
      const exists = prev.some((x) => x.id === c.id)
      return sortCases(exists ? prev.map((x) => (x.id === c.id ? c : x)) : [...prev, c])
    })
  }, [])

  useEffect(() => {
    if (!enabled || !boardId || !numericCardId) return
    let cancelled = false
    const controller = new AbortController()

    setLoading(true)
    getQa(boardId, numericCardId, controller.signal)
      .then((data) => {
        if (cancelled) return
        const list: TestCase[] = sortCases(data?.cases ?? [])
        setCases(list)
        setSelectedCaseId((cur) => cur ?? list[0]?.id ?? null)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    const channel = getEcho().private(`board.${boardId}`)
    const handler = (e: IncomingEvent) => {
      if (!e.type.startsWith('qa.')) return
      const p = e.payload as { card_id?: number; id?: number }
      if (p.card_id !== numericCardId) return
      if (e.type === 'qa.case.deleted') {
        setCases((prev) => prev.filter((x) => x.id !== p.id))
      } else if (isCase(e.payload)) {
        upsert(e.payload)
      }
    }
    channel.listen('.board.event', handler)

    return () => {
      cancelled = true
      controller.abort()
      channel.stopListening('.board.event', handler)
    }
  }, [enabled, boardId, numericCardId, upsert])

  const run = useCallback(
    async <T>(fn: () => Promise<T>) => {
      setBusy(true)
      try {
        return await fn()
      } finally {
        setBusy(false)
      }
    },
    [],
  )

  const createCase = useCallback(
    (title: string, type = 'manual') =>
      run(async () => {
        const c: TestCase = await createTestCase(boardId!, numericCardId, { title, type })
        upsert(c)
        setSelectedCaseId(c.id)
        return c
      }),
    [run, boardId, numericCardId, upsert],
  )

  const saveCase = useCallback(
    (caseId: number, patch: Record<string, unknown>) =>
      run(async () => {
        const c: TestCase = await updateTestCase(boardId!, numericCardId, caseId, patch)
        upsert(c)
        return c
      }),
    [run, boardId, numericCardId, upsert],
  )

  const removeCase = useCallback(
    (caseId: number) =>
      run(async () => {
        await deleteTestCase(boardId!, numericCardId, caseId)
        setCases((prev) => {
          const next = prev.filter((x) => x.id !== caseId)
          setSelectedCaseId((cur) => (cur === caseId ? next[0]?.id ?? null : cur))
          return next
        })
      }),
    [run, boardId, numericCardId],
  )

  const launchRun = useCallback(
    (caseId: number, payload: Parameters<typeof createTestRun>[3]) =>
      run(async () => {
        const c: TestCase = await createTestRun(boardId!, numericCardId, caseId, payload)
        upsert(c)
        return c
      }),
    [run, boardId, numericCardId, upsert],
  )

  const linkBug = useCallback(
    (caseId: number) =>
      run(async () => {
        const c: TestCase = await apiLinkBug(boardId!, numericCardId, caseId)
        upsert(c)
        return c
      }),
    [run, boardId, numericCardId, upsert],
  )

  const setVerdict = useCallback(
    (caseId: number, verdict: Verdict | null) =>
      run(async () => {
        const c: TestCase = await setCaseVerdict(boardId!, numericCardId, caseId, verdict)
        upsert(c)
        return c
      }),
    [run, boardId, numericCardId, upsert],
  )

  const generateCiToken = useCallback(
    (caseId: number) =>
      run(async () => {
        const c: TestCase = await apiGenerateCiToken(boardId!, numericCardId, caseId)
        upsert(c)
        return c
      }),
    [run, boardId, numericCardId, upsert],
  )

  return {
    cases,
    selectedCaseId,
    setSelectedCaseId,
    loading,
    busy,
    createCase,
    saveCase,
    removeCase,
    launchRun,
    linkBug,
    setVerdict,
    generateCiToken,
  }
}
