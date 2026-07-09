'use client'

import Icon from '@/components/ui/Icon'
import { faBolt, faChartLine, faFlagCheckered } from '@fortawesome/free-solid-svg-icons'
import type { SprintInterface } from '@/interfaces/SprintInterface'
import type { CardInterface } from '@/interfaces/CardInterface'
import type { SectionData } from '@/interfaces/BoardInterface'
import { toNumber } from '@/lib/currency'

function fmtDate(d?: string | null): string {
    return d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'
}

function daysLeft(end?: string | null): number | null {
    if (!end) return null
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const e = new Date(end + 'T00:00:00')
    return Math.round((e.getTime() - today.getTime()) / 86400000)
}

// Compact active-sprint status bar meant to sit inline in the board's top toggle row:
// name · dates · days-left · per-column point pills · Complete · Report.
export function SprintStatusBar({ sprint, sections, sprintCards, canManage, onComplete, onOpenReport }: {
    sprint: SprintInterface;
    sections: SectionData[];
    sprintCards: CardInterface[];
    canManage: boolean;
    onComplete: (sprint: SprintInterface) => void;
    onOpenReport: (sprint: SprintInterface) => void;
}) {
    const columnPoints = sections.map(sec => ({
        name: sec.name,
        points: sprintCards.filter(c => c.section_id === sec.id).reduce((sum, c) => sum + toNumber(c.story_points), 0),
    }))
    const dLeft = daysLeft(sprint.end_date)

    return (
        <div className="glass-panel flex items-center gap-3 flex-wrap px-4 py-2.5 rounded-2xl mb-4">
            <span className="cf-mono uppercase tracking-widest font-bold flex items-center gap-2 flex-shrink-0" style={{ fontSize: '13px', color: 'var(--cf-text)' }}>
                <Icon icon={faBolt} style={{ color: 'var(--cf-phosphor)', fontSize: 13 }} />
                {sprint.name}
                <span className="cf-led" style={{ background: 'var(--cf-phosphor)', boxShadow: '0 0 6px var(--cf-phosphor)', width: 7, height: 7 }} />
            </span>

            {sprint.goal && (
                <span className="cf-mono truncate hidden lg:block" style={{ fontSize: '12px', color: 'var(--cf-text-muted)', maxWidth: 220 }} title={sprint.goal}>“{sprint.goal}”</span>
            )}

            <span className="cf-mono flex items-center gap-2" style={{ fontSize: '12px', color: 'var(--cf-text-muted)' }}>
                {fmtDate(sprint.start_date)} – {fmtDate(sprint.end_date)}
                {dLeft !== null && (
                    <span className="font-bold" style={{ color: dLeft < 0 ? 'var(--cf-red)' : dLeft <= 2 ? 'var(--cf-amber)' : 'var(--cf-phosphor)' }}>
                        · {dLeft < 0 ? `${Math.abs(dLeft)}d overdue` : dLeft === 0 ? 'due today' : `${dLeft}d left`}
                    </span>
                )}
            </span>

            {/* Per-column point pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
                {columnPoints.map(col => (
                    <span key={col.name} className="cf-mono px-2.5 py-1 rounded-sm tabular-nums" style={{ fontSize: '11px', letterSpacing: '0.06em', color: 'var(--cf-text-muted)', background: '#0d1410' }}>
                        {col.name} <span className="font-bold" style={{ color: 'var(--cf-cyan)' }}>{col.points}</span>
                    </span>
                ))}
            </div>

            <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                <button onClick={() => onOpenReport(sprint)}
                    className="aero-btn aero-btn--ghost text-[11px] uppercase tracking-widest font-bold px-3 py-2 cursor-pointer inline-flex items-center gap-1.5">
                    <Icon icon={faChartLine} style={{ fontSize: '11px' }} /> Report
                </button>
                {canManage && (
                    <button onClick={() => onComplete(sprint)}
                        className="aero-btn aero-btn--cyan text-[11px] uppercase tracking-widest font-bold px-3 py-2 cursor-pointer inline-flex items-center gap-1.5">
                        <Icon icon={faFlagCheckered} style={{ fontSize: '11px' }} /> Complete sprint
                    </button>
                )}
            </div>
        </div>
    )
}
