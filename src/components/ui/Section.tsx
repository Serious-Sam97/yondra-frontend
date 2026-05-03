import { useEffect, useRef, useState } from "react"
import { CardInterface } from "@/interfaces/CardInterface"
import { Droppable } from "../shared/Droppable"
import { Card } from "./Card"
import { SectionInterface } from "@/interfaces/SectionInterface"
import { playWipReject } from "@/lib/sound"

export function Section({id, name, color, cards, handleClick, onDelete, onRename, wipLimit, onSetWipLimit}: SectionInterface) {
    const [editing, setEditing] = useState(false)
    const [editValue, setEditValue] = useState(name)
    const [editingWip, setEditingWip] = useState(false)
    const [wipInput, setWipInput] = useState('')
    const [shaking, setShaking] = useState(false)
    const wipInputRef = useRef<HTMLInputElement>(null)
    const prevOverLimit = useRef(false)

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
    const countColor = overLimit ? '#ef4444' : atLimit ? '#f97316' : '#6b7280'
    const countBg    = overLimit ? '#ef444422' : atLimit ? '#f9731622' : '#1f2937'

    // Shake + sound when a card pushes the column over its WIP limit
    useEffect(() => {
        if (overLimit && !prevOverLimit.current) {
            setShaking(true)
            playWipReject()
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
            className={`flex flex-col w-64 flex-shrink-0 group/section ${shaking ? 'wip-shake' : ''}`}
            style={{ transform: shaking ? undefined : `translateY(${sag}px)`, transition: shaking ? 'none' : 'transform 600ms cubic-bezier(0.16,1,0.3,1)' }}
        >
            {/* Column header */}
            <div className="flex items-center gap-2 mb-3 px-1">
                <div style={{ backgroundColor: color }} className="w-2 h-2 rounded-full flex-shrink-0"/>

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
                        className="flex-1 bg-transparent text-xs uppercase tracking-widest font-bold text-gray-300 focus:outline-none border-b border-amber-400 min-w-0"
                    />
                ) : (
                    <p
                        className="text-xs uppercase tracking-widest font-bold text-gray-300 cursor-pointer hover:text-white truncate"
                        onDoubleClick={() => { setEditValue(name); setEditing(true) }}
                        title="Double-click to rename"
                    >
                        {name}
                    </p>
                )}

                {/* Count / WIP badge */}
                <span
                    style={{ color: countColor, backgroundColor: countBg, borderColor: countColor + '44' }}
                    className="ml-auto text-xs px-2 py-0.5 rounded-full flex-shrink-0 border font-bold"
                    title={wipLimit != null ? `${count} / ${wipLimit} WIP limit` : `${count} cards`}
                >
                    {wipLimit != null ? `${count}/${wipLimit}` : count}
                </span>

                {/* WIP edit trigger */}
                {onSetWipLimit && (
                    <button
                        onClick={openWipEdit}
                        className="btn-physical opacity-0 group-hover/section:opacity-100 text-gray-600 hover:text-amber-400 text-xs cursor-pointer leading-none flex-shrink-0"
                        title="Set WIP limit"
                    >
                        ⚙
                    </button>
                )}

                {onDelete && (
                    <button
                        onClick={onDelete}
                        className="btn-physical opacity-0 group-hover/section:opacity-100 text-gray-600 hover:text-red-400 text-xs cursor-pointer leading-none ml-1 flex-shrink-0"
                        title="Delete section"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* WIP limit inline editor */}
            {editingWip && (
                <div className="flex items-center gap-2 mb-2 px-1">
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
                        className="w-20 bg-gray-800 border border-gray-600 text-white text-xs px-2 py-1 rounded focus:outline-none focus:border-amber-400"
                    />
                    <button onClick={commitWip} className="btn-physical text-xs text-amber-400 font-bold cursor-pointer hover:text-amber-300">Set</button>
                    <button onClick={() => { onSetWipLimit?.(null); setEditingWip(false); }} className="btn-physical text-xs text-gray-500 cursor-pointer hover:text-gray-300">Clear</button>
                </div>
            )}

            {/* WIP warning banner */}
            {overLimit && (
                <div className="mb-2 px-2 py-1 bg-red-900/40 border border-red-700/50 rounded-lg text-xs text-red-400 font-bold uppercase tracking-widest">
                    ⚠ WIP limit exceeded
                </div>
            )}
            {atLimit && (
                <div className="mb-2 px-2 py-1 bg-orange-900/40 border border-orange-700/50 rounded-lg text-xs text-orange-400 font-bold uppercase tracking-widest">
                    WIP limit reached
                </div>
            )}

            {/* Card list */}
            <div style={{ backgroundColor: color + '33', borderColor: color + '55' }} className="border rounded-xl p-2 flex-1 max-h-[50vh] md:max-h-[calc(100vh-320px)] overflow-y-auto">
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
