'use client'

import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Card } from "../ui/Card";
import { useEffect, useRef, useState } from "react";
import { Section } from "../ui/Section";
import { BoardInterface, SharedUser } from "@/interfaces/BoardInterface";
import { TagInterface } from "@/interfaces/TagInterface";
import CardEdit from "../ui/CardEdit";
import Modal from "../shared/Modal";
import {
    createCard, updateCard, deleteCard,
    createSection, updateSection, deleteSection,
    createTag, deleteTag,
    getActivity, restoreCard, getArchivedCards,
    getTemplates,
} from "@/lib/api";
import BoardChat from "../ui/BoardChat";
import { getEcho } from "@/lib/echo";
import {
    demoCreateCard, demoUpdateCard,
    demoCreateSection, demoUpdateSection, demoDeleteSection,
    demoCreateTag, demoDeleteTag,
    demoArchiveCard, demoRestoreCard, loadDemoArchivedCards,
    loadDemoTemplates,
} from "@/lib/demoStorage";

const SECTION_COLORS = ['#4CAF50', '#FF9800', '#1976D2', '#F44336', '#7B1FA2', '#FFC107'];
const AVATAR_COLORS  = ['#4CAF50', '#FF9800', '#1976D2', '#F44336', '#7B1FA2', '#FFC107', '#00BCD4', '#E91E63'];
const TAG_PALETTE    = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];
const BG_OPTIONS = [
    { label: 'Default',      value: '' },
    { label: 'Deep Navy',    value: '#07090f' },
    { label: 'Forest',       value: '#070f09' },
    { label: 'Plum',         value: '#0d070f' },
    { label: 'Warm Dark',    value: '#100a07' },
    { label: 'Graphite',     value: '#0a0a0a' },
    { label: 'Ocean',        value: 'linear-gradient(135deg,#060d1a 0%,#081525 100%)' },
    { label: 'Dusk',         value: 'linear-gradient(135deg,#130d1a 0%,#07090f 100%)' },
    { label: 'Deep Forest',  value: 'linear-gradient(135deg,#071309 0%,#07090f 100%)' },
    { label: 'Sunset',       value: 'linear-gradient(135deg,#1a0707 0%,#100a07 100%)' },
];

