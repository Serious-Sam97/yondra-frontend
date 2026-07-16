"use client";

import {
  type CollisionDetection,
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  getFirstCollision,
  MeasuringStrategy,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import {
  faLayerGroup,
  faPlus,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BoardSettings } from "@/components/ui/BoardSettings";
import Icon from "@/components/ui/Icon";
import {
  LossReasonModal,
  parseLossReasonError,
} from "@/components/ui/LossReasonModal";
import { triggerInkSplash } from "@/components/ui/SpringTrail";
import { useConsole } from "@/contexts/ConsoleContext";
import { useHeaderBus } from "@/contexts/HeaderBusContext";
import { useBoardActivity } from "@/hooks/useBoardActivity";
import { useBoardArchive } from "@/hooks/useBoardArchive";
import { BACKLOG_NAME, useBoardBacklog } from "@/hooks/useBoardBacklog";
import { useBoardChat } from "@/hooks/useBoardChat";
import { useBoardHotkeys } from "@/hooks/useBoardHotkeys";
import { useBoardPreferences } from "@/hooks/useBoardPreferences";
import { useBoardRealtime } from "@/hooks/useBoardRealtime";
import { useBoardSections } from "@/hooks/useBoardSections";
import { useBoardTags } from "@/hooks/useBoardTags";
import { useCardModalRouting } from "@/hooks/useCardModalRouting";
import { useSprints } from "@/hooks/useSprints";
import { useSyncError } from "@/hooks/useSyncError";
import type {
  BoardInterface,
  RoadmapConfig,
  SectionData,
  SharedUser,
} from "@/interfaces/BoardInterface";
import type { CardInterface } from "@/interfaces/CardInterface";
import type { TagInterface } from "@/interfaces/TagInterface";
import {
  ApiError,
  createCard,
  fetchBoard,
  reorderCards,
  updateBoard,
  updateCard,
} from "@/lib/api";
import { toNumber } from "@/lib/currency";
import { demoCreateCard, demoUpdateCard } from "@/lib/demoStorage";
import { hapticDrop, hapticPick } from "@/lib/haptics";
import { playDrop, playPickup } from "@/lib/sound";
import Modal from "../shared/Modal";
import { ActivityLogModal } from "../ui/ActivityLogModal";
import { AddSectionColumn } from "../ui/AddSectionColumn";
import { AnalyticsView } from "../ui/AnalyticsView";
import { ArchivedCardsModal } from "../ui/ArchivedCardsModal";
import { BackgroundPickerModal } from "../ui/BackgroundPickerModal";
import { BacklogView } from "../ui/BacklogView";
import BoardChat from "../ui/BoardChat";
import { ArchiveCardModal, DeleteSectionModal } from "../ui/BoardConfirmModals";
import { BoardFilterStrip } from "../ui/BoardFilterStrip";
import { BoardStandupModal } from "../ui/BoardStandupModal";
import { BoardToolsDock } from "../ui/BoardToolsDock";
import { BoardTopBar, type BoardViewMode } from "../ui/BoardTopBar";
import { CalendarView } from "../ui/CalendarView";
import { Card } from "../ui/Card";
import type { CardFormData } from "../ui/CardEdit";
import { CardImportModal } from "../ui/CardImportModal";
import { CardWorkspace } from "../ui/CardWorkspace";
import { CommandPalette } from "../ui/CommandPalette";
import { CompleteSprintModal } from "../ui/CompleteSprintModal";
import { DueDateBanner } from "../ui/DueDateBanner";
import { ListView } from "../ui/ListView";
import { RoadmapView } from "../ui/RoadmapView";
import { Section } from "../ui/Section";
import { SprintBacklog } from "../ui/SprintBacklog";
import { SprintReport } from "../ui/SprintReport";
import { SprintStatusBar } from "../ui/SprintStatusBar";
import { TestPlansOverview } from "../ui/sentinel/TestPlansOverview";
import { TagsManagerModal } from "../ui/TagsManagerModal";

const SECTION_COLORS = [
  "#4CAF50",
  "#FF9800",
  "#1976D2",
  "#F44336",
  "#7B1FA2",
  "#FFC107",
];

// Left-to-right order of the view tabs (matches BoardTopBar) — used to pick the
// slide direction so a new view enters from the side you're moving toward.
const VIEW_ORDER: BoardViewMode[] = [
  "kanban",
  "list",
  "backlog",
  "calendar",
  "analytics",
  "roadmap",
  "plans",
];

// Re-measure droppables on every frame while dragging (not just at drag start). Without
// this, moving a card into another column mid-drag leaves the target column's rects stale,
// so its cards don't slide open to make room — the cross-column gap animation is missing.
const KANBAN_MEASURING = { droppable: { strategy: MeasuringStrategy.Always } };

interface BoardProps extends BoardInterface {
  size: string;
  isDemo?: boolean;
  demoId?: string;
  projectId?: number | null;
  boardUsers?: SharedUser[];
  isReadOnly?: boolean;
  currentUserId?: number;
  qaEnabled?: boolean;
  settingsOpen?: boolean;
  onSettingsClose?: () => void;
  // Merged board-header identity tier (rendered inside BoardTopBar)
  onBack?: () => void;
  backTitle?: string;
  canManage?: boolean;
  showShare?: boolean;
  onOpenSettings?: () => void;
  onOpenShare?: () => void;
  onBoardMetaSaved?: (
    name: string,
    description: string,
    ticketPrefix: string,
  ) => void;
  onDeleteBoard?: () => void;
}

export function Board({
  id,
  name,
  type = "kanban",
  currency = "BRL",
  description,
  ticket_prefix,
  size,
  cards,
  sections: initialSections,
  sprints: initialSprints = [],
  tags: initialTags = [],
  roadmap_config: initialRoadmapConfig = null,
  isDemo = false,
  demoId = "demo",
  projectId = null,
  boardUsers = [],
  isReadOnly = false,
  currentUserId = 0,
  qaEnabled = false,
  settingsOpen = false,
  onSettingsClose,
  onBack,
  backTitle,
  canManage = false,
  showShare = false,
  onOpenSettings,
  onOpenShare,
  onBoardMetaSaved,
  onDeleteBoard,
}: BoardProps) {
  const [cardsProp, setCards] = useState(cards);
  const [sections, setSections] = useState(initialSections);
  const [sprints, setSprints] = useState(initialSprints);
  const [tags, setTags] = useState<TagInterface[]>(initialTags);
  const [roadmapConfig, setRoadmapConfig] = useState(initialRoadmapConfig);
  const [isCardVisible, setIsCardVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardInterface | null>(null);
  const [filterUserId, setFilterUserId] = useState<number | null>(null);
  const [filterTagId, setFilterTagId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCard, setActiveCard] = useState<CardInterface | null>(null);
  const [isToolbarOpen, setIsToolbarOpen] = useState(false);
  const [isStandupOpen, setIsStandupOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [viewMode, setViewMode] = useState<BoardViewMode>("kanban");
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  // Subtasks (child cards) are hidden from the board by default; this toggle reveals them
  // in their own columns. They're fetched + merged once on first enable.
  const [showSubtasks, setShowSubtasks] = useState(false);
  const subtasksLoadedRef = useRef(false);
  // Direction of the view-swap slide: +1 = moving right through the tabs
  // (enter from the right), -1 = moving left. Recomputed only when the view
  // actually changes and frozen in a ref otherwise, so unrelated re-renders
  // can't overwrite --view-vx on the element while its animation is running.
  const prevViewRef = useRef<BoardViewMode>(viewMode);
  const viewDirRef = useRef(1);
  if (prevViewRef.current !== viewMode) {
    viewDirRef.current =
      VIEW_ORDER.indexOf(viewMode) >= VIEW_ORDER.indexOf(prevViewRef.current)
        ? 1
        : -1;
    prevViewRef.current = viewMode;
  }
  const viewDir = viewDirRef.current;
  // Section a newly-created card should default into (used by backlog "+ New" → full editor)
  const [newCardSectionId, setNewCardSectionId] = useState<number | null>(null);

  const storageKey = isDemo ? demoId : String(id);

  const router = useRouter();

  // Sync failure feedback — shown when a server mutation fails and local state was reverted.
  const { syncError, reportSyncError } = useSyncError();

  // Required-loss-reason prompt (YON-66): when the backend blocks a move into the
  // Lost stage for want of a reason, we open this picker and retry with the choice.
  const [lossPrompt, setLossPrompt] = useState<{
    reasons: string[];
    onConfirm: (reason: string) => void;
    onCancel: () => void;
  } | null>(null);

  // Returns true when `e` is a loss-reason gate 422 (and opens the picker), so the
  // caller can skip its generic error handling. `retry` re-runs the move with the
  // chosen reason; `revert` undoes the optimistic change if the user cancels.
  const handleLossGate = useCallback(
    (
      e: unknown,
      retry: (reason: string) => void,
      revert: () => void,
    ): boolean => {
      const reasons = parseLossReasonError(e);
      if (!reasons) return false;
      setLossPrompt({
        reasons,
        onConfirm: (reason) => {
          setLossPrompt(null);
          retry(reason);
        },
        onCancel: () => {
          setLossPrompt(null);
          revert();
        },
      });
      return true;
    },
    [],
  );

  // ── feed the header console: track where the user is + what they're doing ──
  const { setLocation, pushActivity } = useConsole();
  useEffect(() => {
    const v = viewMode === "kanban" ? "BOARD" : viewMode.toUpperCase();
    setLocation(`${name || "BOARD"} / ${v}`);
    return () => setLocation(null);
  }, [name, viewMode, setLocation]);
  useEffect(() => {
    pushActivity(`view: ${viewMode === "kanban" ? "board" : viewMode}`);
  }, [viewMode, pushActivity]);
  useEffect(() => {
    if (selectedCard && isCardVisible)
      pushActivity(`opened “${selectedCard.name ?? "card"}”`);
  }, [selectedCard, isCardVisible, pushActivity]);

  // Board gravity tilt — the board tilts toward wherever the card is being dragged
  const kanbanRef = useRef<HTMLDivElement>(null);
  const lastPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
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
    const x = ((clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((clientY - rect.top) / rect.height - 0.5) * 2;
    el.style.transform = `perspective(1400px) rotateX(${(-y * 1.8).toFixed(2)}deg) rotateY(${(x * 2.2).toFixed(2)}deg)`;
    el.style.transition = "transform 80ms ease-out";
  }, []);

  const resetTilt = useCallback(() => {
    const el = kanbanRef.current;
    if (!el) return;
    el.style.transform = "";
    el.style.transition = `transform 500ms cubic-bezier(0.34,1.56,0.64,1)`;
  }, []);

  // dnd-kit captures the pointer on drag start (setPointerCapture), so onPointerMove
  // on the container stops firing. Listen on window instead while a card is active.
  useEffect(() => {
    if (!activeCard) return;
    const onMove = (e: PointerEvent) => {
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      applyTilt(e.clientX, e.clientY);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [activeCard, applyTilt]);

  // Per-device board preferences (WIP limits, background) + card templates.
  const {
    wipLimits,
    boardBg,
    isBgOpen,
    setIsBgOpen,
    boardTemplates,
    handleSetWipLimit,
    handleSetBg,
  } = useBoardPreferences({ boardId: id, isDemo, demoId, storageKey });

  useEffect(() => {
    setCards(cards);
  }, [cards]);
  useEffect(() => {
    setSections(initialSections);
  }, [initialSections]);
  useEffect(() => {
    setTags(initialTags);
  }, [initialTags]);

  // --- Board chat ---
  const {
    isChatOpen,
    setIsChatOpen,
    chatMessages,
    setChatMessages,
    handleOpenChat,
    handleChatSend,
    handleChatDelete,
  } = useBoardChat({ boardId: id, reportSyncError });

  // --- Real-time ---
  // `isDraggingRef` freezes realtime mutations while a card is being dragged (events are
  // queued); the drag handlers below flip it and replay the queue on drop/cancel.
  const { isDraggingRef, flushPendingBoardEvents } = useBoardRealtime({
    boardId: id,
    isDemo,
    currentUserId,
    setCards,
    setSections,
    setSprints,
    setChatMessages,
  });

  // --- Tag management ---
  const {
    isTagsOpen,
    setIsTagsOpen,
    newTagName,
    setNewTagName,
    newTagColor,
    setNewTagColor,
    handleCreateTag,
    handleDeleteTag,
  } = useBoardTags({
    boardId: id,
    isDemo,
    demoId,
    setTags,
    setCards,
    filterTagId,
    setFilterTagId,
    reportSyncError,
  });

  // --- Backlog ---
  // Backlog tickets are cards parked in a reserved per-board section named "Backlog"
  // (see useBoardBacklog). The backlog section is filtered out of every board view here.
  // Memoized (not just for cost): the per-section card lists below key off these
  // references, which in turn keep the memoized Sections from re-rendering.
  const backlogSection = useMemo(
    () => sections.find((s) => s.name === BACKLOG_NAME) ?? null,
    [sections],
  );
  const boardSections = useMemo(
    () =>
      backlogSection ? sections.filter((s) => s !== backlogSection) : sections,
    [sections, backlogSection],
  );
  const backlogCards = backlogSection
    ? cardsProp.filter(
        (c) =>
          c.section_id === backlogSection.id &&
          (showSubtasks || !c.parent_card_id),
      )
    : [];
  // Subtasks are gated at render (not in state) so realtime can hold them while the
  // toggle is off; flipping the toggle reveals them without a refetch after the first.
  const boardCards = useMemo(() => {
    const base = backlogSection
      ? cardsProp.filter((c) => c.section_id !== backlogSection.id)
      : cardsProp;
    return showSubtasks ? base : base.filter((c) => !c.parent_card_id);
  }, [cardsProp, backlogSection, showSubtasks]);

  // --- Section management ---
  const {
    isAddingSection,
    setIsAddingSection,
    newSectionName,
    setNewSectionName,
    sectionError,
    setSectionError,
    sectionToDelete,
    setSectionToDelete,
    handleRenameSection,
    handleDeleteSection,
    handleAddSection,
  } = useBoardSections({
    boardId: id,
    isDemo,
    demoId,
    sections,
    setSections,
    setCards,
    backlogSection,
    boardSections,
    reportSyncError,
  });

  // --- Card filtering ---

  const matchesFilters = useCallback(
    (card: CardInterface) => {
      if (filterUserId !== null && card.assigned_user_id !== filterUserId)
        return false;
      if (
        filterTagId !== null &&
        !(card.tags ?? []).some((t) => t.id === filterTagId)
      )
        return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (
          !(
            card.name?.toLowerCase().includes(q) ||
            (card.description ?? "").toLowerCase().includes(q)
          )
        )
          return false;
      }
      return true;
    },
    [filterUserId, filterTagId, searchQuery],
  );

  // Scrum boards show only the active sprint on the Board; planning lives in the Backlog.
  const activeSprint = sprints.find((s) => s.status === "active") ?? null;
  const matchesSprint = useCallback(
    (card: CardInterface) => {
      if (type !== "scrum") return true;
      if (!activeSprint) return false;
      return (card.sprint_id ?? null) === activeSprint.id;
    },
    [type, activeSprint],
  );

  // Per-section card lists for the kanban columns. Recomputed when the real inputs
  // change, but a section whose filtered contents came out IDENTICAL keeps its
  // previous array REFERENCE — that, plus the stable callbacks passed below, is
  // what lets React.memo(Section) skip re-rendering every column (and every Card)
  // on each search keystroke or unrelated Board state change.
  const prevSectionCardsRef = useRef(new Map<number, CardInterface[]>());
  const sectionCardsById = useMemo(() => {
    const next = new Map<number, CardInterface[]>();
    for (const section of boardSections) {
      const computed = boardCards
        .filter(
          (card) =>
            card.section_id === section.id &&
            matchesFilters(card) &&
            matchesSprint(card),
        )
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      const prev = prevSectionCardsRef.current.get(section.id);
      const reusable =
        prev !== undefined &&
        prev.length === computed.length &&
        computed.every((card, i) => card === prev[i]);
      next.set(section.id, reusable ? prev : computed);
    }
    prevSectionCardsRef.current = next;
    return next;
  }, [boardSections, boardCards, matchesFilters, matchesSprint]);

  const totalCards = boardCards.length;
  // Total subtasks across the board (epic rollup counts) — drives the toggle's badge so
  // hidden subtasks are discoverable.
  const subtaskTotal = useMemo(
    () => cardsProp.reduce((n, c) => n + (c.subtasks_count ?? 0), 0),
    [cardsProp],
  );
  const doneSection = boardSections.find(
    (s) => s.name?.toLowerCase() === "done",
  );
  const doneCards = doneSection
    ? boardCards.filter((c) => c.section_id === doneSection.id).length
    : 0;

  // CRM: total value of every deal on the board (the headline figure).
  const isCrm = type === "crm";
  const crmTotal = isCrm
    ? boardCards.reduce((sum, c) => sum + toNumber(c.value), 0)
    : 0;

  // The card handed to the open modal, derived LIVE from cards state so realtime
  // merges (card.updated / cards.reordered) flow into it. `selectedCard` is only a
  // frozen snapshot from open time; fall back to it when the card left the board
  // state while open (archived / removed) so the modal doesn't lose its data.
  const liveSelectedCard = selectedCard
    ? (cardsProp.find((c) => c.id === selectedCard.id) ?? selectedCard)
    : null;

  // --- Card modal ↔ URL routing (`?card=<id>` deep links, Back/Forward) ---
  const { openCard, closeCard } = useCardModalRouting({
    cards: cardsProp,
    setSelectedCard,
    setIsCardVisible,
    setNewCardSectionId,
  });

  // Stable identity — handed to every memoized Section (and the other views).
  const handleClick = useCallback(
    (card: CardInterface) => openCard(card),
    [openCard],
  );

  // Persist a manager-edited roadmap flowchart. Optimistically updates local
  // state, then saves to the board (demo boards stay client-only).
  const handleSaveRoadmap = useCallback(
    async (config: RoadmapConfig) => {
      setRoadmapConfig(config);
      if (!isDemo) await updateBoard(id, { roadmap_config: config });
    },
    [id, isDemo],
  );

  // Move a single card to another column from the roadmap drill-in. Appends to
  // the end of the destination column; reuses the board's reorder persistence
  // (incl. the QA quality-gate on Done) and rolls back on failure.
  const handleMoveCard = useCallback(
    (cardId: number | string, toSectionId: number) => {
      const card = cardsProp.find((c) => c.id === cardId);
      if (!card || isReadOnly || card.section_id === toSectionId) return;
      const snapshot = cardsProp;
      const destIsDone = toSectionId === doneSection?.id;
      const destOrdered = cardsProp
        .filter((c) => c.section_id === toSectionId && c.id !== cardId)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      const orderedIds = [...destOrdered.map((c) => c.id), cardId];
      setCards((prev) =>
        prev.map((c) => {
          if (c.id === cardId)
            return {
              ...c,
              section_id: toSectionId,
              position: orderedIds.length - 1,
              done_at: destIsDone
                ? (c.done_at ?? new Date().toISOString())
                : null,
            };
          const idx = orderedIds.indexOf(c.id);
          return idx === -1 ? c : { ...c, position: idx };
        }),
      );
      if (isDemo) {
        demoUpdateCard(demoId, cardId as number, { section_id: toSectionId });
        return;
      }
      reorderCards(id, toSectionId, orderedIds).catch((e) => {
        if (
          handleLossGate(
            e,
            (reason) =>
              reorderCards(id, toSectionId, orderedIds, reason).catch(() => {
                setCards(snapshot);
                reportSyncError("Move failed — change reverted");
              }),
            () => setCards(snapshot),
          )
        )
          return;
        setCards(snapshot);
        if (e instanceof ApiError && e.status === 422) {
          reportSyncError(
            "Quality gate: card has tests that failed or were not run — move to Done blocked",
          );
        } else {
          reportSyncError("Move failed — change reverted");
        }
      });
    },
    [
      cardsProp,
      isReadOnly,
      isDemo,
      demoId,
      id,
      doneSection,
      reportSyncError,
      handleLossGate,
    ],
  );

  // Fetch + merge subtasks once (annotating each with its epic's ticket key for the
  // "↳ epic" chip). Idempotent — rendering is gated by boardCards, not by state.
  const loadSubtasks = useCallback(async () => {
    if (subtasksLoadedRef.current || isDemo) return;
    subtasksLoadedRef.current = true;
    try {
      const board = await fetchBoard(id, undefined, true);
      const all = (board.cards ?? []) as CardInterface[];
      const keyById = new Map(all.map((c) => [c.id, c.ticket_key]));
      const subs = all
        .filter((c) => c.parent_card_id)
        .map((c) => ({
          ...c,
          parent_ticket_key: c.parent_card_id
            ? (keyById.get(c.parent_card_id) ?? null)
            : null,
        }));
      setCards((prev) => {
        const have = new Set(prev.map((c) => c.id));
        return [...prev, ...subs.filter((c) => !have.has(c.id))];
      });
    } catch {
      subtasksLoadedRef.current = false; // let a later attempt retry
    }
  }, [isDemo, id]);

  // Toggle on-board subtasks; load them on first reveal.
  const toggleShowSubtasks = useCallback(() => {
    setShowSubtasks((v) => !v);
    void loadSubtasks();
  }, [loadSubtasks]);

  // Deep-link fallback: a `?card=<id>` that isn't in board state may be a HIDDEN subtask
  // (e.g. a shared subtask link opened cold). Load subtasks + reveal them so the modal
  // routing can resolve it once they merge in.
  useEffect(() => {
    if (isDemo || subtasksLoadedRef.current) return;
    const cardId = Number(
      new URLSearchParams(window.location.search).get("card"),
    );
    if (!cardId || cardsProp.some((c) => c.id === cardId)) return;
    setShowSubtasks(true);
    void loadSubtasks();
  }, [cardsProp, isDemo, loadSubtasks]);

  // Open a subtask as its own card — merge it into board state first so it resolves
  // (and stays live) even when the board toggle is off.
  const handleOpenSubtask = useCallback(
    (subtask: CardInterface) => {
      setCards((prev) =>
        prev.some((c) => c.id === subtask.id) ? prev : [...prev, subtask],
      );
      openCard(subtask);
    },
    [openCard],
  );

  // Open a subtask's parent epic — always a top-level card in board state.
  const handleOpenParent = useCallback(
    (parentId: number) => {
      const parent = cardsProp.find((c) => c.id === parentId);
      if (parent) openCard(parent);
    },
    [cardsProp, openCard],
  );

  // Stable per-section handler for the delete-confirm modal (Section passes its
  // own id/name back, so no per-column closure is needed).
  const handleRequestDeleteSection = useCallback(
    (sectionId: number, sectionName: string) =>
      setSectionToDelete({ id: sectionId, name: sectionName }),
    [setSectionToDelete],
  );

  // --- Backlog + scrum planning handlers ---
  const {
    ensureBacklogSection,
    handleAddToBoard,
    handleSendToBacklog,
    handleQuickCreateBacklog,
    handleAssignSprint,
    handleScrumQuickCreate,
    handleOpenBacklogEditor,
  } = useBoardBacklog({
    boardId: id,
    isDemo,
    demoId,
    isScrum: type === "scrum",
    activeSprintId: activeSprint?.id ?? null,
    cards: cardsProp,
    setCards,
    setSections,
    backlogSection,
    boardSections,
    doneSection,
    closeCard,
    setSelectedCard,
    setIsCardVisible,
    setNewCardSectionId,
    reportSyncError,
  });

  // ── feed the console header (MenuAppBar): MODE keys, WIP faders, quick-add ──
  const { publish: publishHeaderBus, clear: clearHeaderBus } = useHeaderBus();

  // Header quick-add: name-only card into the board's first column.
  const quickCreate = useCallback(
    async (rawName: string) => {
      const cardName = rawName.trim();
      const sectionId = boardSections[0]?.id;
      if (!cardName || !sectionId || isReadOnly) return;
      const saved = isDemo
        ? demoCreateCard(demoId, {
            section_id: sectionId,
            name: cardName,
            description: "",
          })
        : await createCard(id, {
            section_id: sectionId,
            name: cardName,
            description: "",
          });
      setCards((prev) =>
        prev.some((c) => c.id === saved.id) ? prev : [...prev, saved],
      );
      pushActivity(`quick-added “${cardName}”`);
    },
    [boardSections, isDemo, demoId, id, isReadOnly, pushActivity],
  );

  // Header WIP fader click: switch to kanban and scroll that column into view.
  const jumpToSection = useCallback(
    (sectionId: number) => {
      const idx = boardSections.findIndex((s) => s.id === sectionId);
      if (idx < 0) return;
      setViewMode("kanban");
      // Double rAF: the kanban view may only render on the next frame.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const col = kanbanRef.current?.children[idx] as
            | HTMLElement
            | undefined;
          col?.scrollIntoView({
            behavior: "smooth",
            inline: "center",
            block: "nearest",
          });
        }),
      );
    },
    [boardSections],
  );

  useEffect(() => {
    publishHeaderBus({
      boardId: id,
      boardName: name || "Board",
      boardType: type,
      projectId,
      isDemo,
      canWrite: !isReadOnly,
      qaEnabled,
      viewMode,
      setViewMode,
      sections: boardSections.map((s) => ({
        id: s.id,
        name: s.name,
        count: (sectionCardsById.get(s.id) ?? []).length,
      })),
      quickCreate,
      jumpToSection,
    });
    if (!isDemo) localStorage.setItem("yd:lastBoard", String(id));
    return () => clearHeaderBus();
  }, [
    publishHeaderBus,
    clearHeaderBus,
    id,
    name,
    type,
    projectId,
    isDemo,
    isReadOnly,
    qaEnabled,
    viewMode,
    boardSections,
    sectionCardsById,
    quickCreate,
    jumpToSection,
  ]);

  // --- Card management ---

  const handleSubmit = async (card: CardFormData, isNew: boolean) => {
    try {
      if (isNew) {
        const saved = isDemo
          ? demoCreateCard(demoId, {
              section_id: card.section_id,
              name: card.name,
              description: card.description,
              tag_ids: card.tag_ids,
              due_date: card.due_date,
              priority: card.priority,
              value: card.value,
              story_points: card.story_points,
              sprint_id: card.sprint_id,
            })
          : await createCard(id, {
              section_id: card.section_id,
              assigned_user_id: card.assigned_user_id,
              tag_ids: card.tag_ids,
              name: card.name,
              description: card.description,
              due_date: card.due_date,
              priority: card.priority,
              value: card.value,
              story_points: card.story_points,
              sprint_id: card.sprint_id,
              contact: card.contact,
            });
        setCards((prev) =>
          prev.some((c) => c.id === saved.id)
            ? prev.map((c) => (c.id === saved.id ? { ...c, ...saved } : c))
            : [...prev, saved],
        );
      } else {
        const saved = isDemo
          ? demoUpdateCard(demoId, card.id as number, {
              section_id: card.section_id,
              name: card.name,
              description: card.description,
              tag_ids: card.tag_ids,
              due_date: card.due_date,
              priority: card.priority,
              value: card.value,
              story_points: card.story_points,
              sprint_id: card.sprint_id,
            })
          : await updateCard(id, card.id, {
              section_id: card.section_id,
              assigned_user_id: card.assigned_user_id,
              tag_ids: card.tag_ids,
              name: card.name,
              description: card.description,
              due_date: card.due_date,
              priority: card.priority,
              value: card.value,
              story_points: card.story_points,
              sprint_id: card.sprint_id,
              contact: card.contact,
            });
        // demoUpdateCard returns null when the card is gone — keep the row as-is
        // instead of replacing it with a husk that has no id/name.
        setCards((prev) =>
          prev.map((c) =>
            c.id === card.id && saved
              ? { ...saved, checklist_items: card.checklist_items }
              : c,
          ),
        );
      }
    } catch (e) {
      // Moving a CRM deal to the Lost stage needs a reason (YON-66): prompt, then
      // retry the save with the chosen reason.
      if (
        handleLossGate(
          e,
          async (reason) => {
            try {
              const saved = await updateCard(id, card.id, {
                section_id: card.section_id,
                assigned_user_id: card.assigned_user_id,
                tag_ids: card.tag_ids,
                name: card.name,
                description: card.description,
                due_date: card.due_date,
                priority: card.priority,
                value: card.value,
                story_points: card.story_points,
                sprint_id: card.sprint_id,
                contact: card.contact,
                loss_reason: reason,
              });
              setCards((prev) =>
                prev.map((c) =>
                  c.id === card.id && saved
                    ? { ...saved, checklist_items: card.checklist_items }
                    : c,
                ),
              );
              closeCard();
            } catch {
              reportSyncError("Could not save card — try again");
            }
          },
          () => {},
        )
      )
        return;
      // Keep the editor open so nothing the user typed is lost.
      reportSyncError("Could not save card — try again");
      return;
    }
    closeCard();
  };

  // --- Scrum sprint lifecycle ---
  const {
    completingSprint,
    setCompletingSprint,
    reportSprint,
    setReportSprint,
    openReport,
    handleCreateSprint,
    handleUpdateSprintDates,
    handleStartSprint,
    handleDeleteSprint,
    handleCompleteSprint,
  } = useSprints({
    boardId: id,
    isDemo,
    demoId,
    sprints,
    setSprints,
    setCards,
    reportSyncError,
  });

  // --- Activity log + card archive ---
  const { isActivityOpen, setIsActivityOpen, activityLog, handleOpenActivity } =
    useBoardActivity({ boardId: id, isDemo });

  const {
    isArchivedOpen,
    setIsArchivedOpen,
    archivedCards,
    hasMoreArchived,
    loadingMoreArchived,
    handleLoadMoreArchived,
    cardToDelete,
    setCardToDelete,
    handleArchiveCard,
    handleOpenArchived,
    handleRestoreCard,
  } = useBoardArchive({
    boardId: id,
    isDemo,
    demoId,
    setCards,
    closeCard,
    reportSyncError,
  });

  // --- Keyboard shortcuts (Cmd/Ctrl+K, "C" to create) ---
  useBoardHotkeys({
    isReadOnly,
    viewMode,
    isCardVisible,
    isTagsOpen,
    isActivityOpen,
    isArchivedOpen,
    isBgOpen,
    settingsOpen,
    isChatOpen,
    isToolbarOpen,
    isCommandOpen,
    isAddingSection,
    sectionToDelete,
    cardToDelete,
    setIsCommandOpen,
    setNewCardSectionId,
    setIsCardVisible,
  });

  // --- Drag and drop ---
  // Deliberately kept together in Board (not scattered): the collision strategy, the
  // 120ms cross-container damper, and handleDragEnd's ordering branches form one
  // crash-prevention system (dnd-kit #1678 / React #185) with regression e2e coverage.

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 350, tolerance: 5 },
    }),
  );

  // Which section a draggable id belongs to. Container ids look like `section-<id>`;
  // card ids look like `draggable-<cardId>` and resolve to that card's current section.
  const findSectionIdOfItem = (rawId: string): number | null => {
    if (rawId.startsWith("section-"))
      return Number(rawId.slice("section-".length));
    const cardId = Number(rawId.split("-")[1]);
    return cardsProp.find((c) => c.id === cardId)?.section_id ?? null;
  };

  // Pointer-anchored collision detection (dnd-kit's official MultipleContainers strategy).
  // closestCorners compares RECTS, and our onDragOver relocates the dragged card, shifting
  // those rects — so the "closest" target could flip A↔B every frame and loop React past
  // its nested-update limit (error #185, black screen). The pointer's position is immune
  // to layout shifts, so anchoring on pointerWithin kills the oscillation at the source.
  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      // STRICTLY pointer-driven with a sticky fallback (dnd-kit #1678). Column x-positions
      // never change during a drag, so a pointer-only `over` cannot flip between columns on
      // its own. Falling back to rect intersection mid-drag would reintroduce the loop: our
      // relocation shifts rects, the rect-winner flips A↔B, and onDragOver cascades setState
      // past React's update limit. So rects may only decide when we have NO pointer hit yet.
      const pointerIntersections = pointerWithin(args);
      const intersections =
        pointerIntersections.length > 0
          ? pointerIntersections
          : lastOverIdRef.current == null
            ? rectIntersection(args)
            : [];
      let overId = getFirstCollision(intersections, "id");

      if (overId != null) {
        if (String(overId).startsWith("section-")) {
          // Hit a column body: snap to the closest card inside it (if it has any), so
          // insertion lands next to a card instead of always at the column level.
          const sectionId = Number(String(overId).slice("section-".length));
          const containerCardIds = new Set(
            cardsProp
              .filter((c) => c.section_id === sectionId)
              .map((c) => `draggable-${c.id}`),
          );
          if (containerCardIds.size > 0) {
            const closest = closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter((c) =>
                containerCardIds.has(String(c.id)),
              ),
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
    },
    [cardsProp],
  );

  // Release the "just moved" latch one frame after the cards state settles.
  useEffect(() => {
    requestAnimationFrame(() => {
      recentlyMovedToNewContainerRef.current = false;
    });
  }, [cardsProp]);

  function handleDragStart(event: DragStartEvent) {
    const cardId = Number(String(event.active.id).split("-")[1]);
    isDraggingRef.current = true; // freeze realtime mutations for the duration of the drag
    dragStartCardsRef.current = cardsProp; // pre-drag snapshot for rollback on a failed reorder
    lastOverIdRef.current = null;
    lastCrossMoveAtRef.current = 0;
    setActiveCard(cardsProp.find((c) => c.id === cardId) ?? null);
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
    const activeCardId = Number(activeRawId.split("-")[1]);
    const fromSection = findSectionIdOfItem(activeRawId);
    const toSection = findSectionIdOfItem(overRawId);
    if (fromSection == null || toSection == null || fromSection === toSection)
      return;

    // Hard damper (belt & suspenders for dnd-kit #1678): relocate the dragged card across
    // containers at most once per 120ms. React #185 requires dozens of setStates cascading
    // in ONE synchronous task — a time gate makes that physically impossible, no matter
    // how the collision layer misbehaves. Worst case is a brief gap flicker, never a crash.
    const now = Date.now();
    if (now - lastCrossMoveAtRef.current < 120) return;
    lastCrossMoveAtRef.current = now;

    recentlyMovedToNewContainerRef.current = true; // stabilise collisions while layout settles
    setCards((prev) => {
      const activeNow = prev.find((c) => c.id === activeCardId);
      if (!activeNow || activeNow.section_id === toSection) return prev; // already moved → no-op
      let newPosition: number;
      if (overRawId.startsWith("section-")) {
        newPosition =
          Math.max(
            -1,
            ...prev
              .filter((c) => c.section_id === toSection)
              .map((c) => c.position ?? 0),
          ) + 1;
      } else {
        const overCard = prev.find(
          (c) => c.id === Number(overRawId.split("-")[1]),
        );
        newPosition = (overCard?.position ?? 0) - 0.5;
      }
      return prev.map((c) =>
        c.id === activeCardId
          ? { ...c, section_id: toSection, position: newPosition }
          : c,
      );
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
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: -1,
            background: boardBg,
          }}
        />
      )}

      {/* Sync failure toast */}
      {syncError && (
        <div
          role="alert"
          className="glass-panel cf-mono fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 text-xs uppercase tracking-widest font-bold flex items-center gap-2"
          style={{ color: "var(--cf-red)", borderColor: "var(--cf-red)" }}
        >
          <Icon icon={faTriangleExclamation} /> {syncError}
        </div>
      )}

      {/* Top bar: search + shortcuts */}
      <BoardTopBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isCrm={isCrm}
        crmTotal={crmTotal}
        currency={currency}
        totalCards={totalCards}
        doneCards={doneCards}
        viewMode={viewMode}
        qaEnabled={qaEnabled}
        showSubtasks={showSubtasks}
        subtaskTotal={subtaskTotal}
        onToggleSubtasks={toggleShowSubtasks}
        onSelectView={(key) => {
          if (key === "backlog" && type !== "scrum")
            ensureBacklogSection().catch(() => {});
          setViewMode(key);
        }}
        onOpenCommand={() => setIsCommandOpen(true)}
        boardName={name}
        boardType={type}
        memberCount={boardUsers.length}
        backTitle={backTitle}
        onBack={() => onBack?.()}
        canManage={canManage}
        showShare={showShare}
        onOpenSettings={onOpenSettings}
        onOpenShare={onOpenShare}
        onExport={
          isDemo
            ? undefined
            : () => router.push(`/dashboard/export?board=${id}`)
        }
      />

      {/* Due date banner — always visible when there are overdue/due-today cards */}
      <DueDateBanner
        cards={boardCards}
        sections={boardSections}
        onCardClick={handleClick}
      />

      {/* Filter strip — kanban + list + backlog */}
      {(viewMode === "kanban" ||
        viewMode === "list" ||
        viewMode === "backlog") && (
        <BoardFilterStrip
          boardUsers={boardUsers}
          tags={tags}
          filterUserId={filterUserId}
          filterTagId={filterTagId}
          setFilterUserId={setFilterUserId}
          setFilterTagId={setFilterTagId}
        />
      )}

      {/* View body — keyed by viewMode so each switch replays an entrance animation.
          Outer clip stops the horizontal slide from spilling a page scrollbar. */}
      <div className="view-swap-clip">
        <div
          key={viewMode}
          className="view-swap"
          style={{ "--view-vx": `${viewDir * 44}px` } as React.CSSProperties}
        >
          {/* Calendar view */}
          {viewMode === "calendar" && (
            <CalendarView
              cards={boardCards}
              sections={boardSections}
              onCardClick={handleClick}
            />
          )}

          {/* Analytics view */}
          {viewMode === "analytics" && (
            <AnalyticsView cards={boardCards} sections={boardSections} />
          )}

          {/* Roadmap — flowchart of the workflow, per-column steps + card progress */}
          {viewMode === "roadmap" && (
            <RoadmapView
              sections={boardSections}
              cards={boardCards}
              config={roadmapConfig}
              canEdit={!isReadOnly}
              onSave={handleSaveRoadmap}
              onCardClick={handleClick}
              onMoveCard={isReadOnly ? undefined : handleMoveCard}
              onMoveToSprint={
                isReadOnly
                  ? undefined
                  : (cardId, sprintId) =>
                      handleAssignSprint(cardId as number, sprintId)
              }
              boardType={type}
              sprints={sprints}
              currency={currency}
            />
          )}

          {/* QA — test-plan overview (cross-card suites) */}
          {viewMode === "plans" && qaEnabled && (
            <TestPlansOverview
              boardId={id}
              onCaseClick={(cardId) => {
                const c = boardCards.find((x) => x.id === cardId);
                if (c) handleClick(c);
              }}
            />
          )}

          {/* List view */}
          {viewMode === "list" && (
            <ListView
              cards={boardCards.filter(matchesFilters)}
              sections={boardSections}
              users={boardUsers}
              onCardClick={handleClick}
              boardType={type}
              currency={currency}
            />
          )}

          {/* Backlog view — Scrum: sprint planning; other board types: reserved-section parking lot */}
          {viewMode === "backlog" &&
            (type === "scrum" ? (
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
                onOpenReport={openReport}
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
          {type === "scrum" &&
            (viewMode === "kanban" || viewMode === "list") &&
            activeSprint && (
              <SprintStatusBar
                sprint={activeSprint}
                sections={boardSections}
                sprintCards={boardCards.filter(
                  (c) => c.sprint_id === activeSprint.id,
                )}
                canManage={!isReadOnly}
                onComplete={setCompletingSprint}
                onOpenReport={openReport}
              />
            )}

          {/* Scrum: no active sprint → prompt to plan one in the Backlog */}
          {type === "scrum" && viewMode === "kanban" && !activeSprint && (
            <div className="glass-panel flex flex-col items-center gap-3 text-center px-6 py-14 rounded-2xl">
              <Icon
                icon={faLayerGroup}
                style={{ fontSize: 28, color: "var(--cf-text-muted)" }}
              />
              <p
                className="cf-mono uppercase tracking-widest font-bold"
                style={{ fontSize: "13px", color: "var(--cf-text)" }}
              >
                No active sprint
              </p>
              <p
                className="cf-mono"
                style={{ fontSize: "11px", color: "var(--cf-text-muted)" }}
              >
                Plan and start a sprint from the Backlog to begin.
              </p>
              <button
                onClick={() => setViewMode("backlog")}
                className="aero-btn aero-btn--cyan text-[10px] uppercase tracking-widest font-bold px-4 py-2 cursor-pointer inline-flex items-center gap-1.5"
              >
                <Icon icon={faLayerGroup} style={{ fontSize: "9px" }} /> Go to
                Backlog
              </button>
            </div>
          )}

          {viewMode === "kanban" && !(type === "scrum" && !activeSprint) && (
            <DndContext
              sensors={sensors}
              collisionDetection={collisionDetectionStrategy}
              measuring={KANBAN_MEASURING}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <div
                ref={kanbanRef}
                className="flex gap-5 items-start overflow-x-auto pb-4"
                style={{
                  transformOrigin: "center center",
                  willChange: "transform",
                }}
              >
                {boardSections.map((section, i) => (
                  <Section
                    key={section.id}
                    handleClick={handleClick}
                    cards={sectionCardsById.get(section.id) ?? []}
                    id={section.id}
                    name={section.name}
                    color={SECTION_COLORS[i % SECTION_COLORS.length]}
                    parent={null}
                    onDelete={
                      isReadOnly ? undefined : handleRequestDeleteSection
                    }
                    onRename={isReadOnly ? undefined : handleRenameSection}
                    wipLimit={wipLimits[section.id] ?? null}
                    onSetWipLimit={isReadOnly ? undefined : handleSetWipLimit}
                    boardType={type}
                    currency={currency}
                    agingHours={section.aging_hours ?? null}
                  />
                ))}

                {!isReadOnly && (
                  <AddSectionColumn
                    isAddingSection={isAddingSection}
                    setIsAddingSection={setIsAddingSection}
                    newSectionName={newSectionName}
                    setNewSectionName={setNewSectionName}
                    sectionError={sectionError}
                    setSectionError={setSectionError}
                    onAddSection={handleAddSection}
                  />
                )}
              </div>

              <DragOverlay dropAnimation={null}>
                {activeCard ? (
                  <div
                    style={{
                      transform: "rotate(4deg) skewX(-1.5deg)",
                      opacity: 0.97,
                      filter:
                        "drop-shadow(0 18px 28px rgba(0,0,0,0.65)) drop-shadow(0 6px 10px rgba(0,0,0,0.4))",
                      transition: "none",
                    }}
                  >
                    <Card
                      {...activeCard}
                      overlay
                      boardType={type}
                      currency={currency}
                      color={
                        SECTION_COLORS[
                          sections.findIndex(
                            (s) => s.id === activeCard.section_id,
                          ) % SECTION_COLORS.length
                        ] ?? SECTION_COLORS[0]
                      }
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </div>

      {/* FAB */}
      {!isReadOnly && (
        <button
          onClick={() => {
            setNewCardSectionId(null);
            setIsCardVisible(true);
          }}
          style={{
            background:
              "linear-gradient(to bottom, #3a3730 0%, #2b2a26 50%, #1c1a16 100%)",
            border: "1px solid var(--cf-edge)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.08), 0 0 16px rgba(154,166,126,0.45), 0 8px 22px rgba(0,0,0,0.55)",
            color: "var(--cf-phosphor)",
            textShadow: "0 0 8px rgba(154,166,126,0.6)",
          }}
          className="fab-physical fixed bottom-16 lg:bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center cursor-pointer text-2xl font-bold z-40"
          title="Add ticket"
        >
          <span
            className="cf-led absolute top-2 right-2"
            style={{
              background: "var(--cf-phosphor)",
              boxShadow: "0 0 6px var(--cf-phosphor)",
            }}
          />
          <Icon icon={faPlus} />
        </button>
      )}

      {/* Tool launchers: desktop toolbar + mobile bottom drawer */}
      <BoardToolsDock
        viewMode={viewMode}
        isDemo={isDemo}
        isToolbarOpen={isToolbarOpen}
        setIsToolbarOpen={setIsToolbarOpen}
        onOpenTags={() => setIsTagsOpen(true)}
        onOpenActivity={handleOpenActivity}
        onOpenChat={handleOpenChat}
        onOpenArchived={handleOpenArchived}
        onOpenBackground={() => setIsBgOpen(true)}
        onOpenStandup={() => setIsStandupOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
      />

      {/* JSON card importer (YON-121). On success the modal closes and onImported
          merges the new cards + any tags created on demand into board state. */}
      {isImportOpen && (
        <CardImportModal
          boardId={id}
          sectionNames={sections.map((s) => s.name)}
          projectId={projectId}
          onClose={() => setIsImportOpen(false)}
          onImported={(result) => {
            // Merge the created cards locally (deduped by id) rather than waiting
            // on the realtime channel, so they're present the instant the modal
            // closes. The realtime card.created also dedupes, so no double-add.
            setCards((prev) => {
              const known = new Set(prev.map((c) => c.id));
              const fresh = result.created.filter((c) => !known.has(c.id));
              return fresh.length ? [...prev, ...fresh] : prev;
            });
            // Tags created on demand during import aren't on the board's tag list
            // yet, so a freshly imported card would show no chips until reload.
            // Merge any new ones (by id) so they render immediately.
            setTags((prev) => {
              const known = new Set(prev.map((t) => t.id));
              const added: TagInterface[] = [];
              for (const card of result.created) {
                for (const tag of card.tags ?? []) {
                  if (!known.has(tag.id)) {
                    known.add(tag.id);
                    added.push(tag);
                  }
                }
              }
              return added.length ? [...prev, ...added] : prev;
            });
          }}
        />
      )}

      {/* AI standup / sprint summary modal */}
      {isStandupOpen && (
        <BoardStandupModal
          boardId={id}
          onClose={() => setIsStandupOpen(false)}
        />
      )}

      {/* Tags modal */}
      {isTagsOpen && (
        <TagsManagerModal
          tags={tags}
          isReadOnly={isReadOnly}
          newTagName={newTagName}
          setNewTagName={setNewTagName}
          newTagColor={newTagColor}
          setNewTagColor={setNewTagColor}
          onCreateTag={handleCreateTag}
          onDeleteTag={handleDeleteTag}
          onClose={() => setIsTagsOpen(false)}
        />
      )}

      {/* Activity modal */}
      {isActivityOpen && (
        <ActivityLogModal
          entries={activityLog}
          onClose={() => setIsActivityOpen(false)}
        />
      )}

      {/* Archived cards modal */}
      {isArchivedOpen && (
        <ArchivedCardsModal
          cards={archivedCards}
          hasMore={hasMoreArchived}
          loadingMore={loadingMoreArchived}
          onLoadMore={handleLoadMoreArchived}
          onRestore={handleRestoreCard}
          onClose={() => setIsArchivedOpen(false)}
        />
      )}

      {/* Background picker modal */}
      {isBgOpen && (
        <BackgroundPickerModal
          boardBg={boardBg}
          onSelect={handleSetBg}
          onClose={() => setIsBgOpen(false)}
        />
      )}

      {/* Board settings modal (unified: board meta + section order + delete) */}
      {settingsOpen && !isReadOnly && (
        <Modal onClose={() => onSettingsClose?.()}>
          <BoardSettings
            boardId={id}
            isDemo={isDemo}
            demoId={demoId}
            name={name}
            description={description ?? ""}
            ticketPrefix={ticket_prefix ?? ""}
            sections={boardSections}
            onMetaSaved={(n, d, prefix) => {
              // Reflow every card's key immediately so the new prefix shows without a refetch.
              setCards((prev) =>
                prev.map((c) =>
                  c.ticket_number == null
                    ? c
                    : {
                        ...c,
                        ticket_key: prefix
                          ? `${prefix}-${c.ticket_number}`
                          : `#${c.ticket_number}`,
                      },
                ),
              );
              onBoardMetaSaved?.(n, d, prefix);
            }}
            onSectionsReordered={(reordered: SectionData[]) =>
              setSections(
                backlogSection ? [...reordered, backlogSection] : reordered,
              )
            }
            onDelete={() => {
              onSettingsClose?.();
              onDeleteBoard?.();
            }}
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
        <DeleteSectionModal
          sectionName={sectionToDelete.name}
          onCancel={() => setSectionToDelete(null)}
          onConfirm={handleDeleteSection}
        />
      )}

      {/* Archive card confirm modal */}
      {cardToDelete && (
        <ArchiveCardModal
          cardName={cardToDelete.name}
          onCancel={() => setCardToDelete(null)}
          onConfirm={handleArchiveCard}
        />
      )}

      {/* Command palette */}
      {isCommandOpen && (
        <CommandPalette
          cards={boardCards}
          sections={boardSections}
          onSelect={(card) => {
            setIsCommandOpen(false);
            handleClick(card);
          }}
          onClose={() => setIsCommandOpen(false)}
        />
      )}

      {/* Card edit modal */}
      {isCardVisible && (
        <Modal mobileFullscreen onClose={closeCard}>
          <div className="w-full sm:w-auto">
            {/* Keyed by card identity: switching cards (popstate/forward-nav) REMOUNTS
                the editor, so its mount-only init effects seed the right card's form
                instead of card A's form silently saving over card B. */}
            <CardWorkspace
              key={selectedCard?.id ?? "new"}
              currentUserId={currentUserId}
              qaEnabled={qaEnabled}
              onOpenSubtask={handleOpenSubtask}
              onOpenParent={handleOpenParent}
              card={liveSelectedCard}
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
              isBacklogCard={
                type === "scrum"
                  ? (liveSelectedCard?.sprint_id ?? null) === null
                  : !!backlogSection &&
                    liveSelectedCard?.section_id === backlogSection.id
              }
              onAddToBoard={
                liveSelectedCard
                  ? () => handleAddToBoard(liveSelectedCard)
                  : undefined
              }
              backlogSectionId={backlogSection?.id}
              onSendToBacklog={
                liveSelectedCard
                  ? () => handleSendToBacklog(liveSelectedCard)
                  : undefined
              }
              goBack={closeCard}
              submit={handleSubmit}
              onDocumentsChange={
                liveSelectedCard
                  ? (documents) => {
                      const cardId = liveSelectedCard.id;
                      setCards((prev) =>
                        prev.map((c) =>
                          c.id === cardId ? { ...c, documents } : c,
                        ),
                      );
                      setSelectedCard((prev) =>
                        prev && prev.id === cardId
                          ? { ...prev, documents }
                          : prev,
                      );
                    }
                  : undefined
              }
              onDelete={
                liveSelectedCard && !isReadOnly
                  ? () => {
                      setCardToDelete(liveSelectedCard);
                      closeCard();
                    }
                  : undefined
              }
            />
          </div>
        </Modal>
      )}

      {/* Complete sprint dialog */}
      {completingSprint && (
        <Modal onClose={() => setCompletingSprint(null)}>
          <CompleteSprintModal
            sprint={completingSprint}
            cards={boardCards.filter(
              (c) => c.sprint_id === completingSprint.id,
            )}
            futureSprints={sprints.filter((s) => s.status === "future")}
            onConfirm={handleCompleteSprint}
            onClose={() => setCompletingSprint(null)}
          />
        </Modal>
      )}

      {/* Required loss reason when a deal enters the Lost stage (YON-66) */}
      {lossPrompt && (
        <LossReasonModal
          reasons={lossPrompt.reasons}
          onConfirm={lossPrompt.onConfirm}
          onCancel={lossPrompt.onCancel}
        />
      )}

      {/* Sprint report */}
      {reportSprint && (
        <Modal mobileFullscreen onClose={() => setReportSprint(null)}>
          <SprintReport
            boardId={id}
            sprint={reportSprint}
            sprints={sprints}
            cards={cardsProp.filter((c) => c.sprint_id === reportSprint.id)}
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
      if (!over) {
        if (dragStartCardsRef.current) setCards(dragStartCardsRef.current);
        return;
      }

      playDrop();
      hapticDrop();
      triggerInkSplash(lastPointerRef.current.x, lastPointerRef.current.y);

      const activeCardId = Number(String(active.id).split("-")[1]);
      const activeCard = cardsProp.find((c) => c.id === activeCardId);
      const overRawId = String(over.id);
      const destSection = findSectionIdOfItem(overRawId);
      if (!activeCard || destSection == null) return;

      const overIsContainer = overRawId.startsWith("section-");
      const overCardId = overIsContainer
        ? null
        : Number(overRawId.split("-")[1]);
      const byPosition = (a: CardInterface, b: CardInterface) =>
        (a.position ?? 0) - (b.position ?? 0);

      // Branch on the PRE-DRAG section, not the current one: handleDragOver may have
      // already relocated the card into destSection during the drag, which would make a
      // cross-column move look like a same-column no-op and skip persistence entirely.
      const originalSection =
        (dragStartCardsRef.current ?? cardsProp).find(
          (c) => c.id === activeCardId,
        )?.section_id ?? activeCard.section_id;

      // Build the destination section's final ordered card ids.
      let orderedIds: (number | string)[];
      if (originalSection === destSection) {
        // True same-column reorder: the card was never relocated, so arrayMove the
        // current order from old→new slot. A genuine no-op (same slot) skips persistence.
        const ordered = cardsProp
          .filter((c) => c.section_id === destSection)
          .sort(byPosition);
        const oldIndex = ordered.findIndex((c) => c.id === activeCardId);
        let newIndex = overIsContainer
          ? ordered.length - 1
          : ordered.findIndex((c) => c.id === overCardId);
        if (oldIndex === -1) return;
        if (newIndex === -1) newIndex = ordered.length - 1;
        if (oldIndex === newIndex) return; // dropped back in place → nothing to persist
        orderedIds = arrayMove(ordered, oldIndex, newIndex).map((c) => c.id);
      } else if (activeCard.section_id === destSection) {
        // Cross-column, and handleDragOver already placed the card in destSection at the
        // drop spot → the current sorted order IS the final order. Always persists.
        orderedIds = cardsProp
          .filter((c) => c.section_id === destSection)
          .sort(byPosition)
          .map((c) => c.id);
      } else {
        // Cross-column with no live preview (e.g. a quick flick): insert the card at the
        // hovered card's slot (or the end).
        const destCards = cardsProp
          .filter((c) => c.section_id === destSection && c.id !== activeCardId)
          .sort(byPosition);
        let insertIndex = overIsContainer
          ? destCards.length
          : destCards.findIndex((c) => c.id === overCardId);
        if (insertIndex === -1) insertIndex = destCards.length;
        orderedIds = destCards.map((c) => c.id);
        orderedIds.splice(insertIndex, 0, activeCardId);
      }

      // Commit normalised integer positions (and the new section) locally.
      const snapshot = dragStartCardsRef.current ?? cardsProp; // pre-drag state for rollback
      const destIsDone = destSection === doneSection?.id;
      setCards((prev) =>
        prev.map((c) => {
          const idx = orderedIds.indexOf(c.id);
          if (idx === -1) return c;
          const next = { ...c, section_id: destSection, position: idx };
          // Keep done_at in sync locally so sprint metrics / the complete dialog stay
          // accurate without a refetch (the backend applies the same rule on reorder).
          if (c.id === activeCardId)
            next.done_at = destIsDone
              ? (c.done_at ?? new Date().toISOString())
              : null;
          return next;
        }),
      );

      if (isDemo) {
        demoUpdateCard(demoId, activeCardId, { section_id: destSection });
        return;
      }
      reorderCards(id, destSection, orderedIds).catch((e) => {
        if (
          handleLossGate(
            e,
            (reason) =>
              reorderCards(id, destSection, orderedIds, reason).catch(() => {
                setCards(snapshot);
                reportSyncError("Move failed — change reverted");
              }),
            () => setCards(snapshot),
          )
        )
          return;
        setCards(snapshot);
        if (e instanceof ApiError && e.status === 422) {
          reportSyncError(
            "Quality gate: card has tests that failed or were not run — move to Done blocked",
          );
        } else {
          reportSyncError("Reorder failed — change reverted");
        }
      });
    } finally {
      // Drag is over: unfreeze and replay any realtime events that arrived meanwhile.
      isDraggingRef.current = false;
      flushPendingBoardEvents();
    }
  }
}
