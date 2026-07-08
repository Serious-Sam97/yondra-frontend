"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BoardInterface } from "@/interfaces/BoardInterface";
import { archiveBoard, copyBoard, deleteBoard } from "@/lib/api";
import { type Feedback, FeedbackBanner, PanelHeading } from "./shared";

export default function DangerTab({ board }: { board: BoardInterface }) {
  const router = useRouter();
  const backHref = board.project_id
    ? `/projects/${board.project_id}`
    : "/dashboard";

  const [includeCards, setIncludeCards] = useState(true);
  const [copying, setCopying] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const handleCopy = async () => {
    setFeedback(null);
    setCopying(true);
    try {
      const copy = await copyBoard(board.id, { include_cards: includeCards });
      router.push(`/boards/${copy.id}`);
    } catch {
      setFeedback({ type: "error", message: "Could not copy board." });
      setCopying(false);
    }
  };

  const handleArchive = async () => {
    setFeedback(null);
    setArchiving(true);
    try {
      await archiveBoard(board.id);
      router.push(backHref);
    } catch {
      setFeedback({ type: "error", message: "Could not archive board." });
      setArchiving(false);
    }
  };

  const handleDelete = async () => {
    setFeedback(null);
    setDeleting(true);
    try {
      await deleteBoard(board.id);
      router.push(backHref);
    } catch {
      setFeedback({ type: "error", message: "Could not delete board." });
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <FeedbackBanner feedback={feedback} />

      {/* Copy board */}
      <div className="glass-panel p-6 flex flex-col gap-4">
        <PanelHeading>Duplicate board</PanelHeading>
        <p
          className="text-sm cf-mono"
          style={{ color: "var(--cf-text-muted)" }}
        >
          Create a copy of this board with its columns and tags in your own
          space.
        </p>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeCards}
            onChange={(e) => setIncludeCards(e.target.checked)}
          />
          <span
            className="cf-mono"
            style={{ fontSize: "11px", color: "var(--cf-text)" }}
          >
            Also copy cards
          </span>
        </label>
        <button
          onClick={handleCopy}
          disabled={copying}
          className="aero-btn aero-btn--cyan self-start px-5 py-2.5"
        >
          {copying ? "Copying…" : "Duplicate board"}
        </button>
      </div>

      {/* Archive / delete */}
      <div
        className="glass-panel p-6 flex flex-col gap-5"
        style={{ borderColor: "var(--cf-red)" }}
      >
        <PanelHeading>Danger zone</PanelHeading>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p
              className="font-bold"
              style={{ fontSize: "13px", color: "var(--cf-text)" }}
            >
              Close board
            </p>
            <p
              className="text-sm cf-mono"
              style={{ color: "var(--cf-text-muted)" }}
            >
              Hide it from your lists. You can reopen it later.
            </p>
          </div>
          <button
            onClick={handleArchive}
            disabled={archiving}
            className="aero-btn aero-btn--ghost px-4 py-2.5 flex-shrink-0"
          >
            {archiving ? "Closing…" : "Close board"}
          </button>
        </div>

        <div
          className="flex items-center justify-between gap-4 flex-wrap pt-4 border-t"
          style={{ borderColor: "var(--cf-edge)" }}
        >
          <div>
            <p
              className="font-bold"
              style={{ fontSize: "13px", color: "var(--cf-red)" }}
            >
              Delete board
            </p>
            <p
              className="text-sm cf-mono"
              style={{ color: "var(--cf-text-muted)" }}
            >
              Permanently remove this board and all its cards.
            </p>
          </div>
          {confirmDelete ? (
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className="cf-mono uppercase"
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.1em",
                  color: "var(--cf-red)",
                }}
              >
                Sure?
              </span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="aero-btn aero-btn--magenta px-4 py-2.5"
              >
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="aero-btn aero-btn--ghost px-4 py-2.5"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="aero-btn aero-btn--magenta px-4 py-2.5 flex-shrink-0"
            >
              Delete board
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
