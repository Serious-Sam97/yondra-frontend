"use client";

import { memo, useRef } from "react";
import type { BoardType } from "@/interfaces/BoardInterface";
import type { CardInterface } from "@/interfaces/CardInterface";
import { useAged } from "@/lib/aging";
import { formatMoney } from "@/lib/currency";
import { Draggable } from "../shared/Draggable";

// Console palette with dark-ink initials (the app-wide avatarColor keeps white
// text, which these brighter hues can't carry).
const AVATAR_COLORS = [
  "#ffb000",
  "#ff5a4d",
  "#6fe0ff",
  "#9aa67e",
  "#e08c3a",
  "#ff6fd8",
  "#a78bfa",
  "#22c55e",
];

// Cassette-futurism status-LED colors keyed to priority
const PRIORITY_COLORS: Record<string, string> = {
  high: "var(--cf-red)",
  medium: "var(--cf-amber)",
  low: "var(--cf-phosphor)",
};

// Ink levels on the graphite cartridge face
const INK_DIM = "rgba(232,228,214,0.55)";
const INK_FAINT = "rgba(232,228,214,0.5)";

const SPRING = "cubic-bezier(0.34, 1.56, 0.64, 1)";
const REST_SHADOW =
  "inset 0 1px 0 rgba(255,255,255,0.12), 0 6px 16px rgba(0,0,0,0.45)";

function resetCard(
  el: HTMLDivElement,
  transition = `transform 400ms ${SPRING}, box-shadow 400ms ${SPRING}`,
) {
  el.style.transition = transition;
  el.style.transform = "";
  el.style.boxShadow = "";
  el.style.zIndex = "";
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Avatar({
  user,
  size = 18,
}: {
  user: { id: number; name: string };
  size?: number;
}) {
  return (
    <div
      style={{
        backgroundColor: AVATAR_COLORS[user.id % AVATAR_COLORS.length],
        fontSize: size * 0.45,
        width: size,
        height: size,
        color: "#1c1a15",
        border: "1.5px solid #232220",
        boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
      }}
      className="cf-mono rounded-full flex items-center justify-center font-bold flex-shrink-0"
      title={user.name}
    >
      {initials(user.name)}
    </div>
  );
}

function DueDateBadge({ dueDate }: { dueDate: string }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);

  let label = due.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  let led = "var(--cf-cyan)";
  let ink = "var(--cf-text)";
  if (diff < 0) {
    led = "var(--cf-red)";
    ink = "var(--cf-red)";
    label = `${label} OVERDUE`;
  } else if (diff === 0) {
    led = "var(--cf-amber)";
    ink = "var(--cf-amber)";
    label = "TODAY";
  } else if (diff <= 2) {
    led = "var(--cf-amber)";
  } else {
    led = "var(--cf-cyan)";
  }

  return (
    <span className="kc-chip flex-shrink-0">
      <span
        className="cf-led flex-shrink-0"
        style={{
          background: led,
          boxShadow: `0 0 5px ${led}`,
          width: 5,
          height: 5,
        }}
      />
      <span style={{ color: ink }}>{label}</span>
    </span>
  );
}

