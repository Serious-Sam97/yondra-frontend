"use client";

import {
  faArrowRightToBracket,
  faCheck,
  faLayerGroup,
  faLink,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChecklistSection } from "@/components/ui/card-edit/ChecklistSection";
import { CommentsSection } from "@/components/ui/card-edit/CommentsSection";
import { Lightbox } from "@/components/ui/card-edit/Lightbox";
import { PaymentsSection } from "@/components/ui/card-edit/PaymentsSection";
import { PropertiesPanel } from "@/components/ui/card-edit/PropertiesPanel";
import { SubtasksSection } from "@/components/ui/card-edit/SubtasksSection";
import { WhatsAppSection } from "@/components/ui/card-edit/WhatsAppSection";
import { CardAiPanel } from "@/components/ui/CardAiPanel";
import Icon from "@/components/ui/Icon";
import RichTextEditor from "@/components/ui/RichTextEditor";
import { useCardAttachments } from "@/hooks/useCardAttachments";
import { useCardChecklist } from "@/hooks/useCardChecklist";
import { useCardComments } from "@/hooks/useCardComments";
import { type Subtask, useCardSubtasks } from "@/hooks/useCardSubtasks";
import { useCardLinks } from "@/hooks/useCardLinks";
import { type Template, useCardTemplates } from "@/hooks/useCardTemplates";
import { useWhatsappThread } from "@/hooks/useWhatsappThread";
import type {
  CardDocument,
  CardInterface,
  ChecklistItem,
} from "@/interfaces/CardInterface";
import type { TagInterface } from "@/interfaces/TagInterface";
import {
  currencySymbol,
  formatMoneyInput,
  parseMoneyInput,
} from "@/lib/currency";

interface BoardUser {
  id: number;
  name: string;
}

// Re-exported so existing importers (e.g. useBoardPreferences) keep working.
export type { Template };

// Payload handed to `submit` when the editor is saved.
export interface CardFormData {
  id: number | string;
  name: string;
  description: string;
  section_id: number;
  assigned_user_id: number | null;
  tag_ids: number[];
  due_date: string | null;
  priority: "low" | "medium" | "high" | null;
  checklist_items: ChecklistItem[];
  value: number | null;
  story_points: number | null;
  sprint_id: number | null;
  // CRM contact upsert payload (null on non-CRM boards — leaves contact untouched).
  contact: { name: string; email: string; phone: string } | null;
}

export interface CardEditProps {
  goBack: () => void;
  submit: (card: CardFormData, isNew: boolean) => void;
  onDelete?: () => void;
  // Sync document-attachment changes back to the board's card state so they
  // survive a modal close/reopen without relying on the realtime echo.
  onDocumentsChange?: (documents: CardDocument[]) => void;
  card: CardInterface | null;
  sections: { id: number; name: string }[];
  users?: BoardUser[];
  tags?: TagInterface[];
  boardId?: number;
  isDemo?: boolean;
  demoId?: string;
  isReadOnly?: boolean;
  initialTemplates?: Template[];
  defaultSectionId?: number;
  isBacklogCard?: boolean;
  onAddToBoard?: () => void;
  backlogSectionId?: number;
  onSendToBacklog?: () => void;
  // Board type drives which extra fields show: crm → deal value, scrum → points/sprint.
  boardType?: "kanban" | "scrum" | "crm";
  currency?: string;
  sprints?: { id: number; name: string; is_active: boolean }[];
  // When provided (Scrum, saved card), a top-level "Card / Planning Poker" switch
  // appears and this node replaces the card body on the Planning tab.
  planningTab?: React.ReactNode;
  planningCount?: number;
  // An apply *event* from Planning Poker (a new object per apply) — mirrors the
  // committed estimate into the points field without stomping manual edits.
  planningApplied?: { value: number | null; at: string } | null;
  // Sentinel (QA) tab — a node replacing the card body, plus the rollup status LED colour.
  qaTab?: React.ReactNode;
  qaStatusColor?: string | null;
  // Who is looking — drives "mine" state on comment reactions and own-comment
  // actions. 0 (default) disables those affordances (e.g. demo mode).
  currentUserId?: number;
  // Open a subtask as its own card. Provided by the board (merges the subtask into
  // board state so it resolves even when hidden); falls back to a deep-link push.
  onOpenSubtask?: (subtask: CardInterface) => void;
  // Open this subtask's parent epic card (resolved from board state by id).
  onOpenParent?: (parentId: number) => void;
}

