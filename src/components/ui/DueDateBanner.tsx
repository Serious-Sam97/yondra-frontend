'use client'

import { useState } from 'react'

interface Card { id: string | number; name: string; due_date?: string | null; section_id: number }
interface Section { id: number; name: string }

interface DueDateBannerProps {
    cards: Card[]
    sections: Section[]
    onCardClick: (card: Card) => void
}

export function DueDateBanner({ cards, sections, onCardClick }: DueDateBannerProps) {
    const [dismissed, setDismissed] = useState<Set<string | number>>(new Set())
    const [expanded, setExpanded] = useState(true)

    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const doneIds = new Set(sections.filter(s => s.name.toLowerCase() === 'done').map(s => s.id))

    const overdue: Card[] = []
    const dueToday: Card[] = []
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
        <div className="mb-4 rounded-lg border border-amber-900/50 overflow-hidden" style={{ backgroundColor: 'rgba(120,53,15,0.15)' }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-amber-400 text-sm flex-shrink-0">⚠</span>
                <span className="text-amber-400 text-xs uppercase tracking-widest font-bold flex-1">
                    {overdue.length > 0 && `${overdue.length} overdue`}
                    {overdue.length > 0 && dueToday.length > 0 && ' · '}
                    {dueToday.length > 0 && `${dueToday.length} due today`}
                </span>
                <button
                    onClick={() => setExpanded(v => !v)}
                    className="text-amber-700 hover:text-amber-500 text-[10px] cursor-pointer transition-colors"
                >
                    {expanded ? '▲' : '▼'}
                </button>
                <button
                    onClick={dismissAll}
                    className="text-amber-900 hover:text-amber-700 text-[10px] uppercase tracking-widest cursor-pointer transition-colors"
                >
                    dismiss all
                </button>
            </div>

            {expanded && (
                <div className="flex flex-col gap-1 px-4 pb-3">
                    {overdue.map(c => (
                        <div key={c.id} className="flex items-center gap-2">
                            <span className="text-red-500 text-[8px] flex-shrink-0">●</span>
                            <button
                                onClick={() => onCardClick(c)}
                                className="text-xs text-amber-200 hover:text-white cursor-pointer transition-colors truncate flex-1 text-left"
                            >
                                {c.name}
                            </button>
                            <span className="text-red-600 text-[9px] uppercase tracking-widest flex-shrink-0">overdue</span>
                            <button onClick={() => dismiss(c.id)} className="text-amber-900 hover:text-amber-600 text-xs cursor-pointer flex-shrink-0">✕</button>
                        </div>
                    ))}
                    {dueToday.map(c => (
                        <div key={c.id} className="flex items-center gap-2">
                            <span className="text-amber-400 text-[8px] flex-shrink-0">●</span>
                            <button
                                onClick={() => onCardClick(c)}
                                className="text-xs text-amber-200 hover:text-white cursor-pointer transition-colors truncate flex-1 text-left"
                            >
                                {c.name}
                            </button>
                            <span className="text-amber-600 text-[9px] uppercase tracking-widest flex-shrink-0">today</span>
                            <button onClick={() => dismiss(c.id)} className="text-amber-900 hover:text-amber-600 text-xs cursor-pointer flex-shrink-0">✕</button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
