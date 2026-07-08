"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  type Feedback,
  FeedbackBanner,
  PanelHeading,
} from "@/components/settings/shared";
import type { ProjectInterface } from "@/interfaces/ProjectInterface";
import { archiveProject, copyProject, deleteProject } from "@/lib/api";

export default function DangerTab({ project }: { project: ProjectInterface }) {
  const router = useRouter();

  const [includeBoards, setIncludeBoards] = useState(true);
  const [includeCards, setIncludeCards] = useState(false);
  const [copying, setCopying] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const handleCopy = async () => {
    setFeedback(null);
    setCopying(true);
    try {
      const copy = await copyProject(project.id, {
        include_boards: includeBoards,
        include_cards: includeCards,
      });
      router.push(`/projects/${copy.id}`);
    } catch {
      setFeedback({ type: "error", message: "Could not copy project." });
      setCopying(false);
    }
  };

  const handleArchive = async () => {
    setFeedback(null);
    setArchiving(true);
    try {
      await archiveProject(project.id);
      router.push("/dashboard");
    } catch {
      setFeedback({ type: "error", message: "Could not archive project." });
      setArchiving(false);
    }
  };

  const handleDelete = async () => {
    setFeedback(null);
    setDeleting(true);
    try {
      await deleteProject(project.id);
      router.push("/dashboard");
    } catch {
      setFeedback({ type: "error", message: "Could not delete project." });
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <FeedbackBanner feedback={feedback} />

      {/* Duplicate */}
      <div className="glass-panel p-6 flex flex-col gap-4">
        <PanelHeading>Duplicate project</PanelHeading>
        <p
          className="text-sm cf-mono"
          style={{ color: "var(--cf-text-muted)" }}
        >
          Create a copy of this project in your own space.
        </p>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeBoards}
            onChange={(e) => setIncludeBoards(e.target.checked)}
          />
          <span
            className="cf-mono"
            style={{ fontSize: "11px", color: "var(--cf-text)" }}
          >
            Also copy boards (columns &amp; tags)
          </span>
        </label>
        <label
          className="flex items-center gap-2 cursor-pointer select-none"
          style={{ opacity: includeBoards ? 1 : 0.5 }}
        >
          <input
            type="checkbox"
            checked={includeCards}
            disabled={!includeBoards}
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
          {copying ? "Copying…" : "Duplicate project"}
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
              Close project
            </p>
            <p
              className="text-sm cf-mono"
              style={{ color: "var(--cf-text-muted)" }}
            >
              Hide it from your lists. Boards are preserved; you can reopen it
              later.
            </p>
          </div>
          <button
            onClick={handleArchive}
            disabled={archiving}
            className="aero-btn aero-btn--ghost px-4 py-2.5 flex-shrink-0"
          >
            {archiving ? "Closing…" : "Close project"}
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
              Delete project
            </p>
            <p
              className="text-sm cf-mono"
              style={{ color: "var(--cf-text-muted)" }}
            >
              Permanently remove this project. Its boards are kept but detached.
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
              Delete project
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
