'use client'

const SECTION_COLORS = ['#4CAF50', '#FF9800', '#1976D2', '#F44336', '#7B1FA2', '#FFC107']

interface Section { id: number; name: string }

interface AnalyticsViewProps {
    cards: any[]
    sections: Section[]
}

export function AnalyticsView({ cards, sections }: AnalyticsViewProps) {
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    const total = cards.length
    const doneSection = sections.find(s => s.name.toLowerCase() === 'done')
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
        { label: 'High',   color: '#ef4444', count: cards.filter(c => c.priority === 'high').length },
        { label: 'Medium', color: '#f97316', count: cards.filter(c => c.priority === 'medium').length },
        { label: 'Low',    color: '#22c55e', count: cards.filter(c => c.priority === 'low').length },
        { label: 'None',   color: '#374151', count: cards.filter(c => !c.priority).length },
    ].filter(r => r.count > 0)

    const maxPriority = Math.max(...priorityRows.map(p => p.count), 1)

    // Due date distribution: overdue / today / this week / next week / later / none
    const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1)
    const nextWeek  = new Date(now); nextWeek.setDate(nextWeek.getDate() + 7)
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
    const nextWeekStr = `${nextWeek.getFullYear()}-${String(nextWeek.getMonth() + 1).padStart(2, '0')}-${String(nextWeek.getDate()).padStart(2, '0')}`

    const dueRows = [
        { label: 'Overdue',    color: '#ef4444', count: cards.filter(c => c.due_date && c.due_date.slice(0, 10) < todayStr).length },
        { label: 'Due today',  color: '#f97316', count: cards.filter(c => c.due_date && c.due_date.slice(0, 10) === todayStr).length },
        { label: 'This week',  color: '#eab308', count: cards.filter(c => c.due_date && c.due_date.slice(0, 10) > todayStr && c.due_date.slice(0, 10) <= nextWeekStr).length },
        { label: 'Later',      color: '#3b82f6', count: cards.filter(c => c.due_date && c.due_date.slice(0, 10) > nextWeekStr).length },
        { label: 'No due date',color: '#374151', count: cards.filter(c => !c.due_date).length },
    ].filter(r => r.count > 0)

    const maxDue = Math.max(...dueRows.map(r => r.count), 1)

    if (total === 0) {
        return (
            <div className="flex items-center justify-center py-24">
                <p className="text-gray-700 text-xs uppercase tracking-widest">No cards yet — add some tickets to see analytics</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-5 pb-8">

            {/* Summary stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Total',       value: String(total),            color: '#9ca3af' },
                    { label: 'Completed',   value: `${done} (${donePercent}%)`, color: '#22c55e' },
                    { label: 'Overdue',     value: String(overdue),          color: overdue > 0 ? '#ef4444' : '#9ca3af' },
                    { label: 'With Due Date', value: String(withDue),        color: '#f59e0b' },
                ].map(stat => (
                    <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-1">
                        <p className="text-[10px] uppercase tracking-widest text-gray-600">{stat.label}</p>
                        <p className="text-2xl font-bold leading-tight" style={{ color: stat.color }}>{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid md:grid-cols-2 gap-5">
                {/* Cards by section */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-4">
                    <p className="text-[10px] uppercase tracking-widest text-gray-600 font-bold">By Section</p>
                    <div className="flex flex-col gap-3">
                        {bySection.map(s => (
                            <div key={s.name} className="flex items-center gap-3">
                                <span className="text-[10px] uppercase tracking-widest font-bold w-20 flex-shrink-0 truncate" style={{ color: s.color }}>
                                    {s.name}
                                </span>
                                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${(s.count / maxSection) * 100}%`, backgroundColor: s.color }}
                                    />
                                </div>
                                <span className="text-gray-400 text-sm font-bold w-5 text-right flex-shrink-0">{s.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Priority breakdown */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-4">
                    <p className="text-[10px] uppercase tracking-widest text-gray-600 font-bold">By Priority</p>
                    <div className="flex flex-col gap-3">
                        {priorityRows.map(p => (
                            <div key={p.label} className="flex items-center gap-3">
                                <span className="text-[10px] uppercase tracking-widest font-bold w-14 flex-shrink-0" style={{ color: p.color }}>
                                    {p.label}
                                </span>
                                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${(p.count / maxPriority) * 100}%`, backgroundColor: p.color }}
                                    />
                                </div>
                                <span className="text-gray-400 text-sm font-bold w-5 text-right flex-shrink-0">{p.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Due date distribution */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-4">
                    <p className="text-[10px] uppercase tracking-widest text-gray-600 font-bold">Due Date Distribution</p>
                    <div className="flex flex-col gap-3">
                        {dueRows.map(r => (
                            <div key={r.label} className="flex items-center gap-3">
                                <span className="text-[10px] uppercase tracking-widest font-bold w-20 flex-shrink-0 leading-tight" style={{ color: r.color }}>
                                    {r.label}
                                </span>
                                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${(r.count / maxDue) * 100}%`, backgroundColor: r.color }}
                                    />
                                </div>
                                <span className="text-gray-400 text-sm font-bold w-5 text-right flex-shrink-0">{r.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Completion rate */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] uppercase tracking-widest text-gray-600 font-bold">Completion Rate</p>
                        <span className="text-3xl font-bold text-gray-400">{donePercent}%</span>
                    </div>
                    <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${donePercent}%`, backgroundColor: '#22c55e' }}
                        />
                    </div>
                    <p className="text-gray-600 text-xs">{done} of {total} cards in Done</p>
                </div>
            </div>
        </div>
    )
}
