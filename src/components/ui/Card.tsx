"use client";

import { memo, useMemo } from "react";
import type { BoardType } from "@/interfaces/BoardInterface";
import type { CardInterface } from "@/interfaces/CardInterface";
import { useAged } from "@/lib/aging";
import {
  artKindFor,
  barcode,
  cardInks,
  coverArt,
  spineArt,
} from "@/lib/boardArt";
import { formatMoney } from "@/lib/currency";
import { channelIcon } from "@/lib/tags";
import { avatarColor, initials } from "@/lib/ui";
import { Draggable } from "../shared/Draggable";
import { SvgArt } from "./SvgArt";

// How many named tags a card prints before the rest collapse into "+N".
const CARD_TAG_LIMIT = 3;
// A card untouched this long reads as "aged tape".
const IDLE_DAYS = 7;
// A month untouched: the card grows cobwebs (and Vortex calls it cursed).
const CURSED_DAYS = 30;
const DAY = 86_400_000;

function firstImageSrc(html?: string): string | null {
  if (!html) return null;
  const m = html.match(/<img[^>]+src="([^"]+)"/i);
  if (!m) return null;
  // The src is a raw attribute value, so entities are still encoded; React's `src`
  // prop won't decode them (signed URLs would break on `&amp;`).
  return m[1]
    .replace(/&amp;/g, "&")
    .replace(/&#38;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function shortDate(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T00:00:00`)
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
}

function daysSince(iso?: string | null, now = Date.now()): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((now - t) / DAY);
}

function durationLabel(iso?: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return "";
  if (ms < 3_600_000) return "NOW";
  if (ms < DAY) return `${Math.floor(ms / 3_600_000)}H`;
  return `${Math.floor(ms / DAY)}D`;
}

function MiniAvatar({ user }: { user: { id: number; name: string } }) {
  return (
    <span
      className="mt-av"
      style={{ backgroundColor: avatarColor(user.id) }}
      title={user.name}
    >
      {initials(user.name)}
    </span>
  );
}

