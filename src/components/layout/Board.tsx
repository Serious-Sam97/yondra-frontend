import { DndContext } from "@dnd-kit/core";
import { Droppable } from "../shared/Droppable";
import { useEffect, useState } from "react";
import { Draggable } from "../shared/Draggable";
import { Card } from "../ui/Card";
import { Section } from "../ui/Section";
import { BoardInterface } from "@/interfaces/BoardInterface";

export function Board({id, name, description, size, cards, sections}: BoardInterface & { size: string }) {
    const [parent, setParent] = useState(null);
    const [cardsProp, setCards] = useState(cards);

    useEffect(() => {
        setCards(cards);
    }, [cards]);

    useEffect(() => {
        console.log(cardsProp);
    }, [cardsProp])

    const sectionCards = (sectionId: any) => {
        console.log('SECGTION LOGIC')
        return cardsProp.filter((card) => card.section_id === sectionId)
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
                console.log('Drag LOGIC')
                setCards(cardsProp.map(card => {
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