'use client'

import { useEffect, useState } from 'react'
import { getQaOverview } from '@/lib/api'
import { STATUS_META, type CaseStatus } from '@/interfaces/QAInterface'

interface OverviewCase {
  id: number
  title: string
  card_id: number
  card_name: string | null
  latest_status: CaseStatus
}
interface OverviewPlan {
  id: number
  name: string
  description: string | null
  cases: OverviewCase[]
}

// Worst-wins rollup over a plan's case statuses.
function planRollup(cases: OverviewCase[]): CaseStatus | 'none' {
  if (cases.length === 0) return 'none'
  const s = cases.map((c) => c.latest_status)
  if (s.includes('failed')) return 'failed'
  if (s.includes('not_run')) return 'not_run'
  if (s.includes('awaiting_retest')) return 'awaiting_retest'
  if (s.includes('blocked')) return 'blocked'
  return 'passed'
}

function Led({ status, size = 8 }: { status: CaseStatus | 'none'; size?: number }) {
  const { color } = STATUS_META[status]
  return <span className="cf-led flex-shrink-0" style={{ background: color, boxShadow: `0 0 5px ${color}`, width: size, height: size }} />
}

export function TestPlansOverview({
  boardId,
  onCaseClick,
}: {
  boardId: number
  onCaseClick: (cardId: number) => void
}) {
  const [plans, setPlans] = useState<OverviewPlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    getQaOverview(boardId, controller.signal)
      .then((data) => setPlans(data?.plans ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [boardId])

  if (loading) {
    return <p className="cf-mono py-10 text-center" style={{ fontSize: '12px', color: 'var(--cf-text-dim)' }}>Loading plans…</p>
  }

  if (plans.length === 0) {
    return (
      <div className="py-16 text-center flex flex-col gap-2 items-center">
        <p style={{ color: 'var(--cf-text-muted)', fontSize: '13px' }}>No test plans yet.</p>
        <p className="cf-mono" style={{ color: 'var(--cf-text-dim)', fontSize: '11px' }}>
          Link a test case to a plan (e.g. “Regressão v2.0”) from a card’s Sentinel tab.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-8">
      {plans.map((plan) => {
        const rollup = planRollup(plan.cases)
        const passed = plan.cases.filter((c) => c.latest_status === 'passed').length
        return (
          <div key={plan.id} className="aero-column p-0 overflow-hidden">
            {/* Plan header */}
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--cf-edge)' }}>
              <div className="flex items-center gap-2.5">
                <Led status={rollup} size={11} />
                <div>
                  <div className="cf-label uppercase tracking-widest font-bold" style={{ fontSize: '12px', color: 'var(--cf-text)' }}>{plan.name}</div>
                  <div className="cf-mono" style={{ fontSize: '10px', color: 'var(--cf-text-dim)' }}>
                    {passed}/{plan.cases.length} passed · {STATUS_META[rollup].label}
                  </div>
                </div>
              </div>
              <span className="cf-mono px-2 py-0.5 rounded-sm" style={{ background: '#1c1a16', color: 'var(--cf-cyan)', fontSize: '11px' }}>
                {plan.cases.length} case{plan.cases.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Cases across cards */}
            {plan.cases.length === 0 ? (
              <p className="cf-mono px-4 py-4" style={{ fontSize: '11px', color: 'var(--cf-text-dim)' }}>No cases linked yet.</p>
            ) : (
              plan.cases.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onCaseClick(c.card_id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left border-b last:border-0 hover:bg-white/5 transition-colors cursor-pointer"
                  style={{ borderColor: 'var(--cf-edge)' }}
                >
                  <Led status={c.latest_status} />
                  <span className="cf-mono flex-1 truncate" style={{ fontSize: '12px', color: 'var(--cf-text)' }}>{c.title}</span>
                  <span className="cf-mono truncate" style={{ fontSize: '10px', color: 'var(--cf-text-dim)', maxWidth: 160 }}>{c.card_name ?? '—'}</span>
                  <span className="cf-mono uppercase" style={{ fontSize: '9px', letterSpacing: '0.08em', color: STATUS_META[c.latest_status].color }}>
                    {STATUS_META[c.latest_status].label}
                  </span>
                </button>
              ))
            )}
          </div>
        )
      })}
    </div>
  )
}
