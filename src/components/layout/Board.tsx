'use client'

import { CollisionDetection, DndContext, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent, MeasuringStrategy, MouseSensor, TouchSensor, UniqueIdentifier, closestCenter, getFirstCollision, pointerWithin, rectIntersection, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type Echo from "laravel-echo";
import { Card } from "../ui/Card";
import { useCallback, useEffect, useRef, useState } from "react";
import { Section } from "../ui/Section";
import { BoardInterface, SectionData, SharedUser } from "@/interfaces/BoardInterface";
import { CardInterface } from "@/interfaces/CardInterface";
import { SprintInterface } from "@/interfaces/SprintInterface";
import { TagInterface } from "@/interfaces/TagInterface";
import { useConsole } from "@/contexts/ConsoleContext";
import CardEdit, { CardFormData, Template } from "../ui/CardEdit";
import Modal from "../shared/Modal";
import {
    createCard, updateCard, deleteCard, reorderCards,
    createSection, updateSection, deleteSection, reorderSections,
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
import { formatMoney, toNumber } from "@/lib/currency";
import { completeSprint as apiCompleteSprint, createSprint as apiCreateSprint, startSprint as apiStartSprint, deleteSprint as apiDeleteSprint, updateSprint, fetchSprints } from "@/lib/api";
import { demoCreateSprint, demoStartSprint, demoCompleteSprint, demoDeleteSprint, demoUpdateSprint, loadDemoSprints } from "@/lib/demoStorage";
import {
    demoCreateCard, demoUpdateCard,
    demoCreateSection, demoUpdateSection, demoDeleteSection,
    demoCreateTag, demoDeleteTag,
    demoArchiveCard, demoRestoreCard, loadDemoArchivedCards,
    loadDemoTemplates,
} from "@/lib/demoStorage";
import { playPickup, playDrop } from "@/lib/sound";
import { hapticPick, hapticDrop } from "@/lib/haptics";
import { triggerInkSplash } from "@/components/ui/SpringTrail";
import { BoardSettings } from "@/components/ui/BoardSettings";
import Icon from "@/components/ui/Icon";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
    faTag, faClipboardList, faCommentDots, faBoxArchive, faPalette,
    faTableCells, faBars, faCalendarDays, faChartColumn,
    faMagnifyingGlass, faTriangleExclamation, faPlus, faLayerGroup,
} from "@fortawesome/free-solid-svg-icons";
import { BacklogView } from "../ui/BacklogView";
import { SprintStatusBar } from "../ui/SprintStatusBar";
import { SprintBacklog } from "../ui/SprintBacklog";
import { CompleteSprintModal } from "../ui/CompleteSprintModal";
import { SprintReport } from "../ui/SprintReport";

const SECTION_COLORS = ['#4CAF50', '#FF9800', '#1976D2', '#F44336', '#7B1FA2', '#FFC107'];

// Re-measure droppables on every frame while dragging (not just at drag start). Without
// this, moving a card into another column mid-drag leaves the target column's rects stale,
// so its cards don't slide open to make room — the cross-column gap animation is missing.
const KANBAN_MEASURING = { droppable: { strategy: MeasuringStrategy.Always } };

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


interface ActivityEntry {
    id: number;
    description: string;
    created_at: string;
}

interface ChatMessage {
    id: number;
    body: string;
    created_at: string;
    user: { id: number; name: string };
}

// Payloads broadcast on the private board channel as `.board.event`.
type BoardEventPayload =
    | { type: 'card.created' | 'card.updated' | 'card.restored'; payload: CardInterface }
    | { type: 'card.deleted'; payload: { id: number | string } }
    | { type: 'section.created' | 'section.updated'; payload: SectionData }
    | { type: 'section.deleted'; payload: { id: number } }
    | { type: 'sections.reordered'; payload: { section_ids: number[] } }
    | { type: 'sprint.created' | 'sprint.updated'; payload: SprintInterface }
    | { type: 'sprint.deleted'; payload: { id: number } }
    | { type: 'message.created'; payload: ChatMessage }
    | { type: 'message.deleted'; payload: { id: number } };

interface BoardProps extends BoardInterface {
    size: string;
    isDemo?: boolean;
    demoId?: string;
    boardUsers?: SharedUser[];
    isReadOnly?: boolean;
    currentUserId?: number;
    settingsOpen?: boolean;
    onSettingsClose?: () => void;
    onBoardMetaSaved?: (name: string, description: string, ticketPrefix: string) => void;
    onDeleteBoard?: () => void;
}

export function Board({ id, name, type = 'kanban', currency = 'BRL', description, ticket_prefix, size, cards, sections: initialSections, sprints: initialSprints = [], tags: initialTags = [], isDemo = false, demoId = 'demo', boardUsers = [], isReadOnly = false, currentUserId = 0, settingsOpen = false, onSettingsClose, onBoardMetaSaved, onDeleteBoard }: BoardProps) {
    const [cardsProp, setCards] = useState(cards);
    const [sections, setSections] = useState(initialSections);
    const [sprints, setSprints] = useState(initialSprints);
    const [tags, setTags] = useState<TagInterface[]>(initialTags);
    // Scrum modals: the sprint being completed, and the sprint whose report is open.
    const [completingSprint, setCompletingSprint] = useState<SprintInterface | null>(null);
    const [reportSprint, setReportSprint] = useState<SprintInterface | null>(null);
    const [isCardVisible, setIsCardVisible] = useState(false);
    const [selectedCard, setSelectedCard] = useState<CardInterface | null>(null);
    const [isAddingSection, setIsAddingSection] = useState(false);
    const [newSectionName, setNewSectionName] = useState('');
    const [sectionError, setSectionError] = useState('');
    const [sectionToDelete, setSectionToDelete] = useState<{id: number, name: string} | null>(null);
    const [cardToDelete, setCardToDelete] = useState<CardInterface | null>(null);
    const [filterUserId, setFilterUserId] = useState<number | null>(null);
    const [filterTagId, setFilterTagId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCard, setActiveCard] = useState<CardInterface | null>(null);
    const [isTagsOpen, setIsTagsOpen] = useState(false);
    const [isActivityOpen, setIsActivityOpen] = useState(false);
    const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
    const [isArchivedOpen, setIsArchivedOpen] = useState(false);
    const [archivedCards, setArchivedCards] = useState<CardInterface[]>([]);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState(TAG_PALETTE[0]);

    const storageKey = isDemo ? demoId : String(id);
    const [wipLimits, setWipLimits] = useState<Record<number, number | null>>({});
    const [boardBg, setBoardBg] = useState<string>('');
    const [isBgOpen, setIsBgOpen] = useState(false);
    const [boardTemplates, setBoardTemplates] = useState<Template[]>([]);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const chatChannelRef = useRef<ReturnType<Echo<'reverb'>['private']> | null>(null);
    const chatLoadedRef = useRef(false);
    const [isToolbarOpen, setIsToolbarOpen] = useState(false);
    const touchStartY = useRef<number>(0);
    const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'calendar' | 'analytics' | 'backlog'>('kanban');
    const [isCommandOpen, setIsCommandOpen] = useState(false);
    // Section a newly-created card should default into (used by backlog "+ New" → full editor)
    const [newCardSectionId, setNewCardSectionId] = useState<number | null>(null);

    // Sync failure feedback — shown when a server mutation fails and local state was reverted.
    const [syncError, setSyncError] = useState<string | null>(null);
    const syncErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reportSyncError = useCallback((message: string) => {
        setSyncError(message);
        if (syncErrorTimer.current) clearTimeout(syncErrorTimer.current);
        syncErrorTimer.current = setTimeout(() => setSyncError(null), 4000);
    }, []);
    useEffect(() => () => { if (syncErrorTimer.current) clearTimeout(syncErrorTimer.current); }, []);

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
    const lastPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    // While a card is being dragged we must NOT mutate the sortable lists, or dnd-kit
    // re-measures mid-drag and loops (React #185). Realtime board events that land during
    // a drag are queued here and replayed once the drag settles.
    const isDraggingRef = useRef(false);
    const pendingBoardEventsRef = useRef<BoardEventPayload[]>([]);
    const dragStartCardsRef = useRef<CardInterface[] | null>(null);
    // Collision stabilisation (dnd-kit MultipleContainers pattern): remember the last hit and
    // whether we just relocated the dragged card, so layout shifts can't flip the target.
    const lastOverIdRef = useRef<UniqueIdentifier | null>(null);
    const recentlyMovedToNewContainerRef = useRef(false);
    const lastCrossMoveAtRef = useRef(0);

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

    // Apply one realtime board event to local state. Kept as a stable callback so the drag
    // handlers can also replay queued events after a drag finishes.
    const applyBoardEvent = useCallback((e: BoardEventPayload) => {
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
            case 'sprint.created':
                setSprints(prev => prev.some(s => s.id === e.payload.id) ? prev : [...prev, e.payload]);
                break;
            case 'sprint.updated':
                setSprints(prev => {
                    // A sprint becoming active deactivates the others (single-active invariant).
                    const next = prev.map(s => s.id === e.payload.id ? { ...s, ...e.payload } : s);
                    return e.payload.is_active ? next.map(s => s.id === e.payload.id ? s : { ...s, is_active: false }) : next;
                });
                break;
            case 'sprint.deleted':
                setSprints(prev => prev.filter(s => s.id !== e.payload.id));
                break;
            case 'message.created':
                setChatMessages(prev => prev.some(m => m.id === e.payload.id) ? prev : [...prev, e.payload]);
                break;
            case 'message.deleted':
                setChatMessages(prev => prev.filter(m => m.id !== e.payload.id));
                break;
        }
    }, []);

    // Replay any board events that were queued while a drag was in progress.
    const flushPendingBoardEvents = useCallback(() => {
        if (pendingBoardEventsRef.current.length === 0) return;
        const queued = pendingBoardEventsRef.current;
        pendingBoardEventsRef.current = [];
        queued.forEach(applyBoardEvent);
    }, [applyBoardEvent]);

    useEffect(() => {
        if (isDemo || id === 0 || currentUserId === 0) return;

        const echo = getEcho();
        const channel = echo.private(`board.${id}`);
        chatChannelRef.current = channel;

        channel.listen('.board.event', (e: BoardEventPayload) => {
            // Never mutate the board while dragging — queue and replay on drop/cancel.
            if (isDraggingRef.current) { pendingBoardEventsRef.current.push(e); return; }
            applyBoardEvent(e);
        });

        return () => {
            echo.leave(`board.${id}`);
            chatChannelRef.current = null;
        };
    }, [id, isDemo, currentUserId, applyBoardEvent]);

    // --- Tag management ---

    const handleCreateTag = async () => {
        const trimmed = newTagName.trim();
        if (!trimmed) return;
        try {
            const saved = isDemo
                ? demoCreateTag(demoId, trimmed, newTagColor)
                : await createTag(id, { name: trimmed, color: newTagColor });
            setTags(prev => [...prev, saved]);
            setNewTagName('');
            setNewTagColor(TAG_PALETTE[0]);
        } catch {
            reportSyncError('Could not create tag — try again');
        }
    };

    const handleDeleteTag = async (tagId: number) => {
        try {
            if (isDemo) demoDeleteTag(demoId, tagId);
            else await deleteTag(id, tagId);
        } catch {
            reportSyncError('Could not delete tag — try again');
            return;
        }
        setTags(prev => prev.filter(t => t.id !== tagId));
        setCards(prev => prev.map(c => ({ ...c, tags: (c.tags ?? []).filter((t) => t.id !== tagId) })));
        if (filterTagId === tagId) setFilterTagId(null);
    };

    // --- Section management ---

    // "Backlog" is reserved for the unique built-in backlog — users can't take that name.
    const isReservedName = (n: string) => n.trim().toLowerCase() === 'backlog';

    const handleRenameSection = async (sectionId: number, newName: string) => {
        if (isReservedName(newName)) return; // ignore — keep the old name
        const previousName = sections.find(s => s.id === sectionId)?.name;
        setSections(prev => prev.map(s => s.id === sectionId ? { ...s, name: newName } : s));
        try {
            if (isDemo) demoUpdateSection(demoId, sectionId, newName);
            else await updateSection(id, sectionId, { name: newName });
        } catch {
            setSections(prev => prev.map(s => s.id === sectionId ? { ...s, name: previousName ?? s.name } : s));
            reportSyncError('Rename failed — change reverted');
        }
    };

    const handleDeleteSection = async () => {
        if (!sectionToDelete) return;
        try {
            if (isDemo) demoDeleteSection(demoId, sectionToDelete.id);
            else await deleteSection(id, sectionToDelete.id);
        } catch {
            reportSyncError('Could not delete section — try again');
            setSectionToDelete(null);
            return;
        }
        setSections(prev => prev.filter(s => s.id !== sectionToDelete.id));
        setCards(prev => prev.filter(c => c.section_id !== sectionToDelete.id));
        setSectionToDelete(null);
    };

    const handleAddSection = async () => {
        const trimmed = newSectionName.trim();
        if (!trimmed) return;
        if (isReservedName(trimmed)) { setSectionError('“Backlog” is reserved'); return; }
        let saved;
        try {
            saved = isDemo ? demoCreateSection(demoId, trimmed) : await createSection(id, trimmed);
        } catch {
            setSectionError('Could not create section — try again');
            return;
        }
        // Keep the reserved Backlog section pinned to the end — new columns go before it.
        const bl = backlogSection;
        setSections(prev => {
            const withoutBl = bl ? prev.filter(s => s !== bl) : prev;
            return bl ? [...withoutBl, saved, bl] : [...withoutBl, saved];
        });
        // Persist the order so Backlog stays last on the backend too (demo storage handles this itself).
        if (bl && !isDemo) reorderSections(id, [...boardSections, saved, bl].map(s => s.id)).catch(() => {});
        setNewSectionName('');
        setIsAddingSection(false);
    };

    // --- Backlog ---
    // Backlog tickets are cards parked in a reserved per-board section named "Backlog".
    // It is identified by name (centralized here) so a future is_backlog flag is a 1-line swap.
    // The backlog section is filtered out of every board view via boardSections/boardCards below.
    const BACKLOG_NAME = 'Backlog';
    const backlogSection = sections.find(s => s.name === BACKLOG_NAME) ?? null;
    const boardSections  = backlogSection ? sections.filter(s => s !== backlogSection) : sections;
    const backlogCards   = backlogSection ? cardsProp.filter(c => c.section_id === backlogSection.id) : [];
    const boardCards     = backlogSection ? cardsProp.filter(c => c.section_id !== backlogSection.id) : cardsProp;

    // --- Card filtering ---

    const matchesFilters = (card: CardInterface) => {
        if (filterUserId !== null && card.assigned_user_id !== filterUserId) return false;
        if (filterTagId !== null && !(card.tags ?? []).some((t) => t.id === filterTagId)) return false;
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase();
            if (!(card.name?.toLowerCase().includes(q) || (card.description ?? '').toLowerCase().includes(q))) return false;
        }
        return true;
    };

    // Scrum boards show only the active sprint on the Board; planning lives in the Backlog.
    const activeSprint = sprints.find(s => s.status === 'active') ?? null;
    const matchesSprint = (card: CardInterface) => {
        if (type !== 'scrum') return true;
        if (!activeSprint) return false;
        return (card.sprint_id ?? null) === activeSprint.id;
    };

    const sectionCards = (sectionId: number) => boardCards
        .filter(card => card.section_id === sectionId && matchesFilters(card) && matchesSprint(card))
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    const totalCards = boardCards.length;
    const doneSection = boardSections.find(s => s.name?.toLowerCase() === 'done');
    const doneCards = doneSection ? boardCards.filter(c => c.section_id === doneSection.id).length : 0;

    // CRM: total value of every deal on the board (the headline figure).
    const isCrm = type === 'crm';
    const crmTotal = isCrm ? boardCards.reduce((sum, c) => sum + toNumber(c.value), 0) : 0;

    // --- Backlog handlers ---

    const ensureBacklogSection = async () => {
        if (backlogSection) return backlogSection;
        const saved = isDemo ? demoCreateSection(demoId, BACKLOG_NAME) : await createSection(id, BACKLOG_NAME);
        setSections(prev => [...prev, saved]);
        return saved;
    };

    // Optimistically move a card to another section (appended to the end); roll back and report if the server rejects it.
    const moveCard = (cardId: number | string, sectionId: number) => {
        const prevCard = cardsProp.find(c => c.id === cardId);
        const previousSectionId = prevCard?.section_id;
        const previousPosition = prevCard?.position;
        const newPosition = Math.max(-1, ...cardsProp.filter(c => c.section_id === sectionId).map(c => c.position ?? 0)) + 1;
        const movingToDone = sectionId === doneSection?.id;
        setCards(prev => prev.map(c => c.id === cardId ? { ...c, section_id: sectionId, position: newPosition, done_at: movingToDone ? (c.done_at ?? new Date().toISOString()) : null } : c));
        if (isDemo) { demoUpdateCard(demoId, cardId as number, { section_id: sectionId }); return; }
        updateCard(id, cardId, { section_id: sectionId, position: newPosition }).catch(() => {
            if (previousSectionId !== undefined) {
                setCards(prev => prev.map(c => c.id === cardId ? { ...c, section_id: previousSectionId, position: previousPosition } : c));
            }
            reportSyncError('Move failed — change reverted');
        });
    };

    // Promote a backlog ticket onto the board: move it into the first/leftmost column (their "To Do").
    const handleAddToBoard = (card: CardInterface) => {
        const target = boardSections[0];
        if (!card || !target) return;
        moveCard(card.id, target.id);
        setIsCardVisible(false);
        setSelectedCard(null);
    };

    // Send a board card back to the backlog.
    const handleSendToBacklog = async (card: CardInterface) => {
        if (!card) return;
        let bl;
        try {
            bl = await ensureBacklogSection();
        } catch {
            reportSyncError('Could not reach the backlog — try again');
            return;
        }
        moveCard(card.id, bl.id);
        setIsCardVisible(false);
        setSelectedCard(null);
    };

    // Quick-add: create a backlog ticket instantly from just a name.
    const handleQuickCreateBacklog = async (cardName: string) => {
        try {
            const bl = await ensureBacklogSection();
            const saved = isDemo
                ? demoCreateCard(demoId, { section_id: bl.id, name: cardName, description: '' })
                : await createCard(id, { section_id: bl.id, name: cardName, description: '' });
            setCards(prev => prev.some(c => c.id === saved.id) ? prev : [...prev, saved]);
        } catch {
            reportSyncError('Could not create ticket — try again');
        }
    };

    // --- Scrum planning (Backlog view) ---

    // Assign a ticket to a sprint (or back to the product backlog: sprintId = null).
    const handleAssignSprint = (cardId: number, sprintId: number | null) => {
        const prevCard = cardsProp.find(c => c.id === cardId);
        setCards(prev => prev.map(c => c.id === cardId ? { ...c, sprint_id: sprintId } : c));
        if (isDemo) { demoUpdateCard(demoId, cardId, { sprint_id: sprintId }); return; }
        updateCard(id, cardId, { sprint_id: sprintId }).catch(() => {
            setCards(prev => prev.map(c => c.id === cardId ? { ...c, sprint_id: prevCard?.sprint_id ?? null } : c));
            reportSyncError('Could not move ticket — change reverted');
        });
    };

    // Quick-create a ticket in the planning backlog, into the given sprint (or backlog).
    const handleScrumQuickCreate = async (cardName: string, sprintId: number | null) => {
        const section = boardSections[0];
        if (!section) return;
        try {
            const saved = isDemo
                ? demoCreateCard(demoId, { section_id: section.id, name: cardName, description: '', sprint_id: sprintId })
                : await createCard(id, { section_id: section.id, name: cardName, description: '', sprint_id: sprintId });
            setCards(prev => prev.some(c => c.id === saved.id) ? prev : [...prev, saved]);
        } catch {
            reportSyncError('Could not create ticket — try again');
        }
    };

    // Full editor: open CardEdit for a new card pre-seeded to the backlog section.
    const handleOpenBacklogEditor = async () => {
        try {
            const bl = await ensureBacklogSection();
            setNewCardSectionId(bl.id);
        } catch {
            reportSyncError('Could not reach the backlog — try again');
            return;
        }
        setSelectedCard(null);
        setIsCardVisible(true);
    };

    // --- Card management ---

    const handleClick = (card: CardInterface) => {
        setSelectedCard(card);
        setIsCardVisible(true);
    };

    const handleSubmit = async (card: CardFormData, isNew: boolean) => {
        try {
            if (isNew) {
                const saved = isDemo
                    ? demoCreateCard(demoId, { section_id: card.section_id, name: card.name, description: card.description, tag_ids: card.tag_ids, due_date: card.due_date, priority: card.priority, value: card.value, story_points: card.story_points, sprint_id: card.sprint_id })
                    : await createCard(id, { section_id: card.section_id, assigned_user_id: card.assigned_user_id, tag_ids: card.tag_ids, name: card.name, description: card.description, due_date: card.due_date, priority: card.priority, value: card.value, story_points: card.story_points, sprint_id: card.sprint_id });
                setCards(prev => prev.some(c => c.id === saved.id) ? prev.map(c => c.id === saved.id ? { ...c, ...saved } : c) : [...prev, saved]);
            } else {
                const saved = isDemo
                    ? demoUpdateCard(demoId, card.id as number, { section_id: card.section_id, name: card.name, description: card.description, tag_ids: card.tag_ids, due_date: card.due_date, priority: card.priority, value: card.value, story_points: card.story_points, sprint_id: card.sprint_id })
                    : await updateCard(id, card.id, { section_id: card.section_id, assigned_user_id: card.assigned_user_id, tag_ids: card.tag_ids, name: card.name, description: card.description, due_date: card.due_date, priority: card.priority, value: card.value, story_points: card.story_points, sprint_id: card.sprint_id });
                setCards(prev => prev.map(c => c.id === card.id ? { ...saved, checklist_items: card.checklist_items } : c));
            }
        } catch {
            // Keep the editor open so nothing the user typed is lost.
            reportSyncError('Could not save card — try again');
            return;
        }
        setIsCardVisible(false);
        setSelectedCard(null);
        setNewCardSectionId(null);
    };

    // --- Scrum sprint lifecycle (demo mirrors the backend locally) ---

    // Re-read the whole sprint list (dates cascade server-side, so a single response isn't enough).
    const refreshSprints = async () => {
        if (isDemo) { setSprints(loadDemoSprints(demoId) as SprintInterface[]); return; }
        try { const list = await fetchSprints(id); if (Array.isArray(list)) setSprints(list); } catch { /* keep current */ }
    };

    const handleCreateSprint = async (data: { name: string; start_date: string; end_date: string }) => {
        try {
            if (isDemo) demoCreateSprint(demoId, data.name, data.start_date, data.end_date);
            else await apiCreateSprint(id, data);
            await refreshSprints();
        } catch { reportSyncError('Could not create sprint — try again'); }
    };

    const handleUpdateSprintDates = async (sprintId: number, dates: { start_date: string; end_date: string }) => {
        try {
            if (isDemo) demoUpdateSprint(demoId, sprintId, dates);
            else await updateSprint(id, sprintId, dates);
            await refreshSprints();
        } catch { reportSyncError('Could not update sprint dates — try again'); }
    };

    const handleStartSprint = async (sprintId: number) => {
        try {
            const saved: SprintInterface = isDemo
                ? demoStartSprint(demoId, sprintId) as SprintInterface
                : await apiStartSprint(id, sprintId);
            setSprints(prev => prev.map(s => s.id === sprintId ? saved : { ...s, is_active: false, status: s.status === 'active' ? 'future' : s.status }));
        } catch { reportSyncError('Could not start sprint — another may be active'); }
    };

    const handleDeleteSprint = async (sprintId: number) => {
        const prev = sprints;
        setSprints(p => p.filter(s => s.id !== sprintId));
        try {
            if (isDemo) demoDeleteSprint(demoId, sprintId);
            else await apiDeleteSprint(id, sprintId);
        } catch { setSprints(prev); reportSyncError('Could not delete sprint — try again'); }
    };

    // Complete the active sprint: freeze it, rehome incomplete tickets per the dialog.
    const handleCompleteSprint = async (data: { move_to: string; new_sprint_name?: string }) => {
        const sprint = completingSprint;
        if (!sprint) return;
        try {
            let completed: SprintInterface;
            let newSprint: SprintInterface | null = null;
            let targetId: number | null;
            if (isDemo) {
                completed = demoCompleteSprint(demoId, sprint.id, data.move_to, data.new_sprint_name) as SprintInterface;
                const all = loadDemoSprints(demoId) as SprintInterface[];
                newSprint = data.move_to === 'new' ? all.find(s => s.name === data.new_sprint_name && s.status === 'future') ?? null : null;
                targetId = data.move_to === 'backlog' ? null : data.move_to === 'new' ? (newSprint?.id ?? null) : Number(data.move_to);
            } else {
                const res = await apiCompleteSprint(id, sprint.id, data);
                completed = res.sprint;
                newSprint = res.new_sprint ?? null;
                targetId = res.target_sprint_id ?? null;
            }
            setSprints(prev => {
                let next = prev.map(s => s.id === completed.id ? completed : s);
                if (newSprint && !next.some(s => s.id === newSprint!.id)) next = [...next, newSprint];
                return next;
            });
            // Reflect moved tickets locally: incomplete cards move to the chosen destination.
            setCards(prev => prev.map(c =>
                c.sprint_id === sprint.id && !c.done_at ? { ...c, sprint_id: targetId } : c));
            setCompletingSprint(null);
        } catch {
            reportSyncError('Could not complete sprint — try again');
        }
    };

    const handleArchiveCard = async () => {
        if (!cardToDelete) return;
        try {
            if (isDemo) demoArchiveCard(demoId, cardToDelete.id as number);
            else await deleteCard(id, cardToDelete.id);
        } catch {
            reportSyncError('Could not archive card — try again');
            setCardToDelete(null);
            return;
        }
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

    const handleRestoreCard = async (card: CardInterface) => {
        try {
            if (isDemo) demoRestoreCard(demoId, card.id as number);
            else await restoreCard(id, card.id);
        } catch {
            reportSyncError('Could not restore card — try again');
            return;
        }
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
                const fetched: ChatMessage[] = Array.isArray(data) ? data : [];
                const merged = [...fetched, ...prev.filter((m) => !fetched.some((f) => f.id === m.id))];
                return merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            });
        }
    };

    const handleChatSend = async (body: string) => {
        try {
            const { createBoardMessage } = await import('@/lib/api');
            const msg = await createBoardMessage(id, body);
            setChatMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        } catch {
            reportSyncError('Message not sent — try again');
        }
    };

    const handleChatDelete = async (messageId: number) => {
        const { deleteBoardMessage } = await import('@/lib/api');
        await deleteBoardMessage(id, messageId).catch(() => {});
        setChatMessages(prev => prev.filter(m => m.id !== messageId));
    };

    useEffect(() => {
        const isTyping = (el: HTMLElement | null) =>
            !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);

        const handleGlobalEvent = (event: KeyboardEvent) => {
            // Any modal, panel, drawer, or inline editor that's open → the board is "busy".
            const anyOpen =
                isCardVisible || isTagsOpen || isActivityOpen || isArchivedOpen || isBgOpen ||
                settingsOpen || isChatOpen || isToolbarOpen || isCommandOpen || isAddingSection ||
                sectionToDelete !== null || cardToDelete !== null;

            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setIsCommandOpen(v => !v);
                return;
            }

            // "C" to create a card — only on the board / list views, when nothing else is
            // open, never while typing in a field, and not as part of a Cmd/Ctrl+C (copy).
            if (
                event.key.toLowerCase() === 'c' &&
                !event.metaKey && !event.ctrlKey && !event.altKey &&
                !isReadOnly &&
                !anyOpen &&
                (viewMode === 'kanban' || viewMode === 'list') &&
                !isTyping(event.target as HTMLElement | null) && !isTyping(document.activeElement as HTMLElement | null)
            ) {
                // Stop the browser from typing the "c" into the (about-to-autofocus) name field.
                event.preventDefault();
                setNewCardSectionId(null);
                setIsCardVisible(true);
            }
        };
        window.addEventListener('keydown', handleGlobalEvent);
        return () => window.removeEventListener('keydown', handleGlobalEvent);
    }, [isReadOnly, viewMode, isCardVisible, isTagsOpen, isActivityOpen, isArchivedOpen, isBgOpen, settingsOpen, isChatOpen, isToolbarOpen, isCommandOpen, isAddingSection, sectionToDelete, cardToDelete]);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor,  { activationConstraint: { delay: 350, tolerance: 5 } })
    );

    // Which section a draggable id belongs to. Container ids look like `section-<id>`;
    // card ids look like `draggable-<cardId>` and resolve to that card's current section.
    const findSectionIdOfItem = (rawId: string): number | null => {
        if (rawId.startsWith('section-')) return Number(rawId.slice('section-'.length));
        const cardId = Number(rawId.split('-')[1]);
        return cardsProp.find(c => c.id === cardId)?.section_id ?? null;
    };

    // Pointer-anchored collision detection (dnd-kit's official MultipleContainers strategy).
    // closestCorners compares RECTS, and our onDragOver relocates the dragged card, shifting
    // those rects — so the "closest" target could flip A↔B every frame and loop React past
    // its nested-update limit (error #185, black screen). The pointer's position is immune
    // to layout shifts, so anchoring on pointerWithin kills the oscillation at the source.
    const collisionDetectionStrategy: CollisionDetection = useCallback((args) => {
        // STRICTLY pointer-driven with a sticky fallback (dnd-kit #1678). Column x-positions
        // never change during a drag, so a pointer-only `over` cannot flip between columns on
        // its own. Falling back to rect intersection mid-drag would reintroduce the loop: our
        // relocation shifts rects, the rect-winner flips A↔B, and onDragOver cascades setState
        // past React's update limit. So rects may only decide when we have NO pointer hit yet.
        const pointerIntersections = pointerWithin(args);
        const intersections = pointerIntersections.length > 0
            ? pointerIntersections
            : (lastOverIdRef.current == null ? rectIntersection(args) : []);
        let overId = getFirstCollision(intersections, 'id');

        if (overId != null) {
            if (String(overId).startsWith('section-')) {
                // Hit a column body: snap to the closest card inside it (if it has any), so
                // insertion lands next to a card instead of always at the column level.
                const sectionId = Number(String(overId).slice('section-'.length));
                const containerCardIds = new Set(
                    cardsProp.filter(c => c.section_id === sectionId).map(c => `draggable-${c.id}`)
                );
                if (containerCardIds.size > 0) {
                    const closest = closestCenter({
                        ...args,
                        droppableContainers: args.droppableContainers.filter(c => containerCardIds.has(String(c.id))),
                    })[0]?.id;
                    if (closest != null) overId = closest;
                }
            }
            lastOverIdRef.current = overId;
            return [{ id: overId }];
        }

        // Right after we relocate the dragged card the layout shifts and a frame can have no
        // pointer hit; anchor on the active card so targets don't jump around.
        if (recentlyMovedToNewContainerRef.current) {
            lastOverIdRef.current = args.active.id;
        }
        return lastOverIdRef.current ? [{ id: lastOverIdRef.current }] : [];
    }, [cardsProp]);

    // Release the "just moved" latch one frame after the cards state settles.
    useEffect(() => {
        requestAnimationFrame(() => { recentlyMovedToNewContainerRef.current = false; });
    }, [cardsProp]);

    function handleDragStart(event: DragStartEvent) {
        const cardId = Number(String(event.active.id).split('-')[1]);
        isDraggingRef.current = true;        // freeze realtime mutations for the duration of the drag
        dragStartCardsRef.current = cardsProp; // pre-drag snapshot for rollback on a failed reorder
        lastOverIdRef.current = null;
        lastCrossMoveAtRef.current = 0;
        setActiveCard(cardsProp.find(c => c.id === cardId) ?? null);
        playPickup();
        hapticPick();
    }

    // While dragging across columns, move the active card into the hovered column so its
    // siblings shift and open a gap (the Trello-style preview). A fractional position drops
    // it next to the hovered card; handleDragEnd renormalises to integers and persists.
    // The `return prev` no-op guard is important: it stops redundant state updates (and any
    // boundary oscillation) from churning re-renders. Safe because SortableContext items are
    // memoized — see Section.tsx — so this no longer feeds the React #185 update loop.
    function handleDragOver(event: DragOverEvent) {
        const { active, over } = event;
        if (!over) return;
        const activeRawId = String(active.id);
        const overRawId = String(over.id);
        const activeCardId = Number(activeRawId.split('-')[1]);
        const fromSection = findSectionIdOfItem(activeRawId);
        const toSection = findSectionIdOfItem(overRawId);
        if (fromSection == null || toSection == null || fromSection === toSection) return;

        // Hard damper (belt & suspenders for dnd-kit #1678): relocate the dragged card across
        // containers at most once per 120ms. React #185 requires dozens of setStates cascading
        // in ONE synchronous task — a time gate makes that physically impossible, no matter
        // how the collision layer misbehaves. Worst case is a brief gap flicker, never a crash.
        const now = Date.now();
        if (now - lastCrossMoveAtRef.current < 120) return;
        lastCrossMoveAtRef.current = now;

        recentlyMovedToNewContainerRef.current = true;   // stabilise collisions while layout settles
        setCards(prev => {
            const activeNow = prev.find(c => c.id === activeCardId);
            if (!activeNow || activeNow.section_id === toSection) return prev; // already moved → no-op
            let newPosition: number;
            if (overRawId.startsWith('section-')) {
                newPosition = Math.max(-1, ...prev.filter(c => c.section_id === toSection).map(c => c.position ?? 0)) + 1;
            } else {
                const overCard = prev.find(c => c.id === Number(overRawId.split('-')[1]));
                newPosition = (overCard?.position ?? 0) - 0.5;
            }
            return prev.map(c => c.id === activeCardId ? { ...c, section_id: toSection, position: newPosition } : c);
        });
    }

    // ESC / programmatic cancel: dnd-kit fires this instead of onDragEnd, so it must also
    // clear the drag flag and replay any queued realtime events.
    function handleDragCancel() {
        setActiveCard(null);
        resetTilt();
        isDraggingRef.current = false;
        flushPendingBoardEvents();
    }

    return (
        <>
            {/* Board background overlay */}
            {boardBg && (
                <div style={{ position: 'fixed', inset: 0, zIndex: -1, background: boardBg }} />
            )}

            {/* Sync failure toast */}
            {syncError && (
                <div
                    role="alert"
                    className="glass-panel cf-mono fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 text-xs uppercase tracking-widest font-bold flex items-center gap-2"
                    style={{ color: 'var(--cf-red)', borderColor: 'var(--cf-red)' }}
                >
                    <Icon icon={faTriangleExclamation} /> {syncError}
                </div>
            )}

            {/* Top bar: search + shortcuts */}
            <div className="glass-panel flex items-center gap-3 mb-4 flex-wrap px-3 py-2.5 rounded-2xl">
                <div className="relative flex-1 min-w-[160px] max-w-xs">
                    <input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search cards..."
                        className="glass-input w-full text-xs"
                        style={{ paddingLeft: '2rem' }}
                    />
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none" style={{ color: 'var(--cf-phosphor)' }}><Icon icon={faMagnifyingGlass} /></span>
                </div>

                {/* CRM total — headline funnel value (LCD strip) */}
                {isCrm && (
                    <span className="cf-screen cf-mono text-xs flex-shrink-0 px-2.5 py-1 font-bold inline-flex items-center gap-1.5" style={{ color: 'var(--cf-phosphor)' }} title="Total value of all deals on the board">
                        <span className="cf-led" style={{ background: 'var(--cf-phosphor)', boxShadow: '0 0 6px var(--cf-phosphor)' }} />
                        {formatMoney(crmTotal, currency)} · {totalCards} deal{totalCards !== 1 ? 's' : ''}
                    </span>
                )}

                {/* Progress counter — LCD strip (task boards only) */}
                {!isCrm && totalCards > 0 && (
                    <span className="cf-screen cf-mono text-xs flex-shrink-0 px-2.5 py-1" style={{ color: 'var(--cf-phosphor)' }}>
                        {doneCards}/{totalCards} done
                    </span>
                )}

                {/* View toggle — hardware toggle keys with status LEDs */}
                <div className="flex items-center gap-1 flex-shrink-0">
                    {([
                        { key: 'kanban',    icon: faTableCells,   label: 'Board' },
                        { key: 'list',      icon: faBars,         label: 'List' },
                        { key: 'backlog',   icon: faLayerGroup,   label: 'Backlog' },
                        { key: 'calendar',  icon: faCalendarDays, label: 'Cal' },
                        { key: 'analytics', icon: faChartColumn,  label: 'Stats' },
                    ] as const).map(({ key, icon, label }) => (
                        <button key={key} onClick={() => { if (key === 'backlog' && type !== 'scrum') ensureBacklogSection().catch(() => {}); setViewMode(key); }}
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
                        <kbd className="cf-mono text-xs glass-input px-2 py-1" style={{ color: '#1c2016' }}>⌘K</kbd>
                        <span className="cf-mono text-xs uppercase tracking-widest">Search</span>
                    </button>
                    <span style={{ color: 'var(--cf-edge)' }}>·</span>
                    <p className="cf-mono text-xs uppercase tracking-widest">Press</p>
                    <kbd className="cf-mono text-xs glass-input px-2 py-1" style={{ color: '#1c2016' }}>C</kbd>
                    <p className="cf-mono text-xs uppercase tracking-widest">to add</p>
                </div>
            </div>

            {/* Due date banner — always visible when there are overdue/due-today cards */}
            <DueDateBanner cards={boardCards} sections={boardSections} onCardClick={handleClick} />

            {/* Filter strip — kanban + list + backlog */}
            {(viewMode === 'kanban' || viewMode === 'list' || viewMode === 'backlog') && <div className="flex items-center gap-2 mb-5 flex-wrap">
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
                <CalendarView cards={boardCards} sections={boardSections} onCardClick={handleClick} />
            )}

            {/* Analytics view */}
            {viewMode === 'analytics' && (
                <AnalyticsView cards={boardCards} sections={boardSections} />
            )}

            {/* List view */}
            {viewMode === 'list' && (
                <ListView cards={boardCards.filter(matchesFilters)} sections={boardSections} users={boardUsers} onCardClick={handleClick} boardType={type} currency={currency} />
            )}

            {/* Backlog view — Scrum: sprint planning; other board types: reserved-section parking lot */}
            {viewMode === 'backlog' && (type === 'scrum' ? (
                <SprintBacklog
                    sprints={sprints}
                    cards={boardCards.filter(matchesFilters)}
                    canManage={!isReadOnly}
                    onAssignSprint={handleAssignSprint}
                    onCreateSprint={handleCreateSprint}
                    onStartSprint={handleStartSprint}
                    onDeleteSprint={handleDeleteSprint}
                    onUpdateSprintDates={handleUpdateSprintDates}
                    onQuickCreate={handleScrumQuickCreate}
                    onCardClick={handleClick}
                    onOpenReport={setReportSprint}
                />
            ) : (
                <BacklogView
                    cards={backlogCards.filter(matchesFilters)}
                    users={boardUsers}
                    onCardClick={handleClick}
                    onAddToBoard={handleAddToBoard}
                    onQuickCreate={handleQuickCreateBacklog}
                    onOpenEditor={handleOpenBacklogEditor}
                    canPromote={boardSections.length > 0}
                    isReadOnly={isReadOnly}
                />
            ))}

            {/* Scrum: compact active-sprint status bar (Board view shows the active sprint only) */}
            {type === 'scrum' && (viewMode === 'kanban' || viewMode === 'list') && activeSprint && (
                <SprintStatusBar
                    sprint={activeSprint}
                    sections={boardSections}
                    sprintCards={boardCards.filter(c => c.sprint_id === activeSprint.id)}
                    canManage={!isReadOnly}
                    onComplete={setCompletingSprint}
                    onOpenReport={setReportSprint}
                />
            )}

            {/* Scrum: no active sprint → prompt to plan one in the Backlog */}
            {type === 'scrum' && viewMode === 'kanban' && !activeSprint && (
                <div className="glass-panel flex flex-col items-center gap-3 text-center px-6 py-14 rounded-2xl">
                    <Icon icon={faLayerGroup} style={{ fontSize: 28, color: 'var(--cf-text-muted)' }} />
                    <p className="cf-mono uppercase tracking-widest font-bold" style={{ fontSize: '13px', color: 'var(--cf-text)' }}>No active sprint</p>
                    <p className="cf-mono" style={{ fontSize: '11px', color: 'var(--cf-text-muted)' }}>Plan and start a sprint from the Backlog to begin.</p>
                    <button onClick={() => setViewMode('backlog')}
                        className="aero-btn aero-btn--cyan text-[10px] uppercase tracking-widest font-bold px-4 py-2 cursor-pointer inline-flex items-center gap-1.5">
                        <Icon icon={faLayerGroup} style={{ fontSize: '9px' }} /> Go to Backlog
                    </button>
                </div>
            )}

            {viewMode === 'kanban' && !(type === 'scrum' && !activeSprint) && <DndContext sensors={sensors} collisionDetection={collisionDetectionStrategy} measuring={KANBAN_MEASURING} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
                <div
                    ref={kanbanRef}
                    className="flex gap-5 items-start overflow-x-auto pb-4"
                    style={{ transformOrigin: 'center center', willChange: 'transform' }}
                >
                    {boardSections.map((section, i) => (
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
                            boardType={type}
                            currency={currency}
                            agingHours={section.aging_hours ?? null}
                        />
                    ))}

                    {!isReadOnly && <div className="flex flex-col w-64 flex-shrink-0">
                        {isAddingSection ? (
                            <div className="flex flex-col gap-2">
                                <input
                                    autoFocus
                                    value={newSectionName}
                                    onChange={e => { setNewSectionName(e.target.value); if (sectionError) setSectionError(''); }}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleAddSection();
                                        if (e.key === 'Escape') { setIsAddingSection(false); setNewSectionName(''); setSectionError(''); }
                                    }}
                                    placeholder="Section name..."
                                    className="glass-input cf-mono text-xs uppercase tracking-widest px-3 py-2 w-full"
                                />
                                {sectionError && (
                                    <p className="cf-mono text-[10px]" style={{ color: 'var(--cf-red)' }}>{sectionError}</p>
                                )}
                                <div className="flex gap-2">
                                    <button onClick={handleAddSection} className="aero-btn aero-btn--cyan flex-1 text-xs uppercase tracking-widest font-bold py-1.5 cursor-pointer">Add</button>
                                    <button onClick={() => { setIsAddingSection(false); setNewSectionName(''); setSectionError(''); }} className="aero-btn aero-btn--ghost flex-1 text-xs uppercase tracking-widest py-1.5 cursor-pointer">Cancel</button>
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
                                overlay
                                boardType={type}
                                currency={currency}
                                color={SECTION_COLORS[sections.findIndex(s => s.id === activeCard.section_id) % SECTION_COLORS.length] ?? SECTION_COLORS[0]}
                            />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>}

            {/* FAB */}
            {!isReadOnly && (
                <button
                    onClick={() => { setNewCardSectionId(null); setIsCardVisible(true); }}
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
                </div>
            ) : (
                <div className="hidden lg:flex flex-row items-center gap-2 fixed z-40" style={{ bottom: '28px', left: '50%', transform: 'translateX(-50%)' }}>
                    {[
                        { icon: faTag, color: TOOL_COLORS.tags, label: 'Tags',       onClick: () => setIsTagsOpen(true) },
                        ...(!isDemo ? [{ icon: faClipboardList, color: TOOL_COLORS.activity, label: 'Activity',   onClick: handleOpenActivity }] : []),
                        ...(!isDemo ? [{ icon: faCommentDots, color: TOOL_COLORS.chat, label: 'Chat',       onClick: handleOpenChat }] : []),
                        { icon: faBoxArchive, color: TOOL_COLORS.archived, label: 'Archived',   onClick: handleOpenArchived },
                        { icon: faPalette, color: TOOL_COLORS.background, label: 'Background', onClick: () => setIsBgOpen(true) },
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
                        </div>
                    </div>
                </div>
            </div>

            {/* Tags modal */}
            {isTagsOpen && (
                <Modal onClose={() => setIsTagsOpen(false)}>
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
                <Modal onClose={() => setIsActivityOpen(false)}>
                    <div className="aero-menu p-6 w-[95vw] max-w-md flex flex-col gap-4" style={{ maxHeight: '80vh' }}>
                        <div className="flex items-center justify-between flex-shrink-0">
                            <p className="cf-mono text-xs uppercase tracking-widest" style={{ color: 'var(--cf-phosphor)' }}>Activity log</p>
                            <button onClick={() => setIsActivityOpen(false)} className="cursor-pointer transition-colors" style={{ color: 'var(--cf-text-muted)' }}>✕</button>
                        </div>
                        <div className="flex flex-col gap-3 overflow-y-auto">
                            {activityLog.length === 0 && (
                                <p className="cf-mono text-xs text-center py-6" style={{ color: 'var(--cf-text-muted)' }}>No activity yet.</p>
                            )}
                            {activityLog.map((entry) => (
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
                <Modal onClose={() => setIsArchivedOpen(false)}>
                    <div className="aero-menu p-6 w-[95vw] max-w-md flex flex-col gap-4" style={{ maxHeight: '80vh' }}>
                        <div className="flex items-center justify-between flex-shrink-0">
                            <p className="cf-mono text-xs uppercase tracking-widest" style={{ color: 'var(--cf-phosphor)' }}>Archived cards</p>
                            <button onClick={() => setIsArchivedOpen(false)} className="cursor-pointer transition-colors" style={{ color: 'var(--cf-text-muted)' }}>✕</button>
                        </div>
                        <div className="flex flex-col gap-3 overflow-y-auto">
                            {archivedCards.length === 0 && (
                                <p className="cf-mono text-xs text-center py-6" style={{ color: 'var(--cf-text-muted)' }}>No archived cards.</p>
                            )}
                            {archivedCards.map((card) => (
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
                <Modal onClose={() => setIsBgOpen(false)}>
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

            {/* Board settings modal (unified: board meta + section order + delete) */}
            {settingsOpen && !isReadOnly && (
                <Modal onClose={() => onSettingsClose?.()}>
                    <BoardSettings
                        boardId={id}
                        isDemo={isDemo}
                        demoId={demoId}
                        name={name}
                        description={description ?? ''}
                        ticketPrefix={ticket_prefix ?? ''}
                        sections={boardSections}
                        onMetaSaved={(n, d, prefix) => {
                            // Reflow every card's key immediately so the new prefix shows without a refetch.
                            setCards(prev => prev.map(c => c.ticket_number == null
                                ? c
                                : { ...c, ticket_key: prefix ? `${prefix}-${c.ticket_number}` : `#${c.ticket_number}` }))
                            onBoardMetaSaved?.(n, d, prefix)
                        }}
                        onSectionsReordered={(reordered: SectionData[]) => setSections(backlogSection ? [...reordered, backlogSection] : reordered)}
                        onDelete={() => { onSettingsClose?.(); onDeleteBoard?.(); }}
                        onClose={() => onSettingsClose?.()}
                    />
                </Modal>
            )}

            {/* Chat modal */}
            {isChatOpen && (
                <Modal onClose={() => setIsChatOpen(false)}>
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
                    cards={boardCards}
                    sections={boardSections}
                    onSelect={(card) => { setIsCommandOpen(false); handleClick(card); }}
                    onClose={() => setIsCommandOpen(false)}
                />
            )}

            {/* Card edit modal */}
            {isCardVisible && (
                <Modal mobileFullscreen onClose={() => { setIsCardVisible(false); setSelectedCard(null); setNewCardSectionId(null); }}>
                    <div className="w-full sm:w-auto">
                        <CardEdit
                            card={selectedCard}
                            sections={sections}
                            users={boardUsers}
                            tags={tags}
                            boardType={type}
                            currency={currency}
                            sprints={sprints}
                            boardId={isDemo ? undefined : id}
                            isDemo={isDemo}
                            demoId={demoId}
                            isReadOnly={isReadOnly}
                            initialTemplates={boardTemplates}
                            defaultSectionId={newCardSectionId ?? undefined}
                            isBacklogCard={!!backlogSection && selectedCard?.section_id === backlogSection.id}
                            onAddToBoard={selectedCard ? () => handleAddToBoard(selectedCard) : undefined}
                            backlogSectionId={backlogSection?.id}
                            onSendToBacklog={selectedCard ? () => handleSendToBacklog(selectedCard) : undefined}
                            goBack={() => { setIsCardVisible(false); setSelectedCard(null); setNewCardSectionId(null); }}
                            submit={handleSubmit}
                            onDelete={selectedCard && !isReadOnly ? () => { setCardToDelete(selectedCard); setIsCardVisible(false); } : undefined}
                        />
                    </div>
                </Modal>
            )}

            {/* Complete sprint dialog */}
            {completingSprint && (
                <Modal onClose={() => setCompletingSprint(null)}>
                    <CompleteSprintModal
                        sprint={completingSprint}
                        cards={boardCards.filter(c => c.sprint_id === completingSprint.id)}
                        futureSprints={sprints.filter(s => s.status === 'future')}
                        onConfirm={handleCompleteSprint}
                        onClose={() => setCompletingSprint(null)}
                    />
                </Modal>
            )}

            {/* Sprint report */}
            {reportSprint && (
                <Modal mobileFullscreen onClose={() => setReportSprint(null)}>
                    <SprintReport
                        boardId={id}
                        sprint={reportSprint}
                        sprints={sprints}
                        cards={cardsProp.filter(c => c.sprint_id === reportSprint.id)}
                        isDemo={isDemo}
                        onClose={() => setReportSprint(null)}
                    />
                </Modal>
            )}
        </>
    );

    function handleDragEnd(event: DragEndEvent) {
        setActiveCard(null);
        resetTilt();
        try {
            const { active, over } = event;
            // Dropped outside any column → undo the cross-column preview from handleDragOver.
            if (!over) { if (dragStartCardsRef.current) setCards(dragStartCardsRef.current); return; }

            playDrop(); hapticDrop();
            triggerInkSplash(lastPointerRef.current.x, lastPointerRef.current.y);

            const activeCardId = Number(String(active.id).split('-')[1]);
            const activeCard = cardsProp.find(c => c.id === activeCardId);
            const overRawId = String(over.id);
            const destSection = findSectionIdOfItem(overRawId);
            if (!activeCard || destSection == null) return;

            const overIsContainer = overRawId.startsWith('section-');
            const overCardId = overIsContainer ? null : Number(overRawId.split('-')[1]);
            const byPosition = (a: CardInterface, b: CardInterface) => (a.position ?? 0) - (b.position ?? 0);

            // Branch on the PRE-DRAG section, not the current one: handleDragOver may have
            // already relocated the card into destSection during the drag, which would make a
            // cross-column move look like a same-column no-op and skip persistence entirely.
            const originalSection = (dragStartCardsRef.current ?? cardsProp)
                .find(c => c.id === activeCardId)?.section_id ?? activeCard.section_id;

            // Build the destination section's final ordered card ids.
            let orderedIds: (number | string)[];
            if (originalSection === destSection) {
                // True same-column reorder: the card was never relocated, so arrayMove the
                // current order from old→new slot. A genuine no-op (same slot) skips persistence.
                const ordered = cardsProp.filter(c => c.section_id === destSection).sort(byPosition);
                const oldIndex = ordered.findIndex(c => c.id === activeCardId);
                let newIndex = overIsContainer ? ordered.length - 1 : ordered.findIndex(c => c.id === overCardId);
                if (oldIndex === -1) return;
                if (newIndex === -1) newIndex = ordered.length - 1;
                if (oldIndex === newIndex) return;   // dropped back in place → nothing to persist
                orderedIds = arrayMove(ordered, oldIndex, newIndex).map(c => c.id);
            } else if (activeCard.section_id === destSection) {
                // Cross-column, and handleDragOver already placed the card in destSection at the
                // drop spot → the current sorted order IS the final order. Always persists.
                orderedIds = cardsProp.filter(c => c.section_id === destSection).sort(byPosition).map(c => c.id);
            } else {
                // Cross-column with no live preview (e.g. a quick flick): insert the card at the
                // hovered card's slot (or the end).
                const destCards = cardsProp.filter(c => c.section_id === destSection && c.id !== activeCardId).sort(byPosition);
                let insertIndex = overIsContainer ? destCards.length : destCards.findIndex(c => c.id === overCardId);
                if (insertIndex === -1) insertIndex = destCards.length;
                orderedIds = destCards.map(c => c.id);
                orderedIds.splice(insertIndex, 0, activeCardId);
            }

            // Commit normalised integer positions (and the new section) locally.
            const snapshot = dragStartCardsRef.current ?? cardsProp;  // pre-drag state for rollback
            const destIsDone = destSection === doneSection?.id;
            setCards(prev => prev.map(c => {
                const idx = orderedIds.indexOf(c.id);
                if (idx === -1) return c;
                const next = { ...c, section_id: destSection, position: idx };
                // Keep done_at in sync locally so sprint metrics / the complete dialog stay
                // accurate without a refetch (the backend applies the same rule on reorder).
                if (c.id === activeCardId) next.done_at = destIsDone ? (c.done_at ?? new Date().toISOString()) : null;
                return next;
            }));

            if (isDemo) { demoUpdateCard(demoId, activeCardId, { section_id: destSection }); return; }
            reorderCards(id, destSection, orderedIds).catch(() => {
                setCards(snapshot);
                reportSyncError('Reorder failed — change reverted');
            });
        } finally {
            // Drag is over: unfreeze and replay any realtime events that arrived meanwhile.
            isDraggingRef.current = false;
            flushPendingBoardEvents();
        }
    }
}
