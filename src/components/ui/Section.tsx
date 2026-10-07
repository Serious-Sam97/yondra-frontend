import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { faGear, faXmark } from "@fortawesome/free-solid-svg-icons";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { SvgArt } from "@/components/ui/SvgArt";
import type { CardInterface } from "@/interfaces/CardInterface";
import type { SectionInterface } from "@/interfaces/SectionInterface";
import { coverArt, LINER_ART, railArt } from "@/lib/boardArt";
import { formatMoney, toNumber } from "@/lib/currency";
import { hapticReject } from "@/lib/haptics";
import { playWipReject } from "@/lib/sound";
import { Droppable } from "../shared/Droppable";
import { Card, DoneSpine } from "./Card";

const DAY = 86_400_000;
const VU_SEGMENTS = 12;
const VU_KEYS = Array.from({ length: VU_SEGMENTS }, (_, i) => `vu-${i}`);
// Done shelf shows this many spines before "+N more on the shelf".
const SHELF_LIMIT = 7;

// Rack stickers per channel position (design/board-final.png). Purely decorative;
// they sit behind the cards so a full rack covers them.
const DECALS: React.ReactNode[] = [
  null,
  <>
    <span key="s" className="mt-decal star" style={{ right: 18, bottom: 96 }}>
      Peak
      <br />
      Level
    </span>
    <span key="b" className="mt-decal badge" style={{ left: 24, bottom: 66 }}>
      Type II · <b>CrO2</b>
    </span>
  </>,
  <>
    <span key="r" className="mt-decal round" style={{ right: 20, bottom: 64 }}>
      Rev<b>B</b>
    </span>
    <span key="b" className="mt-decal badge" style={{ left: 24, bottom: 66 }}>
      Dolby · <b>NR</b>
    </span>
  </>,
  <>
    <span key="c" className="mt-decal chrome" style={{ right: 26, bottom: 62 }}>
      Metal
    </span>
    <span key="b" className="mt-decal badge" style={{ left: 24, bottom: 66 }}>
      Type IV · <b>Archive</b>
    </span>
  </>,
];

function weekBucket(doneAt?: string | null): number {
  if (!doneAt) return 2;
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));
  const t = new Date(doneAt).getTime();
  if (t >= startOfWeek.getTime()) return 0;
  if (t >= startOfWeek.getTime() - 7 * DAY) return 1;
  return 2;
}

const SHELF_GROUPS = ["This week · on the shelf", "Last week", "Earlier"];

