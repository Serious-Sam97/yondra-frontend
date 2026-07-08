"use client";

import { faRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import type { BoardInterface } from "@/interfaces/BoardInterface";
import type { TagInterface } from "@/interfaces/TagInterface";
import { getArchivedCards, restoreCard } from "@/lib/api";
import { type Feedback, FeedbackBanner, PanelHeading } from "./shared";

interface ArchivedCard {
  id: number;
  name: string;
  ticket_number?: number | null;
  archived_at?: string | null;
  tags?: TagInterface[];
  assigned_user?: { id: number; name: string } | null;
}

interface Props {
  board: BoardInterface;
  onRestored?: () => void;
}

export default function ArchivedTab({ board, onRestored }: Props) {
  const [cards, setCards] = useState<ArchivedCard[] | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const prefix = board.ticket_prefix;
  const ticketKey = (n?: number | null) =>
    n == null ? "" : prefix ? `${prefix}-${n}` : `#${n}`;

  useEffect(() => {
    let active = true;
    getArchivedCards(board.id)
      .then((res: ArchivedCard[]) => {
        if (active) setCards(res ?? []);
      })
      .catch(() => {
        if (active) setCards([]);
      });
    return () => {
      active = false;
    };
  }, [board.id]);

  const handleRestore = async (id: number) => {
    setFeedback(null);
    setRestoringId(id);
    try {
      await restoreCard(board.id, id);
      setCards((prev) => (prev ?? []).filter((c) => c.id !== id));
      onRestored?.();
    } catch {
      setFeedback({ type: "error", message: "Could not restore card." });
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="glass-panel p-6 flex flex-col gap-4">
      <PanelHeading>Archived cards</PanelHeading>
      <FeedbackBanner feedback={feedback} />

      {cards === null ? (
        <div className="flex justify-center py-6">
          <div
            className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
            style={{
              borderColor: "var(--cf-phosphor)",
              borderTopColor: "transparent",
            }}
          />
        </div>
      ) : cards.length === 0 ? (
        <p
          className="cf-mono text-center py-3"
          style={{ fontSize: "10px", color: "var(--cf-text-dim)" }}
        >
          No archived cards.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-[60vh] overflow-y-auto -mx-1 px-1">
          {cards.map((card) => (
            <div
              key={card.id}
              className="flex items-center gap-3 rounded-xl px-3 py-2"
              style={{ background: "#211f1b", border: "1px solid #38352e" }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {ticketKey(card.ticket_number) && (
                    <span
                      className="cf-mono flex-shrink-0"
                      style={{ fontSize: "9px", color: "var(--cf-text-dim)" }}
                    >
                      {ticketKey(card.ticket_number)}
                    </span>
                  )}
                  <span
                    className="font-bold truncate"
                    style={{ fontSize: "12px", color: "var(--cf-text)" }}
                  >
                    {card.name}
                  </span>
                </div>
                {(card.tags?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {card.tags!.map((t) => (
                      <span
                        key={t.id}
                        className="rounded-full"
                        style={{ width: 8, height: 8, background: t.color }}
                        title={t.name}
                      />
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleRestore(card.id)}
                disabled={restoringId === card.id}
                className="cf-mono uppercase font-bold rounded-md px-3 py-1.5 cursor-pointer transition-all duration-150 flex-shrink-0 disabled:opacity-50 inline-flex items-center gap-1.5"
                style={{
                  fontSize: "9px",
                  letterSpacing: "0.1em",
                  color: "var(--cf-phosphor)",
                  background: "rgba(154,166,126,0.16)",
                  border: "1px solid rgba(154,166,126,0.5)",
                }}
              >
                <Icon icon={faRotateLeft} style={{ fontSize: "9px" }} />{" "}
                {restoringId === card.id ? "…" : "Restore"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
