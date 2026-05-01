'use client'

import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useEffect, useState } from "react";
import { Card } from "../ui/Card";
import { Section } from "../ui/Section";
import { BoardInterface, SharedUser } from "@/interfaces/BoardInterface";
import CardEdit from "../ui/CardEdit";
import Modal from "../shared/Modal";
import { createCard, updateCard, createSection, updateSection, deleteSection } from "@/lib/api";
import { demoCreateCard, demoUpdateCard, demoCreateSection, demoUpdateSection, demoDeleteSection } from "@/lib/demoStorage";

const SECTION_COLORS = ['#4CAF50', '#FF9800', '#1976D2', '#F44336', '#7B1FA2', '#FFC107'];
const AVATAR_COLORS  = ['#4CAF50', '#FF9800', '#1976D2', '#F44336', '#7B1FA2', '#FFC107', '#00BCD4', '#E91E63'];

function initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

interface BoardProps extends BoardInterface {
    size: string;
    isDemo?: boolean;
    demoId?: string;
    boardUsers?: SharedUser[];
}

export function Board({ id, name, description, size, cards, sections: initialSections, isDemo = false, demoId = 'demo', boardUsers = [] }: BoardProps) {
    const [cardsProp, setCards] = useState(cards);
    const [sections, setSections] = useState(initialSections);
    const [isCardVisible, setIsCardVisible] = useState<boolean>(false)
    const [selectedCard, setSelectedCard] = useState(null)
    const [isAddingSection, setIsAddingSection] = useState(false)
    const [newSectionName, setNewSectionName] = useState('')
    const [sectionToDelete, setSectionToDelete] = useState<{id: number, name: string} | null>(null)
    const [filterUserId, setFilterUserId] = useState<number | null>(null)

    useEffect(() => { setCards(cards); }, [cards]);
    useEffect(() => { setSections(initialSections); }, [initialSections]);

    const handleRenameSection = async (sectionId: number, newName: string) => {
        setSections(prev => prev.map(s => s.id === sectionId ? { ...s, name: newName } : s));
        if (isDemo) {
            demoUpdateSection(demoId, sectionId, newName);
        } else {
            await updateSection(id, sectionId, newName);
        }
    };

    const handleDeleteSection = async () => {
        if (!sectionToDelete) return;
        if (isDemo) {
            demoDeleteSection(demoId, sectionToDelete.id);
        } else {
            await deleteSection(id, sectionToDelete.id);
        }
        setSections(prev => prev.filter(s => s.id !== sectionToDelete.id));
        setCards(prev => prev.filter(c => c.section_id !== sectionToDelete.id));
        setSectionToDelete(null);
    };

    const handleAddSection = async () => {
        const trimmed = newSectionName.trim();
        if (!trimmed) return;
        const saved = isDemo ? demoCreateSection(demoId, trimmed) : await createSection(id, trimmed);
        setSections(prev => [...prev, saved]);
        setNewSectionName('');
        setIsAddingSection(false);
    };

    const sectionCards = (sectionId: any) => {
        const filtered = cardsProp.filter(card => card.section_id === sectionId);
        if (filterUserId === null) return filtered;
        return filtered.filter(card => card.assigned_user_id === filterUserId);
    };

    const handleClick = (card: any) => {
        setSelectedCard(card)
        setIsCardVisible(true)
    }

    const handleSubmit = async (card: any, isNew: boolean) => {
        if (isNew) {
            const saved = isDemo
                ? demoCreateCard(demoId, { section_id: card.section_id, name: card.name, description: card.description })
                : await createCard(id, { section_id: card.section_id, assigned_user_id: card.assigned_user_id, name: card.name, description: card.description });
            setCards(prev => [...prev, saved]);
        } else {
            const saved = isDemo
                ? demoUpdateCard(demoId, card.id, { section_id: card.section_id, name: card.name, description: card.description })
                : await updateCard(id, card.id, { section_id: card.section_id, assigned_user_id: card.assigned_user_id, name: card.name, description: card.description });
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
            {/* Filter strip + Press C hint */}
            <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                    {boardUsers.length > 0 && (
                        <>
                            <button
                                onClick={() => setFilterUserId(null)}
                                className={`text-xs uppercase tracking-widest px-3 py-1.5 rounded-full border font-bold cursor-pointer transition-all duration-150 ${
                                    filterUserId === null
                                        ? 'bg-white text-gray-900 border-white'
                                        : 'text-gray-500 border-gray-700 hover:border-gray-400 hover:text-gray-300'
                                }`}
                            >
                                All
                            </button>
                            {boardUsers.map((user) => {
                                const color = AVATAR_COLORS[user.id % AVATAR_COLORS.length]
                                const isActive = filterUserId === user.id
                                return (
                                    <button
                                        key={user.id}
                                        onClick={() => setFilterUserId(isActive ? null : user.id)}
                                        style={{ borderColor: color, backgroundColor: isActive ? color : 'transparent', color: isActive ? '#fff' : color }}
                                        className="text-xs uppercase tracking-widest px-3 py-1.5 rounded-full border font-bold cursor-pointer transition-all duration-150 flex items-center gap-1.5"
                                    >
                                        <span
                                            style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : color, fontSize: '9px', width: '16px', height: '16px' }}
                                            className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                                        >
                                            {initials(user.name)}
                                        </span>
                                        {user.name.split(' ')[0]}
                                    </button>
                                )
                            })}
                        </>
                    )}
                </div>

                <div className="hidden md:flex items-center gap-2 text-gray-600 flex-shrink-0">
                    <p className="text-xs uppercase tracking-widest">Press</p>
                    <kbd className="text-xs bg-gray-800 border border-gray-700 text-amber-400 px-2 py-1 rounded font-mono">C</kbd>
                    <p className="text-xs uppercase tracking-widest">to add a ticket</p>
                </div>
            </div>

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
                            onDelete={() => setSectionToDelete({ id: section.id, name: section.name })}
                            onRename={(newName) => handleRenameSection(section.id, newName)}
                        />
                    ))}

                    {/* Add section */}
                    <div className="flex flex-col w-64 flex-shrink-0">
                        {isAddingSection ? (
                            <div className="flex flex-col gap-2">
                                <input
                                    autoFocus
                                    value={newSectionName}
                                    onChange={e => setNewSectionName(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleAddSection();
                                        if (e.key === 'Escape') { setIsAddingSection(false); setNewSectionName(''); }
                                    }}
                                    placeholder="Section name..."
                                    className="bg-gray-800 border border-gray-600 text-white text-xs uppercase tracking-widest px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-gray-600 w-full"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleAddSection}
                                        className="flex-1 text-xs uppercase tracking-widest font-bold text-black bg-amber-400 hover:bg-amber-300 py-1.5 rounded-lg cursor-pointer transition-all duration-150"
                                    >
                                        Add
                                    </button>
                                    <button
                                        onClick={() => { setIsAddingSection(false); setNewSectionName(''); }}
                                        className="flex-1 text-xs uppercase tracking-widest text-gray-400 hover:text-white border border-gray-700 hover:border-gray-400 py-1.5 rounded-lg cursor-pointer transition-all duration-150"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsAddingSection(true)}
                                className="flex items-center gap-2 text-xs uppercase tracking-widest text-gray-600 hover:text-gray-300 border-2 border-dashed border-gray-700 hover:border-gray-500 rounded-xl px-4 py-3 cursor-pointer transition-all duration-150 w-full"
                            >
                                <span className="text-lg leading-none">+</span> Add Section
                            </button>
                        )}
                    </div>
                </div>
            </DndContext>

            {/* FAB - Add ticket */}
            <button
                onClick={() => setIsCardVisible(true)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-amber-400 hover:bg-amber-300 active:scale-95 text-black rounded-full flex items-center justify-center shadow-2xl cursor-pointer transition-all duration-150 text-2xl font-bold z-40"
                title="Add ticket"
            >
                +
            </button>

            {sectionToDelete && (
                <Modal>
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-[90%] max-w-sm flex flex-col gap-6">
                        <div className="flex flex-col items-center text-center gap-3">
                            <p className="text-3xl">⚠</p>
                            <p className="text-white font-bold text-lg">Delete "{sectionToDelete.name}"?</p>
                            <p className="text-gray-500 text-sm">All cards in this section will be permanently deleted.</p>
                        </div>
                        <div className="flex justify-between">
                            <button
                                onClick={() => setSectionToDelete(null)}
                                className="text-xs uppercase tracking-widest text-gray-400 hover:text-white border border-gray-700 hover:border-gray-400 px-4 py-2 rounded-lg cursor-pointer transition-all duration-200"
                            >
                                Go back
                            </button>
                            <button
                                onClick={handleDeleteSection}
                                className="text-xs uppercase tracking-widest font-bold text-white bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg cursor-pointer transition-all duration-200"
                            >
                                Yes, delete
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {isCardVisible && (
                <Modal>
                    <div>
                        <CardEdit
                            card={selectedCard}
                            sections={sections}
                            users={boardUsers}
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
        if (isDemo) {
            demoUpdateCard(demoId, selectedCardId, { section_id: sectionSelected.id });
        } else {
            updateCard(id, selectedCardId, { section_id: sectionSelected.id });
        }
    }
}