// A board column as a neon-lit tape rack: channel number, label-tape title, LCD
// count, a WIP VU meter, the rack body the cards rest in, liner art + stickers in
// the empty space, and an "add card" key at the foot. Memoized: Board keeps every
// prop referentially stable so unchanged racks skip re-rendering.
export const Section = memo(function Section({
  id,
  name,
  color,
  cards,
  handleClick,
  onDelete,
  onRename,
  wipLimit,
  onSetWipLimit,
  boardType = "kanban",
  currency = "BRL",
  agingHours,
  index = 0,
  isDone = false,
  isInProgress = false,
  onAddCard,
}: SectionInterface) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);
  const [editingWip, setEditingWip] = useState(false);
  const [wipInput, setWipInput] = useState("");
  const [shaking, setShaking] = useState(false);
  const [shelfOpen, setShelfOpen] = useState(false);
  const wipInputRef = useRef<HTMLInputElement>(null);
  const prevOverLimit = useRef(false);

  const commitRename = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== name) onRename?.(id, trimmed);
    else setEditValue(name);
    setEditing(false);
  };

  const openWipEdit = () => {
    setWipInput(wipLimit != null ? String(wipLimit) : "");
    setEditingWip(true);
    setTimeout(() => wipInputRef.current?.focus(), 0);
  };

  const commitWip = () => {
    const n = parseInt(wipInput, 10);
    onSetWipLimit?.(id, Number.isNaN(n) || n <= 0 ? null : n);
    setEditingWip(false);
  };

  const count = cards.length;
  const isCrm = boardType === "crm";
  const columnTotal = isCrm
    ? cards.reduce((sum, c) => sum + toNumber(c.value), 0)
    : 0;
  const atLimit = wipLimit != null && count === wipLimit;
  const overLimit = wipLimit != null && count > wipLimit;

  // Shake + sound when a card pushes the rack over its WIP limit.
  useEffect(() => {
    if (overLimit && !prevOverLimit.current) {
      setShaking(true);
      playWipReject();
      hapticReject();
      setTimeout(() => setShaking(false), 500);
    }
    prevOverLimit.current = overLimit;
  }, [overLimit]);

  // dnd-kit needs a STABLE items array: key the memo on the id sequence so the
  // reference only changes when the order does (avoids the React #185 loop).
  const cardIdsKey = cards.map((c) => c.id).join(",");
  const sortableIds = useMemo(
    () =>
      cardIdsKey
        ? cardIdsKey.split(",").map((cardId) => `draggable-${cardId}`)
        : [],
    [cardIdsKey],
  );

  // Pace note shown when the rack has no WIP limit.
  const note = useMemo(() => {
    if (isDone) {
      const thisWeek = cards.filter((c) => weekBucket(c.done_at) === 0).length;
      const lastWeek = cards.filter((c) => weekBucket(c.done_at) === 1).length;
      return `▲ ${thisWeek} this week · ${lastWeek} last`;
    }
    if (count === 0) return "Empty · waiting for tape";
    const now = Date.now();
    const ages = cards
      .map((c) =>
        c.created_at ? (now - new Date(c.created_at).getTime()) / DAY : null,
      )
      .filter((v): v is number => v != null && !Number.isNaN(v));
    if (ages.length === 0) return `${count} on the rack`;
    const avg = ages.reduce((s, v) => s + v, 0) / ages.length;
    return `Avg age ${avg.toFixed(1)}d · oldest ${Math.floor(Math.max(...ages))}d`;
  }, [cards, count, isDone]);

  const liner = useMemo(() => {
    const [kind, a, b] = LINER_ART[index % LINER_ART.length];
    return coverArt(kind, a, b, index + 3, `ln${id}`);
  }, [index, id]);
  const rail = useMemo(() => railArt(color), [color]);

  const lit = wipLimit
    ? Math.round(Math.min(count / wipLimit, 1.25) * VU_SEGMENTS * 0.8)
    : 0;

  // Done shelf: grouped by week, capped until expanded.
  const shelf = useMemo(() => {
    if (!isDone) return null;
    const sorted = [...cards].sort(
      (x, y) =>
        new Date(y.done_at ?? 0).getTime() - new Date(x.done_at ?? 0).getTime(),
    );
    const shown = shelfOpen ? sorted : sorted.slice(0, SHELF_LIMIT);
    return { shown, hidden: sorted.length - shown.length };
  }, [cards, isDone, shelfOpen]);

  const shelfShown = shelf?.shown.length ?? 0;
  // Stickers and liner art live in the rack's empty space; hide them once the
  // tapes fill it (spines have gaps the art would peek through).
  const crowded = isDone ? shelfShown > 8 : count > 3;

  return (
    <section
      className={`mt-rack${shaking ? " wip-shake" : ""}`}
      style={{ "--st": color } as React.CSSProperties}
      data-vx-rack={id}
      data-vx-count={count}
      data-vx-limit={wipLimit ?? undefined}
      data-vx-over={overLimit ? "1" : undefined}
      data-vx-done={isDone ? "1" : undefined}
      aria-label={`${name}, ${count} card${count === 1 ? "" : "s"}`}
    >
      <SvgArt className="mt-rail-art" svg={rail} aria-hidden />
      <span className="mt-foot" aria-hidden />
      <span className="mt-scw" style={{ left: 4, top: 80 }} aria-hidden />
      <span className="mt-scw" style={{ right: 4, top: 80 }} aria-hidden />
      <span className="mt-scw" style={{ left: 4, bottom: 20 }} aria-hidden />
      <span className="mt-scw" style={{ right: 4, bottom: 20 }} aria-hidden />
      <SvgArt as="div" className="mt-liner" svg={liner} aria-hidden />
      {!crowded && DECALS[index % DECALS.length]}

      <div className="mt-rack-h">
        <div className="mt-rack-t">
          <span className="ch">CH{index + 1}</span>
          {/* biome-ignore lint/a11y/noStaticElementInteractions: double-click rename shortcut; the channel menu stays keyboard reachable */}
          <span
            className="nm"
            onDoubleClick={() => {
              if (!onRename) return;
              setEditValue(name);
              setEditing(true);
            }}
            title={onRename ? "Double-click to rename" : name}
          >
            {editing ? (
              <input
                // biome-ignore lint/a11y/noAutofocus: inline rename starts focused
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") {
                    setEditValue(name);
                    setEditing(false);
                  }
                }}
                aria-label="Channel name"
              />
            ) : (
              name
            )}
          </span>
          <span
            className="cnt"
            title={
              wipLimit != null
                ? `${count} / ${wipLimit} WIP limit`
                : `${count} cards`
            }
          >
            {count}
          </span>
          {onSetWipLimit && (
            <button
              type="button"
              className="tool"
              onClick={openWipEdit}
              title="Set WIP limit"
              aria-label="Set WIP limit"
            >
              <Icon icon={faGear} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="tool"
              onClick={() => onDelete(id, name)}
              title="Delete channel"
              aria-label="Delete channel"
            >
              <Icon icon={faXmark} />
            </button>
          )}
          {onAddCard && !isDone && (
            <button
              type="button"
              className="add"
              onClick={() => onAddCard(id)}
              title="Add card"
              aria-label={`Add card to ${name}`}
            >
              +
            </button>
          )}
        </div>

        {editingWip ? (
          <div className="mt-wip-edit">
            <input
              ref={wipInputRef}
              type="number"
              min="1"
              value={wipInput}
              onChange={(e) => setWipInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitWip();
                if (e.key === "Escape") setEditingWip(false);
              }}
              placeholder="Limit"
              aria-label="WIP limit"
            />
            <button type="button" className="ok" onClick={commitWip}>
              Set
            </button>
            <button
              type="button"
              onClick={() => {
                onSetWipLimit?.(id, null);
                setEditingWip(false);
              }}
            >
              Clear
            </button>
          </div>
        ) : wipLimit != null ? (
          <div
            className="mt-vu"
            title={`${count} of ${wipLimit} WIP`}
            data-vx-vu
          >
            <span>
              WIP {count}/{wipLimit}
            </span>
            <span className="bar" aria-hidden>
              {VU_KEYS.map((key, i) => {
                if (i >= lit) return <i key={key} />;
                const f = i / VU_SEGMENTS;
                return (
                  <i
                    key={key}
                    className={f < 0.55 ? "g" : f < 0.8 ? "a" : "r"}
                  />
                );
              })}
            </span>
            {overLimit ? (
              <span className="over">Over</span>
            ) : atLimit ? (
              <span className="peak">Peak</span>
            ) : null}
          </div>
        ) : (
          <div className="mt-vu">
            <span>{note}</span>
          </div>
        )}

        {isCrm && (
          <div
            className="mt-rack-crm"
            title={`${count} deal${count !== 1 ? "s" : ""}`}
          >
            <b>{formatMoney(columnTotal, currency)}</b>
            {count} deal{count !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      <div className="mt-rack-b">
        <Droppable
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            minHeight: "100%",
          }}
          key={id}
          id={`section-${id}`}
        >
          <SortableContext
            items={sortableIds}
            strategy={verticalListSortingStrategy}
          >
            {isDone && shelf
              ? shelf.shown.map((card, i) => {
                  const bucket = weekBucket(card.done_at);
                  const prev =
                    i > 0 ? weekBucket(shelf.shown[i - 1].done_at) : -1;
                  return (
                    <div key={card.id} style={{ display: "contents" }}>
                      {bucket !== prev && (
                        <div className="mt-dn-group">
                          {SHELF_GROUPS[bucket]}
                        </div>
                      )}
                      <div onClick={() => handleClick(card)}>
                        <DoneSpine {...card} />
                      </div>
                    </div>
                  );
                })
              : cards.map((card: CardInterface) => (
                  <div key={card.id} onClick={() => handleClick(card)}>
                    <Card
                      {...card}
                      color={color}
                      playing={isInProgress}
                      boardType={boardType}
                      currency={currency}
                      agingHours={agingHours}
                    />
                  </div>
                ))}
            {isDone && shelf && (shelf.hidden > 0 || shelfOpen) && (
              <button
                type="button"
                className="mt-more"
                onClick={() => setShelfOpen((o) => !o)}
              >
                {shelfOpen
                  ? "− Show less"
                  : `+ ${shelf.hidden} more on the shelf`}
              </button>
            )}
          </SortableContext>
        </Droppable>
      </div>

      {onAddCard && !isDone && (
        <div className="mt-rack-f">
          <button type="button" onClick={() => onAddCard(id)}>
            + Add card <span className="mt-kbd">N</span>
          </button>
        </div>
      )}
    </section>
  );
});
