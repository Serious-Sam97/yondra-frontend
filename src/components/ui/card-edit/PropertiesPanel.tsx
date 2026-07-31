"use client";

import { faGithub } from "@fortawesome/free-brands-svg-icons";
import {
  faCheck,
  faDownload,
  faPaperclip,
  faPlus,
  faRotate,
  faTrash,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import type { Template } from "@/hooks/useCardTemplates";
import type { CardDocument, CardLink } from "@/interfaces/CardInterface";
import { ApiError, suggestStoryPoints, suggestTriage } from "@/lib/api";
import { currencySymbol, maskMoneyInput } from "@/lib/currency";
import { FIBONACCI } from "@/lib/estimation";
import { channelIcon, foldAccents } from "@/lib/tags";

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

// Human-friendly file size for the document list (e.g. 2.4 MB, 812 KB).
function formatBytes(bytes?: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

// Instrument-cluster header: LED + monospace label.
const clusterHead = (label: string, led: "amber" | "dim" | "off" = "dim") => {
  const ledStyle =
    led === "amber"
      ? { background: "var(--cf-amber)", boxShadow: "0 0 6px var(--cf-amber)" }
      : led === "dim"
        ? {
            background:
              "color-mix(in srgb, var(--cf-phosphor) 55%, var(--cf-edge))",
            boxShadow: "none",
          }
        : { background: "var(--cf-edge)", boxShadow: "none" };
  return (
    <div className="flex items-center gap-2">
      <span className="cf-led" style={{ width: 6, height: 6, ...ledStyle }} />
      <span
        className="cf-mono uppercase font-bold"
        style={{
          fontSize: "9px",
          letterSpacing: "0.24em",
          color: "var(--cf-text-muted)",
        }}
      >
        {label}
      </span>
    </div>
  );
};

// Small sub-label used inside clusters (e.g. Priority / Due date).
const subLabel = (t: string) => (
  <p
    className="cf-label uppercase font-bold"
    style={{
      fontSize: "8px",
      letterSpacing: "0.2em",
      color: "var(--cf-text-dim)",
    }}
  >
    {t}
  </p>
);

interface PropertiesPanelProps {
  isReadOnly: boolean;
  // Present on saved cards — enables the AI story-point suggestion on Scrum boards.
  boardId?: number;
  cardId?: number | string;
  // Section
  sections: { id: number; name: string }[];
  backlogSectionId?: number;
  sectionId: number;
  setSectionId: (v: number) => void;
  // Priority / due date
  priority: "low" | "medium" | "high" | null;
  setPriority: (v: "low" | "medium" | "high" | null) => void;
  dueDate: string;
  setDueDate: (v: string) => void;
  // Board-type extras
  boardType: "kanban" | "scrum" | "crm";
  currency: string;
  value: string;
  setValue: (v: string) => void;
  // CRM contact (client/lead) — recipient of stage email automations.
  contactName: string;
  setContactName: (v: string) => void;
  contactEmail: string;
  setContactEmail: (v: string) => void;
  contactPhone: string;
  setContactPhone: (v: string) => void;
  storyPoints: string;
  setStoryPoints: (v: string) => void;
  sprintId: number | null;
  setSprintId: (v: number | null) => void;
  sprints: { id: number; name: string; is_active: boolean }[];
  // GitHub links (useCardLinks)
  canUseLinks: boolean;
  links: CardLink[];
  newLinkUrl: string;
  setNewLinkUrl: (v: string) => void;
  linkBusy: boolean;
  linkError: string | null;
  handleAddLink: () => void;
  handleRefreshLink: (linkId: number) => void;
  handleDeleteLink: (linkId: number) => void;
  // Documents (useCardAttachments)
  canUseDocs: boolean;
  documents: CardDocument[];
  docBusy: boolean;
  docError: string | null;
  docInputRef: React.RefObject<HTMLInputElement | null>;
  handleUploadDoc: (file: File) => void;
  handleDeleteDoc: (documentId: number) => void;
  handleDownloadDoc: (doc: CardDocument) => void;
  // Assignee / tags
  users: { id: number; name: string }[];
  assignedUserId: number | null;
  setAssignedUserId: (v: number | null) => void;
  tags: {
    id: number;
    name: string;
    color: string;
    kind?: "channel" | "custom";
  }[];
  selectedTagIds: number[];
  toggleTag: (tagId: number) => void;
  // Templates (useCardTemplates)
  templates: Template[];
  showTemplatePicker: boolean;
  setShowTemplatePicker: React.Dispatch<React.SetStateAction<boolean>>;
  templateNameInput: string;
  setTemplateNameInput: (v: string) => void;
  showSaveTemplate: boolean;
  setShowSaveTemplate: React.Dispatch<React.SetStateAction<boolean>>;
  handleSaveTemplate: () => void;
  handleApplyTemplate: (t: Template) => void;
  handleDeleteTemplate: (tId: number) => void;
}

// The card editor's metadata rail (sidebar on desktop, stacked on mobile),
// grouped into instrument clusters: Pipeline/Column, Signals, Deal or Sprint,
// Links, Crew, Tags, Template. Purely presentational — all state and handlers
// live in CardEdit's hooks and arrive via props.
export function PropertiesPanel({
  isReadOnly,
  boardId,
  cardId,
  sections,
  backlogSectionId,
  sectionId,
  setSectionId,
  priority,
  setPriority,
  dueDate,
  setDueDate,
  boardType,
  currency,
  value,
  setValue,
  contactName,
  setContactName,
  contactEmail,
  setContactEmail,
  contactPhone,
  setContactPhone,
  storyPoints,
  setStoryPoints,
  sprintId,
  setSprintId,
  sprints,
  canUseLinks,
  links,
  newLinkUrl,
  setNewLinkUrl,
  linkBusy,
  linkError,
  handleAddLink,
  handleRefreshLink,
  handleDeleteLink,
  canUseDocs,
  documents,
  docBusy,
  docError,
  docInputRef,
  handleUploadDoc,
  handleDeleteDoc,
  handleDownloadDoc,
  users,
  assignedUserId,
  setAssignedUserId,
  tags,
  selectedTagIds,
  toggleTag,
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
}: PropertiesPanelProps) {
  const boardSections = sections.filter((s) => s.id !== backlogSectionId);
  const currentStepIdx = boardSections.findIndex((s) => s.id === sectionId);

  // Tag picker. The card shows only its own tags; the board's full set lives
  // behind this popover, so the section's height tracks the card, not the board.
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const [tagQuery, setTagQuery] = useState("");
  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));
  const tagSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!tagPickerOpen) return;
    tagSearchRef.current?.focus();
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("[data-tag-picker]")) setTagPickerOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTagPickerOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [tagPickerOpen]);

  // AI story-point suggestion (Scrum). Fills the picker + shows a one-line rationale.
  const [suggesting, setSuggesting] = useState(false);
  const [rationale, setRationale] = useState<string | null>(null);
  const [suggestErr, setSuggestErr] = useState<string | null>(null);
  const canSuggest = !isReadOnly && !!boardId && !!cardId;
  const suggestPoints = async () => {
    if (!boardId || !cardId || suggesting) return;
    setSuggesting(true);
    setSuggestErr(null);
    setRationale(null);
    try {
      const r = await suggestStoryPoints(boardId, cardId);
      setStoryPoints(String(r.points));
      setRationale(r.rationale || null);
    } catch (e) {
      setSuggestErr(
        e instanceof ApiError && e.status === 503
          ? "AI isn't configured on this server."
          : "Couldn't estimate — try again.",
      );
    } finally {
      setSuggesting(false);
    }
  };

  // AI triage — applies suggested labels (additive), priority and assignee.
  const [triaging, setTriaging] = useState(false);
  const [triageMsg, setTriageMsg] = useState<string | null>(null);
  const [triageErr, setTriageErr] = useState<string | null>(null);
  const runTriage = async () => {
    if (!boardId || !cardId || triaging) return;
    setTriaging(true);
    setTriageErr(null);
    setTriageMsg(null);
    try {
      const r = await suggestTriage(boardId, cardId);
      // Additive: only add suggested tags not already on the card (never remove).
      for (const id of r.tag_ids) {
        if (!selectedTagIds.includes(id)) toggleTag(id);
      }
      if (r.priority) setPriority(r.priority);
      if (r.assignee_id) setAssignedUserId(r.assignee_id);
      setTriageMsg(r.rationale || "Applied.");
    } catch (e) {
      setTriageErr(
        e instanceof ApiError && e.status === 503
          ? "AI isn't configured on this server."
          : "Couldn't triage — try again.",
      );
    } finally {
      setTriaging(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Crew — assignee */}
      {users.length > 0 && (
        <div className="flex flex-col gap-2.5 pt-3 pb-4">
          {clusterHead(
            `Crew${
              assignedUserId !== null
                ? ` · ${users.find((u) => u.id === assignedUserId)?.name ?? ""}`
                : ""
            }`,
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

      {/* Pipeline / Column — the board's stages as a vertical stepper: passed
          stages glow dim phosphor, the current one amber, the rest unlit. */}
      <div
        className={`flex flex-col gap-2.5 py-4 ${users.length > 0 ? "border-t" : ""}`}
        style={{
          borderColor: "color-mix(in srgb, var(--cf-edge) 60%, transparent)",
        }}
      >
        {clusterHead(boardType === "crm" ? "Pipeline" : "Column", "amber")}
        <div className="flex flex-col">
          {boardSections.map((s, i) => {
            const isCurrent = s.id === sectionId;
            const isPast = currentStepIdx >= 0 && i < currentStepIdx;
            const isLast = i === boardSections.length - 1;
            return (
              <button
                key={s.id}
                disabled={isReadOnly}
                onClick={() => setSectionId(s.id)}
                className="relative grid items-center gap-2.5 text-left cursor-pointer disabled:cursor-not-allowed group/step"
                style={{ gridTemplateColumns: "14px 1fr", minHeight: 30 }}
              >
                {/* connector */}
                {!isLast && (
                  <span
                    className="absolute"
                    style={{
                      left: 6.5,
                      top: 22,
                      bottom: -8,
                      width: 1,
                      background: "var(--cf-edge)",
                    }}
                  />
                )}
                <span
                  className="rounded-full flex items-center justify-center transition-all"
                  style={{
                    width: 13,
                    height: 13,
                    border: `1px solid ${
                      isCurrent ? "var(--cf-amber)" : "var(--cf-edge)"
                    }`,
                    background: "var(--cf-graphite-2)",
                  }}
                >
                  <span
                    className="rounded-full transition-all"
                    style={{
                      width: 5,
                      height: 5,
                      background: isCurrent
                        ? "var(--cf-amber)"
                        : isPast
                          ? "color-mix(in srgb, var(--cf-phosphor) 70%, var(--cf-edge))"
                          : "transparent",
                      boxShadow: isCurrent ? "0 0 7px var(--cf-amber)" : "none",
                    }}
                  />
                </span>
                <span
                  className="cf-mono uppercase transition-colors group-hover/step:text-[var(--cf-text)]"
                  style={{
                    fontSize: "10px",
                    letterSpacing: "0.12em",
                    fontWeight: isCurrent ? 700 : 400,
                    color: isCurrent
                      ? "var(--cf-amber)"
                      : isPast
                        ? "var(--cf-text-muted)"
                        : "var(--cf-text-dim)",
                  }}
                >
                  {s.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Signals — priority + due date */}
      <div
        className="flex flex-col gap-2.5 py-4 border-t"
        style={{
          borderColor: "color-mix(in srgb, var(--cf-edge) 60%, transparent)",
        }}
      >
        {clusterHead("Signals")}
        {subLabel("Priority")}
        <div
          className="flex rounded-md overflow-hidden"
          style={{ border: "1px solid var(--cf-edge)" }}
        >
          {PRIORITY_OPTS.map((opt, i) => {
            const isActive = priority === opt.value;
            return (
              <button
                key={opt.value}
                disabled={isReadOnly}
                onClick={() => setPriority(isActive ? null : opt.value)}
                style={{
                  fontSize: "9px",
                  letterSpacing: "0.14em",
                  color: isActive ? "#1c1a16" : opt.color,
                  background: isActive ? opt.color : "rgba(0,0,0,0.2)",
                  boxShadow: isActive
                    ? `inset 0 0 10px ${opt.color}55`
                    : "none",
                  borderLeft: i > 0 ? "1px solid var(--cf-edge)" : "none",
                }}
                className="cf-mono uppercase font-bold flex-1 py-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {subLabel("Due date")}
        <input
          type="date"
          disabled={isReadOnly}
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          style={{ fontSize: "12px" }}
          className="glass-input px-2 py-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed w-full"
        />
      </div>

      {/* CRM: Deal — amber LCD value readout, still an input */}
      {boardType === "crm" && (
        <div
          className="flex flex-col gap-2.5 py-4 border-t"
          style={{
            borderColor: "color-mix(in srgb, var(--cf-edge) 60%, transparent)",
          }}
        >
          {clusterHead("Deal")}
          <div
            className="flex items-baseline gap-2 rounded-md px-3 py-2"
            style={{
              background: "linear-gradient(to bottom, #101408, #0d1005)",
              border: "1px solid color-mix(in srgb, var(--cf-edge) 75%, black)",
              boxShadow: "inset 0 2px 8px rgba(0,0,0,0.6)",
            }}
          >
            <span
              className="cf-mono flex-shrink-0"
              style={{
                fontSize: "9px",
                letterSpacing: "0.15em",
                color: "var(--cf-text-dim)",
              }}
            >
              {currency} · {currencySymbol(currency)}
            </span>
            <input
              type="text"
              inputMode="decimal"
              disabled={isReadOnly}
              value={value}
              onChange={(e) => setValue(maskMoneyInput(e.target.value))}
              placeholder="0,00"
              style={{
                fontSize: "16px",
                letterSpacing: "0.05em",
                color: "var(--cf-amber)",
                textShadow:
                  "0 0 8px color-mix(in srgb, var(--cf-amber) 45%, transparent)",
                caretColor: "var(--cf-amber)",
              }}
              className="cf-mono flex-1 min-w-0 bg-transparent text-right focus:outline-none tabular-nums disabled:opacity-60 disabled:cursor-not-allowed placeholder:text-[var(--cf-text-dim)]"
            />
          </div>
        </div>
      )}

      {/* CRM: Contact — the client this deal represents. Their email is the
          recipient of any stage-triggered email automation (Settings → Email). */}
      {boardType === "crm" && (
        <div
          className="flex flex-col gap-2 py-4 border-t"
          style={{
            borderColor: "color-mix(in srgb, var(--cf-edge) 60%, transparent)",
          }}
        >
          {clusterHead("Contact")}
          <input
            type="text"
            disabled={isReadOnly}
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Name"
            className="glass-input w-full text-xs px-3 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <input
            type="email"
            disabled={isReadOnly}
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="client@email.com"
            className="glass-input w-full text-xs px-3 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <input
            type="tel"
            disabled={isReadOnly}
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="Phone (optional)"
            className="glass-input w-full text-xs px-3 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
      )}

      {/* Scrum: Sprint — points readout + estimate picker + sprint select */}
      {boardType === "scrum" && (
        <div
          className="flex flex-col gap-2.5 py-4 border-t"
          style={{
            borderColor: "color-mix(in srgb, var(--cf-edge) 60%, transparent)",
          }}
        >
          {clusterHead("Sprint")}
          <div
            className="flex items-baseline justify-between rounded-md px-3 py-2"
            style={{
              background: "linear-gradient(to bottom, #0d1410, #0a0f0b)",
              border: "1px solid color-mix(in srgb, var(--cf-edge) 75%, black)",
              boxShadow: "inset 0 2px 8px rgba(0,0,0,0.6)",
            }}
          >
            <span
              className="cf-mono"
              style={{
                fontSize: "9px",
                letterSpacing: "0.15em",
                color: "var(--cf-text-dim)",
              }}
            >
              STORY POINTS
            </span>
            <span
              className="cf-mono tabular-nums"
              style={{
                fontSize: "16px",
                letterSpacing: "0.05em",
                color: storyPoints
                  ? "var(--cf-phosphor)"
                  : "var(--cf-text-dim)",
                textShadow: storyPoints
                  ? "0 0 8px color-mix(in srgb, var(--cf-phosphor) 45%, transparent)"
                  : "none",
              }}
            >
              {storyPoints || "—"}
            </span>
          </div>
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
                borderColor:
                  storyPoints === ""
                    ? "var(--cf-text-muted)"
                    : "var(--cf-edge)",
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
          {canSuggest && (
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={suggestPoints}
                disabled={suggesting}
                className="ai-btn self-start"
              >
                {suggesting ? "Estimating…" : "Suggest"}
              </button>
              {rationale && (
                <span
                  className="cf-mono"
                  style={{
                    fontSize: "10px",
                    color: "var(--cf-text-dim)",
                    lineHeight: 1.4,
                  }}
                >
                  {rationale}
                </span>
              )}
              {suggestErr && (
                <span
                  className="cf-mono"
                  style={{ fontSize: "10px", color: "var(--cf-red)" }}
                >
                  {suggestErr}
                </span>
              )}
            </div>
          )}
          {subLabel("Sprint")}
          <select
            disabled={isReadOnly}
            value={sprintId ?? ""}
            onChange={(e) =>
              setSprintId(e.target.value === "" ? null : Number(e.target.value))
            }
            style={{ fontSize: "12px" }}
            className="glass-input px-2 py-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed w-full"
          >
            <option value="" className="text-black">
              Backlog (no sprint)
            </option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id} className="text-black">
                {s.name}
                {s.is_active ? " · active" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Links — GitHub PRs/issues + attached docs */}
      {(canUseLinks || canUseDocs) && (
        <div
          className="flex flex-col gap-2.5 py-4 border-t"
          style={{
            borderColor: "color-mix(in srgb, var(--cf-edge) 60%, transparent)",
          }}
        >
          {clusterHead("Links")}

          {canUseLinks && (
            <>
              <div className="flex items-center gap-1.5">
                <Icon
                  icon={faGithub}
                  style={{ fontSize: "11px", color: "var(--cf-text-dim)" }}
                />
                {subLabel("GitHub")}
              </div>

              {links.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {links.map((link) => {
                    const meta = link.state
                      ? LINK_STATE_META[link.state]
                      : null;
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
                            background: meta
                              ? `${meta.color}1a`
                              : "transparent",
                          }}
                        >
                          {meta?.label ??
                            (link.type === "issue" ? "Issue" : "PR")}
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
                                (e.currentTarget.style.color =
                                  "var(--cf-text-dim)")
                              }
                            >
                              <Icon
                                icon={faRotate}
                                style={{ fontSize: "9px" }}
                              />
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
                                (e.currentTarget.style.color =
                                  "var(--cf-text-dim)")
                              }
                            >
                              <Icon
                                icon={faTrash}
                                style={{ fontSize: "9px" }}
                              />
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
            </>
          )}

          {canUseDocs && (
            <>
              <div className="flex items-center gap-1.5">
                <Icon
                  icon={faPaperclip}
                  style={{ fontSize: "11px", color: "var(--cf-text-dim)" }}
                />
                {subLabel("Docs")}
              </div>

              {documents.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5"
                      style={{
                        background: "#211f1b",
                        border: "1px solid #38352e",
                      }}
                    >
                      <Icon
                        icon={faPaperclip}
                        style={{
                          fontSize: "11px",
                          color: "var(--cf-text-muted)",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleDownloadDoc(doc)}
                        className="flex-1 min-w-0 truncate text-left cf-mono hover:underline cursor-pointer"
                        style={{ fontSize: "11px", color: "var(--cf-text)" }}
                        title={`Download ${doc.original_name ?? "file"}`}
                      >
                        {doc.original_name ?? `document-${doc.id}`}
                        {doc.size != null && (
                          <span style={{ color: "var(--cf-text-dim)" }}>
                            {" "}
                            · {formatBytes(doc.size)}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadDoc(doc)}
                        aria-label="Download file"
                        title="Download"
                        className="w-5 h-5 rounded flex items-center justify-center cursor-pointer flex-shrink-0"
                        style={{ color: "var(--cf-text-dim)" }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.color = "var(--cf-cyan)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.color = "var(--cf-text-dim)")
                        }
                      >
                        <Icon icon={faDownload} style={{ fontSize: "9px" }} />
                      </button>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => handleDeleteDoc(doc.id)}
                          aria-label="Remove file"
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
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!isReadOnly && (
                <div className="flex items-center gap-1.5">
                  <input
                    ref={docInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.rtf,.odt,.ods,.odp,.zip"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadDoc(file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => docInputRef.current?.click()}
                    disabled={docBusy}
                    className="aero-btn aero-btn--cyan px-2.5 py-1.5 flex items-center gap-1.5 disabled:opacity-50"
                    style={{ fontSize: "11px" }}
                  >
                    <Icon
                      icon={docBusy ? faRotate : faPlus}
                      style={{ fontSize: "9px" }}
                    />
                    {docBusy ? "Uploading…" : "Attach a file"}
                  </button>
                </div>
              )}
              {docError && (
                <p
                  className="cf-mono"
                  style={{ fontSize: "9px", color: "var(--cf-red)" }}
                >
                  {docError}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div
          className="flex flex-col gap-2.5 py-4 border-t"
          style={{
            borderColor: "color-mix(in srgb, var(--cf-edge) 60%, transparent)",
          }}
        >
          <div
            className="flex items-center justify-between gap-2 relative"
            data-tag-picker
          >
            {clusterHead("Tags")}
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => {
                  setTagPickerOpen((v) => !v);
                  setTagQuery("");
                }}
                aria-expanded={tagPickerOpen}
                aria-haspopup="true"
                style={{ fontSize: "9px" }}
                className="aero-pill uppercase tracking-widest px-2 py-1 cursor-pointer font-bold inline-flex items-center gap-1.5 text-white/70 hover:text-white"
              >
                <Icon icon={faPlus} />
                Add
              </button>
            )}

            {tagPickerOpen && !isReadOnly && (
              <div
                className="aero-menu absolute right-0 top-full mt-1.5 z-50 p-2"
                style={{ width: "250px" }}
              >
                <input
                  ref={tagSearchRef}
                  value={tagQuery}
                  onChange={(e) => setTagQuery(e.target.value)}
                  placeholder="Find a tag"
                  className="w-full rounded px-2 py-1.5 mb-2"
                  style={{
                    fontSize: "11px",
                    background: "var(--cf-graphite-3)",
                    border: "1px solid var(--cf-edge)",
                    color: "var(--cf-text)",
                  }}
                />
                <div className="max-h-56 overflow-y-auto flex flex-col gap-2">
                  {(
                    [
                      ["Channel", tags.filter((t) => t.kind === "channel")],
                      ["Custom", tags.filter((t) => t.kind !== "channel")],
                    ] as const
                  ).map(([label, group]) => {
                    const hits = group.filter((t) =>
                      foldAccents(t.name).includes(
                        foldAccents(tagQuery.trim()),
                      ),
                    );
                    return hits.length === 0 ? null : (
                      <div key={label} className="flex flex-col gap-0.5">
                        <span
                          className="cf-mono uppercase px-1"
                          style={{
                            fontSize: "8px",
                            letterSpacing: "0.18em",
                            color: "var(--cf-text-dim)",
                          }}
                        >
                          {label}
                        </span>
                        {hits.map((tag) => {
                          const isActive = selectedTagIds.includes(tag.id);
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => toggleTag(tag.id)}
                              aria-pressed={isActive}
                              title={tag.name}
                              style={{
                                fontSize: "10px",
                                color: isActive ? "#1c1a16" : tag.color,
                                background: isActive
                                  ? tag.color
                                  : "transparent",
                              }}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded cf-mono uppercase tracking-widest font-bold cursor-pointer text-left transition-colors hover:bg-white/5"
                            >
                              <span
                                className="cf-led flex-shrink-0"
                                style={{
                                  background: tag.color,
                                  boxShadow: isActive
                                    ? "none"
                                    : `0 0 6px ${tag.color}`,
                                }}
                              />
                              <span className="truncate">{tag.name}</span>
                              <span
                                className="ml-auto flex-shrink-0"
                                style={{
                                  fontSize: "9px",
                                  visibility: isActive ? "visible" : "hidden",
                                }}
                              >
                                <Icon icon={faCheck} />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                  {tags.every(
                    (t) =>
                      !foldAccents(t.name).includes(
                        foldAccents(tagQuery.trim()),
                      ),
                  ) && (
                    <span
                      className="cf-mono px-2 py-1.5"
                      style={{ fontSize: "10px", color: "var(--cf-text-dim)" }}
                    >
                      No tag matches “{tagQuery.trim()}”
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Only the card's own tags — long names truncate rather than wrap. */}
          {selectedTags.length === 0 ? (
            <span
              className="cf-mono uppercase tracking-widest"
              style={{ fontSize: "9px", color: "var(--cf-text-dim)" }}
            >
              {isReadOnly ? "No tags" : "No tags — add one"}
            </span>
          ) : (
            <div className="flex gap-1 flex-wrap items-start">
              {/* Every tag shows its full name — channels keep their glyph as a
                  prefix, and long names wrap instead of truncating so nothing
                  has to be hovered to be read. */}
              {selectedTags.map((tag) => {
                const icon = channelIcon(tag);
                return (
                  <span
                    key={tag.id}
                    style={{
                      background: tag.color,
                      color: "#1c1a16",
                      boxShadow: `0 0 6px ${tag.color}55`,
                      fontSize: "9px",
                      letterSpacing: "0.04em",
                    }}
                    className="cf-mono uppercase px-1.5 py-0.5 rounded-sm font-bold inline-flex items-center gap-1"
                  >
                    {icon && (
                      <Icon
                        icon={icon}
                        className="flex-shrink-0"
                        style={{ fontSize: "10px" }}
                      />
                    )}
                    <span className="break-words">{tag.name}</span>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        aria-label={`Remove ${tag.name}`}
                        style={{ fontSize: "8px" }}
                        className="cursor-pointer opacity-50 hover:opacity-100 flex-shrink-0 transition-opacity"
                      >
                        <Icon icon={faXmark} />
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Template */}
      {(!isReadOnly || templates.length > 0) && (
        <div
          className="flex flex-col gap-2.5 py-4 border-t"
          style={{
            borderColor: "color-mix(in srgb, var(--cf-edge) 60%, transparent)",
          }}
        >
          {clusterHead("Template", "off")}
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

      {canSuggest && (
        <div
          className="flex flex-col gap-1 py-4 border-t"
          style={{
            borderColor: "color-mix(in srgb, var(--cf-edge) 60%, transparent)",
          }}
        >
          <button
            type="button"
            onClick={runTriage}
            disabled={triaging}
            className="ai-btn self-start"
          >
            {triaging ? "Triaging…" : "AI triage"}
          </button>
          {triageMsg && (
            <span
              className="cf-mono"
              style={{
                fontSize: "10px",
                color: "var(--cf-text-dim)",
                lineHeight: 1.4,
              }}
            >
              {triageMsg}
            </span>
          )}
          {triageErr && (
            <span
              className="cf-mono"
              style={{ fontSize: "10px", color: "var(--cf-red)" }}
            >
              {triageErr}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