// The description is rich-text HTML. Derive the cover from its first image, and a
// plain-text snippet (tags stripped) for the small card preview.
function firstImageSrc(html?: string): string | null {
  if (!html) return null;
  const m = html.match(/<img[^>]+src="([^"]+)"/i);
  return m ? m[1] : null;
}
function stripHtml(html?: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// Memoized: card fields arrive spread from a stable card object (Board only
// replaces the objects that actually changed), so untouched cards skip
// re-rendering when their Section re-renders.
export const Card = memo(function Card({
  id,
  name,
  description,
  assigned_user,
  created_by,
  tags,
  due_date,
  priority,
  checklist_items,
  updated_at,
  done_at,
  ticket_key,
  value,
  story_points,
  parent_card_id,
  parent_ticket_key,
  subtasks_count,
  done_subtasks_count,
  section_entered_at,
  overlay,
  boardType = "kanban",
  currency = "BRL",
  agingHours,
}: CardInterface & {
  color: string;
  overlay?: boolean;
  boardType?: BoardType;
  currency?: string;
  agingHours?: number | null;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  const showBottom = assigned_user || created_by;
  const priorityColor = priority ? PRIORITY_COLORS[priority] : null;
  const coverSrc = firstImageSrc(description);
  const descText = stripHtml(description);

  // CRM deal value (Laravel serializes decimals as strings).
  const hasValue =
    boardType === "crm" &&
    value !== null &&
    value !== undefined &&
    value !== "";

  // SLA aging ("rot"): a CRM deal that has sat in its stage past the stage's
  // aging_hours threshold turns red — spot overdue deals without opening the card.
  // useAged re-renders exactly when the threshold passes, so an open board flips live.
  const aged =
    boardType === "crm" && useAged(section_entered_at, agingHours, done_at);

  // First tag anodizes the casing; priority (or aging, which outranks it)
  // claims the glowing left rail.
  const tagColor = tags && tags.length > 0 ? tags[0].color : null;
  const railColor = aged ? "var(--cf-red)" : (priorityColor ?? "transparent");

  const doneItems = (checklist_items ?? []).filter((i) => i.is_done).length;
  const totalItems = (checklist_items ?? []).length;

  const hasStrip =
    (tags && tags.length > 0) ||
    hasValue ||
    aged ||
    (boardType === "scrum" && story_points != null) ||
    priorityColor ||
    done_at ||
    (subtasks_count ?? 0) > 0;

  // ── Subtle cursor-follow tilt: card leans toward the cursor, clean light shadow ──
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 … 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    const shadowX = -x * 8 + 2;
    const shadowY = -y * 8 + 6;

    el.style.transition = `box-shadow 80ms ease-out`;
    el.style.transform = `perspective(600px) rotateX(${-y * 5}deg) rotateY(${x * 5}deg) translateY(-3px) scale(1.01)`;
    el.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.12), ${shadowX}px ${shadowY}px 20px rgba(0,0,0,0.5)`;
    el.style.zIndex = "10";
  };

  const handleMouseLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    resetCard(el);
  };

  // ── Press depth: card dents slightly on click ────────────────────────────
  const handlePointerDown = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transition = `transform 60ms ease-out, box-shadow 60ms ease-out`;
    el.style.transform = `perspective(600px) translateY(1px) scale(0.99)`;
    el.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 6px rgba(0,0,0,0.4)`;
  };

  const handlePointerUp = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transition = `transform 350ms ${SPRING}, box-shadow 350ms ${SPRING}`;
    el.style.transform = `perspective(600px) translateY(-3px) scale(1.01)`;
    el.style.boxShadow = REST_SHADOW;
  };

  // Fires when dnd-kit captures the pointer — resets pressed state cleanly
  const handlePointerCancel = () => {
    const el = cardRef.current;
    if (!el) return;
    resetCard(el, "none");
  };

  const handlePointerLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    resetCard(el);
  };

  const body = (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerLeave}
      style={
        {
          minHeight: "56px",
          willChange: "transform",
          "--kc-ac": tagColor ?? "transparent",
          "--kc-rail": railColor,
        } as React.CSSProperties
      }
      className={`kc-card cursor-pointer flex flex-col overflow-hidden${
        aged ? " kc-card--aged" : ""
      }${done_at ? " kc-card--done" : ""}`}
    >
      {/* priority / aging rail + tag backlight wash */}
      <span className="kc-rail" />
      {!coverSrc && <span className="kc-wash" />}

      {/* Cover — first image embedded in the description, full-bleed above the body */}
      {coverSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverSrc}
          alt=""
          style={{
            height: "120px",
            borderBottom: "1px solid rgba(0,0,0,0.4)",
          }}
          className="w-full object-cover flex-shrink-0"
        />
      )}

      {/* Body */}
      <div className="pl-3.5 pr-3 pt-2.5 pb-3 flex flex-col gap-1.5 flex-1 relative">
        {/* Ticket key (+ ↳ epic for subtasks) top-left, due date docked top-right */}
        {(ticket_key || due_date || parent_card_id) && (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 min-w-0">
              {ticket_key && (
                <span
                  className="cf-mono font-bold tracking-wider"
                  style={{
                    color: INK_FAINT,
                    fontSize: "10px",
                    letterSpacing: "0.08em",
                  }}
                >
                  {ticket_key}
                </span>
              )}
              {parent_card_id && (
                <span
                  className="cf-mono inline-flex items-center rounded truncate flex-shrink-0"
                  style={{
                    fontSize: "9px",
                    letterSpacing: "0.04em",
                    padding: "1px 5px",
                    color: "var(--cf-phosphor)",
                    background:
                      "color-mix(in srgb, var(--cf-phosphor) 12%, transparent)",
                    border:
                      "1px solid color-mix(in srgb, var(--cf-phosphor) 40%, transparent)",
                  }}
                  title={`Subtask of epic ${parent_ticket_key ?? ""}`}
                >
                  ↳ {parent_ticket_key ?? "epic"}
                </span>
              )}
            </span>
            {due_date && <DueDateBadge dueDate={due_date} />}
          </div>
        )}

        <p
          style={{
            color: "var(--cf-cream)",
            fontSize: "13px",
            lineHeight: "1.3",
          }}
          className="font-bold"
        >
          {name}
        </p>

        {/* One wrapping strip: tags, value, aging, points, priority, done stamp */}
        {hasStrip && (
          <div className="flex flex-wrap gap-1">
            {(subtasks_count ?? 0) > 0 && (
              <span className="kc-chip" title="Subtasks done / total">
                <span style={{ color: "var(--cf-text)" }}>
                  ↳ {done_subtasks_count ?? 0}/{subtasks_count}
                </span>
              </span>
            )}
            {(tags ?? []).map((tag) => (
              <span key={tag.id} className="kc-chip">
                <span
                  className="cf-led flex-shrink-0"
                  style={{
                    background: tag.color,
                    boxShadow: `0 0 5px ${tag.color}`,
                    width: 5,
                    height: 5,
                  }}
                />
                <span style={{ color: "var(--cf-text)" }}>{tag.name}</span>
              </span>
            ))}
            {hasValue && (
              <span
                className="kc-chip font-bold"
                style={{ fontSize: "10px", letterSpacing: "0.02em" }}
              >
                <span
                  className="cf-led flex-shrink-0"
                  style={{
                    background: "var(--cf-phosphor)",
                    boxShadow: "0 0 5px var(--cf-phosphor)",
                    width: 5,
                    height: 5,
                  }}
                />
                <span style={{ color: "var(--cf-phosphor)" }}>
                  {formatMoney(value, currency)}
                </span>
              </span>
            )}
            {aged && (
              <span
                className="kc-chip"
                title="This deal has been in its stage past the SLA limit"
              >
                <span
                  className="cf-led flex-shrink-0"
                  style={{
                    background: "var(--cf-red)",
                    boxShadow: "0 0 5px var(--cf-red)",
                    width: 5,
                    height: 5,
                  }}
                />
                <span style={{ color: "var(--cf-red)" }}>Aging</span>
              </span>
            )}
            {boardType === "scrum" && story_points != null && (
              <span className="kc-chip" title="Story points">
                <span
                  className="cf-led flex-shrink-0"
                  style={{
                    background: "var(--cf-cyan)",
                    boxShadow: "0 0 5px var(--cf-cyan)",
                    width: 5,
                    height: 5,
                  }}
                />
                <span style={{ color: "var(--cf-text)" }}>
                  {story_points} pts
                </span>
              </span>
            )}
            {priorityColor && (
              <span className="kc-chip">
                <span
                  className="cf-led flex-shrink-0"
                  style={{
                    background: priorityColor,
                    boxShadow: `0 0 5px ${priorityColor}`,
                    width: 5,
                    height: 5,
                  }}
                />
                <span style={{ color: priorityColor }}>{priority}</span>
              </span>
            )}
            {/* Done stamp — plays the slam animation on every render where done_at is set */}
            {done_at && (
              <span key={done_at} className="kc-stamp stamp-in">
                ✓ done ·{" "}
                {new Date(done_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}{" "}
                {new Date(done_at).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        )}

        {descText && (
          <p
            style={{ color: INK_DIM, fontSize: "11px", lineHeight: "1.4" }}
            className="line-clamp-3"
          >
            {descText}
          </p>
        )}

        {/* Checklist progress: inset phosphor bar + LCD counter */}
        {totalItems > 0 && (
          <div className="flex items-center gap-2 mt-0.5">
            <div
              className="flex-1 h-1.5 rounded-sm overflow-hidden"
              style={{
                background: "#0d1410",
                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.8)",
              }}
            >
              <div
                className="h-full"
                style={{
                  width: `${(doneItems / totalItems) * 100}%`,
                  background: "#9aa67e",
                  boxShadow: "0 0 6px #9aa67e",
                  transition: "width 300ms cubic-bezier(0.16,1,0.3,1)",
                }}
              />
            </div>
            <span
              style={{
                fontSize: "14px",
                lineHeight: 1,
                color: "var(--cf-phosphor)",
              }}
              className="cf-lcd flex-shrink-0 tabular-nums"
            >
              {doneItems}/{totalItems}
            </span>
          </div>
        )}

        {/* Bottom row: creator left, assignee right */}
        {showBottom && (
          <div className="mt-auto pt-1 flex items-center justify-between">
            {created_by ? (
              <div
                className="flex items-center gap-1"
                title={`Created by ${created_by.name}`}
              >
                <Avatar user={created_by} />
                <span
                  style={{ color: INK_FAINT, fontSize: "10px" }}
                  className="cf-mono truncate"
                >
                  {created_by.name.split(" ")[0]}
                </span>
              </div>
            ) : (
              <div />
            )}

            {assigned_user && (
              <div title={`Assigned to ${assigned_user.name}`}>
                <Avatar user={assigned_user} size={16} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // The DragOverlay copy must NOT register a sortable: useSortable is keyed by id, and a
  // second registration with the list copy's id makes the two fight over dnd-kit's registry
  // (each re-registration invalidates the other → nested updates → React #185 crash).
  if (overlay) return body;

  return <Draggable id={`draggable-${id}`}>{body}</Draggable>;
});
