import { useState } from "react"
import { CardInterface } from "@/interfaces/CardInterface"
import { Droppable } from "../shared/Droppable"
import { Card } from "./Card"
import { SectionInterface } from "@/interfaces/SectionInterface"

export function Section({id, name, color, cards, handleClick, onDelete, onRename}: SectionInterface) {
    const [editing, setEditing] = useState(false)
    const [editValue, setEditValue] = useState(name)

    const commitRename = () => {
        const trimmed = editValue.trim()
        if (trimmed && trimmed !== name) {
            onRename?.(trimmed)
        } else {
            setEditValue(name)
        }
        setEditing(false)
    }

    const style = {
        minHeight: '300px',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '8px',
    }

    return (
        <div className="flex flex-col w-64 flex-shrink-0 group/section">
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

                <span className="ml-auto text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full flex-shrink-0">
                    {cards.length}
                </span>
                {onDelete && (
                    <button
                        onClick={onDelete}
                        className="opacity-0 group-hover/section:opacity-100 text-gray-600 hover:text-red-400 text-xs cursor-pointer transition-all duration-150 leading-none ml-1 flex-shrink-0"
                        title="Delete section"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Card list */}
            <div style={{ backgroundColor: color + '33', borderColor: color + '55' }} className="border rounded-xl p-2 flex-1 max-h-[50vh] md:max-h-[calc(100vh-320px)] overflow-y-auto">
                <Droppable style={style} key={id} id={name}>
                    {cards.map((card: CardInterface) => (
                        <div key={card.id} onClick={() => handleClick(card)}>
                            <Card
                                id={card.id}
                                section_id={card.section_id}
                                name={card.name}
                                description={card.description}
                                color={color}
                            />
                        </div>
                    ))}
                </Droppable>
            </div>
        </div>
    )
}
