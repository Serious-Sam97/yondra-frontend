'use client'

import { useState } from 'react'
import Icon from '@/components/ui/Icon'
import { faSortUp, faSortDown, faSort } from '@fortawesome/free-solid-svg-icons'

const SECTION_COLORS = ['#9aa67e', '#ffb000', '#6fe0ff', '#ff5a4d', '#c08bff', '#ffd24a']
const AVATAR_COLORS  = ['#9aa67e', '#ffb000', '#6fe0ff', '#ff5a4d', '#c08bff', '#ffd24a', '#6fe0ff', '#ff8fa3']
const PRIORITY_COLOR: Record<string, string> = { high: '#ff5a4d', medium: '#ffb000', low: '#9aa67e' }

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
            {sortKey === k ? <Icon icon={sortDir === 'asc' ? faSortUp : faSortDown} /> : <Icon icon={faSort} />}
        </span>
    )

    const ColHeader = ({ k, label, className = '' }: { k: SortKey; label: string; className?: string }) => (
        <div
            onClick={() => toggleSort(k)}
            className={`cf-label px-3 py-2.5 text-[10px] uppercase tracking-widest font-bold flex items-center cursor-pointer transition-colors select-none ${className}`}
            style={{ color: 'var(--cf-text-muted)' }}
        >
            {label}<SortIcon k={k} />
        </div>
    )

    return (
        <div className="flex flex-col pb-8">
            {/* Header */}
            <div className="grid grid-cols-[28px_1fr_auto_auto] md:grid-cols-[28px_1fr_140px_130px_110px_36px] aero-column rounded-b-none overflow-hidden" style={{ borderBottom: '1px solid var(--cf-edge)' }}>
                <div className="cf-label px-2 py-2.5 text-[10px] uppercase tracking-widest font-bold flex items-center justify-center" style={{ color: 'var(--cf-text-muted)' }} title="Priority">
                    P
                </div>
                <ColHeader k="name" label="Name" className="md:border-l md:border-white/15" />
                <ColHeader k="section" label="Section" className="md:border-l md:border-white/15 hidden md:flex" />
                <div className="cf-label px-3 py-2.5 text-[10px] uppercase tracking-widest font-bold md:border-l md:border-white/15 hidden md:flex items-center" style={{ color: 'var(--cf-text-muted)' }}>
                    Tags
                </div>
                <ColHeader k="due_date" label="Due" className="md:border-l md:border-white/15" />
                <div className="px-2 py-2.5 md:border-l md:border-white/15 hidden md:flex items-center" />
            </div>

            {/* Rows */}
            <div className="aero-column rounded-t-none overflow-hidden">
                {sorted.length === 0 && (
                    <p className="cf-label text-center text-xs uppercase tracking-widest py-12" style={{ color: 'var(--cf-text-muted)' }}>No cards match the current filters</p>
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
                            className="grid grid-cols-[28px_1fr_auto_auto] md:grid-cols-[28px_1fr_140px_130px_110px_36px] w-full text-left hover:bg-white/10 transition-colors cursor-pointer group last:border-0"
                            style={{ borderBottom: '1px solid var(--cf-edge)' }}
                        >
                            {/* Priority */}
                            <div className="flex items-center justify-center py-3">
                                <div
                                    className="cf-led w-2 h-2 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: card.priority ? PRIORITY_COLOR[card.priority] : 'var(--cf-edge)', boxShadow: card.priority ? `0 0 8px ${PRIORITY_COLOR[card.priority]}` : 'none' }}
                                />
                            </div>

                            {/* Name */}
                            <div className="px-3 py-3 flex items-center min-w-0 md:border-l md:border-white/10">
                                <span className="cf-mono text-sm truncate transition-colors leading-snug" style={{ color: 'var(--cf-text)' }}>
                                    {card.name}
                                </span>
                            </div>

                            {/* Section */}
                            <div className="px-3 py-3 hidden md:flex items-center md:border-l md:border-white/10">
                                <span
                                    className="aero-pill cf-mono text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 whitespace-nowrap"
                                    style={{ color: sColor, borderColor: sColor + '88', boxShadow: `0 0 8px ${sColor}55` }}
                                >
                                    {section?.name ?? '—'}
                                </span>
                            </div>

                            {/* Tags */}
                            <div className="px-3 py-3 hidden md:flex items-center gap-1 md:border-l md:border-white/10">
                                {(card.tags ?? []).slice(0, 2).map((tag: any) => (
                                    <span
                                        key={tag.id}
                                        className="aero-pill cf-mono text-[9px] uppercase tracking-wide px-1.5 py-0.5 font-bold whitespace-nowrap"
                                        style={{ color: tag.color, borderColor: tag.color + '88', boxShadow: `0 0 7px ${tag.color}55` }}
                                    >
                                        {tag.name}
                                    </span>
                                ))}
                            </div>

                            {/* Due date */}
                            <div className="px-3 py-3 flex items-center md:border-l md:border-white/10">
                                {due ? (
                                    <span
                                        className="cf-lcd text-[11px] whitespace-nowrap"
                                        style={{ color: isOverdue ? 'var(--cf-red)' : isDueToday ? 'var(--cf-amber)' : 'var(--cf-text-muted)' }}
                                    >
                                        {due}
                                    </span>
                                ) : (
                                    <span style={{ color: 'var(--cf-edge)' }} className="text-sm">—</span>
                                )}
                            </div>

                            {/* Assignee */}
                            <div className="px-1 py-3 hidden md:flex items-center justify-center md:border-l md:border-white/10">
                                {user ? (
                                    <div
                                        className="cf-mono w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                                        style={{ backgroundColor: AVATAR_COLORS[user.id % AVATAR_COLORS.length], color: 'var(--cf-ink)', border: '1px solid var(--cf-edge)' }}
                                        title={user.name}
                                    >
                                        {initials(user.name)}
                                    </div>
                                ) : (
                                    <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ border: '1px solid var(--cf-edge)' }} />
                                )}
                            </div>
                        </button>
                    )
                })}
            </div>

            {sorted.length > 0 && (
                <p className="cf-label text-[10px] uppercase tracking-widest text-right pt-2" style={{ color: 'var(--cf-text-muted)' }}>
                    {sorted.length} card{sorted.length !== 1 ? 's' : ''}
                </p>
            )}
        </div>
    )
}
