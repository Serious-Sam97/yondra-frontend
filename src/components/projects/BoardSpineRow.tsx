"use client";

import { memo } from "react";
import type { ProjectBoard } from "@/interfaces/ProjectInterface";
import {
  boardColor,
  boardFlow,
  boardProgress,
  isLatinName,
  isRecording,
  tapeLength,
  timeAgo,
} from "@/lib/ui";
import CrewStack from "./cassette/CrewStack";

// List-view counterpart of the board cassette: the tape seen edge-on, as a
// spine on a shelf. Same data (accent band, C-length, flow, %, crew, REC lamp)
// in a single full-width row.
function BoardSpineRow({
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

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${board.name}: ${total} card${total !== 1 ? "s" : ""}, ${pct}% done${editing ? ". Edit board" : ""}`}
      className={`cs-row${editing ? " is-edit" : ""}${archived ? " is-archived" : ""}`}
      style={{ "--ac": ac } as React.CSSProperties}
    >
      <span className="cs-row-band" aria-hidden />
      <span className="cs-row-label">
        <span className="flex items-center gap-2 min-w-0">
          <span
            className={`cs-row-name${isLatinName(board.name) ? " cf-marker" : " is-plain"}`}
          >
            {board.name}
          </span>
          {recording && <span className="cs-rec">Rec</span>}
        </span>
        <span className="cs-row-meta">
          {lastTouch ? `updated ${timeAgo(lastTouch)}` : "no activity yet"}
          {board.owner ? ` · ${board.owner.name}` : ""}
        </span>
      </span>
      <span className="cs-row-flow" aria-hidden>
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
      <span className="cs-row-pct" aria-hidden>
        {total > 0 ? (
          <>
            {pct}
            <small>%</small>
          </>
        ) : (
          <span className="cs-standby">Standby</span>
        )}
      </span>
      <span className="cs-len cs-row-len">{tapeLength(total)}</span>
      <span className="cs-row-crew">
        <CrewStack users={members} max={4} size={22} ring="#2a2823" />
      </span>
    </button>
  );
}

export default memo(BoardSpineRow);
