'use client'

import { useEffect, useState } from 'react'

// CRM SLA aging — one source of truth shared by the board card and the list row so
// both flip to "aged" (overdue in its stage) on identical rules.

// Wall-clock ms at which a card crosses its stage SLA, or null if it never will:
// the card is done, the stage has no threshold, or we don't know when it entered.
export function agingThresholdMs(
    sectionEnteredAt?: string | null,
    agingHours?: number | null,
    doneAt?: string | null,
): number | null {
    if (doneAt) return null
    if (!agingHours || agingHours <= 0) return null
    if (!sectionEnteredAt) return null
    const entered = new Date(sectionEnteredAt).getTime()
    if (Number.isNaN(entered)) return null
    return entered + agingHours * 3_600_000
}

// setTimeout clamps delays past ~24.8 days to a mess; anything beyond this we let a
// natural re-render (reload / realtime event) catch instead of scheduling.
const MAX_TIMEOUT = 2_000_000_000

// True once the card has sat in its stage past the SLA. Schedules a single re-render
// exactly when the threshold passes, so a board left open flips the card to red live —
// no global polling interval.
export function useAged(
    sectionEnteredAt?: string | null,
    agingHours?: number | null,
    doneAt?: string | null,
): boolean {
    const threshold = agingThresholdMs(sectionEnteredAt, agingHours, doneAt)
    const [, tick] = useState(0)

    useEffect(() => {
        if (threshold == null) return
        const remaining = threshold - Date.now()
        if (remaining <= 0) return            // already aged — nothing to schedule
        if (remaining > MAX_TIMEOUT) return
        const t = setTimeout(() => tick(x => x + 1), remaining + 50)
        return () => clearTimeout(t)
    }, [threshold])

    return threshold != null && Date.now() >= threshold
}

// One timer for a whole list of cards: fires a re-render when the soonest card crosses
// its SLA. `resolveThreshold` maps each card to its threshold ms (or null). Returns a
// tick counter you don't need to read — depending on it forces the re-evaluation.
export function useAgingTick<T>(
    items: T[],
    enabled: boolean,
    resolveThreshold: (item: T) => number | null,
): number {
    const [tick, setTick] = useState(0)

    useEffect(() => {
        if (!enabled) return
        const nowMs = Date.now()
        let soonest = Infinity
        for (const item of items) {
            const th = resolveThreshold(item)
            if (th != null && th > nowMs && th < soonest) soonest = th
        }
        if (soonest === Infinity) return
        const delay = soonest - Date.now() + 50
        if (delay > MAX_TIMEOUT) return
        const t = setTimeout(() => setTick(x => x + 1), delay)
        return () => clearTimeout(t)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, items, tick])

    return tick
}
