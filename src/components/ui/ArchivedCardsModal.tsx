"use client";

import Modal from "@/components/shared/Modal";
import type { CardInterface } from "@/interfaces/CardInterface";

interface ArchivedCardsModalProps {
  cards: CardInterface[];
  // Another API page exists — show the "load more" control.
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onRestore: (card: CardInterface) => void;
  onClose: () => void;
}

// Archived-cards browser: list what's in the archive (25 per page) and restore
// cards to the board.
export function ArchivedCardsModal({
  cards,
  hasMore,
  loadingMore,
  onLoadMore,
  onRestore,
  onClose,
}: ArchivedCardsModalProps) {
  return (
    <Modal onClose={onClose}>
      <div
        className="aero-menu p-6 w-[95vw] max-w-md flex flex-col gap-4"
        style={{ maxHeight: "80vh" }}
      >
        <div className="flex items-center justify-between flex-shrink-0">
          <p
            className="cf-mono text-xs uppercase tracking-widest"
            style={{ color: "var(--cf-phosphor)" }}
          >
            Archived cards
          </p>
          <button
            onClick={onClose}
            className="cursor-pointer transition-colors"
            style={{ color: "var(--cf-text-muted)" }}
          >
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-3 overflow-y-auto">
          {cards.length === 0 && (
            <p
              className="cf-mono text-xs text-center py-6"
              style={{ color: "var(--cf-text-muted)" }}
            >
              No archived cards.
            </p>
          )}
          {cards.map((card) => (
            <div
              key={card.id}
              className="flex items-center justify-between rounded-lg px-4 py-3 gap-3"
              style={{ background: "var(--cf-graphite)" }}
            >
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <p
                  className="cf-mono text-sm font-semibold truncate"
                  style={{ color: "var(--cf-text)" }}
                >
                  {card.name}
                </p>
                {card.archived_at && (
                  <p
                    className="cf-mono text-xs"
                    style={{ color: "var(--cf-text-muted)" }}
                  >
                    Archived{" "}
                    {new Date(card.archived_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                )}
              </div>
              <button
                onClick={() => onRestore(card)}
                className="aero-btn aero-btn--ghost text-xs uppercase tracking-widest font-bold px-3 py-1.5 cursor-pointer flex-shrink-0"
              >
                Restore
              </button>
            </div>
          ))}
          {hasMore && (
            <button
              type="button"
              onClick={onLoadMore}
              disabled={loadingMore}
              className="aero-btn aero-btn--ghost text-xs uppercase tracking-widest font-bold px-3 py-1.5 cursor-pointer self-center disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
