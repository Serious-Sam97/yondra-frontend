import { CardInterface } from "@/interfaces/CardInterface"
import { Droppable } from "../shared/Droppable"
import { Card } from "./Card"
import { SectionInterface } from "@/interfaces/SectionInterface"

export function Section({id, name, color, cards, handleClick, onDelete}: SectionInterface) {
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
                <div style={{ backgroundColor: color }} className="w-2 h-2 rounded-full"/>
                <p className="text-xs uppercase tracking-widest font-bold text-gray-300">{name}</p>
                <span className="ml-auto text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">
                    {cards.length}
                </span>
                {onDelete && (
                    <button
                        onClick={onDelete}
                        className="opacity-0 group-hover/section:opacity-100 text-gray-600 hover:text-red-400 text-xs cursor-pointer transition-all duration-150 leading-none ml-1"
                        title="Delete section"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Top color bar */}
            <div style={{ backgroundColor: color + '33', borderColor: color + '55' }} className="border rounded-xl p-2 flex-1">
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
