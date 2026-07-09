"use client";

import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  faCheck,
  faPlus,
  faTrash,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";
import Icon from "@/components/ui/Icon";
import type { BoardInterface, SectionData } from "@/interfaces/BoardInterface";
import {
  createSection,
  deleteSection,
  reorderSections,
  updateBoard,
  updateSection,
} from "@/lib/api";
import { type Feedback, FeedbackBanner, PanelHeading } from "./shared";

const SECTION_COLORS = [
  "#4CAF50",
  "#FF9800",
  "#1976D2",
  "#F44336",
  "#7B1FA2",
  "#FFC107",
];
const BACKLOG_NAME = "Backlog";
const isReserved = (n: string) =>
  n.trim().toLowerCase() === BACKLOG_NAME.toLowerCase();

interface Props {
  board: BoardInterface;
  onChange: (sections: SectionData[]) => void;
  onBoardPatch?: (patch: Partial<BoardInterface>) => void;
}

function SortableRow({
  section,
  index,
  color,
  onRename,
  onDelete,
  isCrm,
  onSetAging,
}: {
  section: SectionData;
  index: number;
  color: string;
  onRename: (id: number, name: string) => void;
  onDelete: (id: number) => void;
  isCrm: boolean;
  onSetAging: (id: number, hours: number | null) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(section.name);
  const [confirm, setConfirm] = useState(false);

  const commit = () => {
    const name = draft.trim();
    if (name && name !== section.name && !isReserved(name))
      onRename(section.id, name);
    else setDraft(section.name);
    setEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? undefined,
        zIndex: isDragging ? 10 : undefined,
        boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.5)" : undefined,
      }}
      className="glass-card flex items-center gap-3 rounded-lg px-3 py-2.5"
    >
      <button
        {...attributes}
        {...listeners}
        style={{ touchAction: "none", color: "rgba(42,38,32,0.45)" }}
        className="cursor-grab active:cursor-grabbing flex-shrink-0 p-1 -m-1 hover:opacity-70"
        tabIndex={-1}
        aria-label="Drag to reorder"
      >
        <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
          <circle cx="3" cy="3" r="1.5" />
          <circle cx="9" cy="3" r="1.5" />
          <circle cx="3" cy="8" r="1.5" />
          <circle cx="9" cy="8" r="1.5" />
          <circle cx="3" cy="13" r="1.5" />
          <circle cx="9" cy="13" r="1.5" />
        </svg>
      </button>
      <div
        style={{ backgroundColor: color }}
        className="neon-dot w-2 h-2 rounded-full flex-shrink-0"
      />

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(section.name);
              setEditing(false);
            }
          }}
          onBlur={commit}
          className="glass-input cf-lcd text-sm flex-1 py-1"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="cf-label text-xs uppercase tracking-widest font-bold flex-1 truncate text-left cursor-text"
          style={{ color: "var(--cf-ink)" }}
          title="Click to rename"
        >
          {section.name}
        </button>
      )}

      {/* CRM: per-stage SLA aging threshold (hours). Blank = no aging. */}
      {isCrm && (
        <div className="flex items-center gap-1 flex-shrink-0" title="Cards turn red after this many hours in this stage. Blank = off.">
          <input
            type="number"
            min={1}
            defaultValue={section.aging_hours ?? ""}
            onBlur={(e) => {
              const raw = e.target.value.trim();
              const n = raw === "" ? null : Math.max(1, parseInt(raw, 10) || 0) || null;
              if (n !== (section.aging_hours ?? null)) onSetAging(section.id, n);
            }}
            placeholder="SLA"
            className="glass-input cf-lcd text-xs py-1 w-16 text-center"
            style={{ color: "var(--cf-ink)" }}
          />
          <span className="cf-mono" style={{ fontSize: "9px", color: "rgba(42,38,32,0.55)" }}>h</span>
        </div>
      )}

      <span
        className="cf-mono text-[10px]"
        style={{ color: "rgba(42,38,32,0.55)" }}
      >
        {index + 1}
      </span>

      {confirm ? (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span
            className="uppercase"
            style={{
              fontSize: "9px",
              letterSpacing: "0.1em",
              color: "var(--cf-red)",
            }}
          >
            Delete?
          </span>
          <button
            onClick={() => {
              onDelete(section.id);
              setConfirm(false);
            }}
            aria-label="Confirm delete"
            className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer"
            style={{
              background: "rgba(255,90,77,0.16)",
              border: "1px solid rgba(255,90,77,0.55)",
              color: "var(--cf-red)",
            }}
          >
            <Icon icon={faCheck} style={{ fontSize: "10px" }} />
          </button>
          <button
            onClick={() => setConfirm(false)}
            aria-label="Cancel delete"
            className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer"
            style={{
              border: "1px solid var(--cf-edge)",
              color: "var(--cf-text-muted)",
            }}
          >
            <Icon icon={faXmark} style={{ fontSize: "10px" }} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirm(true)}
          aria-label={`Delete ${section.name}`}
          title="Delete column"
          className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer flex-shrink-0"
          style={{ color: "var(--cf-text-dim)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--cf-red)")}
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--cf-text-dim)")
          }
        >
          <Icon icon={faTrash} style={{ fontSize: "11px" }} />
        </button>
      )}
    </div>
  );
}

