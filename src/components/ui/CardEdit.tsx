"use client";

import { faGithub } from "@fortawesome/free-brands-svg-icons";
import {
  faArrowRightToBracket,
  faLayerGroup,
  faPlus,
  faRotate,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import RichTextContent from "@/components/ui/RichTextContent";
import RichTextEditor from "@/components/ui/RichTextEditor";
import type {
  CardInterface,
  CardLink,
  ChecklistItem,
} from "@/interfaces/CardInterface";
import type { TagInterface } from "@/interfaces/TagInterface";
import {
  addCardLink,
  createChecklistItem,
  createComment,
  createSubtask,
  createTemplate,
  deleteCardLink,
  deleteChecklistItem,
  deleteComment,
  deleteTemplate,
  getComments,
  getSubtasks,
  getTemplates,
  refreshCardLink,
  updateChecklistItem,
  updateSubtask,
  uploadInlineImage,
} from "@/lib/api";
import {
  deleteDemoTemplate,
  demoCreateChecklistItem,
  demoCreateSubtask,
  demoDeleteChecklistItem,
  demoGetSubtasks,
  demoToggleSubtask,
  demoUpdateChecklistItem,
  loadDemoTemplates,
  saveDemoTemplate,
} from "@/lib/demoStorage";
import { hapticDone } from "@/lib/haptics";
import { playComplete } from "@/lib/sound";
import { FIBONACCI } from "@/lib/estimation";
import {
  currencySymbol,
  formatMoneyInput,
  maskMoneyInput,
  parseMoneyInput,
} from "@/lib/currency";

interface BoardUser {
  id: number;
  name: string;
}

interface Comment {
  id: number;
  body: string;
  user: { id: number; name: string };
  created_at: string;
}

interface Subtask {
  id: number;
  name: string;
  is_done: boolean;
}

export interface Template {
  id: number;
  name: string;
  template_data: unknown;
}

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
}

export interface CardEditProps {
  goBack: () => void;
  submit: (card: CardFormData, isNew: boolean) => void;
  onDelete?: () => void;
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
  // Story-point value the team applied in Planning Poker; syncs the points field.
  planningAppliedValue?: number | null;
  // Sentinel (QA) tab — a node replacing the card body, plus the rollup status LED colour.
  qaTab?: React.ReactNode;
  qaStatusColor?: string | null;
}

const SECTION_COLORS: Record<string, string> = {
  "To Do": "#4CAF50",
  "In Progress": "#FF9800",
  Done: "#1976D2",
};
const DEFAULT_COLORS = [
  "#4CAF50",
  "#FF9800",
  "#1976D2",
  "#F44336",
  "#7B1FA2",
  "#FFC107",
];
const AVATAR_COLORS = [
  "#4CAF50",
  "#FF9800",
  "#1976D2",
  "#F44336",
  "#7B1FA2",
  "#FFC107",
  "#00BCD4",
  "#E91E63",
];
const PRIORITY_OPTS: {
  value: "low" | "medium" | "high";
  label: string;
  color: string;
}[] = [
  { value: "low", label: "Low", color: "#9aa67e" },
  { value: "medium", label: "Medium", color: "#ffb000" },
  { value: "high", label: "High", color: "#ff5a4d" },
];

