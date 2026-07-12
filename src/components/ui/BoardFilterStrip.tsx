"use client";

import type { Dispatch, SetStateAction } from "react";
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

interface BoardFilterStripProps {
  boardUsers: SharedUser[];
  tags: TagInterface[];
  filterUserId: number | null;
  filterTagId: number | null;
  setFilterUserId: Dispatch<SetStateAction<number | null>>;
  setFilterTagId: Dispatch<SetStateAction<number | null>>;
}

// Filter strip (kanban + list + backlog views): assignee avatars and tag pills
// that toggle the board's card filters. Presentational only.
export function BoardFilterStrip({
  boardUsers,
  tags,
  filterUserId,
  filterTagId,
  setFilterUserId,
  setFilterTagId,
}: BoardFilterStripProps) {
  return (
    <div className="flex items-center gap-2 mb-5 flex-wrap">
      {boardUsers.length > 0 && (
        <>
          <button
            onClick={() => {
              setFilterUserId(null);
              setFilterTagId(null);
            }}
            style={
              filterUserId === null && filterTagId === null
                ? {
                    background: "var(--cf-edge)",
                    borderColor: "var(--cf-phosphor)",
                    color: "var(--cf-text)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.08), 0 0 8px rgba(154,166,126,0.35)",
                  }
                : { color: "var(--cf-text-muted)" }
            }
            className="aero-pill cf-mono text-xs uppercase tracking-widest px-3 py-1.5 font-bold cursor-pointer transition-colors inline-flex items-center gap-1.5"
          >
            <span
              className="cf-led"
              style={{
                background:
                  filterUserId === null && filterTagId === null
                    ? "var(--cf-phosphor)"
                    : "var(--cf-edge)",
                boxShadow:
                  filterUserId === null && filterTagId === null
                    ? "0 0 6px var(--cf-phosphor)"
                    : "none",
              }}
            />
            All
          </button>
          {boardUsers.map((user) => {
            const color = AVATAR_COLORS[user.id % AVATAR_COLORS.length];
            const isActive = filterUserId === user.id;
            return (
              <button
                key={user.id}
                onClick={() => setFilterUserId(isActive ? null : user.id)}
                style={{
                  borderColor: color,
                  backgroundColor: isActive ? color : "var(--cf-graphite)",
                  color: isActive ? "#1c1a16" : color,
                }}
                className="cf-mono text-xs uppercase tracking-widest px-3 py-1.5 rounded-full border font-bold cursor-pointer flex items-center gap-1.5"
              >
                <span
                  style={{
                    backgroundColor: isActive ? "rgba(0,0,0,0.25)" : color,
                    fontSize: "9px",
                    width: "16px",
                    height: "16px",
                    color: isActive ? "#1c1a16" : "#1c1a16",
                  }}
                  className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
                >
                  {initials(user.name)}
                </span>
                {user.name.split(" ")[0]}
              </button>
            );
          })}
        </>
      )}

      {/* Tag filters */}
      {tags.map((tag) => {
        const isActive = filterTagId === tag.id;
        return (
          <button
            key={tag.id}
            onClick={() => setFilterTagId(isActive ? null : tag.id)}
            style={{
              borderColor: tag.color,
              backgroundColor: isActive ? tag.color : "var(--cf-graphite)",
              color: isActive ? "#1c1a16" : tag.color,
              fontSize: "10px",
            }}
            className="cf-mono uppercase tracking-widest px-2.5 py-1.5 rounded-full border cursor-pointer font-bold"
          >
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}
