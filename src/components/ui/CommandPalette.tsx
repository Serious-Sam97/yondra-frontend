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
    high:   '#ff5a4d',
    medium: '#ffb000',
    low:    '#9aa67e',
}

const SECTION_COLORS = ['#9aa67e', '#ffb000', '#6fe0ff', '#ff5a4d', '#c08bff', '#ffd24a']

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
            c.name?.toLowerCase().includes(q) ||
            (c.description ?? '').toLowerCase().includes(q) ||
            (c.tags ?? []).some((t: any) => t.name?.toLowerCase().includes(q)) ||
            sections.find(s => s.id === c.section_id)?.name?.toLowerCase().includes(q)
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
                className="aero-menu w-full max-w-lg flex flex-col rounded-xl overflow-hidden"
                style={{ maxHeight: '70vh' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--cf-edge)' }}>
                    <span className="cf-led w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--cf-phosphor)', boxShadow: '0 0 8px var(--cf-phosphor)' }} />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKey}
                        placeholder="Search cards, sections, tags..."
                        className="glass-input cf-mono flex-1 text-sm"
                    />
                    {query && (
                        <button onClick={() => setQuery('')} className="text-xs cursor-pointer flex-shrink-0 hover:opacity-100" style={{ color: 'var(--cf-text-muted)' }}>
                            ✕
                        </button>
                    )}
                    <kbd className="cf-mono hidden sm:block text-[10px] px-1.5 py-0.5 rounded flex-shrink-0" style={{ color: 'var(--cf-text-muted)', border: '1px solid var(--cf-edge)' }}>
                        esc
                    </kbd>
                </div>

                {/* Results */}
                <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto flex flex-col">
                    {results.length === 0 && (
                        <p className="cf-label text-xs uppercase tracking-widest text-center py-10" style={{ color: 'var(--cf-text-muted)' }}>
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
                                className="flex flex-col gap-1 px-4 py-3 text-left transition-colors cursor-pointer last:border-0"
                                style={{
                                    borderBottom: '1px solid var(--cf-edge)',
                                    backgroundColor: isActive ? 'rgba(154,166,126,0.10)' : 'transparent',
                                    boxShadow: isActive ? 'inset 2px 0 0 var(--cf-phosphor)' : 'none',
                                }}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    {/* Section accent */}
                                    <div className="cf-led w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />

                                    {/* Priority dot */}
                                    {card.priority && (
                                        <div
                                            className="cf-led w-1.5 h-1.5 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: PRIORITY_COLOR[card.priority], boxShadow: `0 0 6px ${PRIORITY_COLOR[card.priority]}` }}
                                        />
                                    )}

                                    <span className="cf-mono text-sm font-medium truncate flex-1" style={{ color: isActive ? 'var(--cf-phosphor)' : 'var(--cf-text)' }}>
                                        {highlight(card.name, q)}
                                    </span>

                                    {/* Due date */}
                                    {card.due_date && (
                                        <span className="cf-lcd text-[10px] flex-shrink-0" style={{ color: 'var(--cf-text-muted)' }}>
                                            {card.due_date.slice(0, 10)}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 pl-3.5">
                                    {/* Section name */}
                                    <span
                                        className="cf-mono text-[10px] uppercase tracking-widest font-bold flex-shrink-0"
                                        style={{ color, textShadow: `0 0 8px ${color}` }}
                                    >
                                        {section?.name ?? ''}
                                    </span>

                                    {/* Tags */}
                                    {(card.tags ?? []).slice(0, 3).map(tag => (
                                        <span
                                            key={tag.id}
                                            className="aero-pill cf-mono text-[9px] uppercase tracking-wide px-1.5 py-0.5 font-bold"
                                            style={{ color: tag.color, borderColor: tag.color + '88', boxShadow: `0 0 7px ${tag.color}55` }}
                                        >
                                            {tag.name}
                                        </span>
                                    ))}

                                    {/* Description snippet */}
                                    {card.description && q.length > 0 && card.description.toLowerCase().includes(q) && (
                                        <span className="cf-mono text-[10px] truncate" style={{ color: 'var(--cf-text-muted)' }}>
                                            …{snippet(card.description, q)}…
                                        </span>
                                    )}
                                </div>
                            </button>
                        )
                    })}
                </div>

                {/* Footer hint */}
                <div className="flex items-center gap-4 px-4 py-2 flex-shrink-0" style={{ borderTop: '1px solid var(--cf-edge)' }}>
                    <span className="cf-label text-[10px] uppercase tracking-widest" style={{ color: 'var(--cf-text-muted)' }}>
                        {results.length} result{results.length !== 1 ? 's' : ''}
                    </span>
                    <div className="flex items-center gap-2 ml-auto">
                        <kbd className="cf-mono text-[10px] px-1 py-0.5 rounded" style={{ color: 'var(--cf-text-muted)', border: '1px solid var(--cf-edge)' }}>↑↓</kbd>
                        <span className="cf-mono text-[10px]" style={{ color: 'var(--cf-text-muted)' }}>navigate</span>
                        <kbd className="cf-mono text-[10px] px-1 py-0.5 rounded" style={{ color: 'var(--cf-text-muted)', border: '1px solid var(--cf-edge)' }}>↵</kbd>
                        <span className="cf-mono text-[10px]" style={{ color: 'var(--cf-text-muted)' }}>open</span>
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
            <mark style={{ backgroundColor: 'rgba(154,166,126,0.22)', color: 'var(--cf-phosphor)', borderRadius: '2px', textShadow: '0 0 8px var(--cf-phosphor)' }}>
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