function getSectionColor(name: string, index: number): string {
  return SECTION_COLORS[name] ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

// GitHub PR/issue state → badge colour + label.
const LINK_STATE_META: Record<string, { color: string; label: string }> = {
  open: { color: "#9aa67e", label: "Open" },
  merged: { color: "#a78bfa", label: "Merged" },
  closed: { color: "#ff5a4d", label: "Closed" },
  draft: { color: "#6f6a5c", label: "Draft" },
};
const CHECKS_COLOR: Record<string, string> = {
  success: "#9aa67e",
  failure: "#ff5a4d",
  pending: "#ffb000",
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const CardEdit: React.FC<CardEditProps> = ({
  goBack,
  submit,
  onDelete,
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
  planningAppliedValue = null,
  qaTab,
  qaStatusColor,
}) => {
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
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState("");
  // CRM deal value + scrum estimate/sprint (empty string = unset).
  const [value, setValue] = useState("");
  const [storyPoints, setStoryPoints] = useState("");
  const [sprintId, setSprintId] = useState<number | null>(null);
  const [links, setLinks] = useState<CardLink[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskName, setNewSubtaskName] = useState("");
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);
  const [templates, setTemplates] = useState<Template[]>(initialTemplates);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "details" | "checklist" | "comments" | "subtasks"
  >("details");
  // Top-level switch between the card, Planning Poker, and Sentinel (QA).
  const [topTab, setTopTab] = useState<"card" | "planning" | "qa">("card");

  // When Planning Poker applies an estimate, mirror it into the points field.
  useEffect(() => {
    if (planningAppliedValue != null) setStoryPoints(String(planningAppliedValue));
  }, [planningAppliedValue]);
  // Full-size viewer opened by clicking any inline image (description or comments).
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  // Action failure feedback — shown when a checklist/comment/subtask mutation fails.
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

  // Close the image lightbox on Escape.
  useEffect(() => {
    if (!lightboxSrc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxSrc(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxSrc]);

  const titleRef = useRef<HTMLTextAreaElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0 });

  const isNew = card === null;

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
      setValue(formatMoneyInput(card.value));
      setStoryPoints(card.story_points != null ? String(card.story_points) : "");
      setSprintId(card.sprint_id ?? null);
    } else if (boardType === "scrum") {
      // New scrum cards default into the active sprint, if one exists.
      setSprintId(sprints.find((s) => s.is_active)?.id ?? null);
    }
  }, []);

  // Reflect live link changes (e.g. a webhook flipping a PR to merged) that arrive
  // on the card prop via the board's real-time event stream while the modal is open.
  useEffect(() => {
    if (card?.links) setLinks(card.links);
  }, [JSON.stringify(card?.links ?? [])]);

  useEffect(() => {
    if (!isNew && !isDemo && boardId && card?.id) {
      setLoadingComments(true);
      getComments(boardId, card.id)
        .then((data) => setComments(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => setLoadingComments(false));
    }
  }, []);

  useEffect(() => {
    if (!isNew && card?.id) {
      setLoadingSubtasks(true);
      if (isDemo) {
        setSubtasks(
          demoGetSubtasks(demoId, card.id as number).map((s) => ({
            id: s.id,
            name: s.name,
            is_done: s.is_done ?? false,
          })),
        );
        setLoadingSubtasks(false);
      } else if (boardId) {
        getSubtasks(boardId, card.id)
          .then((data) => setSubtasks(Array.isArray(data) ? data : []))
          .catch(() => {})
          .finally(() => setLoadingSubtasks(false));
      }
    }
  }, []);

  useEffect(() => {
    if (isDemo) {
      setTemplates(loadDemoTemplates(demoId));
    } else if (boardId && initialTemplates.length === 0) {
      getTemplates(boardId)
        .then((data) => setTemplates(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, []);

  const toggleTag = (tagId: number) => {
    if (isReadOnly) return;
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
      },
      isNew,
    );
  };

  // --- GitHub links ---

  const canUseLinks = !isNew && !isDemo && !!boardId && !!card?.id;

  const handleAddLink = async () => {
    const url = newLinkUrl.trim();
    if (!url || !canUseLinks) return;
    setLinkBusy(true);
    setLinkError(null);
    try {
      const updated = await addCardLink(boardId!, card!.id, url);
      setLinks(updated.links ?? []);
      setNewLinkUrl("");
    } catch {
      setLinkError("Enter a valid GitHub pull request or issue URL.");
    } finally {
      setLinkBusy(false);
    }
  };

  const handleRefreshLink = async (linkId: number) => {
    if (!canUseLinks) return;
    try {
      const updated = await refreshCardLink(boardId!, card!.id, linkId);
      setLinks(updated.links ?? []);
    } catch {
      /* keep current state on failure */
    }
  };

  const handleDeleteLink = async (linkId: number) => {
    if (!canUseLinks) return;
    setLinks((prev) => prev.filter((l) => l.id !== linkId)); // optimistic
    try {
      await deleteCardLink(boardId!, card!.id, linkId);
    } catch {
      setLinkError("Could not remove that link.");
    }
  };

  // --- Templates ---

  const handleSaveTemplate = async () => {
    const tname = templateNameInput.trim();
    if (!tname) return;
    const data = {
      name: tname,
      description,
      tag_ids: selectedTagIds,
      priority,
      due_date: dueDate || null,
    };
    if (isDemo) {
      const t = saveDemoTemplate(demoId, tname, data);
      setTemplates((prev) => [...prev, t]);
    } else if (boardId) {
      const t = await createTemplate(boardId, {
        name: tname,
        template_data: data,
      }).catch(() => null);
      if (t) setTemplates((prev) => [...prev, t]);
    }
    setTemplateNameInput("");
    setShowSaveTemplate(false);
  };

  const handleApplyTemplate = (t: Template) => {
    const d = t.template_data as {
      description?: string;
      tag_ids?: number[];
      priority?: "low" | "medium" | "high" | null;
      due_date?: string | null;
    };
    if (d.description !== undefined) setDescription(d.description);
    if (d.tag_ids !== undefined) setSelectedTagIds(d.tag_ids);
    if (d.priority !== undefined) setPriority(d.priority);
    if (d.due_date !== undefined) setDueDate(d.due_date ?? "");
    setShowTemplatePicker(false);
  };

  const handleDeleteTemplate = async (tId: number) => {
    if (isDemo) {
      deleteDemoTemplate(demoId, tId);
    } else if (boardId) {
      await deleteTemplate(boardId, tId).catch(() => {});
    }
    setTemplates((prev) => prev.filter((t) => t.id !== tId));
  };

  // --- Checklist ---

  const handleAddChecklistItem = async () => {
    const text = newChecklistText.trim();
    if (!text) return;
    if (isDemo) {
      const item = demoCreateChecklistItem(demoId, id as number, text);
      setChecklistItems((prev) => [...prev, item]);
    } else if (boardId && id) {
      let item;
      try {
        item = await createChecklistItem(boardId, id, text);
      } catch {
        // Keep what the user typed so they can retry.
        reportActionError("Could not add item — try again");
        return;
      }
      setChecklistItems((prev) => [...prev, item]);
    } else {
      setChecklistItems((prev) => [
        ...prev,
        { id: Date.now(), text, is_done: false, position: prev.length },
      ]);
    }
    setNewChecklistText("");
  };

  const handleToggleItem = async (item: ChecklistItem) => {
    const updated = { ...item, is_done: !item.is_done };
    if (updated.is_done) {
      playComplete();
      hapticDone();
    }
    setChecklistItems((prev) =>
      prev.map((i) => (i.id === item.id ? updated : i)),
    );
    if (!isNew) {
      if (isDemo)
        demoUpdateChecklistItem(demoId, id as number, item.id, {
          is_done: updated.is_done,
        });
      else if (boardId)
        updateChecklistItem(boardId, id, item.id, {
          is_done: updated.is_done,
        }).catch(() => {
          setChecklistItems((prev) =>
            prev.map((i) =>
              i.id === item.id ? { ...i, is_done: item.is_done } : i,
            ),
          );
          reportActionError("Change not saved — reverted");
        });
    }
  };

  const handleDeleteItem = async (item: ChecklistItem) => {
    setChecklistItems((prev) => prev.filter((i) => i.id !== item.id));
    if (!isNew) {
      if (isDemo) demoDeleteChecklistItem(demoId, id as number, item.id);
      else if (boardId)
        deleteChecklistItem(boardId, id, item.id).catch(() => {
          setChecklistItems((prev) => [...prev, item]);
          reportActionError("Could not delete item — restored");
        });
    }
  };

  // --- Rich-text image upload (shared by description + comments) ---
  // Uploads to the card's attachments endpoint and returns the public URL the
  // editor embeds inline. Rejects in demo mode (no backend).
  const uploadImage = async (file: File): Promise<string> => {
    // Board-scoped so it works while composing a brand-new card (no card id yet).
    if (isDemo || !boardId) throw new Error("uploads unavailable");
    try {
      const { url } = await uploadInlineImage(boardId, file);
      return url;
    } catch {
      reportActionError("Image upload failed — try again");
      throw new Error("upload failed");
    }
  };

  // --- Comments ---

  // An "empty" rich-text body is <p></p> / whitespace once tags are stripped —
  // but an image-only comment is still valid content.
  const isHtmlEmpty = (html: string) =>
    !/<img\b/i.test(html) &&
    html
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim() === "";

  const handleAddComment = async () => {
    const body = newComment;
    if (isHtmlEmpty(body) || !boardId || !id) return;
    let comment;
    try {
      comment = await createComment(boardId, id, body);
    } catch {
      // Keep the draft so the user can retry.
      reportActionError("Comment not posted — try again");
      return;
    }
    setComments((prev) => [comment, ...prev]);
    setNewComment("");
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!boardId || !id) return;
    try {
      await deleteComment(boardId, id, commentId);
    } catch {
      reportActionError("Could not delete comment — try again");
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  // --- Subtasks ---

  const handleAddSubtask = async () => {
    const n = newSubtaskName.trim();
    if (!n) return;
    if (isDemo) {
      const s = demoCreateSubtask(demoId, id as number, { name: n });
      setSubtasks((prev) => [
        ...prev,
        { id: s.id, name: s.name, is_done: false },
      ]);
    } else if (boardId && id) {
      let s;
      try {
        s = await createSubtask(boardId, id, { name: n });
      } catch {
        // Keep what the user typed so they can retry.
        reportActionError("Could not add subtask — try again");
        return;
      }
      setSubtasks((prev) => [
        ...prev,
        { id: s.id, name: s.name, is_done: s.is_done ?? false },
      ]);
    }
    setNewSubtaskName("");
  };

  const handleToggleSubtask = async (s: Subtask) => {
    if (!s.is_done) {
      playComplete();
      hapticDone();
    }
    setSubtasks((prev) =>
      prev.map((i) => (i.id === s.id ? { ...i, is_done: !i.is_done } : i)),
    );
    if (isDemo) {
      demoToggleSubtask(demoId, s.id);
    } else if (boardId && id) {
      updateSubtask(boardId, id, s.id, { is_done: !s.is_done }).catch(() => {
        setSubtasks((prev) =>
          prev.map((i) => (i.id === s.id ? { ...i, is_done: s.is_done } : i)),
        );
        reportActionError("Change not saved — reverted");
      });
    }
  };

  const doneCount = checklistItems.filter((i) => i.is_done).length;
  const doneSubtasks = subtasks.filter((s) => s.is_done).length;

  const tabs: Array<"details" | "checklist" | "subtasks" | "comments"> = isNew
    ? []
    : ["details", "checklist", "subtasks", "comments"];

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

  const pct = (done: number, total: number) =>
    total ? (done / total) * 100 : 0;

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

  const propLabel = (t: string) => (
    <p
      className="cf-label uppercase font-bold"
      style={{
        fontSize: "9px",
        letterSpacing: "0.14em",
        color: "var(--cf-text-dim)",
      }}
    >
      {t}
    </p>
  );

  // Big hero title
  const renderTitle = () => (
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
        setName(e.target.value);
        titleRef.current?.animate(
          [{ filter: "blur(1.4px)" }, { filter: "blur(0)" }],
          { duration: 90, easing: "ease-out" },
        );
      }}
    />
  );

  // Roomy description — the main writing surface
  const renderDescription = () => (
    <RichTextEditor
      value={description}
      onChange={setDescription}
      editable={!isReadOnly}
      placeholder="Add a description — notes, context, images…"
      onUploadImage={isDemo ? undefined : uploadImage}
    />
  );

  // Metadata as a clean property list (sidebar on desktop, stacked on mobile)
  const renderProperties = () => (
    <div className="flex flex-col">
      {/* Section */}
      <div className="flex flex-col gap-2 py-4">
        {propLabel("Section")}
        <div className="flex gap-1.5 flex-wrap">
          {sections
            .filter((s) => s.id !== backlogSectionId)
            .map((s, i) => {
              const color = getSectionColor(s.name, i);
              const isActive = s.id === sectionId;
              return (
                <button
                  key={s.id}
                  disabled={isReadOnly}
                  onClick={() => setSectionId(s.id)}
                  style={{
                    borderColor: color,
                    backgroundColor: isActive ? color : "transparent",
                    color: isActive ? "#1c1a16" : color,
                    boxShadow: isActive ? `0 0 8px ${color}55` : "none",
                    fontSize: "10px",
                  }}
                  className="cf-mono uppercase tracking-widest px-2.5 py-1 rounded-sm border cursor-pointer font-bold disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {s.name}
                </button>
              );
            })}
        </div>
      </div>

      {/* Priority */}
      <div
        className="flex flex-col gap-2 py-4 border-t"
        style={{ borderColor: "var(--cf-edge)" }}
      >
        {propLabel("Priority")}
        <div className="flex gap-1.5">
          {PRIORITY_OPTS.map((opt) => {
            const isActive = priority === opt.value;
            return (
              <button
                key={opt.value}
                disabled={isReadOnly}
                onClick={() => setPriority(isActive ? null : opt.value)}
                style={{
                  borderColor: opt.color,
                  backgroundColor: isActive ? opt.color : "transparent",
                  color: isActive ? "#1c1a16" : opt.color,
                  boxShadow: isActive ? `0 0 8px ${opt.color}55` : "none",
                  fontSize: "9px",
                }}
                className="cf-mono uppercase tracking-widest px-2.5 py-1 rounded-sm border cursor-pointer font-bold disabled:opacity-60 disabled:cursor-not-allowed transition-all flex-1"
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Due date */}
      <div
        className="flex flex-col gap-2 py-4 border-t"
        style={{ borderColor: "var(--cf-edge)" }}
      >
        {propLabel("Due date")}
        <input
          type="date"
          disabled={isReadOnly}
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          style={{ fontSize: "12px" }}
          className="glass-input px-2 py-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed w-full"
        />
      </div>

      {/* CRM: deal value */}
      {boardType === "crm" && (
        <div
          className="flex flex-col gap-2 py-4 border-t"
          style={{ borderColor: "var(--cf-edge)" }}
        >
          {propLabel(`Deal value (${currency})`)}
          <div className="relative">
            <span
              className="cf-mono absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ fontSize: "12px", color: "var(--cf-text-muted)" }}
            >
              {currencySymbol(currency)}
            </span>
            <input
              type="text"
              inputMode="decimal"
              disabled={isReadOnly}
              value={value}
              onChange={(e) => setValue(maskMoneyInput(e.target.value))}
              placeholder="0,00"
              style={{ fontSize: "12px", paddingLeft: "2.6em" }}
              className="glass-input py-1.5 pr-2 text-right disabled:opacity-60 disabled:cursor-not-allowed w-full tabular-nums"
            />
          </div>
        </div>
      )}

      {/* Scrum: story points + sprint */}
      {boardType === "scrum" && (
        <div
          className="flex flex-col gap-2 py-4 border-t"
          style={{ borderColor: "var(--cf-edge)" }}
        >
          {propLabel("Story points")}
          <div className="flex gap-1.5 flex-wrap">
            {FIBONACCI.map((pt) => {
              const active = storyPoints === String(pt);
              return (
                <button
                  key={pt}
                  type="button"
                  disabled={isReadOnly}
                  onClick={() => setStoryPoints(active ? "" : String(pt))}
                  style={{
                    borderColor: active ? "var(--cf-cyan)" : "var(--cf-edge)",
                    backgroundColor: active ? "var(--cf-cyan)" : "transparent",
                    color: active ? "#1c1a16" : "var(--cf-cyan)",
                    boxShadow: active ? "0 0 8px var(--cf-cyan)55" : "none",
                    fontSize: "11px",
                    minWidth: "34px",
                  }}
                  className="cf-mono tracking-widest px-2 py-1 rounded-sm border cursor-pointer font-bold disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {pt}
                </button>
              );
            })}
            {/* Clear / unestimated */}
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => setStoryPoints("")}
              style={{
                borderColor: storyPoints === "" ? "var(--cf-text-muted)" : "var(--cf-edge)",
                color: "var(--cf-text-muted)",
                fontSize: "11px",
                minWidth: "34px",
              }}
              className="cf-mono tracking-widest px-2 py-1 rounded-sm border cursor-pointer font-bold disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              title="No estimate"
            >
              ?
            </button>
          </div>
          <div className="mt-2">{propLabel("Sprint")}</div>
          <select
            disabled={isReadOnly}
            value={sprintId ?? ""}
            onChange={(e) => setSprintId(e.target.value === "" ? null : Number(e.target.value))}
            style={{ fontSize: "12px" }}
            className="glass-input px-2 py-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed w-full"
          >
            <option value="" className="text-black">Backlog (no sprint)</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id} className="text-black">
                {s.name}{s.is_active ? " · active" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* GitHub */}
      {canUseLinks && (
        <div
          className="flex flex-col gap-2 py-4 border-t"
          style={{ borderColor: "var(--cf-edge)" }}
        >
          <div className="flex items-center gap-1.5">
            <Icon
              icon={faGithub}
              style={{ fontSize: "11px", color: "var(--cf-text-dim)" }}
            />
            {propLabel("GitHub")}
          </div>

          {links.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {links.map((link) => {
                const meta = link.state ? LINK_STATE_META[link.state] : null;
                return (
                  <div
                    key={link.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5"
                    style={{
                      background: "#211f1b",
                      border: "1px solid #38352e",
                    }}
                  >
                    <Icon
                      icon={faGithub}
                      style={{
                        fontSize: "12px",
                        color: "var(--cf-text-muted)",
                      }}
                    />
                    <a
                      href={link.html_url ?? link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-0 truncate cf-mono hover:underline"
                      style={{ fontSize: "11px", color: "var(--cf-text)" }}
                      title={link.title ?? undefined}
                    >
                      {link.repo ?? "link"}
                      <span style={{ color: "var(--cf-text-dim)" }}>
                        #{link.number}
                      </span>
                      {link.title && (
                        <span style={{ color: "var(--cf-text-muted)" }}>
                          {" "}
                          · {link.title}
                        </span>
                      )}
                    </a>
                    {link.checks_state && (
                      <span
                        className="rounded-full flex-shrink-0"
                        title={`checks: ${link.checks_state}`}
                        style={{
                          width: 7,
                          height: 7,
                          background: CHECKS_COLOR[link.checks_state],
                          boxShadow: `0 0 5px ${CHECKS_COLOR[link.checks_state]}`,
                        }}
                      />
                    )}
                    <span
                      className="cf-mono uppercase font-bold rounded-sm flex-shrink-0"
                      style={{
                        fontSize: "8px",
                        letterSpacing: "0.1em",
                        padding: "2px 5px",
                        color: meta?.color ?? "var(--cf-text-dim)",
                        border: `1px solid ${meta?.color ?? "var(--cf-edge)"}`,
                        background: meta ? `${meta.color}1a` : "transparent",
                      }}
                    >
                      {meta?.label ?? (link.type === "issue" ? "Issue" : "PR")}
                    </span>
                    {!isReadOnly && (
                      <>
                        <button
                          onClick={() => handleRefreshLink(link.id)}
                          aria-label="Refresh status"
                          title="Refresh"
                          className="w-5 h-5 rounded flex items-center justify-center cursor-pointer flex-shrink-0"
                          style={{ color: "var(--cf-text-dim)" }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.color = "var(--cf-cyan)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.color = "var(--cf-text-dim)")
                          }
                        >
                          <Icon icon={faRotate} style={{ fontSize: "9px" }} />
                        </button>
                        <button
                          onClick={() => handleDeleteLink(link.id)}
                          aria-label="Remove link"
                          title="Remove"
                          className="w-5 h-5 rounded flex items-center justify-center cursor-pointer flex-shrink-0"
                          style={{ color: "var(--cf-text-dim)" }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.color = "var(--cf-red)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.color = "var(--cf-text-dim)")
                          }
                        >
                          <Icon icon={faTrash} style={{ fontSize: "9px" }} />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!isReadOnly && (
            <div className="flex items-center gap-1.5">
              <input
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddLink();
                }}
                placeholder="Paste a GitHub PR or issue URL…"
                style={{ fontSize: "11px" }}
                className="glass-input px-2 py-1.5 flex-1"
              />
              <button
                onClick={handleAddLink}
                disabled={linkBusy || !newLinkUrl.trim()}
                aria-label="Add link"
                className="aero-btn aero-btn--cyan px-2.5 py-1.5 flex-shrink-0 disabled:opacity-50"
              >
                <Icon icon={faPlus} style={{ fontSize: "9px" }} />
              </button>
            </div>
          )}
          {linkError && (
            <p
              className="cf-mono"
              style={{ fontSize: "9px", color: "var(--cf-red)" }}
            >
              {linkError}
            </p>
          )}
        </div>
      )}

      {/* Assignee */}
      {users.length > 0 && (
        <div
          className="flex flex-col gap-2 py-4 border-t"
          style={{ borderColor: "var(--cf-edge)" }}
        >
          {propLabel(
            `Assignee${assignedUserId !== null ? ` · ${users.find((u) => u.id === assignedUserId)?.name ?? ""}` : ""}`,
          )}
          <div className="flex gap-2 flex-wrap items-center">
            <button
              disabled={isReadOnly}
              onClick={() => setAssignedUserId(null)}
              title="Unassigned"
              style={{
                fontSize: "9px",
                borderColor: "var(--cf-edge)",
                color:
                  assignedUserId === null
                    ? "var(--cf-text)"
                    : "var(--cf-text-muted)",
                backgroundColor:
                  assignedUserId === null
                    ? "var(--cf-graphite)"
                    : "transparent",
                width: 32,
                height: 32,
              }}
              className="cf-mono rounded-full border-2 flex items-center justify-center font-bold cursor-pointer disabled:opacity-60 flex-shrink-0 transition-all"
            >
              —
            </button>
            {users.map((u) => {
              const color = AVATAR_COLORS[u.id % AVATAR_COLORS.length];
              const isActive = assignedUserId === u.id;
              return (
                <button
                  key={u.id}
                  disabled={isReadOnly}
                  onClick={() => setAssignedUserId(isActive ? null : u.id)}
                  title={u.name}
                  style={{
                    borderColor: color,
                    backgroundColor: isActive ? color : "transparent",
                    color: isActive ? "#1c1a16" : color,
                    boxShadow: isActive ? `0 0 8px ${color}55` : "none",
                    fontSize: "10px",
                    width: 32,
                    height: 32,
                  }}
                  className="cf-mono rounded-full border-2 flex items-center justify-center font-bold cursor-pointer disabled:opacity-60 flex-shrink-0 transition-all"
                >
                  {initials(u.name)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div
          className="flex flex-col gap-2 py-4 border-t"
          style={{ borderColor: "var(--cf-edge)" }}
        >
          {propLabel("Tags")}
          <div className="flex gap-1.5 flex-wrap">
            {tags.map((tag) => {
              const isActive = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  disabled={isReadOnly}
                  onClick={() => toggleTag(tag.id)}
                  style={{
                    borderColor: tag.color,
                    backgroundColor: isActive ? tag.color : "transparent",
                    color: isActive ? "#1c1a16" : tag.color,
                    boxShadow: isActive ? `0 0 8px ${tag.color}55` : "none",
                    fontSize: "10px",
                  }}
                  className="cf-mono uppercase tracking-widest px-2.5 py-1 rounded-sm border cursor-pointer font-bold disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Templates */}
      {(!isReadOnly || templates.length > 0) && (
        <div
          className="flex flex-col gap-2 py-4 border-t"
          style={{ borderColor: "var(--cf-edge)" }}
        >
          {propLabel("Template")}
          <div className="flex gap-2 flex-wrap">
            {templates.length > 0 && (
              <button
                onClick={() => setShowTemplatePicker((v) => !v)}
                style={{ fontSize: "9px" }}
                className="aero-pill uppercase tracking-widest px-2.5 py-1 cursor-pointer font-bold text-white/80 hover:text-white"
              >
                Apply ▾
              </button>
            )}
            {!isReadOnly && (
              <button
                onClick={() => setShowSaveTemplate((v) => !v)}
                style={{ fontSize: "9px" }}
                className="aero-pill uppercase tracking-widest px-2.5 py-1 cursor-pointer font-bold text-white/80 hover:text-white"
              >
                Save as…
              </button>
            )}
          </div>
          {showTemplatePicker && templates.length > 0 && (
            <div
              style={{ background: "#1c1a16", borderColor: "var(--cf-edge)" }}
              className="border rounded-lg p-2 flex flex-col gap-1"
            >
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-2 group"
                >
                  <button
                    onClick={() => handleApplyTemplate(t)}
                    style={{ fontSize: "11px", color: "var(--cf-text-muted)" }}
                    className="cf-mono flex-1 text-left hover:text-[var(--cf-phosphor)] cursor-pointer truncate"
                  >
                    {t.name}
                  </button>
                  {!isReadOnly && (
                    <button
                      onClick={() => handleDeleteTemplate(t.id)}
                      style={{
                        fontSize: "10px",
                        color: "var(--cf-text-muted)",
                      }}
                      className="opacity-0 group-hover:opacity-100 hover:text-[var(--cf-red)] cursor-pointer flex-shrink-0 transition-all"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {showSaveTemplate && (
            <div className="flex gap-2 items-center">
              <input
                autoFocus
                value={templateNameInput}
                onChange={(e) => setTemplateNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTemplate();
                  if (e.key === "Escape") setShowSaveTemplate(false);
                }}
                placeholder="Template name..."
                style={{ fontSize: "11px" }}
                className="glass-input flex-1 px-2 py-1"
              />
              <button
                onClick={handleSaveTemplate}
                style={{ fontSize: "10px" }}
                className="aero-btn aero-btn--cyan px-3 py-1 font-bold cursor-pointer"
              >
                Save
              </button>
            </div>
          )}
        </div>
      )}
    </div>
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

  const renderChecklist = () => (
    <div className="flex flex-col gap-2">
      {checklistItems.length === 0 && (
        <p
          style={{ fontSize: "12px", color: "var(--cf-text-muted)" }}
          className="cf-mono text-center py-4"
        >
          No items yet. Add one below.
        </p>
      )}
      {checklistItems.map((item) => (
        <div key={item.id} className="flex items-center gap-2 group">
          {/* key changes on toggle → React remounts → check-pop replays */}
          <div
            key={`${item.id}-${item.is_done}`}
            className="check-pop flex-shrink-0"
          >
            <input
              type="checkbox"
              checked={item.is_done}
              disabled={isReadOnly}
              onChange={() => handleToggleItem(item)}
              className="cursor-pointer accent-[var(--cf-phosphor)] w-4 h-4 disabled:cursor-not-allowed"
            />
          </div>
          <span
            style={{
              color: item.is_done ? "var(--cf-text-muted)" : "var(--cf-text)",
              textDecoration: item.is_done ? "line-through" : "none",
              fontSize: "13px",
              flex: 1,
              transition: "color 200ms ease, text-decoration-color 200ms ease",
            }}
          >
            {item.text}
          </span>
          {!isReadOnly && (
            <button
              onClick={() => handleDeleteItem(item)}
              style={{ fontSize: "10px", color: "var(--cf-text-muted)" }}
              className="opacity-0 group-hover:opacity-100 hover:text-[var(--cf-red)] cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      ))}

      {/* Progress bar */}
      {checklistItems.length > 0 && (
        <div className="flex items-center gap-2 mt-1">
          <div
            className="flex-1 h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--cf-screen)" }}
          >
            <div
              style={{
                width: `${(doneCount / checklistItems.length) * 100}%`,
                backgroundColor: "var(--cf-phosphor)",
                boxShadow: "0 0 6px var(--cf-phosphor)",
              }}
              className="h-full rounded-full transition-all duration-300"
            />
          </div>
          <span
            style={{ fontSize: "10px", color: "var(--cf-text-muted)" }}
            className="cf-mono"
          >
            {doneCount}/{checklistItems.length}
          </span>
        </div>
      )}

      {/* Add item */}
      {!isReadOnly && (
        <div className="flex gap-2 mt-2">
          <input
            value={newChecklistText}
            onChange={(e) => setNewChecklistText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddChecklistItem();
            }}
            placeholder="Add item..."
            style={{ fontSize: "12px" }}
            className="glass-input flex-1 px-2 py-1.5"
          />
          <button
            onClick={handleAddChecklistItem}
            style={{ fontSize: "11px" }}
            className="aero-btn aero-btn--cyan px-3 py-1.5 font-bold cursor-pointer"
          >
            +
          </button>
        </div>
      )}
    </div>
  );

  const renderSubtasks = () => (
    <div className="flex flex-col gap-2">
      {loadingSubtasks && (
        <p
          style={{ fontSize: "12px", color: "var(--cf-text-muted)" }}
          className="cf-mono text-center py-4"
        >
          Loading...
        </p>
      )}
      {!loadingSubtasks && subtasks.length === 0 && (
        <p
          style={{ fontSize: "12px", color: "var(--cf-text-muted)" }}
          className="cf-mono text-center py-4"
        >
          No subtasks yet.
        </p>
      )}
      {subtasks.map((s) => (
        <div key={s.id} className="flex items-center gap-2">
          <div key={`${s.id}-${s.is_done}`} className="check-pop flex-shrink-0">
            <input
              type="checkbox"
              checked={s.is_done}
              disabled={isReadOnly}
              onChange={() => handleToggleSubtask(s)}
              className="cursor-pointer accent-[var(--cf-phosphor)] w-4 h-4 disabled:cursor-not-allowed"
            />
          </div>
          <span
            style={{
              color: s.is_done ? "var(--cf-text-muted)" : "var(--cf-text)",
              textDecoration: s.is_done ? "line-through" : "none",
              fontSize: "13px",
              flex: 1,
              transition: "color 200ms ease",
            }}
          >
            {s.name}
          </span>
        </div>
      ))}

      {/* Progress bar */}
      {subtasks.length > 0 && (
        <div className="flex items-center gap-2 mt-1">
          <div
            className="flex-1 h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--cf-screen)" }}
          >
            <div
              style={{
                width: `${(doneSubtasks / subtasks.length) * 100}%`,
                backgroundColor: "var(--cf-phosphor)",
                boxShadow: "0 0 6px var(--cf-phosphor)",
              }}
              className="h-full rounded-full transition-all duration-300"
            />
          </div>
          <span
            style={{ fontSize: "10px", color: "var(--cf-text-muted)" }}
            className="cf-mono"
          >
            {doneSubtasks}/{subtasks.length}
          </span>
        </div>
      )}

      {/* Add subtask */}
      {!isReadOnly && (
        <div className="flex gap-2 mt-2">
          <input
            value={newSubtaskName}
            onChange={(e) => setNewSubtaskName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddSubtask();
            }}
            placeholder="Add subtask..."
            style={{ fontSize: "12px" }}
            className="glass-input flex-1 px-2 py-1.5"
          />
          <button
            onClick={handleAddSubtask}
            style={{ fontSize: "11px" }}
            className="aero-btn aero-btn--cyan px-3 py-1.5 font-bold cursor-pointer"
          >
            +
          </button>
        </div>
      )}
    </div>
  );

  const renderComments = () => (
    <div className="flex flex-col gap-3">
      {/* Compose */}
      {!isDemo && (
        <div className="flex flex-col gap-2">
          <div
            className="rounded-lg px-3 py-2"
            style={{
              border: "1px solid var(--cf-edge)",
              background: "rgba(0,0,0,0.14)",
            }}
          >
            <RichTextEditor
              compact
              value={newComment}
              onChange={setNewComment}
              placeholder="Write a comment… (type @ to mention, paste or drop an image)"
              mentionUsers={users}
              onUploadImage={uploadImage}
            />
          </div>
          <button
            onClick={handleAddComment}
            disabled={isHtmlEmpty(newComment)}
            style={{ fontSize: "11px" }}
            className="aero-btn aero-btn--cyan self-end px-4 py-1.5 font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Post
          </button>
        </div>
      )}
      {isDemo && (
        <p
          style={{ fontSize: "12px", color: "var(--cf-text-muted)" }}
          className="cf-mono text-center py-2"
        >
          Comments are not available in demo mode.
        </p>
      )}

      {/* Thread */}
      {loadingComments && (
        <p
          style={{ fontSize: "12px", color: "var(--cf-text-muted)" }}
          className="cf-mono text-center"
        >
          Loading...
        </p>
      )}
      {comments.map((comment) => (
        <div key={comment.id} className="flex flex-col gap-0.5 group">
          <div className="flex items-center gap-2">
            <span
              style={{
                fontSize: "11px",
                fontWeight: "bold",
                color: "var(--cf-text)",
              }}
            >
              {comment.user?.name}
            </span>
            <span
              style={{ fontSize: "10px", color: "var(--cf-text-muted)" }}
              className="cf-mono"
            >
              {new Date(comment.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <button
              onClick={() => handleDeleteComment(comment.id)}
              style={{ fontSize: "10px", color: "var(--cf-text-muted)" }}
              className="ml-auto opacity-0 group-hover:opacity-100 hover:text-[var(--cf-red)] cursor-pointer transition-all"
            >
              ✕
            </button>
          </div>
          <RichTextContent html={comment.body} className="text-[12px]" />
          <div
            style={{ borderColor: "var(--cf-edge)" }}
            className="border-b mt-1"
          />
        </div>
      ))}
      {!loadingComments && !isDemo && comments.length === 0 && (
        <p
          style={{ fontSize: "12px", color: "var(--cf-text-muted)" }}
          className="cf-mono text-center py-2"
        >
          No comments yet.
        </p>
      )}
    </div>
  );

  // Right pane on desktop: unified WORKLOG console (checklist + subtasks + comments stacked).
  // Clean section header used inside the main column (checklist / subtasks / comments)
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

  // The three work sections stacked (main column, desktop). Clean, no console chrome.
  const renderWork = () => (
    <div className="flex flex-col gap-6">
      <div>
        {workHeader(
          "Checklist",
          checklistItems.length
            ? `${doneCount}/${checklistItems.length}`
            : null,
        )}
        {renderChecklist()}
      </div>
      <div className="border-t pt-6" style={{ borderColor: "var(--cf-edge)" }}>
        {workHeader(
          "Subtasks",
          subtasks.length ? `${doneSubtasks}/${subtasks.length}` : null,
        )}
        {renderSubtasks()}
      </div>
      <div className="border-t pt-6" style={{ borderColor: "var(--cf-edge)" }}>
        {workHeader(
          "Comments",
          comments.length ? String(comments.length) : null,
        )}
        {renderComments()}
      </div>
    </div>
  );

  return (
    <div
      style={tagTintStyle}
      className="aero-menu flex flex-col w-full min-h-[100svh] sm:min-h-0 sm:w-[95vw] sm:max-w-[520px] sm:h-auto sm:max-h-[90vh] lg:max-w-[960px] lg:h-[85vh] lg:max-h-[85vh] relative transition-[background,border-color,box-shadow] duration-300"
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
        <div
          onClick={() => setLightboxSrc(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 120,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "4vh",
            cursor: "zoom-out",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxSrc}
            alt=""
            style={{
              maxWidth: "92vw",
              maxHeight: "92vh",
              objectFit: "contain",
              borderRadius: 8,
              boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
            }}
          />
        </div>
      )}

      {/* Glue strip */}
      <div
        style={{ borderColor: "var(--cf-edge)" }}
        className="h-9 w-full flex items-center justify-between px-4 flex-shrink-0 border-b"
      >
        <div className="flex items-center gap-2">
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
            { key: "card" as const, label: "Card", show: true, led: undefined as string | undefined, badge: 0 },
            { key: "planning" as const, label: "Planning Poker", show: !!planningTab, led: undefined, badge: planningCount },
            { key: "qa" as const, label: "Sentinel · QA", show: !!qaTab, led: qaStatusColor ?? undefined, badge: 0 },
          ]
            .filter((t) => t.show)
            .map((t) => {
              const on = topTab === t.key;
              const activeColor = t.led ?? "var(--cf-phosphor)";
              return (
                <button
                  key={t.key}
                  onClick={() => setTopTab(t.key)}
                  style={{ color: on ? "var(--cf-text)" : "var(--cf-text-muted)", fontSize: "10px" }}
                  className="cf-mono uppercase tracking-widest font-bold pb-2 cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <span
                    className="cf-led"
                    style={{
                      width: 6,
                      height: 6,
                      background: t.led ?? (on ? "var(--cf-phosphor)" : "var(--cf-edge)"),
                      boxShadow: t.led || on ? `0 0 6px ${activeColor}` : "none",
                    }}
                  />
                  {t.label}
                  {t.badge > 0 && (
                    <span
                      className="cf-mono px-1.5 rounded-sm"
                      style={{ background: "#1c1a16", color: "var(--cf-phosphor)", fontSize: "10px" }}
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
        <div className="sm:flex-1 sm:overflow-y-auto min-h-0">{planningTab}</div>
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
                    boxShadow: isActive ? "0 0 6px var(--cf-phosphor)" : "none",
                  }}
                />
                {tab === "checklist" && checklistItems.length > 0
                  ? `checklist ${doneCount}/${checklistItems.length}`
                  : tab === "comments" && comments.length > 0
                    ? `comments ${comments.length}`
                    : tab === "subtasks" && subtasks.length > 0
                      ? `subtasks ${doneSubtasks}/${subtasks.length}`
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
        /* Desktop: document (title + description + work) on the left, properties sidebar on the right, save footer */
        <>
          <div className="flex flex-1 min-h-0">
            <div className="flex-1 min-w-0 flex flex-col overflow-y-auto px-8 pt-6 pb-8 gap-4">
              {renderTitle()}
              {renderDescription()}
              <div
                className="border-t mt-1 pt-6"
                style={{ borderColor: "var(--cf-edge)" }}
              >
                {renderWork()}
              </div>
            </div>
            <div
              className="w-[300px] flex-shrink-0 overflow-y-auto border-l px-5 py-2"
              style={{
                borderColor: "var(--cf-edge)",
                background: "rgba(0,0,0,0.15)",
              }}
            >
              {renderProperties()}
            </div>
          </div>
          {!isReadOnly && (
            <div
              className="flex-shrink-0 border-t px-6 py-3 flex justify-end"
              style={{ borderColor: "var(--cf-edge)" }}
            >
              <div className="w-56">{renderSave()}</div>
            </div>
          )}
        </>
      ) : (
        /* Mobile & new: single column; details tab holds title + description + properties + save */
        <div className="flex flex-col sm:flex-1 px-6 pt-4 pb-6 gap-4 sm:overflow-y-auto">
          {(isNew || activeTab === "details") && (
            <>
              {renderTitle()}
              {renderDescription()}
              {renderProperties()}
              {renderSave()}
            </>
          )}
          {!isNew && activeTab === "checklist" && renderChecklist()}
          {!isNew && activeTab === "subtasks" && renderSubtasks()}
          {!isNew && activeTab === "comments" && renderComments()}
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default CardEdit;
