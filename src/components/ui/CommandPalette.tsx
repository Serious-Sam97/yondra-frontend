'use client'

import { useEffect, useRef, useState } from 'react'

interface Section { id: number; name: string }
interface Tag { id: number; name: string; color: string }
interface Card {
    id: string | number
    name: string
    description?: string
    section_id: number
    priority?: 'low' | 'medium' | 'high' | null
    tags?: Tag[]
    due_date?: string | null
}

interface CommandPaletteProps {
    cards: Card[]
    sections: Section[]
    onSelect: (card: Card) => void
    onClose: () => void
}

const PRIORITY_COLOR: Record<string, string> = {
    high:   '#ef4444',
    medium: '#f97316',
    low:    '#22c55e',
}

const SECTION_COLORS = ['#4CAF50', '#FF9800', '#1976D2', '#F44336', '#7B1FA2', '#FFC107']

function sectionColor(sectionId: number, sections: Section[]): string {
    const idx = sections.findIndex(s => s.id === sectionId)
    return SECTION_COLORS[Math.max(0, idx) % SECTION_COLORS.length]
}

export function CommandPalette({ cards, sections, onSelect, onClose }: CommandPaletteProps) {
    const [query, setQuery] = useState('')
    const [cursor, setCursor] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef  = useRef<HTMLDivElement>(null)

    const q = query.trim().toLowerCase()
    const results = q.length === 0
        ? cards.slice(0, 8)
        : cards.filter(c =>
            c.name.toLowerCase().includes(q) ||
            (c.description ?? '').toLowerCase().includes(q) ||
            (c.tags ?? []).some(t => t.name.toLowerCase().includes(q)) ||
            sections.find(s => s.id === c.section_id)?.name.toLowerCase().includes(q)
        ).slice(0, 12)

    useEffect(() => { setCursor(0) }, [query])

    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    useEffect(() => {
        const el = listRef.current?.children[cursor] as HTMLElement | undefined
        el?.scrollIntoView({ block: 'nearest' })
    }, [cursor])

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setCursor(c => Math.min(c + 1, results.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setCursor(c => Math.max(c - 1, 0))
        } else if (e.key === 'Enter' && results[cursor]) {
            onSelect(results[cursor])
        } else if (e.key === 'Escape') {
            onClose()
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg flex flex-col rounded-xl border border-gray-700 shadow-2xl overflow-hidden"
                style={{ backgroundColor: '#111', maxHeight: '70vh' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 flex-shrink-0">
                    <span className="text-gray-500 text-sm flex-shrink-0">🔍</span>
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKey}
                        placeholder="Search cards, sections, tags..."
                        className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-gray-600"
                    />
                    {query && (
                        <button onClick={() => setQuery('')} className="text-gray-600 hover:text-gray-400 text-xs cursor-pointer flex-shrink-0">
                            ✕
                        </button>
                    )}
                    <kbd className="hidden sm:block text-[10px] text-gray-600 border border-gray-700 px-1.5 py-0.5 rounded font-mono flex-shrink-0">
                        esc
                    </kbd>
                </div>

                {/* Results */}
                <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto flex flex-col">
                    {results.length === 0 && (
                        <p className="text-gray-600 text-xs uppercase tracking-widest text-center py-10">
                            No results for "{query}"
                        </p>
                    )}
                    {results.map((card, i) => {
                        const section = sections.find(s => s.id === card.section_id)
                        const color   = sectionColor(card.section_id, sections)
                        const isActive = i === cursor

                        return (
                            <button
                                key={card.id}
                                onClick={() => onSelect(card)}
                                onMouseEnter={() => setCursor(i)}
                                className="flex flex-col gap-1 px-4 py-3 text-left transition-colors cursor-pointer border-b border-gray-800/50 last:border-0"
                                style={{ backgroundColor: isActive ? '#1e1e1e' : 'transparent' }}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    {/* Section accent */}
                                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />

                                    {/* Priority dot */}
                                    {card.priority && (
                                        <div
                                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: PRIORITY_COLOR[card.priority] }}
                                        />
                                    )}

                                    <span className="text-white text-sm font-medium truncate flex-1">
                                        {highlight(card.name, q)}
                                    </span>

                                    {/* Due date */}
                                    {card.due_date && (
                                        <span className="text-gray-600 text-[10px] flex-shrink-0 font-mono">
                                            {card.due_date.slice(0, 10)}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 pl-3.5">
                                    {/* Section name */}
                                    <span
                                        className="text-[10px] uppercase tracking-widest font-bold flex-shrink-0"
                                        style={{ color }}
                                    >
                                        {section?.name ?? ''}
                                    </span>

                                    {/* Tags */}
                                    {(card.tags ?? []).slice(0, 3).map(tag => (
                                        <span
                                            key={tag.id}
                                            className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full font-bold"
                                            style={{ backgroundColor: tag.color + '22', color: tag.color }}
                                        >
                                            {tag.name}
                                        </span>
                                    ))}

                                    {/* Description snippet */}
                                    {card.description && q.length > 0 && card.description.toLowerCase().includes(q) && (
                                        <span className="text-gray-600 text-[10px] truncate">
                                            …{snippet(card.description, q)}…
                                        </span>
                                    )}
                                </div>
                            </button>
                        )
                    })}
                </div>

                {/* Footer hint */}
                <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-800 flex-shrink-0">
                    <span className="text-[10px] text-gray-700 uppercase tracking-widest">
                        {results.length} result{results.length !== 1 ? 's' : ''}
                    </span>
                    <div className="flex items-center gap-2 ml-auto">
                        <kbd className="text-[10px] text-gray-700 border border-gray-800 px-1 py-0.5 rounded font-mono">↑↓</kbd>
                        <span className="text-[10px] text-gray-700">navigate</span>
                        <kbd className="text-[10px] text-gray-700 border border-gray-800 px-1 py-0.5 rounded font-mono">↵</kbd>
                        <span className="text-[10px] text-gray-700">open</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

function highlight(text: string, q: string): React.ReactNode {
    if (!q) return text
    const idx = text.toLowerCase().indexOf(q)
    if (idx === -1) return text
    return (
        <>
            {text.slice(0, idx)}
            <mark style={{ backgroundColor: '#fbbf2440', color: '#fbbf24', borderRadius: '2px' }}>
                {text.slice(idx, idx + q.length)}
            </mark>
            {text.slice(idx + q.length)}
        </>
    )
}

function snippet(text: string, q: string): string {
    const idx = text.toLowerCase().indexOf(q)
    if (idx === -1) return ''
    const start = Math.max(0, idx - 20)
    const end   = Math.min(text.length, idx + q.length + 20)
    return text.slice(start, end)
}
