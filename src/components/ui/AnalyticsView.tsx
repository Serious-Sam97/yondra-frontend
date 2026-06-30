'use client'

const SECTION_COLORS = ['#9aa67e', '#ffb000', '#6fe0ff', '#ff5a4d', '#c08bff', '#ffd24a']

interface Section { id: number; name: string }

interface AnalyticsViewProps {
    cards: any[]
    sections: Section[]
}

export function AnalyticsView({ cards, sections }: AnalyticsViewProps) {
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    const total = cards.length
    const doneSection = sections.find(s => s.name?.toLowerCase() === 'done')
    const done = doneSection ? cards.filter(c => c.section_id === doneSection.id).length : 0
    const donePercent = total > 0 ? Math.round((done / total) * 100) : 0
    const overdue = cards.filter(c =>
        c.due_date &&
        c.due_date.slice(0, 10) < todayStr &&
        (!doneSection || c.section_id !== doneSection.id)
    ).length
    const withDue = cards.filter(c => c.due_date).length

    const bySection = sections
        .map((s, i) => ({
            name: s.name,
            count: cards.filter(c => c.section_id === s.id).length,
            color: SECTION_COLORS[i % SECTION_COLORS.length],
        }))
        .filter(s => s.count > 0)

    const maxSection = Math.max(...bySection.map(s => s.count), 1)

    const priorityRows = [
        { label: 'High',   color: '#ff5a4d', count: cards.filter(c => c.priority === 'high').length },
        { label: 'Medium', color: '#ffb000', count: cards.filter(c => c.priority === 'medium').length },
        { label: 'Low',    color: '#9aa67e', count: cards.filter(c => c.priority === 'low').length },
        { label: 'None',   color: '#4a463f', count: cards.filter(c => !c.priority).length },
    ].filter(r => r.count > 0)

    const maxPriority = Math.max(...priorityRows.map(p => p.count), 1)

    // Due date distribution: overdue / today / this week / next week / later / none
    const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1)
    const nextWeek  = new Date(now); nextWeek.setDate(nextWeek.getDate() + 7)
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
    const nextWeekStr = `${nextWeek.getFullYear()}-${String(nextWeek.getMonth() + 1).padStart(2, '0')}-${String(nextWeek.getDate()).padStart(2, '0')}`

    const dueRows = [
        { label: 'Overdue',    color: '#ff5a4d', count: cards.filter(c => c.due_date && c.due_date.slice(0, 10) < todayStr).length },
        { label: 'Due today',  color: '#ffb000', count: cards.filter(c => c.due_date && c.due_date.slice(0, 10) === todayStr).length },
        { label: 'This week',  color: '#ffd24a', count: cards.filter(c => c.due_date && c.due_date.slice(0, 10) > todayStr && c.due_date.slice(0, 10) <= nextWeekStr).length },
        { label: 'Later',      color: '#6fe0ff', count: cards.filter(c => c.due_date && c.due_date.slice(0, 10) > nextWeekStr).length },
        { label: 'No due date',color: '#4a463f', count: cards.filter(c => !c.due_date).length },
    ].filter(r => r.count > 0)

    const maxDue = Math.max(...dueRows.map(r => r.count), 1)

    if (total === 0) {
        return (
            <div className="flex items-center justify-center py-24">
                <p className="cf-label text-xs uppercase tracking-widest" style={{ color: 'var(--cf-text-muted)' }}>No cards yet — add some tickets to see analytics</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-5 pb-8">

            {/* Summary stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Total',       value: String(total),              color: 'var(--cf-phosphor)' },
                    { label: 'Completed',   value: `${done} (${donePercent}%)`, color: 'var(--cf-phosphor)' },
                    { label: 'Overdue',     value: String(overdue),            color: overdue > 0 ? 'var(--cf-red)' : 'var(--cf-text-muted)' },
                    { label: 'With Due Date', value: String(withDue),          color: 'var(--cf-amber)' },
                ].map(stat => (
                    <div key={stat.label} className="glass-panel cf-screen rounded-xl p-4 flex flex-col gap-1">
                        <p className="cf-label text-[10px] uppercase tracking-widest" style={{ color: 'var(--cf-text-muted)' }}>{stat.label}</p>
                        <p className="cf-lcd text-2xl font-bold leading-tight" style={{ color: stat.color, textShadow: `0 0 14px ${stat.color}` }}>{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid md:grid-cols-2 gap-5">
                {/* Cards by section */}
                <div className="glass-panel rounded-xl p-5 flex flex-col gap-4">
                    <p className="cf-label text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--cf-text-muted)' }}>By Section</p>
                    <div className="flex flex-col gap-3">
                        {bySection.map(s => (
                            <div key={s.name} className="flex items-center gap-3">
                                <span className="cf-mono text-[10px] uppercase tracking-widest font-bold w-20 flex-shrink-0 truncate" style={{ color: s.color, textShadow: `0 0 8px ${s.color}` }}>
                                    {s.name}
                                </span>
                                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--cf-screen)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)' }}>
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${(s.count / maxSection) * 100}%`, background: s.color, boxShadow: `0 0 8px ${s.color}` }}
                                    />
                                </div>
                                <span className="cf-lcd text-sm font-bold w-5 text-right flex-shrink-0" style={{ color: 'var(--cf-text)' }}>{s.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Priority breakdown */}
                <div className="glass-panel rounded-xl p-5 flex flex-col gap-4">
                    <p className="cf-label text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--cf-text-muted)' }}>By Priority</p>
                    <div className="flex flex-col gap-3">
                        {priorityRows.map(p => (
                            <div key={p.label} className="flex items-center gap-3">
                                <span className="cf-mono text-[10px] uppercase tracking-widest font-bold w-14 flex-shrink-0" style={{ color: p.color, textShadow: `0 0 8px ${p.color}` }}>
                                    {p.label}
                                </span>
                                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--cf-screen)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)' }}>
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${(p.count / maxPriority) * 100}%`, background: p.color, boxShadow: `0 0 8px ${p.color}` }}
                                    />
                                </div>
                                <span className="cf-lcd text-sm font-bold w-5 text-right flex-shrink-0" style={{ color: 'var(--cf-text)' }}>{p.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Due date distribution */}
                <div className="glass-panel rounded-xl p-5 flex flex-col gap-4">
                    <p className="cf-label text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--cf-text-muted)' }}>Due Date Distribution</p>
                    <div className="flex flex-col gap-3">
                        {dueRows.map(r => (
                            <div key={r.label} className="flex items-center gap-3">
                                <span className="cf-mono text-[10px] uppercase tracking-widest font-bold w-20 flex-shrink-0 leading-tight" style={{ color: r.color, textShadow: `0 0 8px ${r.color}` }}>
                                    {r.label}
                                </span>
                                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--cf-screen)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)' }}>
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${(r.count / maxDue) * 100}%`, background: r.color, boxShadow: `0 0 8px ${r.color}` }}
                                    />
                                </div>
                                <span className="cf-lcd text-sm font-bold w-5 text-right flex-shrink-0" style={{ color: 'var(--cf-text)' }}>{r.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Completion rate */}
                <div className="glass-panel rounded-xl p-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <p className="cf-label text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--cf-text-muted)' }}>Completion Rate</p>
                        <span className="cf-lcd text-3xl font-bold" style={{ color: 'var(--cf-phosphor)', textShadow: '0 0 16px var(--cf-phosphor)' }}>{donePercent}%</span>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--cf-screen)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)' }}>
                        <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${donePercent}%`, background: 'var(--cf-phosphor)', boxShadow: '0 0 10px var(--cf-phosphor)' }}
                        />
                    </div>
                    <p className="cf-mono text-xs" style={{ color: 'var(--cf-text-muted)' }}>{done} of {total} cards in Done</p>
                </div>
            </div>
        </div>
    )
}
