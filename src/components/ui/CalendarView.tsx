'use client'

import { useState } from 'react'

const SECTION_COLORS = ['#4CAF50', '#FF9800', '#1976D2', '#F44336', '#7B1FA2', '#FFC107']
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

    const byDate: Record<string, any[]> = {}
    for (const card of cards) {
        if (!card.due_date) continue
        const k = card.due_date.slice(0, 10)
        if (!byDate[k]) byDate[k] = []
        byDate[k].push(card)
    }

    const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
    const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0) }  else setMonth(m => m + 1) }
    const goToday   = () => { setYear(today.getFullYear()); setMonth(today.getMonth()) }

    const totalWithDue = cards.filter(c => c.due_date).length

    return (
        <div className="flex flex-col gap-4 pb-8">

            {/* Month navigation */}
            <div className="flex items-center justify-between">
                <button onClick={prevMonth}
                    className="text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-500 cursor-pointer transition-colors text-sm font-bold">
                    ←
                </button>
                <div className="flex items-center gap-3">
                    <h2 className="text-white font-bold text-lg tracking-wide">
                        {MONTHS[month]} <span className="text-gray-500">{year}</span>
                    </h2>
                    <button onClick={goToday}
                        className="text-[10px] uppercase tracking-widest text-gray-600 hover:text-amber-400 cursor-pointer transition-colors border border-gray-800 hover:border-amber-400/40 px-2 py-1 rounded">
                        Today
                    </button>
                </div>
                <button onClick={nextMonth}
                    className="text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-500 cursor-pointer transition-colors text-sm font-bold">
                    →
                </button>
            </div>

            {totalWithDue === 0 && (
                <p className="text-center text-gray-700 text-xs uppercase tracking-widest py-4">
                    No cards have due dates — edit a card to set one
                </p>
            )}

            {/* Day headers */}
            <div className="grid grid-cols-7">
                {DAYS_SHORT.map(d => (
                    <div key={d} className="text-center text-[10px] uppercase tracking-widest text-gray-600 pb-2 font-bold">
                        {d}
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 border-l border-t border-gray-800 rounded-sm overflow-hidden">
                {days.map(({ date, current }, i) => {
                    const k        = dateKey(date)
                    const dayCards = byDate[k] ?? []
                    const isToday  = k === todayKey
                    const isPast   = current && !isToday && date < today

                    return (
                        <div key={i}
                            className={`border-r border-b border-gray-800 min-h-[80px] md:min-h-[100px] p-1 flex flex-col gap-0.5 ${
                                current ? 'bg-gray-900' : 'bg-[#0d0d0d]'
                            }`}
                        >
                            {/* Day number */}
                            <span className={`text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full mb-0.5 flex-shrink-0 self-start ${
                                isToday  ? 'bg-amber-400 text-black' :
                                isPast   ? 'text-gray-700' :
                                current  ? 'text-gray-400' : 'text-gray-800'
                            }`}>
                                {date.getDate()}
                            </span>

                            {/* Card chips */}
                            {dayCards.slice(0, 3).map(card => {
                                const color = sectionColor(card.section_id, sections)
                                return (
                                    <button key={card.id} onClick={() => onCardClick(card)}
                                        title={card.name}
                                        className="text-left rounded-sm px-1 py-0.5 cursor-pointer hover:opacity-80 active:scale-95 transition-all truncate w-full"
                                        style={{ backgroundColor: color + '22', borderLeft: `2px solid ${color}` }}
                                    >
                                        {card.priority === 'high' && (
                                            <span className="text-red-400 mr-0.5" style={{ fontSize: '8px' }}>●</span>
                                        )}
                                        <span className="text-[10px] text-gray-300 truncate">{card.name}</span>
                                    </button>
                                )
                            })}
                            {dayCards.length > 3 && (
                                <span className="text-[9px] text-gray-600 px-1">+{dayCards.length - 3} more</span>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
