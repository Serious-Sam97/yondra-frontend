"use client";

import { memo } from "react";
import type { ProjectBoard } from "@/interfaces/ProjectInterface";
import {
  boardColor,
  boardFlow,
  boardProgress,
  isLatinName,
  isRecording,
  labelStripes,
  tapeLength,
  timeAgo,
} from "@/lib/ui";
import CrewStack from "./cassette/CrewStack";
import TapeReels from "./cassette/TapeReels";

// "Board cassette": every decorative part carries data — the label stripes are
// the board accent, the C-length is the card count, the reels wind from the
// supply spool (to do + doing) onto the take-up spool (done), and the REC lamp
// lights when a card changed in the last hour. See design/projects-v2-*.png.
function BoardCard({
  board,
  projectColor,
  editMode,
  isOwner,
  archived,
  onClick,
}: {
  board: ProjectBoard;
  projectColor: string;
  editMode?: boolean;
  isOwner?: boolean;
  archived?: boolean;
  // Optional so a non-interactive DragOverlay copy can render the card (YON-125).
  onClick?: () => void;
}) {
  const ac = boardColor(board, projectColor);
  const flow = boardFlow(board);
  const { total, pct } = boardProgress(board);
  const editing = !!(editMode && isOwner);
  const recording = !archived && isRecording(board);
  const lastTouch = board.last_activity_at ?? board.updated_at;

  const members = [board.owner, ...(board.shared_with ?? [])].filter(
    (u, i, all): u is NonNullable<typeof u> =>
      !!u && all.findIndex((x) => x?.id === u.id) === i,
  );

  const label = `${board.name}: ${total} card${total !== 1 ? "s" : ""}, ${pct}% done${recording ? ", active in the last hour" : ""}${editing ? ". Edit board" : ""}`;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`cs-tape${editing ? " is-edit" : ""}${archived ? " is-archived" : ""}`}
      style={{ "--ac": ac } as React.CSSProperties}
    >
      {editing && (
        <>
          <span className="cs-grip" aria-hidden />
          <span className="cs-editbadge" aria-hidden>
            Drag · tap to edit
          </span>
        </>
      )}
      <span className="cs-screw s1" aria-hidden />
      <span className="cs-screw s2" aria-hidden />
      <span className="cs-screw s3" aria-hidden />
      <span className="cs-screw s4" aria-hidden />
      <span className="cs-screw s5" aria-hidden />

      <span className="cs-paper">
        <span className="cs-stripes" aria-hidden>
          {labelStripes(ac).map((c) => (
            <i key={c} style={{ background: c }} />
          ))}
        </span>
        <span className="cs-ph">
          <span className="cs-side" aria-hidden>
            A
          </span>
          <span
            className={`cs-name${isLatinName(board.name) ? " cf-marker" : " is-plain"}`}
          >
            {board.name}
          </span>
          {recording && <span className="cs-rec">Rec</span>}
          <span className="cs-len">{tapeLength(total)}</span>
        </span>
        <span className="cs-ruled">
          <span className="truncate">
            {lastTouch ? `updated ${timeAgo(lastTouch)}` : "no activity yet"}
          </span>
          {board.owner && (
            <span className="truncate flex-shrink-0 max-w-[45%]">
              {board.owner.name}
            </span>
          )}
        </span>
        <span className="cs-window">
          <TapeReels flow={flow} accent={ac} />
          <span className="cs-wlcd">
            {total > 0 ? (
              <span className="cs-wpct">
                {pct}
                <small>%</small>
              </span>
            ) : (
              <span className="cs-standby">
                Standby<span className="cs-cursor">_</span>
              </span>
            )}
          </span>
        </span>
      </span>

      <span className="cs-foot">
        <span className="cs-hole l" aria-hidden />
        <span className="cs-hole r" aria-hidden />
        <span className="cs-flow" aria-hidden>
          <span className="cs-fbar">
            {total > 0 ? (
              <>
                <i className="done" style={{ flex: flow.done }} />
                <i className="doing" style={{ flex: flow.doing }} />
                <i className="todo" style={{ flex: flow.todo }} />
              </>
            ) : (
              <i className="empty" style={{ flex: 1 }} />
            )}
          </span>
          <span className="cs-fnum">
            <b className="done">{flow.done}</b>
            <b className="doing">{flow.doing}</b>
            <b className="todo">{flow.todo}</b>
          </span>
        </span>
        <span className="cs-crew">
          <CrewStack users={members} max={3} size={22} />
        </span>
      </span>
    </button>
  );
}

export default memo(BoardCard);
