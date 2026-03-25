import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Droppable } from "../shared/Droppable";
import { useEffect, useState } from "react";
import { Draggable } from "../shared/Draggable";
import { Card } from "../ui/Card";
import { Section } from "../ui/Section";
import { BoardInterface } from "@/interfaces/BoardInterface";
import CardEdit from "../ui/CardEdit";
import Modal from "../shared/Modal";
import { createCard, updateCard } from "@/lib/api";

export function Board({id, name, description, size, cards, sections}: BoardInterface & { size: string }) {
    const [parent, setParent] = useState(null);
    const [cardsProp, setCards] = useState(cards);
    const [lastIdUsed, setLastIdUsed] = useState(0);
    const [isCardVisible, setIsCardVisible] = useState<boolean>(false)
    const [selectedCard, setSelectedCard] = useState(null)

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

    const handleClick = (card: any) => {
        setSelectedCard(card)
        setIsCardVisible(true)
    }

    const handleSubmit = async (card: any, isNew: boolean) => {
        if (isNew) {
            const saved = await createCard(id, {
                section_id: card.section_id,
                name: card.name,
                description: card.description,
            });
            setCards((prev) => [...prev, saved]);
        } else {
            const saved = await updateCard(id, card.id, {
                section_id: card.section_id,
                name: card.name,
                description: card.description,
            });
            setCards(cardsProp.map(c => c.id === card.id ? saved : c));
        }
        setIsCardVisible(false)
        setSelectedCard(null)
    }

    useEffect(() => {
        const handleGlobalEvent = (event: any) => {
            if (event.key.toLowerCase() === 'c') {
                setIsCardVisible(true)
            }
        }

        window.addEventListener('keydown', handleGlobalEvent)

        return () => {
            window.removeEventListener('keydown', handleGlobalEvent)
        }
    }, [])

    const sensors = useSensors(
        useSensor(PointerSensor, {
        activationConstraint: {
            distance: 5, 
        },
        })
    );

    return (
        <>
            <div className={`min-h-[${size}dvh] w-[80dvw] bg-gray-700 bg-center rounded-xl flex justify-center space-x-7`}>
                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                    <div className="flex justify-between w-full">
                        {sections.map((section) => (
                            <Section handleClick={handleClick} cards={sectionCards(section.id)} key={section.name} id={section.id} name={section.name} parent={parent}/>
                        ))}
                    </div>
                </DndContext>
            </div>
            {
                isCardVisible && (
                    <Modal>
                        <div className="bg-amber-100 p-8 rounded-lg w-[60%] h-[60%]">
                            <CardEdit card={selectedCard} goBack={() => setIsCardVisible(false)} submit={handleSubmit}/>
                        </div>
                    </Modal>
                )
            }
        </>
    )

    function handleDragEnd(event: any) {
        const sectionSelected = sections.filter(section => section.name === event.over.id)[0];

        if (sectionSelected) {
            const selectedCardId = Number(event.active.id.split('-')[1]);

            if (selectedCardId) {
                setCards(cardsProp.map(card => {
                    if (card.id === selectedCardId) {
                        return { ...card, section_id: sectionSelected.id }
                    }
                    return card;
                }))

                updateCard(id, selectedCardId, { section_id: sectionSelected.id });
            }
        }
    }
}