// "J-card" tape insert (design/board-final.png): generated two-ink cover art, a
// cream paper body, stickers for status (due / late / playing / jam / idle) and a
// colour spine with printed art carrying crew, progress, barcode and points.
// Memoized: Board only replaces card objects that actually changed.
export const Card = memo(function Card({
  id,
  name,
  description,
  assigned_user,
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
  blocked_reason,
  blocked_at,
  comments_count,
  overlay,
  playing,
  boardType = "kanban",
  currency = "BRL",
  agingHours,
}: CardInterface & {
  color?: string;
  overlay?: boolean;
  // Set by the rack for in-progress channels: shows the "▶ Playing" sticker.
  playing?: boolean;
  boardType?: BoardType;
  currency?: string;
  agingHours?: number | null;
}) {
  const [a, b] = cardInks({ id, tags });
  const kind = artKindFor(id);
  const seed = typeof id === "number" ? id : 1;
  const uid = String(id).replace(/[^a-z0-9]/gi, "");
  const coverSrc = firstImageSrc(description);

  const cover = useMemo(
    () =>
      coverSrc
        ? null
        : coverArt(kind, a, b, seed, `${uid}${overlay ? "o" : ""}`),
    [coverSrc, kind, a, b, seed, uid, overlay],
  );
  const spine = useMemo(
    () => spineArt(kind, a, b, seed, `${uid}${overlay ? "o" : ""}`),
    [kind, a, b, seed, uid, overlay],
  );

  // CRM SLA aging (stage past its threshold) and plain staleness both read as aged tape.
  const agedBySla = useAged(section_entered_at, agingHours, done_at);
  const slaAged = boardType === "crm" && agedBySla;
  const idleDays = done_at ? null : daysSince(updated_at);
  const idle = idleDays != null && idleDays >= IDLE_DAYS;
  const aged = slaAged || idle;
  const cursed = idleDays != null && idleDays >= CURSED_DAYS;
  // Tape rot (shown only while Vortex is around): fades at 2 weeks, molds at
  // 3, melts at a month.
  const rot =
    idleDays == null
      ? 0
      : idleDays >= CURSED_DAYS
        ? 3
        : idleDays >= 21
          ? 2
          : idleDays >= 14
            ? 1
            : 0;

  const jammed = !!blocked_reason;
  const isPlaying = !!playing && !done_at && !jammed;

  let due: { label: string; late: boolean } | null = null;
  let lateDays = 0;
  if (due_date && !done_at) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round(
      (new Date(`${due_date.slice(0, 10)}T00:00:00`).getTime() -
        today.getTime()) /
        DAY,
    );
    if (diff < 0) {
      due = { label: shortDate(due_date), late: true };
      lateDays = -diff;
    } else if (diff <= 3)
      due = { label: diff === 0 ? "TODAY" : shortDate(due_date), late: false };
  }

  const cardTags = tags ?? [];
  const namedTags = cardTags.filter((t) => !channelIcon(t));
  const shownTags = namedTags.slice(0, CARD_TAG_LIMIT);
  const extraTags = namedTags.length - shownTags.length;

  const doneItems = (checklist_items ?? []).filter((i) => i.is_done).length;
  const totalItems = (checklist_items ?? []).length;
  const subTotal = subtasks_count ?? 0;
  const progress =
    subTotal > 0
      ? [done_subtasks_count ?? 0, subTotal]
      : totalItems > 0
        ? [doneItems, totalItems]
        : null;

  const hasValue =
    boardType === "crm" &&
    value !== null &&
    value !== undefined &&
    value !== "";

  const catLabel = parent_card_id
    ? `${parent_ticket_key ?? "EPIC"} EP`
    : ticket_key && seed % 2 === 0
      ? ticket_key.replace("-", " · ")
      : "SIDE A";

  const blockedFor = blocked_at ? durationLabel(blocked_at).toLowerCase() : "";

  const body = (
    <div
      className={`mt-jx${isPlaying ? " is-playing" : ""}${jammed ? " is-jammed" : ""}${aged ? " is-aged" : ""}${overlay ? " is-overlay" : ""}`}
      style={{ "--a": a, "--b": b } as React.CSSProperties}
      data-card-id={id}
      // Hooks for the Vortex mascot (reads only — see components/vortex).
      data-vx-key={overlay ? undefined : (ticket_key ?? undefined)}
      data-vx-late={!overlay && lateDays > 0 ? lateDays : undefined}
      data-vx-jam={!overlay && jammed ? "1" : undefined}
      data-vx-cursed={!overlay && cursed ? "1" : undefined}
      data-vx-rot={!overlay && rot ? rot : undefined}
      data-vx-idle={!overlay && cursed ? (idleDays ?? undefined) : undefined}
    >
      {/* untouched for a month: cobwebs (Vortex calls it cursed) */}
      {cursed && !overlay && <span className="mt-web" aria-hidden />}
      {rot >= 2 && !overlay && (
        <span className={`mt-rot l${rot}`} aria-hidden />
      )}
      <div className="art">
        {coverSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverSrc} alt="" loading="lazy" />
        ) : (
          <SvgArt svg={cover ?? ""} />
        )}
        <span className="cat">{catLabel}</span>
        <span className="side">A</span>
      </div>

      {due && (
        <span className={`mt-stk due${due.late ? " late" : ""}`}>
          {due.late ? "Late" : "Due"}
          <b>{due.label}</b>
        </span>
      )}
      {jammed && (
        <span className="mt-stk jam">
          <span>JAM</span>
        </span>
      )}
      {isPlaying && (
        <span className="mt-stk play">
          Playing {durationLabel(section_entered_at ?? updated_at)}
        </span>
      )}
      {idle && !jammed && (
        <span className="mt-stk idle">◷ {idleDays}D idle</span>
      )}

      <div className="body">
        <div className="k">
          {ticket_key && <b>{ticket_key}</b>}
          {parent_card_id && (
            <span className="ep">↳ {parent_ticket_key ?? "epic"}</span>
          )}
          {priority === "high" && !ticket_key && <b>HIGH</b>}
        </div>
        <div className="tt">{name}</div>
        {(shownTags.length > 0 || slaAged) && (
          <div className="tags">
            {shownTags.map((t) => (
              <span key={t.id}>
                <i style={{ background: t.color }} />
                {t.name}
              </span>
            ))}
            {extraTags > 0 && <span>+{extraTags}</span>}
            {slaAged && (
              <span style={{ color: "#b8352a" }}>
                <i style={{ background: "#e2402f" }} />
                Past SLA
              </span>
            )}
          </div>
        )}
        {jammed && (
          <div className="jamnote">
            {blocked_reason}
            {blockedFor ? ` · ${blockedFor}` : ""}
          </div>
        )}
      </div>

      <div className="fold">
        <SvgArt className="sp" svg={spine} />
        {/* Who is playing this tape: the assignee only (the creator isn't
            shown, so an avatar always means "assigned"). */}
        {assigned_user ? (
          <span className="mt-who" title={`Assigned to ${assigned_user.name}`}>
            <MiniAvatar user={assigned_user} />
            <span className="nm">{assigned_user.name.split(" ")[0]}</span>
          </span>
        ) : (
          <span className="mt-who empty" title="Unassigned">
            <i aria-hidden />
            <span className="nm">Open</span>
          </span>
        )}
        {progress && (
          <span
            className="m"
            title={subTotal > 0 ? "Subtasks done" : "Checklist"}
          >
            <span className="mini">
              <i style={{ width: `${(progress[0] / progress[1]) * 100}%` }} />
            </span>
            {progress[0]}/{progress[1]}
          </span>
        )}
        {(comments_count ?? 0) > 0 && (
          <span className="m" title="Comments">
            ✉ {comments_count}
          </span>
        )}
        <span className="bc">
          <span className="bars" aria-hidden>
            {barcode(seed).map((w, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed barcode bars
              <i key={i} style={{ width: w }} />
            ))}
          </span>
          {hasValue ? (
            <span className="val">{formatMoney(Number(value), currency)}</span>
          ) : story_points != null ? (
            <span className="pts">
              {story_points}
              <small>PT</small>
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );

  // The DragOverlay copy must NOT register a sortable (two registrations with the
  // same id fight over dnd-kit's registry → React #185).
  if (overlay) return body;

  return <Draggable id={`draggable-${id}`}>{body}</Draggable>;
});

// A finished card filed on the Done shelf as its tape spine.
export const DoneSpine = memo(function DoneSpine({
  id,
  name,
  tags,
  ticket_number,
  ticket_key,
  done_at,
}: CardInterface) {
  const [a] = cardInks({ id, tags });
  const latin = /^[\p{Script=Latin}\p{N}\p{P}\p{S}\s]*$/u.test(name);
  const num =
    ticket_number ?? (ticket_key ? ticket_key.split("-").pop() : null) ?? "";
  return (
    <Draggable id={`draggable-${id}`}>
      <div
        className="mt-dsp"
        style={{ "--a": a } as React.CSSProperties}
        data-vx-spine={id}
        data-vx-key={ticket_key ?? undefined}
      >
        <span className="sw">{num}</span>
        <span className={`t${latin ? "" : " plain"}`}>{name}</span>
        {done_at && <span className="d">{shortDate(done_at)}</span>}
      </div>
    </Draggable>
  );
});
