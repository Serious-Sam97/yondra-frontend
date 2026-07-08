"use client";

import { faArrowRight, faPlus } from "@fortawesome/free-solid-svg-icons";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  type Feedback,
  FeedbackBanner,
  PanelHeading,
} from "@/components/settings/shared";
import Icon from "@/components/ui/Icon";
import type {
  ProjectBoard,
  ProjectInterface,
} from "@/interfaces/ProjectInterface";
import { createBoard } from "@/lib/api";

interface Props {
  project: ProjectInterface;
  canManage: boolean;
  onChange: (boards: ProjectBoard[]) => void;
}

export default function BoardsTab({ project, canManage, onChange }: Props) {
  const router = useRouter();
  const boards = project.boards ?? [];
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    setFeedback(null);
    try {
      const board = await createBoard({
        name: trimmed,
        description: "",
        project_id: project.id,
      });
      onChange([
        ...boards,
        {
          id: board.id,
          name: board.name,
          description: board.description,
          project_id: project.id,
          cards_count: 0,
          shared_with: [],
        },
      ]);
      setName("");
    } catch {
      setFeedback({ type: "error", message: "Could not create board." });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="glass-panel p-6 flex flex-col gap-4">
      <PanelHeading>Boards</PanelHeading>
      <FeedbackBanner feedback={feedback} />

      {boards.length === 0 ? (
        <p
          className="cf-mono text-center py-3"
          style={{ fontSize: "10px", color: "var(--cf-text-dim)" }}
        >
          No boards in this project yet.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {boards.map((board) => (
            <button
              key={board.id}
              onClick={() => router.push(`/boards/${board.id}`)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left cursor-pointer transition-colors"
              style={{ background: "#211f1b", border: "1px solid #38352e" }}
            >
              <span
                className="cf-led flex-shrink-0"
                style={{
                  background: project.color,
                  boxShadow: `0 0 6px ${project.color}`,
                }}
              />
              <div className="flex-1 min-w-0">
                <p
                  className="font-bold truncate"
                  style={{ fontSize: "12px", color: "var(--cf-text)" }}
                >
                  {board.name}
                </p>
                <p
                  className="cf-mono"
                  style={{ fontSize: "9px", color: "var(--cf-text-muted)" }}
                >
                  {board.cards_count ?? 0} card
                  {(board.cards_count ?? 0) !== 1 ? "s" : ""}
                </p>
              </div>
              <Icon
                icon={faArrowRight}
                style={{ fontSize: "11px", color: "var(--cf-text-dim)" }}
              />
            </button>
          ))}
        </div>
      )}

      {canManage && (
        <div
          className="flex items-center gap-2 pt-3 border-t"
          style={{ borderColor: "var(--cf-edge)" }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            placeholder="New board name…"
            className="glass-input cf-lcd text-sm flex-1"
          />
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="aero-btn aero-btn--cyan px-4 py-2 inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <Icon icon={faPlus} style={{ fontSize: "10px" }} />{" "}
            {creating ? "…" : "Add"}
          </button>
        </div>
      )}
    </div>
  );
}