function initials(name: string): string {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

interface BoardProps extends BoardInterface {
    size: string;
    isDemo?: boolean;
    demoId?: string;
    boardUsers?: SharedUser[];
    isReadOnly?: boolean;
    currentUserId?: number;
}

export function Board({ id, name, description, size, cards, sections: initialSections, tags: initialTags = [], isDemo = false, demoId = 'demo', boardUsers = [], isReadOnly = false, currentUserId = 0 }: BoardProps) {
    const [cardsProp, setCards] = useState(cards);
    const [sections, setSections] = useState(initialSections);
    const [tags, setTags] = useState<TagInterface[]>(initialTags);
    const [isCardVisible, setIsCardVisible] = useState(false);
    const [selectedCard, setSelectedCard] = useState<any>(null);
    const [isAddingSection, setIsAddingSection] = useState(false);
    const [newSectionName, setNewSectionName] = useState('');
    const [sectionToDelete, setSectionToDelete] = useState<{id: number, name: string} | null>(null);
    const [cardToDelete, setCardToDelete] = useState<any>(null);
    const [filterUserId, setFilterUserId] = useState<number | null>(null);
    const [filterTagId, setFilterTagId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCard, setActiveCard] = useState<any>(null);
    const [isTagsOpen, setIsTagsOpen] = useState(false);
    const [isActivityOpen, setIsActivityOpen] = useState(false);
    const [activityLog, setActivityLog] = useState<any[]>([]);
    const [isArchivedOpen, setIsArchivedOpen] = useState(false);
    const [archivedCards, setArchivedCards] = useState<any[]>([]);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState(TAG_PALETTE[0]);

    const storageKey = isDemo ? demoId : String(id);
    const [wipLimits, setWipLimits] = useState<Record<number, number | null>>({});
    const [boardBg, setBoardBg] = useState<string>('');
    const [isBgOpen, setIsBgOpen] = useState(false);
    const [boardTemplates, setBoardTemplates] = useState<any[]>([]);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const chatChannelRef = useRef<any>(null);
    const chatLoadedRef = useRef(false);

    useEffect(() => {
        if (typeof window === 'undefined' || (!isDemo && id === 0)) return;
        const raw = localStorage.getItem(`yondra_wip_${storageKey}`);
        setWipLimits(raw ? JSON.parse(raw) : {});
        setBoardBg(localStorage.getItem(`yondra_bg_${storageKey}`) ?? '');
        if (isDemo) {
            setBoardTemplates(loadDemoTemplates(demoId));
        } else if (id !== 0) {
            getTemplates(id).then(data => setBoardTemplates(Array.isArray(data) ? data : [])).catch(() => {});
        }
    }, [storageKey]);

    const handleSetWipLimit = (sectionId: number, limit: number | null) => {
        const next = { ...wipLimits, [sectionId]: limit };
        setWipLimits(next);
        localStorage.setItem(`yondra_wip_${storageKey}`, JSON.stringify(next));
    };

    const handleSetBg = (bg: string) => {
        setBoardBg(bg);
        localStorage.setItem(`yondra_bg_${storageKey}`, bg);
        setIsBgOpen(false);
    };

    useEffect(() => { setCards(cards); }, [cards]);
    useEffect(() => { setSections(initialSections); }, [initialSections]);
    useEffect(() => { setTags(initialTags); }, [initialTags]);

    // --- Real-time ---

    useEffect(() => {
        if (isDemo || id === 0 || currentUserId === 0) return;

        const echo = getEcho();
        const channel = echo.private(`board.${id}`);
        chatChannelRef.current = channel;

        channel.listen('.board.event', (e: any) => {
            switch (e.type) {
                case 'card.created':
                    setCards(prev => prev.some(c => c.id === e.payload.id) ? prev : [...prev, e.payload]);
                    break;
                case 'card.updated':
                    setCards(prev => prev.map(c => c.id === e.payload.id ? { ...c, ...e.payload } : c));
                    break;
                case 'card.deleted':
                    setCards(prev => prev.filter(c => c.id !== e.payload.id));
                    break;
                case 'card.restored':
                    setCards(prev => prev.some(c => c.id === e.payload.id) ? prev : [...prev, e.payload]);
                    break;
                case 'section.created':
                    setSections(prev => prev.some(s => s.id === e.payload.id) ? prev : [...prev, e.payload]);
                    break;
                case 'section.updated':
                    setSections(prev => prev.map(s => s.id === e.payload.id ? { ...s, ...e.payload } : s));
                    break;
                case 'section.deleted':
                    setSections(prev => prev.filter(s => s.id !== e.payload.id));
                    setCards(prev => prev.filter(c => c.section_id !== e.payload.id));
                    break;
                case 'message.created':
                    setChatMessages(prev => prev.some(m => m.id === e.payload.id) ? prev : [...prev, e.payload]);
                    break;
                case 'message.deleted':
                    setChatMessages(prev => prev.filter(m => m.id !== e.payload.id));
                    break;
            }
        });

        return () => {
            echo.leave(`board.${id}`);
            chatChannelRef.current = null;
        };
    }, [id, isDemo, currentUserId]);

    // --- Tag management ---

    const handleCreateTag = async () => {
        const trimmed = newTagName.trim();
        if (!trimmed) return;
        const saved = isDemo
            ? demoCreateTag(demoId, trimmed, newTagColor)
            : await createTag(id, { name: trimmed, color: newTagColor });
        setTags(prev => [...prev, saved]);
        setNewTagName('');
        setNewTagColor(TAG_PALETTE[0]);
    };

    const handleDeleteTag = async (tagId: number) => {
        if (isDemo) demoDeleteTag(demoId, tagId);
        else await deleteTag(id, tagId);
        setTags(prev => prev.filter(t => t.id !== tagId));
        setCards(prev => prev.map(c => ({ ...c, tags: (c.tags ?? []).filter((t: any) => t.id !== tagId) })));
        if (filterTagId === tagId) setFilterTagId(null);
    };

    // --- Section management ---

    const handleRenameSection = async (sectionId: number, newName: string) => {
        setSections(prev => prev.map(s => s.id === sectionId ? { ...s, name: newName } : s));
        if (isDemo) demoUpdateSection(demoId, sectionId, newName);
        else await updateSection(id, sectionId, newName);
    };

    const handleDeleteSection = async () => {
        if (!sectionToDelete) return;
        if (isDemo) demoDeleteSection(demoId, sectionToDelete.id);
        else await deleteSection(id, sectionToDelete.id);
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

    // --- Card filtering ---

    const sectionCards = (sectionId: any) => {
        let filtered = cardsProp.filter(card => card.section_id === sectionId);
        if (filterUserId !== null) filtered = filtered.filter(card => card.assigned_user_id === filterUserId);
        if (filterTagId !== null) filtered = filtered.filter(card => (card.tags ?? []).some((t: any) => t.id === filterTagId));
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            filtered = filtered.filter(card => card.name.toLowerCase().includes(q) || (card.description ?? '').toLowerCase().includes(q));
        }
        return filtered;
    };

    const totalCards = cardsProp.length;
    const doneSection = sections.find(s => s.name.toLowerCase() === 'done');
    const doneCards = doneSection ? cardsProp.filter(c => c.section_id === doneSection.id).length : 0;

    // --- Card management ---

    const handleClick = (card: any) => {
        setSelectedCard(card);
        setIsCardVisible(true);
    };

    const handleSubmit = async (card: any, isNew: boolean) => {
        if (isNew) {
            const saved = isDemo
                ? demoCreateCard(demoId, { section_id: card.section_id, name: card.name, description: card.description, tag_ids: card.tag_ids, due_date: card.due_date, priority: card.priority })
                : await createCard(id, { section_id: card.section_id, assigned_user_id: card.assigned_user_id, tag_ids: card.tag_ids, name: card.name, description: card.description, due_date: card.due_date, priority: card.priority });
            setCards(prev => [...prev, saved]);
        } else {
            const saved = isDemo
                ? demoUpdateCard(demoId, card.id, { section_id: card.section_id, name: card.name, description: card.description, tag_ids: card.tag_ids, due_date: card.due_date, priority: card.priority })
                : await updateCard(id, card.id, { section_id: card.section_id, assigned_user_id: card.assigned_user_id, tag_ids: card.tag_ids, name: card.name, description: card.description, due_date: card.due_date, priority: card.priority });
            setCards(prev => prev.map(c => c.id === card.id ? { ...saved, checklist_items: card.checklist_items } : c));
        }
        setIsCardVisible(false);
        setSelectedCard(null);
    };

    const handleArchiveCard = async () => {
        if (!cardToDelete) return;
        if (isDemo) demoArchiveCard(demoId, cardToDelete.id);
        else await deleteCard(id, cardToDelete.id);
        setCards(prev => prev.filter(c => c.id !== cardToDelete.id));
        setCardToDelete(null);
        setIsCardVisible(false);
        setSelectedCard(null);
    };

    const handleOpenArchived = async () => {
        setIsArchivedOpen(true);
        if (isDemo) {
            setArchivedCards(loadDemoArchivedCards(demoId));
        } else {
            const data = await getArchivedCards(id).catch(() => []);
            setArchivedCards(Array.isArray(data) ? data : []);
        }
    };

    const handleRestoreCard = async (card: any) => {
        if (isDemo) demoRestoreCard(demoId, card.id);
        else await restoreCard(id, card.id);
        setArchivedCards(prev => prev.filter(c => c.id !== card.id));
        setCards(prev => [...prev, { ...card, archived_at: null }]);
    };

    const handleOpenActivity = async () => {
        setIsActivityOpen(true);
        if (!isDemo) {
            const data = await getActivity(id).catch(() => []);
            setActivityLog(Array.isArray(data) ? data : []);
        }
    };

    const handleOpenChat = async () => {
        setIsChatOpen(true);
        if (!chatLoadedRef.current) {
            chatLoadedRef.current = true;
            const { getBoardMessages } = await import('@/lib/api');
            const data = await getBoardMessages(id).catch(() => []);
            setChatMessages(prev => {
                const fetched = Array.isArray(data) ? data : [];
                const merged = [...fetched, ...prev.filter((m: any) => !fetched.some((f: any) => f.id === m.id))];
                return merged.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            });
        }
    };

    const handleChatSend = async (body: string) => {
        const { createBoardMessage } = await import('@/lib/api');
        const msg = await createBoardMessage(id, body);
        setChatMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
    };

    const handleChatDelete = async (messageId: number) => {
        const { deleteBoardMessage } = await import('@/lib/api');
        await deleteBoardMessage(id, messageId).catch(() => {});
        setChatMessages(prev => prev.filter(m => m.id !== messageId));
    };

    useEffect(() => {
        const handleGlobalEvent = (event: any) => {
            if (event.key.toLowerCase() === 'c' && !isReadOnly && !isCardVisible && !isTagsOpen && !isActivityOpen && !isArchivedOpen && !isBgOpen && !isChatOpen) {
                setIsCardVisible(true);
            }
        };
        window.addEventListener('keydown', handleGlobalEvent);
        return () => window.removeEventListener('keydown', handleGlobalEvent);
    }, [isReadOnly, isCardVisible, isTagsOpen, isActivityOpen, isArchivedOpen, isBgOpen, isChatOpen]);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    function handleDragStart(event: any) {
        const cardId = Number(event.active.id.split('-')[1]);
        setActiveCard(cardsProp.find(c => c.id === cardId) ?? null);
    }

    return (
        <>
            {/* Board background overlay */}
            {boardBg && (
                <div style={{ position: 'fixed', inset: 0, zIndex: -1, background: boardBg }} />
            )}

            {/* Top bar: search + shortcuts */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="relative flex-1 min-w-[160px] max-w-xs">
                    <input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search cards..."
                        className="w-full bg-gray-800 border border-gray-700 text-white text-xs px-3 py-2 pl-8 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder-gray-600"
                    />
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 text-xs pointer-events-none">🔍</span>
                </div>

                {/* Progress counter */}
                {totalCards > 0 && (
                    <span className="text-xs text-gray-500 flex-shrink-0">
                        {doneCards}/{totalCards} done
                    </span>
                )}

                <div className="hidden md:flex items-center gap-2 text-gray-600 flex-shrink-0 ml-auto">
                    <p className="text-xs uppercase tracking-widest">Press</p>
                    <kbd className="text-xs bg-gray-800 border border-gray-700 text-amber-400 px-2 py-1 rounded font-mono">C</kbd>
                    <p className="text-xs uppercase tracking-widest">to add a ticket</p>
                </div>
            </div>

            {/* Filter strip */}
            <div className="flex items-center gap-2 mb-5 flex-wrap">
                {boardUsers.length > 0 && (
                    <>
                        <button
                            onClick={() => { setFilterUserId(null); setFilterTagId(null); }}
                            className={`text-xs uppercase tracking-widest px-3 py-1.5 rounded-full border font-bold cursor-pointer transition-all duration-150 ${
                                filterUserId === null && filterTagId === null
                                    ? 'bg-white text-gray-900 border-white'
                                    : 'text-gray-500 border-gray-700 hover:border-gray-400 hover:text-gray-300'
                            }`}
                        >
                            All
                        </button>
                        {boardUsers.map((user) => {
                            const color = AVATAR_COLORS[user.id % AVATAR_COLORS.length];
                            const isActive = filterUserId === user.id;
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
                            );
                        })}
                    </>
                )}

                {/* Tag filters */}
                {tags.map(tag => {
                    const isActive = filterTagId === tag.id;
                    return (
                        <button
                            key={tag.id}
                            onClick={() => setFilterTagId(isActive ? null : tag.id)}
                            style={{ borderColor: tag.color, backgroundColor: isActive ? tag.color : 'transparent', color: isActive ? '#fff' : tag.color, fontSize: '10px' }}
                            className="uppercase tracking-widest px-2.5 py-1.5 rounded-full border cursor-pointer transition-all duration-150 font-bold"
                        >
                            {tag.name}
                        </button>
                    );
                })}

                {/* Tags manage button */}
                <button
                    onClick={() => setIsTagsOpen(true)}
                    className="text-xs uppercase tracking-widest px-3 py-1.5 rounded-full border border-gray-700 text-gray-500 hover:border-gray-400 hover:text-gray-300 font-bold cursor-pointer transition-all duration-150 flex items-center gap-1.5"
                >
                    🏷 Tags
                </button>

                {/* Activity button */}
                {!isDemo && (
                    <button
                        onClick={handleOpenActivity}
                        className="text-xs uppercase tracking-widest px-3 py-1.5 rounded-full border border-gray-700 text-gray-500 hover:border-gray-400 hover:text-gray-300 font-bold cursor-pointer transition-all duration-150 flex items-center gap-1.5"
                    >
                        📋 Activity
                    </button>
                )}

                {/* Chat button */}
                {!isDemo && (
                    <button
                        onClick={handleOpenChat}
                        className="text-xs uppercase tracking-widest px-3 py-1.5 rounded-full border border-gray-700 text-gray-500 hover:border-gray-400 hover:text-gray-300 font-bold cursor-pointer transition-all duration-150 flex items-center gap-1.5"
                    >
                        💬 Chat
                    </button>
                )}

                {/* Archived button */}
                <button
                    onClick={handleOpenArchived}
                    className="text-xs uppercase tracking-widest px-3 py-1.5 rounded-full border border-gray-700 text-gray-500 hover:border-gray-400 hover:text-gray-300 font-bold cursor-pointer transition-all duration-150 flex items-center gap-1.5"
                >
                    🗂 Archived
                </button>

                {/* Background button */}
                <button
                    onClick={() => setIsBgOpen(true)}
                    className="text-xs uppercase tracking-widest px-3 py-1.5 rounded-full border border-gray-700 text-gray-500 hover:border-gray-400 hover:text-gray-300 font-bold cursor-pointer transition-all duration-150 flex items-center gap-1.5"
                >
                    🎨 Background
                </button>
            </div>

            {/* Board columns */}
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
                            onDelete={isReadOnly ? undefined : () => setSectionToDelete({ id: section.id, name: section.name })}
                            onRename={isReadOnly ? undefined : (newName) => handleRenameSection(section.id, newName)}
                            wipLimit={wipLimits[section.id] ?? null}
                            onSetWipLimit={isReadOnly ? undefined : (limit) => handleSetWipLimit(section.id, limit)}
                        />
                    ))}

                    {!isReadOnly && <div className="flex flex-col w-64 flex-shrink-0">
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
                                    <button onClick={handleAddSection} className="flex-1 text-xs uppercase tracking-widest font-bold text-black bg-amber-400 hover:bg-amber-300 py-1.5 rounded-lg cursor-pointer transition-all duration-150">Add</button>
                                    <button onClick={() => { setIsAddingSection(false); setNewSectionName(''); }} className="flex-1 text-xs uppercase tracking-widest text-gray-400 hover:text-white border border-gray-700 hover:border-gray-400 py-1.5 rounded-lg cursor-pointer transition-all duration-150">Cancel</button>
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
                    </div>}
                </div>

                <DragOverlay dropAnimation={null}>
                    {activeCard ? (
                        <div style={{ transform: 'rotate(2deg)', opacity: 0.95 }}>
                            <Card
                                {...activeCard}
                                color={SECTION_COLORS[sections.findIndex(s => s.id === activeCard.section_id) % SECTION_COLORS.length] ?? SECTION_COLORS[0]}
                            />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* FAB */}
            {!isReadOnly && (
                <button
                    onClick={() => setIsCardVisible(true)}
                    className="fixed bottom-6 right-6 w-14 h-14 bg-amber-400 hover:bg-amber-300 active:scale-95 text-black rounded-full flex items-center justify-center shadow-2xl cursor-pointer transition-all duration-150 text-2xl font-bold z-40"
                    title="Add ticket"
                >
                    +
                </button>
            )}

            {/* Tags modal */}
            {isTagsOpen && (
                <Modal>
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-[95vw] max-w-sm flex flex-col gap-5">
                        <div className="flex items-center justify-between">
                            <p className="text-xs uppercase tracking-widest text-gray-400">Board Tags</p>
                            <button onClick={() => setIsTagsOpen(false)} className="text-gray-500 hover:text-white cursor-pointer transition-colors">✕</button>
                        </div>

                        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                            {tags.length === 0 && (
                                <p className="text-gray-600 text-xs text-center py-3">No tags yet. Create one below.</p>
                            )}
                            {tags.map(tag => (
                                <div key={tag.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2.5">
                                    <div className="flex items-center gap-2">
                                        <div style={{ backgroundColor: tag.color }} className="w-3 h-3 rounded-full flex-shrink-0"/>
                                        <span style={{ color: tag.color }} className="text-sm font-bold uppercase tracking-wide">{tag.name}</span>
                                    </div>
                                    {!isReadOnly && (
                                        <button
                                            onClick={() => handleDeleteTag(tag.id)}
                                            className="text-xs text-gray-600 hover:text-red-400 cursor-pointer transition-colors ml-2"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {!isReadOnly && <div className="flex flex-col gap-3 border-t border-gray-800 pt-4">
                            <input
                                value={newTagName}
                                onChange={e => setNewTagName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleCreateTag(); }}
                                placeholder="Tag name..."
                                className="bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-gray-600 w-full"
                            />
                            <div className="flex gap-2 flex-wrap">
                                {TAG_PALETTE.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setNewTagColor(color)}
                                        style={{ backgroundColor: color }}
                                        className={`w-7 h-7 rounded-full cursor-pointer transition-all duration-150 ${newTagColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110' : 'opacity-70 hover:opacity-100'}`}
                                    />
                                ))}
                            </div>
                            <button
                                onClick={handleCreateTag}
                                disabled={!newTagName.trim()}
                                className="text-xs uppercase tracking-widest font-bold text-black bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed py-2 rounded-lg cursor-pointer transition-all duration-150"
                            >
                                + Create Tag
                            </button>
                        </div>}
                    </div>
                </Modal>
            )}

            {/* Activity modal */}
            {isActivityOpen && (
                <Modal>
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-[95vw] max-w-md flex flex-col gap-4" style={{ maxHeight: '80vh' }}>
                        <div className="flex items-center justify-between flex-shrink-0">
                            <p className="text-xs uppercase tracking-widest text-gray-400">Activity Log</p>
                            <button onClick={() => setIsActivityOpen(false)} className="text-gray-500 hover:text-white cursor-pointer transition-colors">✕</button>
                        </div>
                        <div className="flex flex-col gap-3 overflow-y-auto">
                            {activityLog.length === 0 && (
                                <p className="text-gray-600 text-xs text-center py-6">No activity yet.</p>
                            )}
                            {activityLog.map((entry: any) => (
                                <div key={entry.id} className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0 mt-1.5"/>
                                    <div className="flex flex-col gap-0.5">
                                        <p className="text-gray-300 text-xs">{entry.description}</p>
                                        <p className="text-gray-600 text-xs">
                                            {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Modal>
            )}

            {/* Archived cards modal */}
            {isArchivedOpen && (
                <Modal>
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-[95vw] max-w-md flex flex-col gap-4" style={{ maxHeight: '80vh' }}>
                        <div className="flex items-center justify-between flex-shrink-0">
                            <p className="text-xs uppercase tracking-widest text-gray-400">Archived Cards</p>
                            <button onClick={() => setIsArchivedOpen(false)} className="text-gray-500 hover:text-white cursor-pointer transition-colors">✕</button>
                        </div>
                        <div className="flex flex-col gap-3 overflow-y-auto">
                            {archivedCards.length === 0 && (
                                <p className="text-gray-600 text-xs text-center py-6">No archived cards.</p>
                            )}
                            {archivedCards.map((card: any) => (
                                <div key={card.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3 gap-3">
                                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                        <p className="text-white text-sm font-semibold truncate">{card.name}</p>
                                        {card.archived_at && (
                                            <p className="text-gray-500 text-xs">
                                                Archived {new Date(card.archived_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleRestoreCard(card)}
                                        className="text-xs uppercase tracking-widest font-bold text-amber-400 border border-amber-700 hover:bg-amber-400 hover:text-black px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-150 flex-shrink-0"
                                    >
                                        Restore
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </Modal>
            )}

            {/* Background picker modal */}
            {isBgOpen && (
                <Modal>
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-[95vw] max-w-sm flex flex-col gap-5">
                        <div className="flex items-center justify-between">
                            <p className="text-xs uppercase tracking-widest text-gray-400">Board Background</p>
                            <button onClick={() => setIsBgOpen(false)} className="text-gray-500 hover:text-white cursor-pointer transition-colors">✕</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {BG_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => handleSetBg(opt.value)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all duration-150 text-left ${boardBg === opt.value ? 'border-amber-400 text-amber-400' : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'}`}
                                >
                                    <div
                                        style={{ background: opt.value || '#111827' }}
                                        className="w-5 h-5 rounded flex-shrink-0 border border-gray-600"
                                    />
                                    <span className="text-xs font-bold uppercase tracking-wide truncate">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </Modal>
            )}

            {/* Chat modal */}
            {isChatOpen && (
                <Modal>
                    <BoardChat
                        messages={chatMessages}
                        currentUserId={currentUserId}
                        onSend={handleChatSend}
                        onDelete={handleChatDelete}
                        onClose={() => setIsChatOpen(false)}
                    />
                </Modal>
            )}

            {/* Delete section modal */}
            {sectionToDelete && (
                <Modal>
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-[90%] max-w-sm flex flex-col gap-6">
                        <div className="flex flex-col items-center text-center gap-3">
                            <p className="text-3xl">⚠</p>
                            <p className="text-white font-bold text-lg">Delete "{sectionToDelete.name}"?</p>
                            <p className="text-gray-500 text-sm">All cards in this section will be permanently deleted.</p>
                        </div>
                        <div className="flex justify-between">
                            <button onClick={() => setSectionToDelete(null)} className="text-xs uppercase tracking-widest text-gray-400 hover:text-white border border-gray-700 hover:border-gray-400 px-4 py-2 rounded-lg cursor-pointer transition-all duration-200">Go back</button>
                            <button onClick={handleDeleteSection} className="text-xs uppercase tracking-widest font-bold text-white bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg cursor-pointer transition-all duration-200">Yes, delete</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Archive card confirm modal */}
            {cardToDelete && (
                <Modal>
                    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-[90%] max-w-sm flex flex-col gap-6">
                        <div className="flex flex-col items-center text-center gap-3">
                            <p className="text-3xl">🗂</p>
                            <p className="text-white font-bold text-lg">Archive this card?</p>
                            <p className="text-gray-500 text-sm">"{cardToDelete.name}" will be moved to the archive. You can restore it later.</p>
                        </div>
                        <div className="flex justify-between">
                            <button onClick={() => setCardToDelete(null)} className="text-xs uppercase tracking-widest text-gray-400 hover:text-white border border-gray-700 hover:border-gray-400 px-4 py-2 rounded-lg cursor-pointer transition-all duration-200">Go back</button>
                            <button onClick={handleArchiveCard} className="text-xs uppercase tracking-widest font-bold text-white bg-amber-600 hover:bg-amber-500 px-4 py-2 rounded-lg cursor-pointer transition-all duration-200">Archive it</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Card edit modal */}
            {isCardVisible && (
                <Modal>
                    <div>
                        <CardEdit
                            card={selectedCard}
                            sections={sections}
                            users={boardUsers}
                            tags={tags}
                            boardId={isDemo ? undefined : id}
                            isDemo={isDemo}
                            demoId={demoId}
                            isReadOnly={isReadOnly}
                            initialTemplates={boardTemplates}
                            goBack={() => { setIsCardVisible(false); setSelectedCard(null); }}
                            submit={handleSubmit}
                            onDelete={selectedCard && !isReadOnly ? () => { setCardToDelete(selectedCard); setIsCardVisible(false); } : undefined}
                        />
                    </div>
                </Modal>
            )}
        </>
    );

    function handleDragEnd(event: any) {
        setActiveCard(null);
        const sectionSelected = sections.find(section => section.name === event.over?.id);
        if (!sectionSelected) return;
        const selectedCardId = Number(event.active.id.split('-')[1]);
        if (!selectedCardId) return;
        setCards(cardsProp.map(card =>
            card.id === selectedCardId ? { ...card, section_id: sectionSelected.id } : card
        ));
        if (isDemo) demoUpdateCard(demoId, selectedCardId, { section_id: sectionSelected.id });
        else updateCard(id, selectedCardId, { section_id: sectionSelected.id });
    }
}
