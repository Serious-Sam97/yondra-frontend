"use client";

import type { ProjectBoard } from "@/interfaces/ProjectInterface";
import {
  boardColor,
  boardFlow,
  boardProgress,
  shade,
  timeAgo,
  tint,
} from "@/lib/ui";
import Avatar from "./Avatar";

// Accent-tinted "monitor" card: the casing takes the board's own colour, with a
// dark inset flow screen showing the To Do / Doing / Done breakdown.
export default function BoardCard({
  board,
  projectColor,
  editMode,
  isOwner,
  onClick,
}: {
  board: ProjectBoard;
  projectColor: string;
  editMode?: boolean;
  isOwner?: boolean;
  onClick: () => void;
}) {
  const ac = boardColor(board, projectColor);
  const flow = boardFlow(board);
  const { done, total, pct } = boardProgress(board);
  const ink = shade(ac, 0.28);
  const sub = shade(ac, 0.42);
  const casing = `linear-gradient(to bottom, ${tint(ac, 0.72)}, ${tint(ac, 0.52)})`;

  const members = [board.owner, ...(board.shared_with ?? [])].filter(
    (u): u is NonNullable<typeof u> => !!u,
  );

  const seg = (v: number, color: string, glow?: boolean) =>
    v > 0 ? (
      <span
        style={{
          flex: v,
          height: "100%",
          borderRadius: 2,
          background: color,
          boxShadow: glow ? `0 0 8px ${color}` : undefined,
        }}
      />
    ) : null;

  return (
    <div
      onClick={onClick}
      className="rounded-lg overflow-hidden cursor-pointer transition-transform duration-150 hover:-translate-y-0.5"
      style={{
        background: casing,
        border: `1.5px solid ${editMode && isOwner ? "var(--cf-amber)" : tint(ac, 0.35)}`,
        color: ink,
        boxShadow:
          editMode && isOwner
            ? `inset 0 1px 0 rgba(255,255,255,0.55), 0 0 0 2px rgba(255,176,0,0.5), 0 3px 7px rgba(0,0,0,0.45)`
            : "inset 0 1px 0 rgba(255,255,255,0.55), 0 4px 10px rgba(0,0,0,0.45)",
      }}
    >
      {/* colour cap */}
      <div style={{ height: 7, background: ac, boxShadow: `0 0 10px ${ac}` }} />

      <div className="px-3.5 pt-3 pb-3.5">
        <div className="flex items-center gap-2">
          <span
            className="rounded-full flex-shrink-0"
            style={{
              width: 8,
              height: 8,
              background: shade(ac, 0.8),
              boxShadow: `0 0 6px ${ac}`,
            }}
          />
          <span
            className="font-bold flex-1 truncate"
            style={{ fontSize: "14px" }}
          >
            {board.name}
          </span>
          {editMode && isOwner ? (
            <span
              className="cf-mono uppercase font-bold flex-shrink-0"
              style={{
                fontSize: "9px",
                letterSpacing: "0.06em",
                color: "var(--cf-red)",
              }}
            >
              edit
            </span>
          ) : (
            <span
              className="cf-mono flex-shrink-0"
              style={{ fontSize: "9px", color: sub }}
            >
              {total} card{total !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div
          className="cf-mono mt-1 truncate"
          style={{ fontSize: "9px", color: sub }}
        >
          {board.updated_at
            ? `updated ${timeAgo(board.updated_at)}`
            : "no activity yet"}
          {board.owner ? ` · ${board.owner.name}` : ""}
        </div>

        {/* dark flow screen */}
        <div
          className="mt-2.5 rounded-md p-2.5"
          style={{
            background: "#0d1410",
            border: "1.5px solid #11140f",
            boxShadow: "inset 0 2px 6px rgba(0,0,0,0.85)",
          }}
        >
          <div
            className="flex justify-between cf-mono uppercase"
            style={{
              fontSize: "7.5px",
              letterSpacing: "0.1em",
              color: "var(--cf-text-dim)",
              marginBottom: 5,
            }}
          >
            <span>Flow</span>
            <span style={{ color: "var(--cf-phosphor)" }}>
              {pct}% · {done} done
            </span>
          </div>
          <div
            className="flex rounded-sm overflow-hidden"
            style={{ height: 16, gap: 2 }}
          >
            {seg(flow.todo, "#3a3d38")}
            {seg(flow.doing, "var(--cf-amber)")}
            {seg(flow.done, "var(--cf-phosphor)", true)}
            {total === 0 && (
              <span
                style={{
                  flex: 1,
                  height: "100%",
                  borderRadius: 2,
                  background: "#22251f",
                }}
              />
            )}
          </div>
          <div
            className="flex justify-between cf-lcd"
            style={{ fontSize: "16px", marginTop: 6 }}
          >
            <b className="flex items-center gap-1" style={{ color: "#8a8f80" }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#3a3d38",
                  display: "inline-block",
                }}
              />
              {flow.todo}
            </b>
            <b
              className="flex items-center gap-1"
              style={{ color: "var(--cf-amber)" }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--cf-amber)",
                  display: "inline-block",
                }}
              />
              {flow.doing}
            </b>
            <b
              className="flex items-center gap-1"
              style={{ color: "var(--cf-phosphor)" }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--cf-phosphor)",
                  display: "inline-block",
                }}
              />
              {flow.done}
            </b>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2.5">
          <span
            className="cf-lcd"
            style={{ fontSize: "24px", lineHeight: 1, color: ink }}
          >
            {pct}
            <span style={{ fontSize: "12px", color: sub }}>%</span>
          </span>
          {members.length > 0 && (
            <div className="flex">
              {members.slice(0, 4).map((u, i) => (
                <span key={u.id} style={{ marginLeft: i ? -6 : 0 }}>
                  <Avatar user={u} size={19} ring={tint(ac, 0.55)} />
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
