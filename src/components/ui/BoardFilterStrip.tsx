"use client";

import {
  faCheck,
  faChevronDown,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useEffect,
  useState,
} from "react";
import Icon from "@/components/ui/Icon";
import type { SharedUser } from "@/interfaces/BoardInterface";
import type { TagInterface } from "@/interfaces/TagInterface";

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

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// A collapsed filter group: a button that opens a popover of options. Keeps the
// strip to one row no matter how many tags a board has.
function Facet({
  name,
  label,
  count,
  selected,
  isOpen,
  onToggle,
  children,
}: {
  // Identifies this facet to the outside-click handler.
  name: string;
  label: string;
  count: number;
  // The tags picked in this facet — drives the LED preview and the count.
  selected: TagInterface[];
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const isActive = selected.length > 0;

  return (
    <div className="relative" data-facet={name}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="aero-pill cf-mono text-[10px] uppercase tracking-widest px-2.5 py-1.5 font-bold cursor-pointer inline-flex items-center gap-2"
        style={{
          borderColor: isActive ? "var(--cf-phosphor)" : undefined,
          color: isActive ? "var(--cf-text)" : "var(--cf-text-muted)",
        }}
      >
        {label}
        {/* Sneak peek: one lit LED per selected tag, in that tag's own colour,
            so what's on is readable at a glance without opening the menu. */}
        {isActive && (
          <span className="inline-flex items-center gap-1">
            {selected.slice(0, 5).map((t) => (
              <span
                key={t.id}
                className="cf-led"
                style={{
                  width: "6px",
                  height: "6px",
                  background: t.color,
                  boxShadow: `0 0 5px ${t.color}`,
                }}
              />
            ))}
            {selected.length > 5 && (
              <span className="text-[9px]" style={{ color: "var(--cf-text)" }}>
                +{selected.length - 5}
              </span>
            )}
          </span>
        )}
        <span
          className="cf-mono text-[9px] px-1.5 rounded"
          style={{
            background: isActive
              ? "var(--cf-phosphor)"
              : "var(--cf-graphite-3)",
            border: "1px solid var(--cf-edge)",
            color: isActive ? "#1c1a16" : "var(--cf-text-muted)",
          }}
        >
          {isActive ? `${selected.length}/${count}` : count}
        </span>
        <span
          className="text-[9px] transition-transform"
          style={{ transform: isOpen ? "rotate(180deg)" : undefined }}
        >
          <Icon icon={faChevronDown} />
        </span>
      </button>
      {isOpen && (
        <div
          className="aero-menu absolute left-0 top-full mt-2 z-50 p-2 max-h-72 overflow-y-auto"
          style={{ minWidth: "220px" }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface BoardFilterStripProps {
  boardUsers: SharedUser[];
  tags: TagInterface[];
  filterUserIds: number[];
  filterTagIds: number[];
  setFilterUserIds: Dispatch<SetStateAction<number[]>>;
  setFilterTagIds: Dispatch<SetStateAction<number[]>>;
}

// Filter strip (kanban + list + backlog views): assignee avatars and tag facets
// that toggle the board's card filters. Presentational only. Multi-select —
// picking more within a facet widens the result (OR); the facets AND together.
export function BoardFilterStrip({
  boardUsers,
  tags,
  filterUserIds,
  filterTagIds,
  setFilterUserIds,
  setFilterTagIds,
}: BoardFilterStripProps) {
  const [openMenu, setOpenMenu] = useState<"tags" | "channels" | null>(null);

  // Close the open facet on Escape, or on any click outside *that facet* —
  // scoping to the facet (not the whole strip) means clicking an avatar, the
  // other facet, or bare strip space closes it too.
  useEffect(() => {
    if (!openMenu) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest(`[data-facet="${openMenu}"]`)) setOpenMenu(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openMenu]);

  const channelTags = tags.filter((t) => t.kind === "channel");
  const customTags = tags.filter((t) => t.kind !== "channel");
  const selectedOf = (pool: TagInterface[]) =>
    pool.filter((t) => filterTagIds.includes(t.id));
  const hasFilter = filterUserIds.length > 0 || filterTagIds.length > 0;

  // Multi-select: the popover stays open so several can be picked in a row.
  const toggleTag = (id: number) =>
    setFilterTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const tagOption = (tag: TagInterface) => {
    const isActive = filterTagIds.includes(tag.id);
    return (
      <button
        key={tag.id}
        type="button"
        onClick={() => toggleTag(tag.id)}
        aria-pressed={isActive}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded cf-mono text-[10px] uppercase tracking-widest font-bold cursor-pointer text-left transition-colors"
        style={{
          color: isActive ? "#1c1a16" : tag.color,
          background: isActive ? tag.color : "transparent",
        }}
      >
        <span
          className="cf-led flex-shrink-0"
          style={{
            background: tag.color,
            boxShadow: isActive ? "none" : `0 0 6px ${tag.color}`,
          }}
        />
        <span className="truncate">{tag.name}</span>
        <span
          className="ml-auto text-[9px] flex-shrink-0"
          style={{ visibility: isActive ? "visible" : "hidden" }}
        >
          <Icon icon={faCheck} />
        </span>
      </button>
    );
  };

  return (
    <div className="flex items-center gap-2 mb-5 flex-wrap">
      {/* People — overlapping avatar cluster instead of one pill per teammate. */}
      {boardUsers.length > 0 && (
        <div className="flex items-center mr-1">
          {boardUsers.map((user) => {
            const color = AVATAR_COLORS[user.id % AVATAR_COLORS.length];
            const isActive = filterUserIds.includes(user.id);
            const dimmed = filterUserIds.length > 0 && !isActive;
            return (
              <button
                key={user.id}
                type="button"
                title={user.name}
                aria-label={`Filter by ${user.name}`}
                aria-pressed={isActive}
                onClick={() =>
                  setFilterUserIds((prev) =>
                    prev.includes(user.id)
                      ? prev.filter((x) => x !== user.id)
                      : [...prev, user.id],
                  )
                }
                className="relative -ml-2 first:ml-0 w-8 h-8 rounded-full flex items-center justify-center cf-mono text-[10px] font-bold cursor-pointer transition-all hover:-translate-y-0.5 hover:z-10"
                style={{
                  background: color,
                  color: "#1c1a16",
                  border: "2px solid var(--cf-graphite-3)",
                  opacity: dimmed ? 0.4 : 1,
                  zIndex: isActive ? 10 : undefined,
                  boxShadow: isActive
                    ? `0 0 0 2px var(--cf-graphite-3), 0 0 0 3.5px ${color}, 0 0 10px ${color}66`
                    : undefined,
                }}
              >
                {initials(user.name)}
              </button>
            );
          })}
        </div>
      )}

      {boardUsers.length > 0 &&
        (customTags.length > 0 || channelTags.length > 0) && (
          <span
            className="w-px h-6 flex-shrink-0"
            style={{ background: "var(--cf-edge)" }}
          />
        )}

      {/* Tags + channels — collapsed into facets so the strip stays one row. */}
      {customTags.length > 0 && (
        <Facet
          name="tags"
          label="Tags"
          count={customTags.length}
          selected={selectedOf(customTags)}
          isOpen={openMenu === "tags"}
          onToggle={() => setOpenMenu(openMenu === "tags" ? null : "tags")}
        >
          <div className="flex flex-col gap-0.5">
            {customTags.map(tagOption)}
          </div>
        </Facet>
      )}

      {channelTags.length > 0 && (
        <Facet
          name="channels"
          label="Channels"
          count={channelTags.length}
          selected={selectedOf(channelTags)}
          isOpen={openMenu === "channels"}
          onToggle={() =>
            setOpenMenu(openMenu === "channels" ? null : "channels")
          }
        >
          <div className="flex flex-col gap-0.5">
            {channelTags.map(tagOption)}
          </div>
        </Facet>
      )}

      {/* Reset — only offered once something is actually filtered. */}
      {hasFilter && (
        <button
          type="button"
          onClick={() => {
            setFilterUserIds([]);
            setFilterTagIds([]);
          }}
          className="cf-mono text-[9px] uppercase tracking-widest px-2 py-1.5 cursor-pointer inline-flex items-center gap-1.5 transition-colors"
          style={{ color: "var(--cf-text-muted)" }}
        >
          <Icon icon={faXmark} />
          Clear
        </button>
      )}
    </div>
  );
}