export default function ColumnsTab({ board, onChange, onBoardPatch }: Props) {
  const backlog = board.sections.find((s) => s.name === BACKLOG_NAME) ?? null;
  const [rows, setRows] = useState<SectionData[]>(
    board.sections.filter((s) => s !== backlog),
  );
  const [adding, setAdding] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  // Which column marks a card done/closed. CRM → the "won" stage; else "done".
  const [doneSectionId, setDoneSectionId] = useState<number | null>(
    board.done_section_id ?? null,
  );
  const isCrm = board.type === "crm";
  const doneLabel = isCrm ? "Won column (closed deal)" : "Done column";
  const doneVerb = isCrm ? "won" : "done";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  );

  // Persist the full order (backlog pinned last) after any structural change.
  const persistOrder = (next: SectionData[]) => {
    const full = backlog ? [...next, backlog] : next;
    onChange(full);
    reorderSections(
      board.id,
      full.map((s) => s.id),
    ).catch(() =>
      setFeedback({ type: "error", message: "Could not save column order." }),
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rows.findIndex((s) => s.id === active.id);
    const newIndex = rows.findIndex((s) => s.id === over.id);
    const next = arrayMove(rows, oldIndex, newIndex);
    setRows(next);
    persistOrder(next);
  };

  const handleRename = async (id: number, name: string) => {
    const prev = rows;
    const next = rows.map((s) => (s.id === id ? { ...s, name } : s));
    setRows(next);
    onChange(backlog ? [...next, backlog] : next);
    try {
      await updateSection(board.id, id, { name });
    } catch {
      setRows(prev);
      setFeedback({ type: "error", message: "Rename failed." });
    }
  };

  const handleDelete = async (id: number) => {
    const prev = rows;
    const next = rows.filter((s) => s.id !== id);
    setRows(next);
    onChange(backlog ? [...next, backlog] : next);
    // The backend clears done_section_id on delete (nullOnDelete); mirror it here.
    if (id === doneSectionId) {
      setDoneSectionId(null);
      onBoardPatch?.({ done_section_id: null });
    }
    try {
      await deleteSection(board.id, id);
    } catch {
      setRows(prev);
      setFeedback({ type: "error", message: "Delete failed." });
    }
  };

  const handleSetDone = async (raw: string) => {
    const next = raw === "" ? null : Number(raw);
    const prev = doneSectionId;
    setDoneSectionId(next);
    onBoardPatch?.({ done_section_id: next });
    try {
      await updateBoard(board.id, { done_section_id: next });
    } catch {
      setDoneSectionId(prev);
      onBoardPatch?.({ done_section_id: prev });
      setFeedback({
        type: "error",
        message: `Could not save the ${doneVerb} column.`,
      });
    }
  };

  const handleSetAging = async (id: number, hours: number | null) => {
    const prev = rows;
    const next = rows.map((s) => (s.id === id ? { ...s, aging_hours: hours } : s));
    setRows(next);
    onChange(backlog ? [...next, backlog] : next);
    try {
      await updateSection(board.id, id, { aging_hours: hours });
    } catch {
      setRows(prev);
      setFeedback({ type: "error", message: "Could not save SLA." });
    }
  };

  const handleAdd = async () => {
    const name = adding.trim();
    if (!name) return;
    if (isReserved(name)) {
      setFeedback({ type: "error", message: "“Backlog” is reserved." });
      return;
    }
    setFeedback(null);
    try {
      const saved: SectionData = await createSection(board.id, name);
      const next = [...rows, saved];
      setRows(next);
      setAdding("");
      persistOrder(next);
    } catch {
      setFeedback({ type: "error", message: "Could not create column." });
    }
  };

  return (
    <div className="glass-panel p-6 flex flex-col gap-5">
      <PanelHeading>Columns</PanelHeading>
      <FeedbackBanner feedback={feedback} />

      {/* Done/won column — which stage marks a card as done/closed. */}
      <div
        className="flex flex-col gap-1.5 pb-4 border-b"
        style={{ borderColor: "var(--cf-edge)" }}
      >
        <label
          className="cf-label uppercase tracking-widest font-bold"
          style={{ fontSize: "10px", color: "var(--cf-text-muted)" }}
        >
          {doneLabel}
        </label>
        <select
          value={doneSectionId ?? ""}
          onChange={(e) => handleSetDone(e.target.value)}
          className="glass-input cf-lcd text-sm cursor-pointer"
        >
          <option value="" className="text-black">
            None — a column named “Done”
          </option>
          {rows.map((s) => (
            <option key={s.id} value={s.id} className="text-black">
              {s.name}
            </option>
          ))}
        </select>
        <span
          className="cf-mono text-[10px]"
          style={{ color: "var(--cf-text-muted)" }}
        >
          Moving a card into this column marks it as {doneVerb}
          {isCrm ? " — and the deal stops aging." : "."}
        </span>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext
          items={rows.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {rows.map((s, i) => (
              <SortableRow
                key={s.id}
                section={s}
                index={i}
                color={SECTION_COLORS[i % SECTION_COLORS.length]}
                onRename={handleRename}
                onDelete={handleDelete}
                isCrm={board.type === "crm"}
                onSetAging={handleSetAging}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {backlog && (
        <div className="glass-card flex items-center gap-3 rounded-lg px-3 py-2.5 opacity-70">
          <span style={{ width: 20 }} />
          <div
            style={{ backgroundColor: "var(--cf-amber)" }}
            className="neon-dot w-2 h-2 rounded-full flex-shrink-0"
          />
          <span
            className="cf-label text-xs uppercase tracking-widest font-bold flex-1 truncate"
            style={{ color: "var(--cf-text)" }}
          >
            {backlog.name}
          </span>
          <span
            className="cf-mono text-[9px] uppercase"
            style={{ color: "var(--cf-text-dim)" }}
          >
            reserved
          </span>
        </div>
      )}

      <p
        className="cf-mono text-[10px]"
        style={{ color: "var(--cf-text-muted)" }}
      >
        Drag to reorder · click a name to rename.
      </p>

      {/* Add column */}
      <div
        className="flex items-center gap-2 pt-2 border-t"
        style={{ borderColor: "var(--cf-edge)" }}
      >
        <input
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          placeholder="New column name…"
          className="glass-input cf-lcd text-sm flex-1"
        />
        <button
          onClick={handleAdd}
          disabled={!adding.trim()}
          className="aero-btn aero-btn--cyan px-4 py-2 inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          <Icon icon={faPlus} style={{ fontSize: "10px" }} /> Add
        </button>
      </div>
    </div>
  );
}
