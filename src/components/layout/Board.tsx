import { DndContext } from "@dnd-kit/core";
import { Droppable } from "../shared/Droppable";
import { useState } from "react";
import { Draggable } from "../shared/Draggable";
import { Card } from "../ui/Card";
import { Section } from "../ui/Section";
import { BoardInterface } from "@/interfaces/BoardInterface";

export function Board({id, name, description, size}: BoardInterface & { size: string }) {
    const sections = [
        {
            id: 1,
            name: 'To Do',
        },
        {
            id: 2,
            name: 'In Progress',
        },
        {
            id: 3,
            name: 'Done',
        },
    ];

    const [parent, setParent] = useState(null);

    const [cards, setCards] = useState([
        {
            id: 1,
            section_id: 1,
            name: 'Card 012',
            description: 'Here is a description space'
        },
        {
            id: 2,
            section_id: 1,
            name: 'Card 013',
            description: 'Here is a description space'
        },
        {
            id: 3,
            section_id: 1,
            name: 'Card 014',
            description: 'Here is a description space'
        },
        {
            id: 4,
            section_id: 1,
            name: 'Card 015',
            description: 'Here is a description space'
        },
        {
            id: 5,
            section_id: 1,
            name: 'Card 016',
            description: 'Here is a description space'
        },
    ]);

    const sectionCards = (sectionId: any) => {
        return cards.filter((card) => card.section_id === sectionId)
    };

    return (
        <div className={`min-h-[${size}dvh] w-[80dvw] bg-gray-400 bg-center rounded-xl flex justify-center space-x-7`}>
            <DndContext onDragEnd={handleDragEnd}>
                <div className="flex justify-between w-full">
                    {sections.map((section) => (
                        <Section cards={sectionCards(section.id)} key={section.name} id={section.id} name={section.name} parent={parent}/>
                    ))}
                </div>
            </DndContext>
        </div>
    )

    function handleDragEnd(event: any) {
        const sectionSelected = sections.filter(section => section.name === event.over.id)[0];
        if (sectionSelected) {
            const selectedCardId = event.active.id.split('-')[1];

            if (selectedCardId) {
                setCards(cards.map(card => {
                    if (card.id === Number(selectedCardId)) {
                        return {
                            ...card,
                            section_id: sectionSelected.id,
                        }
                    }

                    return {
                        ...card
                    }
                }))
            }
        }
    }
}