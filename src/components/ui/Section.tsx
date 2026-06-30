import { useEffect, useRef, useState } from "react"
import { CardInterface } from "@/interfaces/CardInterface"
import { Droppable } from "../shared/Droppable"
import { Card } from "./Card"
import { SectionInterface } from "@/interfaces/SectionInterface"
import { playWipReject } from "@/lib/sound"
import { hapticReject } from "@/lib/haptics"

export function Section({id, name, color, cards, handleClick, onDelete, onRename, wipLimit, onSetWipLimit}: SectionInterface) {
    const [editing, setEditing] = useState(false)
    const [editValue, setEditValue] = useState(name)
    const [editingWip, setEditingWip] = useState(false)
    const [wipInput, setWipInput] = useState('')
    const [shaking, setShaking] = useState(false)
    const wipInputRef = useRef<HTMLInputElement>(null)
    const cardListRef = useRef<HTMLDivElement>(null)
    const prevOverLimit = useRef(false)
    const prevCount = useRef(cards.length)

    const commitRename = () => {
        const trimmed = editValue.trim()
        if (trimmed && trimmed !== name) {
            onRename?.(trimmed)
        } else {
            setEditValue(name)
        }
        setEditing(false)
    }

    const openWipEdit = () => {
        setWipInput(wipLimit != null ? String(wipLimit) : '')
        setEditingWip(true)
        setTimeout(() => wipInputRef.current?.focus(), 0)
    }

    const commitWip = () => {
        const n = parseInt(wipInput)
        onSetWipLimit?.(isNaN(n) || n <= 0 ? null : n)
        setEditingWip(false)
    }

    const count = cards.length
    const atLimit  = wipLimit != null && count === wipLimit
    const overLimit = wipLimit != null && count > wipLimit
    // Status LED cycles green (nominal) / amber (at limit) / red (over limit)
    const ledColor = overLimit ? 'var(--cf-red)' : atLimit ? 'var(--cf-amber)' : 'var(--cf-phosphor)'
    const countColor = overLimit ? 'var(--cf-red)' : atLimit ? 'var(--cf-amber)' : 'var(--cf-text)'
    const countBg    = '#1c1a16'

    // Ring animation when a card lands in this column — direct DOM to restart reliably
    useEffect(() => {
        if (cards.length > prevCount.current) {
            const el = cardListRef.current
            if (el) {
                el.classList.remove('col-ring')
                void el.offsetWidth  // force reflow so browser sees the removal
                el.classList.add('col-ring')
            }
        }
        prevCount.current = cards.length
    }, [cards.length])

    // Shake + sound when a card pushes the column over its WIP limit
    useEffect(() => {
        if (overLimit && !prevOverLimit.current) {
            setShaking(true)
            playWipReject()
            hapticReject()
            setTimeout(() => setShaking(false), 500)
        }
        prevOverLimit.current = overLimit
    }, [overLimit])

    // Column sags under load — subtle translateY proportional to card count
    const sag = Math.min(count * 0.45, 7)

    const style = {
        minHeight: '300px',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '8px',
    }

    return (
        <div
            className={`aero-column flex flex-col w-64 flex-shrink-0 group/section pb-2 ${shaking ? 'wip-shake' : ''}`}
            style={{ transform: shaking ? undefined : `translateY(${sag}px)`, transition: shaking ? 'none' : 'transform 600ms cubic-bezier(0.16,1,0.3,1)' }}
        >
            {/* Column header — status LED + mono label + readout count */}
            <div className="flex items-center gap-2 mb-3 px-3 pt-2">
                <span
                    style={{ background: ledColor, boxShadow: `0 0 6px ${ledColor}, 0 0 11px ${ledColor}` }}
                    className="cf-led flex-shrink-0"
                />

                {editing ? (
                    <input
                        autoFocus
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={e => {
                            if (e.key === 'Enter') commitRename()
                            if (e.key === 'Escape') { setEditValue(name); setEditing(false) }
                        }}
                        className="cf-mono flex-1 bg-transparent text-xs uppercase tracking-widest font-bold focus:outline-none border-b min-w-0"
                        style={{ color: 'var(--cf-text)', borderColor: 'var(--cf-phosphor)' }}
                    />
                ) : (
                    <p
                        className="cf-label cursor-pointer truncate"
                        style={{ color: 'var(--cf-text)', fontSize: '12px', fontWeight: 700 }}
                        onDoubleClick={() => { setEditValue(name); setEditing(true) }}
                        title="Double-click to rename"
                    >
                        {name}
                    </p>
                )}

                {/* Count / WIP readout */}
                <span
                    style={{ color: countColor, backgroundColor: countBg, fontSize: '11px', letterSpacing: '0.06em' }}
                    className="cf-mono ml-auto px-2 py-0.5 rounded-sm flex-shrink-0 tabular-nums"
                    title={wipLimit != null ? `${count} / ${wipLimit} WIP limit` : `${count} cards`}
                >
                    {wipLimit != null ? `${count}/${wipLimit}` : count}
                </span>

                {/* WIP edit trigger */}
                {onSetWipLimit && (
                    <button
                        onClick={openWipEdit}
                        className="btn-physical opacity-0 group-hover/section:opacity-100 text-xs cursor-pointer leading-none flex-shrink-0"
                        style={{ color: 'var(--cf-text-muted)' }}
                        title="Set WIP limit"
                    >
                        ⚙
                    </button>
                )}

                {onDelete && (
                    <button
                        onClick={onDelete}
                        className="btn-physical opacity-0 group-hover/section:opacity-100 text-xs cursor-pointer leading-none ml-1 flex-shrink-0"
                        style={{ color: 'var(--cf-text-muted)' }}
                        title="Delete section"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* WIP limit inline editor */}
            {editingWip && (
                <div className="flex items-center gap-2 mb-2 px-3">
                    <input
                        ref={wipInputRef}
                        type="number"
                        min="1"
                        value={wipInput}
                        onChange={e => setWipInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') commitWip()
                            if (e.key === 'Escape') setEditingWip(false)
                        }}
                        placeholder="Limit..."
                        className="glass-input w-20 text-xs px-2 py-1"
                    />
                    <button onClick={commitWip} className="btn-physical cf-mono text-xs font-bold uppercase cursor-pointer hover:brightness-110" style={{ color: 'var(--cf-phosphor)' }}>Set</button>
                    <button onClick={() => { onSetWipLimit?.(null); setEditingWip(false); }} className="btn-physical cf-mono text-xs uppercase cursor-pointer hover:brightness-110" style={{ color: 'var(--cf-text-muted)' }}>Clear</button>
                </div>
            )}

            {/* WIP warning banner */}
            {overLimit && (
                <div
                    className="cf-mono mx-3 mb-2 px-2 py-1 rounded-sm text-xs font-bold uppercase tracking-widest"
                    style={{ color: 'var(--cf-red)', background: '#0d1410', border: '1px solid var(--cf-red)' }}
                >
                    ⚠ WIP limit exceeded
                </div>
            )}
            {atLimit && (
                <div
                    className="cf-mono mx-3 mb-2 px-2 py-1 rounded-sm text-xs font-bold uppercase tracking-widest"
                    style={{ color: 'var(--cf-amber)', background: '#0d1410', border: '1px solid var(--cf-amber)' }}
                >
                    WIP limit reached
                </div>
            )}

            {/* Card list */}
            <div ref={cardListRef} className="mx-2 rounded-xl p-2 flex-1 max-h-[50vh] md:max-h-[calc(100vh-320px)] overflow-y-auto">
                <Droppable style={style} key={id} id={name}>
                    {cards.map((card: CardInterface) => (
                        <div key={card.id} onClick={() => handleClick(card)}>
                            <Card {...card} color={color} />
                        </div>
                    ))}
                </Droppable>
            </div>
        </div>
    )
}
