'use client'

import { DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Card } from "../ui/Card";
import { useCallback, useEffect, useRef, useState } from "react";
import { Section } from "../ui/Section";
import { BoardInterface, SharedUser } from "@/interfaces/BoardInterface";
import { TagInterface } from "@/interfaces/TagInterface";
import { useConsole } from "@/contexts/ConsoleContext";
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
import { CalendarView } from "../ui/CalendarView";
import { CommandPalette } from "../ui/CommandPalette";
import { DueDateBanner } from "../ui/DueDateBanner";
import { ListView } from "../ui/ListView";
import { AnalyticsView } from "../ui/AnalyticsView";
import { getEcho } from "@/lib/echo";
import {
    demoCreateCard, demoUpdateCard,
    demoCreateSection, demoUpdateSection, demoDeleteSection,
    demoCreateTag, demoDeleteTag,
    demoArchiveCard, demoRestoreCard, loadDemoArchivedCards,
    loadDemoTemplates,
} from "@/lib/demoStorage";
import { playPickup, playDrop } from "@/lib/sound";
import { hapticPick, hapticDrop } from "@/lib/haptics";
import { initGyroscope, requestGyroscopePermission } from "@/lib/lightSource";
import { initGravityField } from "@/lib/gravityField";
import { triggerInkSplash } from "@/components/ui/SpringTrail";
import { BoardConfig } from "@/components/ui/BoardConfig";
import Icon from "@/components/ui/Icon";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
    faTag, faClipboardList, faCommentDots, faBoxArchive, faPalette, faGear,
    faTableCells, faBars, faCalendarDays, faChartColumn,
    faMagnifyingGlass, faTriangleExclamation, faPlus,
} from "@fortawesome/free-solid-svg-icons";

const SECTION_COLORS = ['#4CAF50', '#FF9800', '#1976D2', '#F44336', '#7B1FA2', '#FFC107'];

// Per-tool colors chosen to echo each original emoji's dominant hue.
const TOOL_COLORS = {
    tags:       '#f97316', // 🏷 orange label
    activity:   '#c2a878', // 📋 tan clipboard
    chat:       '#d4d4d4', // 💬 light speech bubble
    archived:   '#d9a441', // 🗂 manila folder
    background: '#c08bff', // 🎨 artist palette
    config:     '#9ca3af', // ⚙ steel gear
} as const;

function ToolBtn({ icon, label, color, onClick }: { icon: IconDefinition; label: string; color: string; onClick: () => void }) {
    return (
        <div className="flex items-center gap-2">
            <span className="cf-mono text-[9px] uppercase tracking-widest whitespace-nowrap" style={{ color: 'var(--cf-text-muted)' }}>
                {label}
            </span>
            <button onClick={onClick}
                className="aero-btn aero-btn--ghost w-10 h-10 flex items-center justify-center cursor-pointer text-lg"
                style={{ color }}>
                <Icon icon={icon} />
            </button>
        </div>
    );
}

