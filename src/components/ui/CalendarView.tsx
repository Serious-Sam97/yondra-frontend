'use client'

import { useState } from 'react'
import Icon from '@/components/ui/Icon'
import { faCheck } from '@fortawesome/free-solid-svg-icons'

const SECTION_COLORS = ['#9aa67e', '#ffb000', '#6fe0ff', '#ff5a4d', '#c08bff', '#ffd24a']
const DAYS_SHORT     = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS         = ['January','February','March','April','May','June','July','August','September','October','November','December']

interface CalendarViewProps {
    cards: any[]
    sections: { id: number; name: string }[]
    onCardClick: (card: any) => void
}

function sectionColor(sectionId: number, sections: { id: number; name: string }[]) {
    const idx = sections.findIndex(s => s.id === sectionId)
    return SECTION_COLORS[Math.max(0, idx) % SECTION_COLORS.length]
}

function calendarDays(year: number, month: number) {
    const first = new Date(year, month, 1)
    const last  = new Date(year, month + 1, 0)
    const days: { date: Date; current: boolean }[] = []

    for (let i = 0; i < first.getDay(); i++) {
        days.push({ date: new Date(year, month, i - first.getDay() + 1), current: false })
    }
    for (let i = 1; i <= last.getDate(); i++) {
        days.push({ date: new Date(year, month, i), current: true })
    }
    while (days.length < 42) {
        days.push({ date: new Date(year, month + 1, days.length - last.getDate() - first.getDay() + 1), current: false })
    }
    return days
}

function dateKey(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function CalendarView({ cards, sections, onCardClick }: CalendarViewProps) {
    const today = new Date()
    const [year, setYear]   = useState(today.getFullYear())
    const [month, setMonth] = useState(today.getMonth())

    const days      = calendarDays(year, month)
    const todayKey  = dateKey(today)

    // A card can appear twice: on its due date and on the day it was completed.
    const byDate: Record<string, { card: any; kind: 'due' | 'done' }[]> = {}
    for (const card of cards) {
        if (card.due_date) {
            const k = card.due_date.slice(0, 10)
            ;(byDate[k] ??= []).push({ card, kind: 'due' })
        }
        if (card.done_at) {
            const k = dateKey(new Date(card.done_at)) // timestamp → local completion day
            ;(byDate[k] ??= []).push({ card, kind: 'done' })
        }
    }

    const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
    const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0) }  else setMonth(m => m + 1) }
    const goToday   = () => { setYear(today.getFullYear()); setMonth(today.getMonth()) }

    const totalWithDates = cards.filter(c => c.due_date || c.done_at).length

    return (
        <div className="flex flex-col gap-4 pb-8">

            {/* Month navigation */}
            <div className="flex items-center justify-between">
                <button onClick={prevMonth}
                    className="aero-btn aero-btn--ghost px-3 py-1.5 cursor-pointer text-sm font-bold">
                    ←
                </button>
                <div className="flex items-center gap-3">
                    <h2 className="chrome-text cf-lcd font-bold text-lg tracking-wide">
                        {MONTHS[month]} <span style={{ color: 'var(--cf-text-muted)' }}>{year}</span>
                    </h2>
                    <button onClick={goToday}
                        className="aero-pill cf-label text-[10px] uppercase tracking-widest cursor-pointer transition-colors px-2 py-1" style={{ color: 'var(--cf-text-muted)' }}>
                        Today
                    </button>
                </div>
                <button onClick={nextMonth}
                    className="aero-btn aero-btn--ghost px-3 py-1.5 cursor-pointer text-sm font-bold">
                    →
                </button>
            </div>

            {totalWithDates === 0 ? (
                <p className="cf-label text-center text-xs uppercase tracking-widest py-4" style={{ color: 'var(--cf-text-muted)' }}>
                    No cards have due or completion dates yet
                </p>
            ) : (
                <div className="flex items-center justify-center gap-4 cf-label text-[10px] uppercase tracking-widest" style={{ color: 'var(--cf-text-muted)' }}>
                    <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ border: '1px solid var(--cf-text-muted)' }} /> Due
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span style={{ color: 'var(--cf-phosphor)' }}><Icon icon={faCheck} /></span> Done
                    </span>
                </div>
            )}

            {/* Day headers */}
            <div className="grid grid-cols-7">
                {DAYS_SHORT.map(d => (
                    <div key={d} className="cf-label text-center text-[10px] uppercase tracking-widest pb-2 font-bold" style={{ color: 'var(--cf-text-muted)' }}>
                        {d}
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 aero-column overflow-hidden">
                {days.map(({ date, current }, i) => {
                    const k        = dateKey(date)
                    const dayCards = byDate[k] ?? []
                    const isToday  = k === todayKey
                    const isPast   = current && !isToday && date < today

                    return (
                        <div key={i}
                            className="min-h-[80px] md:min-h-[100px] p-1 flex flex-col gap-0.5"
                            style={{
                                borderRight: '1px solid var(--cf-edge)',
                                borderBottom: '1px solid var(--cf-edge)',
                                backgroundColor: current ? 'var(--cf-graphite)' : 'var(--cf-screen)',
                                boxShadow: isToday ? 'inset 0 0 0 1.5px var(--cf-phosphor), inset 0 0 18px rgba(154,166,126,0.22)' : 'none',
                            }}
                        >
                            {/* Day number */}
                            <span className={`cf-mono text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full mb-0.5 flex-shrink-0 self-start`}
                                style={isToday
                                    ? { backgroundColor: 'var(--cf-phosphor)', color: 'var(--cf-ink)', boxShadow: '0 0 10px var(--cf-phosphor)' }
                                    : { color: isPast ? 'var(--cf-edge)' : current ? 'var(--cf-text)' : 'var(--cf-text-muted)', opacity: current ? 1 : 0.5 }}
                            >
                                {date.getDate()}
                            </span>

                            {/* Card chips */}
                            {dayCards.slice(0, 3).map(({ card, kind }) => {
                                const isDone = kind === 'done'
                                const color  = sectionColor(card.section_id, sections)
                                return (
                                    <button key={`${card.id}-${kind}`} onClick={() => onCardClick(card)}
                                        title={isDone ? `Completed: ${card.name}` : card.name}
                                        className="aero-pill cf-mono text-left px-1 py-0.5 cursor-pointer hover:opacity-80 active:scale-95 transition-all truncate w-full"
                                        style={isDone
                                            ? { borderColor: 'rgba(154,166,126,0.6)', boxShadow: '0 0 8px rgba(154,166,126,0.45)', opacity: 0.9 }
                                            : { borderColor: color + '99', boxShadow: `0 0 8px ${color}55` }}
                                    >
                                        {isDone ? (
                                            <span className="mr-0.5" style={{ fontSize: '8px', color: 'var(--cf-phosphor)' }}><Icon icon={faCheck} /></span>
                                        ) : card.priority === 'high' ? (
                                            <span className="cf-led mr-0.5" style={{ fontSize: '8px', color: 'var(--cf-red)' }}>●</span>
                                        ) : null}
                                        <span className="text-[10px] truncate" style={{ color: 'var(--cf-text)', textDecoration: isDone ? 'line-through' : 'none' }}>{card.name}</span>
                                    </button>
                                )
                            })}
                            {dayCards.length > 3 && (
                                <span className="cf-mono text-[9px] px-1" style={{ color: 'var(--cf-text-muted)' }}>+{dayCards.length - 3} more</span>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