const CardEdit: React.FC<CardEditProps> = ({
  goBack,
  submit,
  onDelete,
  onDocumentsChange,
  card,
  sections,
  users = [],
  tags = [],
  boardId,
  isDemo = false,
  demoId = "demo",
  isReadOnly = false,
  initialTemplates = [],
  defaultSectionId,
  isBacklogCard = false,
  onAddToBoard,
  backlogSectionId,
  onSendToBacklog,
  boardType = "kanban",
  currency = "BRL",
  sprints = [],
  planningTab,
  planningCount = 0,
  planningApplied = null,
  qaTab,
  qaStatusColor,
  currentUserId = 0,
  onOpenSubtask,
  onOpenParent,
}) => {
  const router = useRouter();
  const [id, setId] = useState<number | string>(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sectionId, setSectionId] = useState<number>(
    defaultSectionId ?? sections[0]?.id ?? 1,
  );
  const [assignedUserId, setAssignedUserId] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | null>(
    null,
  );
  // CRM deal value + scrum estimate/sprint (empty string = unset).
  const [value, setValue] = useState("");
  // CRM contact (client/lead) fields.
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [storyPoints, setStoryPoints] = useState("");
  const [sprintId, setSprintId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<
    "details" | "checklist" | "subtasks" | "comments" | "whatsapp"
  >("details");
  // Top-level switch between the card, Planning Poker, and Sentinel (QA).
  const [topTab, setTopTab] = useState<"card" | "planning" | "qa">("card");
  // Desktop worklog: Checklist + Subtasks + Payments are collapsible, starting minimized.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    checklist: true,
    subtasks: true,
    payments: true,
  });

  // Unsaved-changes flag — lights the LED on the header Save button. Set by any
  // edit to a field that only persists via Save; cleared on submit. Checklist,
  // comments, links and docs save through their own API calls, so they don't
  // touch it.
  const [dirty, setDirty] = useState(false);
  function dirtify<T>(setter: (v: T) => void): (v: T) => void {
    return (v) => {
      setDirty(true);
      setter(v);
    };
  }

  // When Planning Poker applies an estimate (an actual apply action, not just any
  // snapshot refresh), mirror it into the points field.
  useEffect(() => {
    if (planningApplied && planningApplied.value != null) {
      setStoryPoints(String(planningApplied.value));
      setDirty(true);
    }
  }, [planningApplied]);
  // Action failure feedback — shown when a checklist/comment mutation fails.
  const [actionError, setActionError] = useState<string | null>(null);
  const actionErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reportActionError = (message: string) => {
    setActionError(message);
    if (actionErrorTimer.current) clearTimeout(actionErrorTimer.current);
    actionErrorTimer.current = setTimeout(() => setActionError(null), 4000);
  };
  useEffect(
    () => () => {
      if (actionErrorTimer.current) clearTimeout(actionErrorTimer.current);
    },
    [],
  );

  // --- Per-feature state clusters (custom hooks, called unconditionally) ---

  const {
    checklistItems,
    setChecklistItems,
    newChecklistText,
    setNewChecklistText,
    handleAddChecklistItem,
    addItems: addChecklistItems,
    handleToggleItem,
    handleDeleteItem,
    doneCount,
  } = useCardChecklist({
    isNew: card === null,
    isDemo,
    demoId,
    boardId,
    id,
    reportActionError,
  });

  // "Mark done" on a subtask moves it to the board's done column. Match the backend's
  // fallback (a "Done"-named column) — correct for default boards; custom done columns
  // degrade to the legacy is_done flag (still counted in the rollup).
  const doneSectionId = sections.find(
    (s) => s.name.trim().toLowerCase() === "done",
  )?.id;

  const {
    subtasks,
    newSubtaskName,
    setNewSubtaskName,
    loadingSubtasks,
    handleAddSubtask,
    handleMarkDone,
    isSubtaskDone,
    doneSubtasks,
    aiBreakdown,
    aiBreaking,
    aiRationale,
    aiError: subtaskAiError,
    canAiBreakdown,
  } = useCardSubtasks({
    isNew: card === null,
    isDemo,
    demoId,
    boardId,
    card,
    id,
    doneSectionId,
    reportActionError,
  });

  // Open a subtask as its own card — prefer the board-provided handler (it merges the
  // full subtask into board state so it resolves even while hidden); else deep-link.
  // Runtime subtasks come from the API as full cards, so the cast is safe. Stamp the
  // epic's ticket key so the opened subtask can label its own "part of …" back-link.
  const openSubtask = (s: Subtask) => {
    const enriched = {
      ...s,
      parent_ticket_key: card?.ticket_key,
    } as unknown as CardInterface;
    if (onOpenSubtask) onOpenSubtask(enriched);
    else if (boardId) router.push(`/boards/${boardId}?card=${s.id}`);
  };

  // Open this subtask's parent epic card.
  const openParent = (parentId: number) => {
    if (onOpenParent) onOpenParent(parentId);
    else if (boardId) router.push(`/boards/${boardId}?card=${parentId}`);
  };

  const {
    links,
    setLinks,
    newLinkUrl,
    setNewLinkUrl,
    linkBusy,
    linkError,
    canUseLinks,
    handleAddLink,
    handleRefreshLink,
    handleDeleteLink,
  } = useCardLinks({ isNew: card === null, isDemo, boardId, card });

  const {
    documents,
    setDocuments,
    docBusy,
    docError,
    docInputRef,
    canUseDocs,
    handleUploadDoc,
    handleDeleteDoc,
    handleDownloadDoc,
    lightboxSrc,
    setLightboxSrc,
    uploadImage,
  } = useCardAttachments({
    isNew: card === null,
    isDemo,
    boardId,
    card,
    onDocumentsChange,
    reportActionError,
  });

  const {
    comments,
    newComment,
    setNewComment,
    loadingComments,
    hasOlderComments,
    loadingOlderComments,
    handleLoadOlderComments,
    editingCommentId,
    editingCommentBody,
    setEditingCommentBody,
    savingComment,
    handleAddComment,
    startEditComment,
    cancelEditComment,
    handleUpdateComment,
    handleDeleteComment,
    threads,
    toggleThread,
    loadMoreReplies,
    addReply,
    toggleReaction,
    flashIds,
    gifsEnabled,
  } = useCardComments({
    isNew: card === null,
    isDemo,
    boardId,
    card,
    id,
    currentUserId,
    currentUserName: users.find((u) => u.id === currentUserId)?.name ?? "You",
    reportActionError,
  });

  const {
    templates,
    showTemplatePicker,
    setShowTemplatePicker,
    templateNameInput,
    setTemplateNameInput,
    showSaveTemplate,
    setShowSaveTemplate,
    handleSaveTemplate,
    handleApplyTemplate,
    handleDeleteTemplate,
  } = useCardTemplates({
    isDemo,
    demoId,
    boardId,
    initialTemplates,
    description,
    selectedTagIds,
    priority,
    dueDate,
    // Applying a template edits savable fields, so it must light the dirty LED.
    setDescription: dirtify(setDescription),
    setSelectedTagIds: dirtify(setSelectedTagIds),
    setPriority: dirtify(setPriority),
    setDueDate: dirtify(setDueDate),
  });

  const {
    waThread,
    newWaReply,
    setNewWaReply,
    waSending,
    waError,
    handleSendWaReply,
  } = useWhatsappThread({ isNew: card === null, isDemo, boardId, card, id });

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0 });
  const [linkCopied, setLinkCopied] = useState(false);

  const isNew = card === null;

  // Per-card share link. The board page reads `?card=<id>` on load and opens exactly
  // this card (see Board.tsx deep-link effect), so this URL drops the recipient straight
  // onto the card. Only offered for saved, non-demo cards; sharing the link doesn't grant
  // board access — the recipient still needs it, same as a board link.
  const canShareLink = !isNew && !isDemo && !!boardId && !!id;

  const handleCopyLink = () => {
    if (!canShareLink) return;
    const url = `${window.location.origin}/boards/${boardId}?card=${id}`;
    navigator.clipboard
      ?.writeText(url)
      .then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 1500);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (card !== null) {
      setId(card.id);
      setName(card.name);
      setDescription(card.description ?? "");
      setSectionId(card.section_id);
      setAssignedUserId(card.assigned_user_id ?? null);
      setSelectedTagIds((card.tags ?? []).map((t: TagInterface) => t.id));
      setDueDate(card.due_date ?? "");
      setPriority(card.priority ?? null);
      setChecklistItems(card.checklist_items ?? []);
      setLinks(card.links ?? []);
      setDocuments(card.documents ?? []);
      setValue(formatMoneyInput(card.value));
      setContactName(card.contact?.name ?? "");
      setContactEmail(card.contact?.email ?? "");
      setContactPhone(card.contact?.phone ?? "");
      setStoryPoints(
        card.story_points != null ? String(card.story_points) : "",
      );
      setSprintId(card.sprint_id ?? null);
    } else if (boardType === "scrum") {
      // New scrum cards default into the active sprint, if one exists.
      setSprintId(sprints.find((s) => s.is_active)?.id ?? null);
    }
  }, []);

  const toggleTag = (tagId: number) => {
    if (isReadOnly) return;
    setDirty(true);
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((i) => i !== tagId) : [...prev, tagId],
    );
  };

  const handleSubmit = () => {
    if (isReadOnly) return;
    submit(
      {
        id,
        name,
        description,
        section_id: sectionId,
        assigned_user_id: assignedUserId,
        tag_ids: selectedTagIds,
        due_date: dueDate || null,
        priority: priority ?? null,
        checklist_items: checklistItems,
        value: parseMoneyInput(value),
        story_points: storyPoints.trim() === "" ? null : Number(storyPoints),
        sprint_id: sprintId,
        // Only CRM boards surface the contact fields; elsewhere leave contact untouched.
        contact:
          boardType === "crm"
            ? {
                name: contactName.trim(),
                email: contactEmail.trim(),
                phone: contactPhone.trim(),
              }
            : null,
      },
      isNew,
    );
    setDirty(false);
  };

  // Subtasks are one level deep: a card that is itself a subtask shows no subtasks surface.
  const isSubtask = !!card?.parent_card_id;
  const allTabs: Array<
    "details" | "checklist" | "subtasks" | "comments" | "whatsapp"
  > = isNew
    ? []
    : waThread
      ? ["details", "checklist", "subtasks", "comments", "whatsapp"]
      : ["details", "checklist", "subtasks", "comments"];
  const tabs = allTabs.filter((t) => t !== "subtasks" || !isSubtask);

  // Measure tab button positions for sliding indicator
  useEffect(() => {
    const idx = tabs.indexOf(activeTab);
    const btn = tabRefs.current[idx];
    if (btn) setTabIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
  }, [activeTab, tabs.length]);

  // Desktop (≥1024) = two-pane worklog; below = tabbed (mobile). Single-render via matchMedia.
  const [isDesktop, setIsDesktop] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", sync);
    window.addEventListener("resize", sync); // fallback for envs where 'change' doesn't fire
    return () => {
      mq.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  // Tint the whole modal with the first tag's colour (live as tags toggle), like board cards.
  const activeTag = tags.find((t) => selectedTagIds.includes(t.id));
  const tagColor = activeTag?.color ?? null;
  const tagTintStyle: React.CSSProperties = tagColor
    ? {
        background: `linear-gradient(to bottom, color-mix(in srgb, ${tagColor} 22%, #2c2a24), color-mix(in srgb, ${tagColor} 12%, #1d1b17))`,
        borderColor: `color-mix(in srgb, ${tagColor} 45%, var(--cf-edge))`,
        boxShadow: `0 16px 40px rgba(0,0,0,0.6), 0 0 34px ${tagColor}22, inset 0 1px 0 var(--cf-edge-lit)`,
      }
    : {};

  // Big hero title
  const renderTitle = () => (
    <div className="flex flex-col gap-1 flex-shrink-0">
      {/* Subtask → quick link back to its epic card */}
      {isSubtask && card?.parent_card_id && (
        <button
          type="button"
          onClick={() => openParent(card.parent_card_id as number)}
          title="Open the epic card"
          className="cf-mono self-start inline-flex items-center gap-1 rounded px-2 py-0.5 mx-1 transition-[filter] hover:brightness-125"
          style={{
            fontSize: "10px",
            letterSpacing: "0.04em",
            color: "var(--cf-phosphor)",
            background:
              "color-mix(in srgb, var(--cf-phosphor) 12%, transparent)",
            border:
              "1px solid color-mix(in srgb, var(--cf-phosphor) 40%, transparent)",
          }}
        >
          ↳ Part of {card.parent_ticket_key ?? "epic"}
        </button>
      )}
      <textarea
        ref={titleRef}
        autoFocus={isNew || !isDesktop}
        placeholder="What needs to be done?"
        rows={2}
        disabled={isReadOnly}
        style={{ color: "var(--cf-text)", caretColor: "var(--cf-phosphor)" }}
        className="w-full bg-transparent text-2xl lg:text-[28px] font-bold placeholder-white/25 focus:outline-none resize-none leading-tight disabled:opacity-70 flex-shrink-0 px-1 pt-1"
        value={name}
        onChange={(e) => {
          setDirty(true);
          setName(e.target.value);
          titleRef.current?.animate(
            [{ filter: "blur(1.4px)" }, { filter: "blur(0)" }],
            { duration: 90, easing: "ease-out" },
          );
        }}
      />
    </div>
  );

  // Roomy description — the main writing surface, on a recessed LCD screen.
  // The toolbar fades in on hover/focus (see .cf-screen-editor in globals.css).
  const renderDescription = () => (
    <div className="cf-screen-editor">
      <RichTextEditor
        value={description}
        onChange={dirtify(setDescription)}
        editable={!isReadOnly}
        placeholder="Add a description — notes, context, images…"
        onUploadImage={isDemo ? undefined : uploadImage}
      />
    </div>
  );

  // AI assist for the description area — summary/describe/checklist/tests/rewrite. A
  // read-only assist available on any saved card once a live backend exists (hidden for
  // new/demo cards, and dark server-side without a provider key). Description-producing
  // actions apply straight into the editor.
  const aiPanel =
    !isNew && !isDemo && !!boardId && !!id ? (
      <CardAiPanel
        boardId={boardId}
        cardId={id}
        currentText={description}
        readOnly={isReadOnly}
        onApplyDescription={dirtify(setDescription)}
        onAddChecklist={addChecklistItems}
      />
    ) : null;

  // Header status readouts — the card's state at a glance, cockpit style.
  const readout = (label: string, val: string, accent?: string) => (
    <div key={label} className="flex flex-col leading-tight">
      <span
        className="cf-mono uppercase"
        style={{
          fontSize: "8px",
          letterSpacing: "0.22em",
          color: "var(--cf-text-dim)",
        }}
      >
        {label}
      </span>
      <span
        className="cf-mono uppercase tabular-nums whitespace-nowrap"
        style={{
          fontSize: "11px",
          letterSpacing: "0.08em",
          color: accent ?? "var(--cf-cream)",
        }}
      >
        {val}
      </span>
    </div>
  );

  const sectionName = sections.find((s) => s.id === sectionId)?.name ?? "—";
  const dueReadout = dueDate
    ? new Date(`${dueDate}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "—";
  const sprintName =
    sprintId != null
      ? (sprints.find((s) => s.id === sprintId)?.name ?? "—")
      : "Backlog";

  // Metadata as a clean property list (sidebar on desktop, stacked on mobile)
  const propertiesPanel = (
    <PropertiesPanel
      isReadOnly={isReadOnly}
      sections={sections}
      backlogSectionId={backlogSectionId}
      sectionId={sectionId}
      setSectionId={dirtify(setSectionId)}
      boardId={boardId}
      cardId={!isNew && !isDemo ? id : undefined}
      priority={priority}
      setPriority={dirtify(setPriority)}
      dueDate={dueDate}
      setDueDate={dirtify(setDueDate)}
      boardType={boardType}
      currency={currency}
      value={value}
      setValue={dirtify(setValue)}
      contactName={contactName}
      setContactName={dirtify(setContactName)}
      contactEmail={contactEmail}
      setContactEmail={dirtify(setContactEmail)}
      contactPhone={contactPhone}
      setContactPhone={dirtify(setContactPhone)}
      storyPoints={storyPoints}
      setStoryPoints={dirtify(setStoryPoints)}
      sprintId={sprintId}
      setSprintId={dirtify(setSprintId)}
      sprints={sprints}
      canUseLinks={canUseLinks}
      links={links}
      newLinkUrl={newLinkUrl}
      setNewLinkUrl={setNewLinkUrl}
      linkBusy={linkBusy}
      linkError={linkError}
      handleAddLink={handleAddLink}
      handleRefreshLink={handleRefreshLink}
      handleDeleteLink={handleDeleteLink}
      canUseDocs={canUseDocs}
      documents={documents}
      docBusy={docBusy}
      docError={docError}
      docInputRef={docInputRef}
      handleUploadDoc={handleUploadDoc}
      handleDeleteDoc={handleDeleteDoc}
      handleDownloadDoc={handleDownloadDoc}
      users={users}
      assignedUserId={assignedUserId}
      setAssignedUserId={dirtify(setAssignedUserId)}
      tags={tags}
      selectedTagIds={selectedTagIds}
      toggleTag={toggleTag}
      templates={templates}
      showTemplatePicker={showTemplatePicker}
      setShowTemplatePicker={setShowTemplatePicker}
      templateNameInput={templateNameInput}
      setTemplateNameInput={setTemplateNameInput}
      showSaveTemplate={showSaveTemplate}
      setShowSaveTemplate={setShowSaveTemplate}
      handleSaveTemplate={handleSaveTemplate}
      handleApplyTemplate={handleApplyTemplate}
      handleDeleteTemplate={handleDeleteTemplate}
    />
  );

  const renderSave = () =>
    !isReadOnly ? (
      <button
        onClick={handleSubmit}
        style={{
          fontFamily: "monospace",
          letterSpacing: "0.1em",
          fontSize: "11px",
        }}
        className="aero-btn aero-btn--cyan w-full py-2.5 font-bold uppercase cursor-pointer flex-shrink-0"
      >
        {isNew ? "Pin it" : "Save changes"}
      </button>
    ) : null;

  // Per-feature sections (presentational; state + handlers come from the hooks
  // above). Built once per render and reused by both the desktop worklog and the
  // mobile tabs so props stay in one place.
  const checklistSection = (
    <ChecklistSection
      checklistItems={checklistItems}
      newChecklistText={newChecklistText}
      setNewChecklistText={setNewChecklistText}
      handleAddChecklistItem={handleAddChecklistItem}
      handleToggleItem={handleToggleItem}
      handleDeleteItem={handleDeleteItem}
      doneCount={doneCount}
      isReadOnly={isReadOnly}
    />
  );

  const subtasksSection = (
    <SubtasksSection
      subtasks={subtasks}
      loadingSubtasks={loadingSubtasks}
      newSubtaskName={newSubtaskName}
      setNewSubtaskName={setNewSubtaskName}
      handleAddSubtask={handleAddSubtask}
      handleMarkDone={handleMarkDone}
      isSubtaskDone={isSubtaskDone}
      doneSubtasks={doneSubtasks}
      isReadOnly={isReadOnly}
      onOpenSubtask={openSubtask}
      aiBreakdown={aiBreakdown}
      aiBreaking={aiBreaking}
      aiRationale={aiRationale}
      aiError={subtaskAiError}
      canAiBreakdown={canAiBreakdown}
    />
  );

  const commentsSection = (
    <CommentsSection
      isDemo={isDemo}
      users={users}
      comments={comments}
      loadingComments={loadingComments}
      hasOlderComments={hasOlderComments}
      loadingOlderComments={loadingOlderComments}
      handleLoadOlderComments={handleLoadOlderComments}
      newComment={newComment}
      setNewComment={setNewComment}
      handleAddComment={handleAddComment}
      editingCommentId={editingCommentId}
      editingCommentBody={editingCommentBody}
      setEditingCommentBody={setEditingCommentBody}
      savingComment={savingComment}
      startEditComment={startEditComment}
      cancelEditComment={cancelEditComment}
      handleUpdateComment={handleUpdateComment}
      handleDeleteComment={handleDeleteComment}
      uploadImage={uploadImage}
      currentUserId={currentUserId}
      threads={threads}
      toggleThread={toggleThread}
      loadMoreReplies={loadMoreReplies}
      addReply={addReply}
      toggleReaction={toggleReaction}
      flashIds={flashIds}
      gifsEnabled={gifsEnabled}
    />
  );

  const whatsappSection = (
    <WhatsAppSection
      waThread={waThread}
      newWaReply={newWaReply}
      setNewWaReply={setNewWaReply}
      waSending={waSending}
      waError={waError}
      handleSendWaReply={handleSendWaReply}
      boardId={boardId}
      cardId={!isNew && !isDemo ? id : undefined}
    />
  );

  // Clean section header used by the work sections and the chat pane
  const workHeader = (label: string, chip: string | null) => (
    <div className="flex items-center gap-2 mb-2">
      <span
        className="cf-led"
        style={{
          width: 6,
          height: 6,
          background: "var(--cf-phosphor)",
          boxShadow: "0 0 6px var(--cf-phosphor)",
        }}
      />
      <span
        className="cf-label uppercase tracking-widest font-bold"
        style={{ fontSize: "10px", color: "var(--cf-text)" }}
      >
        {label}
      </span>
      {chip && (
        <span
          className="cf-mono ml-auto"
          style={{ fontSize: "10px", color: "var(--cf-text-muted)" }}
        >
          {chip}
        </span>
      )}
    </div>
  );

  // A collapsible work section: clicking the header toggles it. Starts minimized.
  const collapsibleSection = (
    key: string,
    label: string,
    chip: string | null,
    content: React.ReactNode,
  ) => {
    const open = !collapsed[key];
    return (
      <>
        <button
          type="button"
          onClick={() => setCollapsed((c) => ({ ...c, [key]: !c[key] }))}
          aria-expanded={open}
          className="flex items-center gap-2 mb-2 w-full text-left cursor-pointer"
        >
          <span
            className="cf-led"
            style={{
              width: 6,
              height: 6,
              background: "var(--cf-phosphor)",
              boxShadow: "0 0 6px var(--cf-phosphor)",
            }}
          />
          <span
            className="cf-label uppercase tracking-widest font-bold"
            style={{ fontSize: "10px", color: "var(--cf-text)" }}
          >
            {label}
          </span>
          {chip && (
            <span
              className="cf-mono"
              style={{ fontSize: "10px", color: "var(--cf-text-muted)" }}
            >
              {chip}
            </span>
          )}
          <span
            aria-hidden
            className="ml-auto"
            style={{
              fontSize: "9px",
              color: "var(--cf-text-muted)",
              transform: open ? "rotate(90deg)" : "none",
              transition: "transform 150ms ease",
            }}
          >
            ▸
          </span>
        </button>
        {/* grid-rows 0fr→1fr animates the reveal to natural height; content
            stays mounted so closing animates too. inert keeps the collapsed
            content out of the tab order. */}
        <div
          style={{
            display: "grid",
            gridTemplateRows: open ? "1fr" : "0fr",
            transition: "grid-template-rows 260ms ease",
          }}
        >
          <div
            inert={!open}
            style={{
              overflow: "hidden",
              minHeight: 0,
              opacity: open ? 1 : 0,
              transform: open ? "translateY(0)" : "translateY(-6px)",
              transition: "opacity 200ms ease, transform 260ms ease",
            }}
          >
            {content}
          </div>
        </div>
      </>
    );
  };

  // Work sections stacked in the main column (desktop).
  const renderWork = () => (
    <div className="flex flex-col gap-6">
      <div>
        {collapsibleSection(
          "checklist",
          "Checklist",
          checklistItems.length
            ? `${doneCount}/${checklistItems.length}`
            : null,
          checklistSection,
        )}
      </div>
      {!isSubtask && (
        <div
          className="border-t pt-6"
          style={{ borderColor: "var(--cf-edge)" }}
        >
          {collapsibleSection(
            "subtasks",
            "Subtasks",
            subtasks.length ? `${doneSubtasks}/${subtasks.length}` : null,
            subtasksSection,
          )}
        </div>
      )}
      {waThread && (
        <div
          className="border-t pt-6"
          style={{ borderColor: "var(--cf-edge)" }}
        >
          {workHeader("WhatsApp", String(waThread.messages.length))}
          {whatsappSection}
        </div>
      )}
      {/* Payments ledger + milestone automations (YON-63) — CRM, saved cards only. */}
      {boardType === "crm" && !isDemo && boardId && card?.id != null && (
        <div
          className="border-t pt-6"
          style={{ borderColor: "var(--cf-edge)" }}
        >
          {collapsibleSection(
            "payments",
            "Payments",
            null,
            <PaymentsSection
              boardId={boardId}
              cardId={Number(card.id)}
              currency={currency ?? "BRL"}
              isReadOnly={isReadOnly}
            />,
          )}
        </div>
      )}
      <div className="border-t pt-6" style={{ borderColor: "var(--cf-edge)" }}>
        {workHeader(
          "Comments",
          comments.length ? String(comments.length) : null,
        )}
        {commentsSection}
      </div>
    </div>
  );

  return (
    <div
      style={tagTintStyle}
      className="aero-menu flex flex-col w-full min-h-[100svh] sm:min-h-0 sm:w-[95vw] sm:max-w-[520px] sm:h-auto sm:max-h-[90vh] lg:max-w-[1360px] lg:h-[85vh] lg:max-h-[85vh] relative transition-[background,border-color,box-shadow] duration-300"
      onClick={(e) => {
        // Clicking any inline rich-text image opens it full size.
        const t = e.target as HTMLElement;
        if (t.tagName === "IMG" && t.closest(".rich-content")) {
          setLightboxSrc(
            (t as HTMLImageElement).currentSrc || (t as HTMLImageElement).src,
          );
        }
      }}
    >
      {/* Full-size image viewer */}
      {lightboxSrc && (
        <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}

      {/* Glue strip — identity, status readouts, actions, save */}
      <div
        style={{ borderColor: "var(--cf-edge)" }}
        className="h-9 lg:h-12 w-full flex items-center justify-between px-4 flex-shrink-0 border-b"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="cf-led"
            style={{
              background: "var(--cf-phosphor)",
              boxShadow: "0 0 6px var(--cf-phosphor)",
            }}
          />
          <span
            className="chrome-text"
            style={{
              fontFamily: "monospace",
              fontSize: "11px",
              letterSpacing: "0.15em",
            }}
          >
            {isNew
              ? "NEW"
              : (card?.ticket_key ?? `#${String(id).padStart(4, "0")}`)}
          </span>
          {!isNew && card?.created_at && (
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "10px",
                color: "var(--cf-text-muted)",
              }}
            >
              ·{" "}
              {new Date(card.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
          {isReadOnly && (
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "9px",
                letterSpacing: "0.1em",
                color: "var(--cf-amber)",
              }}
            >
              · READ ONLY
            </span>
          )}
          {/* Status readouts (desktop, saved cards) */}
          {!isNew && (
            <div
              className="hidden lg:flex items-center gap-5 ml-3 pl-4 border-l overflow-hidden"
              style={{ borderColor: "var(--cf-edge)" }}
            >
              {readout(
                boardType === "crm" ? "Stage" : "Column",
                sectionName,
                "var(--cf-amber)",
              )}
              {boardType !== "scrum" &&
                readout(
                  "Priority",
                  priority ?? "—",
                  priority ? undefined : "var(--cf-text-dim)",
                )}
              {boardType === "scrum" &&
                readout(
                  "Points",
                  storyPoints || "—",
                  storyPoints ? undefined : "var(--cf-text-dim)",
                )}
              {boardType === "scrum" && readout("Sprint", sprintName)}
              {readout(
                "Due",
                dueReadout,
                dueDate ? undefined : "var(--cf-text-dim)",
              )}
              {boardType === "crm" &&
                readout(
                  "Value",
                  value ? `${currencySymbol(currency)} ${value}` : "—",
                  value ? undefined : "var(--cf-text-dim)",
                )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!isNew && isBacklogCard && !isReadOnly && onAddToBoard && (
            <button
              onClick={onAddToBoard}
              className="aero-btn aero-btn--cyan cf-mono text-[9px] uppercase tracking-widest font-bold px-2.5 py-1 cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap"
              title="Move this ticket onto the board (To Do)"
            >
              <Icon icon={faArrowRightToBracket} /> Add to Board
            </button>
          )}
          {!isNew && !isBacklogCard && !isReadOnly && onSendToBacklog && (
            <button
              onClick={onSendToBacklog}
              className="aero-btn aero-btn--ghost cf-mono text-[9px] uppercase tracking-widest font-bold px-2.5 py-1 cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap"
              title="Move this card back to the backlog"
            >
              <Icon icon={faLayerGroup} /> Send to Backlog
            </button>
          )}
          {canShareLink && (
            <button
              onClick={handleCopyLink}
              className="aero-btn aero-btn--ghost cf-mono text-[9px] uppercase tracking-widest font-bold px-2.5 py-1 cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap"
              title="Copy a direct link to this card"
              style={linkCopied ? { color: "var(--cf-phosphor)" } : undefined}
            >
              <Icon icon={linkCopied ? faCheck : faLink} />
              {linkCopied ? "Copied" : "Copy Link"}
            </button>
          )}
          {/* Save lives here on desktop (footer removed); the LED lights amber
              while there are unsaved changes. Mobile keeps its inline save.
              Gated on isDesktop because .aero-btn's display beats Tailwind's
              `hidden` in the cascade. */}
          {!isNew && !isReadOnly && isDesktop && (
            <button
              onClick={handleSubmit}
              className="aero-btn aero-btn--cyan cf-mono text-[10px] uppercase tracking-widest font-bold px-4 py-1.5 cursor-pointer inline-flex items-center gap-2 whitespace-nowrap"
              title={dirty ? "You have unsaved changes" : "All changes saved"}
            >
              <span
                className="cf-led"
                style={{
                  width: 6,
                  height: 6,
                  background: dirty ? "var(--cf-amber)" : "var(--cf-edge)",
                  boxShadow: dirty ? "0 0 6px var(--cf-amber)" : "none",
                }}
              />
              Save Changes
            </button>
          )}
          {!isNew && !isReadOnly && onDelete && (
            <button
              onClick={onDelete}
              style={{ color: "var(--cf-red)" }}
              className="text-xs hover:opacity-60 cursor-pointer transition-opacity"
              title="Archive card"
            >
              <Icon icon={faTrash} />
            </button>
          )}
          <button
            onClick={goBack}
            className="text-sm cursor-pointer transition-colors leading-none"
            style={{ color: "var(--cf-text-muted)" }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Top-level Card / Planning Poker / Sentinel switch (saved cards) */}
      {(planningTab || qaTab) && (
        <div
          className="relative flex border-b px-4 pt-2 gap-4 flex-shrink-0"
          style={{ borderColor: "var(--cf-edge)" }}
        >
          {[
            {
              key: "card" as const,
              label: "Card",
              show: true,
              led: undefined as string | undefined,
              badge: 0,
            },
            {
              key: "planning" as const,
              label: "Planning Poker",
              show: !!planningTab,
              led: undefined,
              badge: planningCount,
            },
            {
              key: "qa" as const,
              label: "Sentinel · QA",
              show: !!qaTab,
              led: qaStatusColor ?? undefined,
              badge: 0,
            },
          ]
            .filter((t) => t.show)
            .map((t) => {
              const on = topTab === t.key;
              const activeColor = t.led ?? "var(--cf-phosphor)";
              return (
                <button
                  key={t.key}
                  onClick={() => setTopTab(t.key)}
                  style={{
                    color: on ? "var(--cf-text)" : "var(--cf-text-muted)",
                    fontSize: "10px",
                  }}
                  className="cf-mono uppercase tracking-widest font-bold pb-2 cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <span
                    className="cf-led"
                    style={{
                      width: 6,
                      height: 6,
                      background:
                        t.led ?? (on ? "var(--cf-phosphor)" : "var(--cf-edge)"),
                      boxShadow:
                        t.led || on ? `0 0 6px ${activeColor}` : "none",
                    }}
                  />
                  {t.label}
                  {t.badge > 0 && (
                    <span
                      className="cf-mono px-1.5 rounded-sm"
                      style={{
                        background: "#1c1a16",
                        color: "var(--cf-phosphor)",
                        fontSize: "10px",
                      }}
                    >
                      {t.badge}
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      )}

      {topTab === "planning" && planningTab ? (
        <div className="sm:flex-1 sm:overflow-y-auto min-h-0">
          {planningTab}
        </div>
      ) : topTab === "qa" && qaTab ? (
        <div className="sm:flex-1 sm:overflow-y-auto min-h-0">{qaTab}</div>
      ) : (
        <>
          {/* Tabs (existing cards, mobile only — desktop uses the two-pane worklog) */}
          {!isNew && !isDesktop && (
            <div
              className="relative flex border-b px-4 pt-2 gap-4 flex-shrink-0"
              style={{ borderColor: "var(--cf-edge)" }}
            >
              {tabs.map((tab, i) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    ref={(el) => {
                      tabRefs.current[i] = el;
                    }}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      color: isActive
                        ? "var(--cf-phosphor)"
                        : "var(--cf-text-muted)",
                      fontSize: "10px",
                    }}
                    className="cf-mono uppercase tracking-widest font-bold pb-2 cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <span
                      className="cf-led"
                      style={{
                        width: 6,
                        height: 6,
                        background: isActive
                          ? "var(--cf-phosphor)"
                          : "var(--cf-edge)",
                        boxShadow: isActive
                          ? "0 0 6px var(--cf-phosphor)"
                          : "none",
                      }}
                    />
                    {tab === "checklist" && checklistItems.length > 0
                      ? `checklist ${doneCount}/${checklistItems.length}`
                      : tab === "subtasks" && subtasks.length > 0
                        ? `subtasks ${doneSubtasks}/${subtasks.length}`
                        : tab === "comments" && comments.length > 0
                          ? `comments ${comments.length}`
                          : tab === "whatsapp" && waThread
                            ? `whatsapp ${waThread.messages.length}`
                            : tab}
                  </button>
                );
              })}
              {/* Sliding indicator — springs between tabs */}
              <div
                style={{
                  position: "absolute",
                  bottom: -1,
                  left: tabIndicator.left,
                  width: tabIndicator.width,
                  height: 2,
                  backgroundColor: "var(--cf-phosphor)",
                  borderRadius: 1,
                  boxShadow: "0 0 8px var(--cf-phosphor)",
                  transition:
                    "left 240ms cubic-bezier(0.34,1.56,0.64,1), width 240ms cubic-bezier(0.34,1.56,0.64,1)",
                }}
              />
            </div>
          )}

          {/* Action failure notice */}
          {actionError && (
            <p
              role="alert"
              className="cf-mono text-xs font-bold uppercase tracking-widest px-6 pt-3"
              style={{ color: "var(--cf-red)" }}
            >
              {actionError}
            </p>
          )}

          {/* Body */}
          {isDesktop && !isNew ? (
            /* Desktop: document (title + description + work) on the left at a
               readable measure, properties rail on the right. Save is in the
               header — no footer. */
            <div className="flex flex-1 min-h-0">
              <div className="flex-1 min-w-0 overflow-y-auto px-8 pt-6 pb-10">
                <div className="max-w-[720px] mx-auto flex flex-col gap-5">
                  {renderTitle()}
                  {renderDescription()}
                  {aiPanel}
                  <div
                    className="border-t mt-1 pt-6"
                    style={{ borderColor: "var(--cf-edge)" }}
                  >
                    {renderWork()}
                  </div>
                </div>
              </div>
              <div
                className="w-[300px] flex-shrink-0 overflow-y-auto border-l px-5 py-2"
                style={{
                  borderColor: "var(--cf-edge)",
                  background: "rgba(0,0,0,0.15)",
                }}
              >
                {propertiesPanel}
              </div>
            </div>
          ) : (
            /* Mobile & new: single column; details tab holds title + description + properties + save */
            <div className="flex flex-col sm:flex-1 px-6 pt-4 pb-6 gap-4 sm:overflow-y-auto">
              {(isNew || activeTab === "details") && (
                <>
                  {renderTitle()}
                  {renderDescription()}
                  {aiPanel}
                  {propertiesPanel}
                  {renderSave()}
                </>
              )}
              {!isNew && activeTab === "checklist" && checklistSection}
              {!isNew && activeTab === "subtasks" && subtasksSection}
              {!isNew && activeTab === "comments" && commentsSection}
              {!isNew && activeTab === "whatsapp" && whatsappSection}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CardEdit;
