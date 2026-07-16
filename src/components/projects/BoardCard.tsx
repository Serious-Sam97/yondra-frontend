"use client";

import type { ProjectBoard } from "@/interfaces/ProjectInterface";
import { boardColor, boardFlow, boardProgress, timeAgo } from "@/lib/ui";
import Avatar from "./Avatar";

// "Anodized rack module": graphite casing tinted with the board's own colour
// (rail + LED + header wash), with a dark inset flow screen showing the
// To Do / Doing / Done breakdown.
const DIM_INK = "rgba(232,228,214,0.58)";

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
  // Optional so a non-interactive DragOverlay copy can render the card (YON-125).
  onClick?: () => void;
}) {
  const ac = boardColor(board, projectColor);
  const flow = boardFlow(board);
  const { done, total, pct } = boardProgress(board);

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
    <button
      type="button"
      onClick={onClick}
      className="bc-mod block w-full text-left p-0"
      style={
        {
          "--bc-ac": ac,
          ...(editMode && isOwner
            ? {
                borderColor: "var(--cf-amber)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.14), 0 0 0 2px rgba(255,176,0,0.5), 0 3px 7px rgba(0,0,0,0.45)",
              }
            : null),
        } as React.CSSProperties
      }
    >
      {/* edge-lit colour rail + backlight wash */}
      <div className="bc-rail" />
      <div className="bc-wash" />

      <div className="px-3.5 pt-3 pb-3.5 relative">
        <div className="flex items-center gap-2">
          <span
            className="rounded-full flex-shrink-0"
            style={{
              width: 8,
              height: 8,
              background: ac,
              boxShadow: `0 0 7px ${ac}, inset 0 -1px 1px rgba(0,0,0,0.4)`,
            }}
          />
          <span
            className="font-bold flex-1 truncate"
            style={{ fontSize: "14px", color: "var(--cf-cream)" }}
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
              style={{ fontSize: "9px", color: DIM_INK }}
            >
              {total} card{total !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div
          className="cf-mono mt-1 truncate"
          style={{ fontSize: "9px", color: DIM_INK }}
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
                  background: "#1b1e18",
                }}
              />
            )}
          </div>
          {total === 0 ? (
            <div className="bc-standby" style={{ marginTop: 6 }}>
              STANDBY
              <span className="bc-cursor">_</span>
            </div>
          ) : (
            <div
              className="flex justify-between cf-lcd"
              style={{ fontSize: "16px", marginTop: 6 }}
            >
              <b
                className="flex items-center gap-1"
                style={{ color: "#8a8f80" }}
              >
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
                    boxShadow: "0 0 5px var(--cf-phosphor)",
                    display: "inline-block",
                  }}
                />
                {flow.done}
              </b>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-2.5">
          <span
            className="cf-lcd"
            style={{
              fontSize: "24px",
              lineHeight: 1,
              color: done > 0 ? "var(--cf-phosphor)" : "rgba(232,228,214,0.38)",
              textShadow:
                done > 0
                  ? "0 0 8px color-mix(in srgb, var(--cf-phosphor) 45%, transparent)"
                  : undefined,
            }}
          >
            {pct}
            <span style={{ fontSize: "12px", color: DIM_INK }}>%</span>
          </span>
          {members.length > 0 && (
            <div className="flex">
              {members.slice(0, 4).map((u, i) => (
                <span key={u.id} style={{ marginLeft: i ? -6 : 0 }}>
                  <Avatar user={u} size={19} ring="#232220" />
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
