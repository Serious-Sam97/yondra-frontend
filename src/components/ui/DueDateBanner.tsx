'use client'

import { useState } from 'react'
import { CardInterface } from '@/interfaces/CardInterface'

interface Section { id: number; name: string }

interface DueDateBannerProps {
    cards: CardInterface[]
    sections: Section[]
    onCardClick: (card: CardInterface) => void
}

export function DueDateBanner({ cards, sections, onCardClick }: DueDateBannerProps) {
    const [dismissed, setDismissed] = useState<Set<string | number>>(new Set())
    const [expanded, setExpanded] = useState(true)

    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const doneIds = new Set(sections.filter(s => s.name?.toLowerCase() === 'done').map(s => s.id))

    const overdue: CardInterface[] = []
    const dueToday: CardInterface[] = []
    for (const c of cards) {
        if (!c.due_date || dismissed.has(c.id) || doneIds.has(c.section_id)) continue
        const d = c.due_date.slice(0, 10)
        if (d < todayStr) overdue.push(c)
        else if (d === todayStr) dueToday.push(c)
    }

    const all = [...overdue, ...dueToday]
    if (all.length === 0) return null

    const dismiss = (id: string | number) => setDismissed(prev => new Set([...prev, id]))
    const dismissAll = () => setDismissed(prev => new Set([...prev, ...all.map(c => c.id)]))

    return (
        <div
            className="aero-column mb-4 rounded-lg overflow-hidden"
            style={{ borderLeft: `3px solid ${overdue.length > 0 ? 'var(--cf-red)' : 'var(--cf-amber)'}`, boxShadow: `0 0 18px ${overdue.length > 0 ? 'rgba(255,90,77,0.35)' : 'rgba(255,176,0,0.3)'}` }}
        >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-2.5">
                <span className="cf-led w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: overdue.length > 0 ? 'var(--cf-red)' : 'var(--cf-amber)', boxShadow: `0 0 8px ${overdue.length > 0 ? 'var(--cf-red)' : 'var(--cf-amber)'}` }} />
                <span className="cf-label text-xs uppercase tracking-widest font-bold flex-1" style={{ color: overdue.length > 0 ? 'var(--cf-red)' : 'var(--cf-amber)', textShadow: `0 0 8px ${overdue.length > 0 ? 'var(--cf-red)' : 'var(--cf-amber)'}` }}>
                    {overdue.length > 0 && `${overdue.length} overdue`}
                    {overdue.length > 0 && dueToday.length > 0 && ' · '}
                    {dueToday.length > 0 && `${dueToday.length} due today`}
                </span>
                <button
                    onClick={() => setExpanded(v => !v)}
                    className="text-[10px] cursor-pointer transition-colors hover:opacity-100"
                    style={{ color: 'var(--cf-text-muted)' }}
                >
                    {expanded ? '▲' : '▼'}
                </button>
                <button
                    onClick={dismissAll}
                    className="cf-label text-[10px] uppercase tracking-widest cursor-pointer transition-colors hover:opacity-100"
                    style={{ color: 'var(--cf-text-muted)' }}
                >
                    dismiss all
                </button>
            </div>

            {expanded && (
                <div className="flex flex-col gap-1 px-4 pb-3">
                    {overdue.map(c => (
                        <div key={c.id} className="flex items-center gap-2">
                            <span className="cf-led w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--cf-red)', boxShadow: '0 0 6px var(--cf-red)' }} />
                            <button
                                onClick={() => onCardClick(c)}
                                className="cf-mono text-xs cursor-pointer transition-colors truncate flex-1 text-left hover:opacity-100"
                                style={{ color: 'var(--cf-text)' }}
                            >
                                {c.name}
                            </button>
                            <span className="cf-label text-[9px] uppercase tracking-widest flex-shrink-0" style={{ color: 'var(--cf-red)' }}>overdue</span>
                            <button onClick={() => dismiss(c.id)} className="text-xs cursor-pointer flex-shrink-0 hover:opacity-100" style={{ color: 'var(--cf-text-muted)' }}>✕</button>
                        </div>
                    ))}
                    {dueToday.map(c => (
                        <div key={c.id} className="flex items-center gap-2">
                            <span className="cf-led w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--cf-amber)', boxShadow: '0 0 6px var(--cf-amber)' }} />
                            <button
                                onClick={() => onCardClick(c)}
                                className="cf-mono text-xs cursor-pointer transition-colors truncate flex-1 text-left hover:opacity-100"
                                style={{ color: 'var(--cf-text)' }}
                            >
                                {c.name}
                            </button>
                            <span className="cf-label text-[9px] uppercase tracking-widest flex-shrink-0" style={{ color: 'var(--cf-amber)' }}>today</span>
                            <button onClick={() => dismiss(c.id)} className="text-xs cursor-pointer flex-shrink-0 hover:opacity-100" style={{ color: 'var(--cf-text-muted)' }}>✕</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
