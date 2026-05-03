'use client'

import { useState } from 'react'

const SECTION_COLORS = ['#4CAF50', '#FF9800', '#1976D2', '#F44336', '#7B1FA2', '#FFC107']
const AVATAR_COLORS  = ['#4CAF50', '#FF9800', '#1976D2', '#F44336', '#7B1FA2', '#FFC107', '#00BCD4', '#E91E63']
const PRIORITY_COLOR: Record<string, string> = { high: '#ef4444', medium: '#f97316', low: '#22c55e' }

type SortKey = 'name' | 'section' | 'priority' | 'due_date'
type SortDir = 'asc' | 'desc'

interface Section { id: number; name: string }
interface User { id: number; name: string }

interface ListViewProps {
    cards: any[]
    sections: Section[]
    users: User[]
    onCardClick: (card: any) => void
}

function initials(name: string) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export function ListView({ cards, sections, users, onCardClick }: ListViewProps) {
    const [sortKey, setSortKey] = useState<SortKey>('due_date')
    const [sortDir, setSortDir] = useState<SortDir>('asc')

    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortKey(key); setSortDir('asc') }
    }

    const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }

    const sorted = [...cards].sort((a, b) => {
        let cmp = 0
        if (sortKey === 'name') {
            cmp = a.name.localeCompare(b.name)
        } else if (sortKey === 'section') {
            cmp = sections.findIndex(s => s.id === a.section_id) - sections.findIndex(s => s.id === b.section_id)
        } else if (sortKey === 'priority') {
            const ap = priorityOrder[a.priority ?? ''] ?? 3
            const bp = priorityOrder[b.priority ?? ''] ?? 3
            cmp = ap - bp
        } else if (sortKey === 'due_date') {
            cmp = (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')
        }
        return sortDir === 'asc' ? cmp : -cmp
    })

    const SortIcon = ({ k }: { k: SortKey }) => (
        <span className="ml-1 text-[8px] opacity-60">
            {sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : '⬍'}
        </span>
    )

    const ColHeader = ({ k, label, className = '' }: { k: SortKey; label: string; className?: string }) => (
        <div
            onClick={() => toggleSort(k)}
            className={`px-3 py-2.5 text-[10px] uppercase tracking-widest text-gray-600 font-bold flex items-center cursor-pointer hover:text-gray-400 transition-colors select-none ${className}`}
        >
            {label}<SortIcon k={k} />
        </div>
    )

    return (
        <div className="flex flex-col pb-8">
            {/* Header */}
            <div className="grid grid-cols-[28px_1fr_auto_auto] md:grid-cols-[28px_1fr_140px_auto_110px_36px] border border-gray-800 rounded-t-lg overflow-hidden bg-gray-900/60">
                <div className="px-2 py-2.5 text-[10px] uppercase tracking-widest text-gray-600 font-bold flex items-center justify-center" title="Priority">
                    P
                </div>
                <ColHeader k="name" label="Name" className="border-l border-gray-800" />
                <ColHeader k="section" label="Section" className="border-l border-gray-800 hidden md:flex" />
                <div className="px-3 py-2.5 text-[10px] uppercase tracking-widest text-gray-600 font-bold border-l border-gray-800 hidden md:flex items-center">
                    Tags
                </div>
                <ColHeader k="due_date" label="Due" className="border-l border-gray-800" />
                <div className="px-2 py-2.5 border-l border-gray-800 hidden md:flex items-center" />
            </div>

            {/* Rows */}
            <div className="border-l border-r border-b border-gray-800 rounded-b-lg overflow-hidden">
                {sorted.length === 0 && (
                    <p className="text-center text-gray-700 text-xs uppercase tracking-widest py-12">No cards match the current filters</p>
                )}
                {sorted.map(card => {
                    const sIdx    = sections.findIndex(s => s.id === card.section_id)
                    const section = sections[sIdx]
                    const sColor  = SECTION_COLORS[Math.max(0, sIdx) % SECTION_COLORS.length]
                    const user    = users.find(u => u.id === card.assigned_user_id)
                    const due     = card.due_date?.slice(0, 10)
                    const isOverdue  = due && due < todayStr
                    const isDueToday = due && due === todayStr

                    return (
                        <button
                            key={card.id}
                            onClick={() => onCardClick(card)}
                            className="grid grid-cols-[28px_1fr_auto_auto] md:grid-cols-[28px_1fr_140px_auto_110px_36px] w-full text-left hover:bg-gray-800/40 transition-colors cursor-pointer group border-b border-gray-800/60 last:border-0"
                        >
                            {/* Priority */}
                            <div className="flex items-center justify-center py-3">
                                <div
                                    className="w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: card.priority ? PRIORITY_COLOR[card.priority] : '#374151' }}
                                />
                            </div>

                            {/* Name */}
                            <div className="px-3 py-3 flex items-center min-w-0 border-l border-gray-800/40">
                                <span className="text-gray-200 text-sm truncate group-hover:text-white transition-colors leading-snug">
                                    {card.name}
                                </span>
                            </div>

                            {/* Section */}
                            <div className="px-3 py-3 hidden md:flex items-center border-l border-gray-800/40">
                                <span
                                    className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                                    style={{ color: sColor, backgroundColor: sColor + '18' }}
                                >
                                    {section?.name ?? '—'}
                                </span>
                            </div>

                            {/* Tags */}
                            <div className="px-3 py-3 hidden md:flex items-center gap-1 border-l border-gray-800/40">
                                {(card.tags ?? []).slice(0, 2).map((tag: any) => (
                                    <span
                                        key={tag.id}
                                        className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap"
                                        style={{ backgroundColor: tag.color + '22', color: tag.color }}
                                    >
                                        {tag.name}
                                    </span>
                                ))}
                            </div>

                            {/* Due date */}
                            <div className="px-3 py-3 flex items-center border-l border-gray-800/40">
                                {due ? (
                                    <span className={`text-[11px] font-mono whitespace-nowrap ${isOverdue ? 'text-red-400' : isDueToday ? 'text-amber-400' : 'text-gray-500'}`}>
                                        {due}
                                    </span>
                                ) : (
                                    <span className="text-gray-800 text-sm">—</span>
                                )}
                            </div>

                            {/* Assignee */}
                            <div className="px-1 py-3 hidden md:flex items-center justify-center border-l border-gray-800/40">
                                {user ? (
                                    <div
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                                        style={{ backgroundColor: AVATAR_COLORS[user.id % AVATAR_COLORS.length] }}
                                        title={user.name}
                                    >
                                        {initials(user.name)}
                                    </div>
                                ) : (
                                    <div className="w-6 h-6 rounded-full border border-gray-800 flex-shrink-0" />
                                )}
                            </div>
                        </button>
                    )
                })}
            </div>

            {sorted.length > 0 && (
                <p className="text-gray-700 text-[10px] uppercase tracking-widest text-right pt-2">
                    {sorted.length} card{sorted.length !== 1 ? 's' : ''}
                </p>
            )}
        </div>
    )
}