function MobileToolBtn({ icon, label, color, onClick }: { icon: IconDefinition; label: string; color: string; onClick: () => void }) {
    return (
        <button onClick={onClick}
            className="aero-btn aero-btn--ghost flex flex-col items-center gap-1.5 py-3 px-4 rounded-xl cursor-pointer">
            <span className="text-2xl" style={{ color }}><Icon icon={icon} /></span>
            <span className="cf-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--cf-text-muted)' }}>{label}</span>
        </button>
    );
}
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
    const [isBoardConfigOpen, setIsBoardConfigOpen] = useState(false);
    const [boardTemplates, setBoardTemplates] = useState<any[]>([]);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const chatChannelRef = useRef<any>(null);
    const chatLoadedRef = useRef(false);
    const [isToolbarOpen, setIsToolbarOpen] = useState(false);
    const touchStartY = useRef<number>(0);
    const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'calendar' | 'analytics'>('kanban');
    const [isCommandOpen, setIsCommandOpen] = useState(false);

    // ── feed the header console: track where the user is + what they're doing ──
    const { setLocation, pushActivity } = useConsole();
    useEffect(() => {
        const v = viewMode === 'kanban' ? 'BOARD' : viewMode.toUpperCase();
        setLocation(`${name || 'BOARD'} / ${v}`);
        return () => setLocation(null);
    }, [name, viewMode, setLocation]);
    useEffect(() => {
        pushActivity(`view: ${viewMode === 'kanban' ? 'board' : viewMode}`);
    }, [viewMode, pushActivity]);
    useEffect(() => {
        if (selectedCard && isCardVisible) pushActivity(`opened “${selectedCard.name ?? 'card'}”`);
    }, [selectedCard, isCardVisible, pushActivity]);

    // Board gravity tilt — the board tilts toward wherever the card is being dragged
    const kanbanRef      = useRef<HTMLDivElement>(null);
    const gyroRequested  = useRef(false);
    const lastPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    useEffect(() => { initGyroscope(); initGravityField(); }, []);

    const applyTilt = useCallback((clientX: number, clientY: number) => {
        const el = kanbanRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = ((clientX - rect.left)  / rect.width  - 0.5) * 2;
        const y = ((clientY - rect.top)   / rect.height - 0.5) * 2;
        el.style.transform  = `perspective(1400px) rotateX(${(-y * 1.8).toFixed(2)}deg) rotateY(${(x * 2.2).toFixed(2)}deg)`;
        el.style.transition = 'transform 80ms ease-out';
    }, []);

    const resetTilt = useCallback(() => {
        const el = kanbanRef.current;
        if (!el) return;
        el.style.transform  = '';
        el.style.transition = `transform 500ms cubic-bezier(0.34,1.56,0.64,1)`;
    }, []);

    // dnd-kit captures the pointer on drag start (setPointerCapture), so onPointerMove
    // on the container stops firing. Listen on window instead while a card is active.
    useEffect(() => {
        if (!activeCard) return;
        const onMove = (e: PointerEvent) => { lastPointerRef.current = { x: e.clientX, y: e.clientY }; applyTilt(e.clientX, e.clientY); };
        window.addEventListener('pointermove', onMove, { passive: true });
        return () => window.removeEventListener('pointermove', onMove);
    }, [activeCard, applyTilt]);

    const handleGyroPermission = useCallback(() => {
        if (gyroRequested.current) return;
        gyroRequested.current = true;
        requestGyroscopePermission();
    }, []);

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
                case 'sections.reordered': {
                    const ids: number[] = e.payload.section_ids;
                    setSections(prev => {
                        const map = new Map(prev.map(s => [s.id, s]));
                        const sorted = ids.map(id => map.get(id)).filter(Boolean) as typeof prev;
                        const rest   = prev.filter(s => !ids.includes(s.id));
                        return [...sorted, ...rest];
                    });
                    break;
                }
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
            filtered = filtered.filter(card => card.name?.toLowerCase().includes(q) || (card.description ?? '').toLowerCase().includes(q));
        }
        return filtered;
    };

    const totalCards = cardsProp.length;
    const doneSection = sections.find(s => s.name?.toLowerCase() === 'done');
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
            setCards(prev => prev.some(c => c.id === saved.id) ? prev.map(c => c.id === saved.id ? { ...c, ...saved } : c) : [...prev, saved]);
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
            const anyOpen = isCardVisible || isTagsOpen || isActivityOpen || isArchivedOpen || isBgOpen || isChatOpen || isCommandOpen;
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setIsCommandOpen(v => !v);
                return;
            }
            if (event.key.toLowerCase() === 'c' && !isReadOnly && !anyOpen) {
                setIsCardVisible(true);
            }
        };
        window.addEventListener('keydown', handleGlobalEvent);
        return () => window.removeEventListener('keydown', handleGlobalEvent);
    }, [isReadOnly, isCardVisible, isTagsOpen, isActivityOpen, isArchivedOpen, isBgOpen, isChatOpen, isCommandOpen]);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor,  { activationConstraint: { delay: 350, tolerance: 5 } })
    );

    function handleDragStart(event: any) {
        const cardId = Number(event.active.id.split('-')[1]);
        setActiveCard(cardsProp.find(c => c.id === cardId) ?? null);
        playPickup();
        hapticPick();
    }

    return (
        <>
            {/* Board background overlay */}
            {boardBg && (
                <div style={{ position: 'fixed', inset: 0, zIndex: -1, background: boardBg }} />
            )}

            {/* Top bar: search + shortcuts */}
            <div className="glass-panel flex items-center gap-3 mb-4 flex-wrap px-3 py-2.5 rounded-2xl">
                <div className="relative flex-1 min-w-[160px] max-w-xs">
                    <input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search cards..."
                        className="glass-input w-full text-xs px-3 py-2 pl-8"
                    />
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: 'var(--cf-phosphor)' }}><Icon icon={faMagnifyingGlass} /></span>
                </div>

                {/* Progress counter — LCD strip */}
                {totalCards > 0 && (
                    <span className="cf-screen cf-mono text-xs flex-shrink-0 px-2.5 py-1" style={{ color: 'var(--cf-phosphor)' }}>
                        {doneCards}/{totalCards} done
                    </span>
                )}

                {/* View toggle — hardware toggle keys with status LEDs */}
                <div className="flex items-center gap-1 flex-shrink-0">
                    {([
                        { key: 'kanban',    icon: faTableCells,   label: 'Board' },
                        { key: 'list',      icon: faBars,         label: 'List' },
                        { key: 'calendar',  icon: faCalendarDays, label: 'Cal' },
                        { key: 'analytics', icon: faChartColumn,  label: 'Stats' },
                    ] as const).map(({ key, icon, label }) => (
                        <button key={key} onClick={() => setViewMode(key)}
                            style={viewMode === key
                                ? { background: 'var(--cf-edge)', borderColor: 'var(--cf-phosphor)', color: 'var(--cf-text)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 0 8px rgba(154,166,126,0.35)' }
                                : { color: 'var(--cf-text-muted)' }}
                            className="aero-pill cf-mono text-[10px] uppercase tracking-widest px-2.5 py-1 font-bold cursor-pointer transition-colors inline-flex items-center gap-1.5">
                            <span className="cf-led" style={{ background: viewMode === key ? 'var(--cf-phosphor)' : 'var(--cf-edge)', boxShadow: viewMode === key ? '0 0 6px var(--cf-phosphor)' : 'none' }} />
                            <Icon icon={icon} />
                            {label}
                        </button>
                    ))}
                </div>

                <div className="hidden md:flex items-center gap-3 flex-shrink-0 ml-auto" style={{ color: 'var(--cf-text-muted)' }}>
                    <button
                        onClick={() => setIsCommandOpen(true)}
                        className="flex items-center gap-1.5 cursor-pointer transition-colors"
                        style={{ color: 'var(--cf-text-muted)' }}
                    >
                        <kbd className="cf-mono text-xs glass-input px-2 py-1" style={{ color: 'var(--cf-phosphor)' }}>⌘K</kbd>
                        <span className="cf-mono text-xs uppercase tracking-widest">Search</span>
                    </button>
                    <span style={{ color: 'var(--cf-edge)' }}>·</span>
                    <p className="cf-mono text-xs uppercase tracking-widest">Press</p>
                    <kbd className="cf-mono text-xs glass-input px-2 py-1" style={{ color: 'var(--cf-phosphor)' }}>C</kbd>
                    <p className="cf-mono text-xs uppercase tracking-widest">to add</p>
                </div>
            </div>

            {/* Due date banner — always visible when there are overdue/due-today cards */}
            <DueDateBanner cards={cardsProp} sections={sections} onCardClick={handleClick} />

            {/* Filter strip — kanban + list */}
            {(viewMode === 'kanban' || viewMode === 'list') && <div className="flex items-center gap-2 mb-5 flex-wrap">
                {boardUsers.length > 0 && (
                    <>
                        <button
                            onClick={() => { setFilterUserId(null); setFilterTagId(null); }}
                            style={filterUserId === null && filterTagId === null
                                ? { background: 'var(--cf-edge)', borderColor: 'var(--cf-phosphor)', color: 'var(--cf-text)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 0 8px rgba(154,166,126,0.35)' }
                                : { color: 'var(--cf-text-muted)' }}
                            className="aero-pill cf-mono text-xs uppercase tracking-widest px-3 py-1.5 font-bold cursor-pointer transition-colors inline-flex items-center gap-1.5"
                        >
                            <span className="cf-led" style={{ background: filterUserId === null && filterTagId === null ? 'var(--cf-phosphor)' : 'var(--cf-edge)', boxShadow: filterUserId === null && filterTagId === null ? '0 0 6px var(--cf-phosphor)' : 'none' }} />
                            All
                        </button>
                        {boardUsers.map((user) => {
                            const color = AVATAR_COLORS[user.id % AVATAR_COLORS.length];
                            const isActive = filterUserId === user.id;
                            return (
                                <button
                                    key={user.id}
                                    onClick={() => setFilterUserId(isActive ? null : user.id)}
                                    style={{ borderColor: color, backgroundColor: isActive ? color : 'var(--cf-graphite)', color: isActive ? '#1c1a16' : color }}
                                    className="cf-mono text-xs uppercase tracking-widest px-3 py-1.5 rounded-full border font-bold cursor-pointer flex items-center gap-1.5"
                                >
                                    <span
                                        style={{ backgroundColor: isActive ? 'rgba(0,0,0,0.25)' : color, fontSize: '9px', width: '16px', height: '16px', color: isActive ? '#1c1a16' : '#1c1a16' }}
                                        className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
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
                            style={{ borderColor: tag.color, backgroundColor: isActive ? tag.color : 'var(--cf-graphite)', color: isActive ? '#1c1a16' : tag.color, fontSize: '10px' }}
                            className="cf-mono uppercase tracking-widest px-2.5 py-1.5 rounded-full border cursor-pointer font-bold"
                        >
                            {tag.name}
                        </button>
                    );
                })}

            </div>}

            {/* Calendar view */}
            {viewMode === 'calendar' && (
                <CalendarView cards={cardsProp} sections={sections} onCardClick={handleClick} />
            )}

            {/* Analytics view */}
            {viewMode === 'analytics' && (
                <AnalyticsView cards={cardsProp} sections={sections} />
            )}

            {/* List view */}
            {viewMode === 'list' && (() => {
                let filtered = cardsProp;
                if (filterUserId !== null) filtered = filtered.filter((c: any) => c.assigned_user_id === filterUserId);
                if (filterTagId !== null) filtered = filtered.filter((c: any) => (c.tags ?? []).some((t: any) => t.id === filterTagId));
                if (searchQuery.trim()) {
                    const q = searchQuery.trim().toLowerCase();
                    filtered = filtered.filter((c: any) => c.name?.toLowerCase().includes(q) || (c.description ?? '').toLowerCase().includes(q));
                }
                return <ListView cards={filtered} sections={sections} users={boardUsers} onCardClick={handleClick} />;
            })()}

            {/* Board columns — kanban only */}
            {viewMode === 'kanban' && <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div
                    ref={kanbanRef}
                    className="flex gap-5 items-start overflow-x-auto pb-4"
                    style={{ transformOrigin: 'center center', willChange: 'transform' }}
                    onTouchStart={handleGyroPermission}
                >
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
                                    className="glass-input cf-mono text-xs uppercase tracking-widest px-3 py-2 w-full"
                                />
                                <div className="flex gap-2">
                                    <button onClick={handleAddSection} className="aero-btn aero-btn--cyan flex-1 text-xs uppercase tracking-widest font-bold py-1.5 cursor-pointer">Add</button>
                                    <button onClick={() => { setIsAddingSection(false); setNewSectionName(''); }} className="aero-btn aero-btn--ghost flex-1 text-xs uppercase tracking-widest py-1.5 cursor-pointer">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsAddingSection(true)}
                                style={{ borderColor: 'var(--cf-edge)', color: 'var(--cf-text-muted)' }}
                                className="cf-mono flex items-center justify-center gap-2 text-xs uppercase tracking-widest border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer w-full transition-colors hover:opacity-100"
                            >
                                <span className="text-lg leading-none">+</span> Add section
                            </button>
                        )}
                    </div>}
                </div>

                <DragOverlay dropAnimation={null}>
                    {activeCard ? (
                        <div style={{
                            transform: 'rotate(4deg) skewX(-1.5deg)',
                            opacity: 0.97,
                            filter: 'drop-shadow(0 18px 28px rgba(0,0,0,0.65)) drop-shadow(0 6px 10px rgba(0,0,0,0.4))',
                            transition: 'none',
                        }}>
                            <Card
                                {...activeCard}
                                color={SECTION_COLORS[sections.findIndex(s => s.id === activeCard.section_id) % SECTION_COLORS.length] ?? SECTION_COLORS[0]}
                            />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>}

            {/* FAB */}
            {!isReadOnly && (
                <button
                    onClick={() => setIsCardVisible(true)}
                    style={{
                        background: 'linear-gradient(to bottom, #3a3730 0%, #2b2a26 50%, #1c1a16 100%)',
                        border: '1px solid var(--cf-edge)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 0 16px rgba(154,166,126,0.45), 0 8px 22px rgba(0,0,0,0.55)',
                        color: 'var(--cf-phosphor)',
                        textShadow: '0 0 8px rgba(154,166,126,0.6)',
                    }}
                    className="fab-physical fixed bottom-16 lg:bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center cursor-pointer text-2xl font-bold z-40"
                    title="Add ticket"
                >
                    <span className="cf-led absolute top-2 right-2" style={{ background: 'var(--cf-phosphor)', boxShadow: '0 0 6px var(--cf-phosphor)' }} />
                    <Icon icon={faPlus} />
                </button>
            )}

            {/* Desktop toolbar — vertical on kanban/list, horizontal bottom bar on calendar/analytics */}
            {viewMode === 'kanban' ? (
                <div className="hidden lg:flex flex-col items-end gap-2 fixed z-40" style={{ right: '24px', bottom: '96px' }}>
                    <ToolBtn icon={faTag} color={TOOL_COLORS.tags} label="Tags" onClick={() => setIsTagsOpen(true)} />
                    {!isDemo && <ToolBtn icon={faClipboardList} color={TOOL_COLORS.activity} label="Activity" onClick={handleOpenActivity} />}
                    {!isDemo && <ToolBtn icon={faCommentDots} color={TOOL_COLORS.chat} label="Chat" onClick={handleOpenChat} />}
                    <ToolBtn icon={faBoxArchive} color={TOOL_COLORS.archived} label="Archived" onClick={handleOpenArchived} />
                    <ToolBtn icon={faPalette} color={TOOL_COLORS.background} label="Background" onClick={() => setIsBgOpen(true)} />
                    {!isDemo && <ToolBtn icon={faGear} color={TOOL_COLORS.config} label="Config" onClick={() => setIsBoardConfigOpen(true)} />}
                </div>
            ) : (
                <div className="hidden lg:flex flex-row items-center gap-2 fixed z-40" style={{ bottom: '28px', left: '50%', transform: 'translateX(-50%)' }}>
                    {[
                        { icon: faTag, color: TOOL_COLORS.tags, label: 'Tags',       onClick: () => setIsTagsOpen(true) },
                        ...(!isDemo ? [{ icon: faClipboardList, color: TOOL_COLORS.activity, label: 'Activity',   onClick: handleOpenActivity }] : []),
                        ...(!isDemo ? [{ icon: faCommentDots, color: TOOL_COLORS.chat, label: 'Chat',       onClick: handleOpenChat }] : []),
                        { icon: faBoxArchive, color: TOOL_COLORS.archived, label: 'Archived',   onClick: handleOpenArchived },
                        { icon: faPalette, color: TOOL_COLORS.background, label: 'Background', onClick: () => setIsBgOpen(true) },
                        ...(!isDemo ? [{ icon: faGear, color: TOOL_COLORS.config, label: 'Config', onClick: () => setIsBoardConfigOpen(true) }] : []),
                    ].map(({ icon, color, label, onClick }) => (
                        <button key={label} onClick={onClick} title={label}
                            className="aero-btn aero-btn--ghost w-10 h-10 flex items-center justify-center cursor-pointer text-lg"
                            style={{ color }}
                        >
                            <Icon icon={icon} />
                        </button>
                    ))}
                </div>
            )}

            {/* Mobile bottom drawer */}
            <div className="lg:hidden">
                {isToolbarOpen && (
                    <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsToolbarOpen(false)} />
                )}
                <div
                    className="fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out"
                    style={{ transform: isToolbarOpen ? 'translateY(0)' : 'translateY(calc(100% - 36px))' }}
                    onTouchStart={e => { touchStartY.current = e.touches[0].clientY; }}
                    onTouchEnd={e => {
                        const delta = touchStartY.current - e.changedTouches[0].clientY;
                        if (delta > 40) setIsToolbarOpen(true);
                        if (delta < -40) setIsToolbarOpen(false);
                    }}
                >
                    <div className="aero-menu border-t rounded-t-2xl rounded-b-none">
                        <div className="flex items-center justify-center gap-2 pt-3 pb-2 cursor-pointer" onClick={() => setIsToolbarOpen(s => !s)}>
                            <div className="w-10 h-1 rounded-full flex-shrink-0" style={{ background: 'var(--cf-edge)' }} />
                            {!isToolbarOpen && (
                                <span className="cf-mono text-[9px] uppercase tracking-widest font-bold" style={{ color: 'var(--cf-text-muted)' }}>Tools</span>
                            )}
                        </div>
                        <div className="flex flex-wrap justify-evenly px-2 pb-8 pt-1 gap-y-1">
                            <MobileToolBtn icon={faTag} color={TOOL_COLORS.tags} label="Tags" onClick={() => { setIsTagsOpen(true); setIsToolbarOpen(false); }} />
                            {!isDemo && <MobileToolBtn icon={faClipboardList} color={TOOL_COLORS.activity} label="Activity" onClick={() => { handleOpenActivity(); setIsToolbarOpen(false); }} />}
                            {!isDemo && <MobileToolBtn icon={faCommentDots} color={TOOL_COLORS.chat} label="Chat" onClick={() => { handleOpenChat(); setIsToolbarOpen(false); }} />}
                            <MobileToolBtn icon={faBoxArchive} color={TOOL_COLORS.archived} label="Archived" onClick={() => { handleOpenArchived(); setIsToolbarOpen(false); }} />
                            <MobileToolBtn icon={faPalette} color={TOOL_COLORS.background} label="Background" onClick={() => { setIsBgOpen(true); setIsToolbarOpen(false); }} />
                            {!isDemo && <MobileToolBtn icon={faGear} color={TOOL_COLORS.config} label="Config" onClick={() => { setIsBoardConfigOpen(true); setIsToolbarOpen(false); }} />}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tags modal */}
            {isTagsOpen && (
                <Modal>
                    <div className="aero-menu p-6 w-[95vw] max-w-sm flex flex-col gap-5">
                        <div className="flex items-center justify-between">
                            <p className="cf-mono text-xs uppercase tracking-widest" style={{ color: 'var(--cf-phosphor)' }}>Board tags</p>
                            <button onClick={() => setIsTagsOpen(false)} className="cursor-pointer transition-colors" style={{ color: 'var(--cf-text-muted)' }}>✕</button>
                        </div>

                        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                            {tags.length === 0 && (
                                <p className="cf-mono text-xs text-center py-3" style={{ color: 'var(--cf-text-muted)' }}>No tags yet. Create one below.</p>
                            )}
                            {tags.map(tag => (
                                <div key={tag.id} className="flex items-center justify-between rounded-lg px-3 py-2.5" style={{ background: 'var(--cf-graphite)' }}>
                                    <div className="flex items-center gap-2">
                                        <div style={{ backgroundColor: tag.color }} className="w-3 h-3 rounded-full flex-shrink-0"/>
                                        <span style={{ color: tag.color }} className="cf-mono text-sm font-bold uppercase tracking-wide">{tag.name}</span>
                                    </div>
                                    {!isReadOnly && (
                                        <button
                                            onClick={() => handleDeleteTag(tag.id)}
                                            className="text-xs cursor-pointer transition-colors ml-2 hover:opacity-100"
                                            style={{ color: 'var(--cf-text-muted)' }}
                                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--cf-red)')}
                                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--cf-text-muted)')}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {!isReadOnly && <div className="flex flex-col gap-3 border-t pt-4" style={{ borderColor: 'var(--cf-edge)' }}>
                            <input
                                value={newTagName}
                                onChange={e => setNewTagName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleCreateTag(); }}
                                placeholder="Tag name..."
                                className="glass-input cf-mono text-sm px-3 py-2 w-full"
                            />
                            <div className="flex gap-2 flex-wrap">
                                {TAG_PALETTE.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setNewTagColor(color)}
                                        style={{ backgroundColor: color }}
                                        className={`w-7 h-7 rounded-full cursor-pointer border border-[var(--cf-edge)] ${newTagColor === color ? 'ring-2 ring-[var(--cf-phosphor)] ring-offset-2 ring-offset-[var(--cf-ink)] scale-110' : 'opacity-70 hover:opacity-100'}`}
                                    />
                                ))}
                            </div>
                            <button
                                onClick={handleCreateTag}
                                disabled={!newTagName.trim()}
                                className="aero-btn aero-btn--cyan text-xs uppercase tracking-widest font-bold py-2 cursor-pointer"
                            >
                                + Create tag
                            </button>
                        </div>}
                    </div>
                </Modal>
            )}

            {/* Activity modal */}
            {isActivityOpen && (
                <Modal>
                    <div className="aero-menu p-6 w-[95vw] max-w-md flex flex-col gap-4" style={{ maxHeight: '80vh' }}>
                        <div className="flex items-center justify-between flex-shrink-0">
                            <p className="cf-mono text-xs uppercase tracking-widest" style={{ color: 'var(--cf-phosphor)' }}>Activity log</p>
                            <button onClick={() => setIsActivityOpen(false)} className="cursor-pointer transition-colors" style={{ color: 'var(--cf-text-muted)' }}>✕</button>
                        </div>
                        <div className="flex flex-col gap-3 overflow-y-auto">
                            {activityLog.length === 0 && (
                                <p className="cf-mono text-xs text-center py-6" style={{ color: 'var(--cf-text-muted)' }}>No activity yet.</p>
                            )}
                            {activityLog.map((entry: any) => (
                                <div key={entry.id} className="flex items-start gap-3">
                                    <div className="cf-led flex-shrink-0 mt-1.5" style={{ background: 'var(--cf-phosphor)', boxShadow: '0 0 6px var(--cf-phosphor)' }}/>
                                    <div className="flex flex-col gap-0.5">
                                        <p className="cf-mono text-xs" style={{ color: 'var(--cf-text)' }}>{entry.description}</p>
                                        <p className="cf-mono text-xs" style={{ color: 'var(--cf-text-muted)' }}>
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
                    <div className="aero-menu p-6 w-[95vw] max-w-md flex flex-col gap-4" style={{ maxHeight: '80vh' }}>
                        <div className="flex items-center justify-between flex-shrink-0">
                            <p className="cf-mono text-xs uppercase tracking-widest" style={{ color: 'var(--cf-phosphor)' }}>Archived cards</p>
                            <button onClick={() => setIsArchivedOpen(false)} className="cursor-pointer transition-colors" style={{ color: 'var(--cf-text-muted)' }}>✕</button>
                        </div>
                        <div className="flex flex-col gap-3 overflow-y-auto">
                            {archivedCards.length === 0 && (
                                <p className="cf-mono text-xs text-center py-6" style={{ color: 'var(--cf-text-muted)' }}>No archived cards.</p>
                            )}
                            {archivedCards.map((card: any) => (
                                <div key={card.id} className="flex items-center justify-between rounded-lg px-4 py-3 gap-3" style={{ background: 'var(--cf-graphite)' }}>
                                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                        <p className="cf-mono text-sm font-semibold truncate" style={{ color: 'var(--cf-text)' }}>{card.name}</p>
                                        {card.archived_at && (
                                            <p className="cf-mono text-xs" style={{ color: 'var(--cf-text-muted)' }}>
                                                Archived {new Date(card.archived_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleRestoreCard(card)}
                                        className="aero-btn aero-btn--ghost text-xs uppercase tracking-widest font-bold px-3 py-1.5 cursor-pointer flex-shrink-0"
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
                    <div className="aero-menu p-6 w-[95vw] max-w-sm flex flex-col gap-5">
                        <div className="flex items-center justify-between">
                            <p className="cf-mono text-xs uppercase tracking-widest" style={{ color: 'var(--cf-phosphor)' }}>Board background</p>
                            <button onClick={() => setIsBgOpen(false)} className="cursor-pointer transition-colors" style={{ color: 'var(--cf-text-muted)' }}>✕</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {BG_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => handleSetBg(opt.value)}
                                    style={boardBg === opt.value
                                        ? { borderColor: 'var(--cf-phosphor)', color: 'var(--cf-text)', background: 'var(--cf-graphite)', boxShadow: '0 0 10px rgba(154,166,126,0.4)' }
                                        : { borderColor: 'var(--cf-edge)', color: 'var(--cf-text-muted)', background: 'var(--cf-graphite)' }}
                                    className="cf-mono flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-left transition-colors hover:opacity-100"
                                >
                                    <div
                                        style={{ background: opt.value || '#111827', borderColor: 'var(--cf-edge)' }}
                                        className="w-5 h-5 rounded flex-shrink-0 border"
                                    />
                                    <span className="text-xs font-bold uppercase tracking-wide truncate">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </Modal>
            )}

            {/* Board config modal */}
            {isBoardConfigOpen && (
                <Modal>
                    <BoardConfig
                        boardId={id}
                        sections={sections}
                        onClose={() => setIsBoardConfigOpen(false)}
                        onSectionsReordered={setSections}
                    />
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
                    <div className="aero-menu p-6 w-[90%] max-w-sm flex flex-col gap-6">
                        <div className="flex flex-col items-center text-center gap-3">
                            <p className="text-3xl" style={{ color: 'var(--cf-amber)' }}><Icon icon={faTriangleExclamation} /></p>
                            <p className="cf-mono font-bold text-lg" style={{ color: 'var(--cf-text)' }}>Delete "{sectionToDelete.name}"?</p>
                            <p className="cf-mono text-sm" style={{ color: 'var(--cf-text-muted)' }}>All cards in this section will be permanently deleted.</p>
                        </div>
                        <div className="flex justify-between">
                            <button onClick={() => setSectionToDelete(null)} className="aero-btn aero-btn--ghost text-xs uppercase tracking-widest px-4 py-2 cursor-pointer">Go back</button>
                            <button onClick={handleDeleteSection} className="aero-btn aero-btn--magenta text-xs uppercase tracking-widest font-bold px-4 py-2 cursor-pointer">Yes, delete</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Archive card confirm modal */}
            {cardToDelete && (
                <Modal>
                    <div className="aero-menu p-6 w-[90%] max-w-sm flex flex-col gap-6">
                        <div className="flex flex-col items-center text-center gap-3">
                            <p className="text-3xl" style={{ color: TOOL_COLORS.archived }}><Icon icon={faBoxArchive} /></p>
                            <p className="cf-mono font-bold text-lg" style={{ color: 'var(--cf-text)' }}>Archive this card?</p>
                            <p className="cf-mono text-sm" style={{ color: 'var(--cf-text-muted)' }}>"{cardToDelete.name}" will be moved to the archive. You can restore it later.</p>
                        </div>
                        <div className="flex justify-between">
                            <button onClick={() => setCardToDelete(null)} className="aero-btn aero-btn--ghost text-xs uppercase tracking-widest px-4 py-2 cursor-pointer">Go back</button>
                            <button onClick={handleArchiveCard} className="aero-btn aero-btn--cyan text-xs uppercase tracking-widest font-bold px-4 py-2 cursor-pointer">Archive it</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Command palette */}
            {isCommandOpen && (
                <CommandPalette
                    cards={cardsProp}
                    sections={sections}
                    onSelect={(card) => { setIsCommandOpen(false); handleClick(card); }}
                    onClose={() => setIsCommandOpen(false)}
                />
            )}

            {/* Card edit modal */}
            {isCardVisible && (
                <Modal mobileFullscreen>
                    <div className="w-full sm:w-auto">
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
        resetTilt();
        if (event.over) {
            playDrop(); hapticDrop();
            triggerInkSplash(lastPointerRef.current.x, lastPointerRef.current.y);
        }
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
