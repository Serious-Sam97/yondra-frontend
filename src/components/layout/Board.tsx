'use client'

import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useEffect, useState } from "react";
import { Card } from "../ui/Card";
import { Section } from "../ui/Section";
import { BoardInterface } from "@/interfaces/BoardInterface";
import CardEdit from "../ui/CardEdit";
import Modal from "../shared/Modal";
import { createCard, updateCard } from "@/lib/api";

const SECTION_COLORS = ['#4CAF50', '#FF9800', '#1976D2', '#F44336', '#7B1FA2', '#FFC107'];

export function Board({id, name, description, size, cards, sections}: BoardInterface & { size: string }) {
    const [cardsProp, setCards] = useState(cards);
    const [isCardVisible, setIsCardVisible] = useState<boolean>(false)
    const [selectedCard, setSelectedCard] = useState(null)

    useEffect(() => {
        setCards(cards);
    }, [cards]);

    const sectionCards = (sectionId: any) => {
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
            if (event.key.toLowerCase() === 'c' && !isCardVisible) {
                setIsCardVisible(true)
            }
        }
        window.addEventListener('keydown', handleGlobalEvent)
        return () => window.removeEventListener('keydown', handleGlobalEvent)
    }, [isCardVisible])

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    return (
        <>
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <div className="flex gap-5 items-start overflow-x-auto pb-4">
                    {sections.map((section, i) => (
                        <Section
                            key={section.id}
                            handleClick={handleClick}
                            cards={sectionCards(section.id)}
                            id={section.id}
                            name={section.name}
                            color={SECTION_COLORS[i % SECTION_COLORS.length]}
                            parent={null}
                        />
                    ))}
                </div>
            </DndContext>

            {isCardVisible && (
                <Modal>
                    <div>
                        <CardEdit
                            card={selectedCard}
                            sections={sections}
                            goBack={() => { setIsCardVisible(false); setSelectedCard(null); }}
                            submit={handleSubmit}
                        />
                    </div>
                </Modal>
            )}
        </>
    )

    function handleDragEnd(event: any) {
        const sectionSelected = sections.find(section => section.name === event.over?.id);
        if (!sectionSelected) return;

        const selectedCardId = Number(event.active.id.split('-')[1]);
        if (!selectedCardId) return;

        setCards(cardsProp.map(card =>
            card.id === selectedCardId ? { ...card, section_id: sectionSelected.id } : card
        ));
        updateCard(id, selectedCardId, { section_id: sectionSelected.id });
    }
}
