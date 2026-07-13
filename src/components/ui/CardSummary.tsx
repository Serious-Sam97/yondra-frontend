"use client";

import { useCardSummary } from "@/hooks/useCardSummary";

// "✨ Summarise thread" affordance under a card's description. Streams an AI TL;DR of
// the description + checklist + comments over the board channel and renders it live.
// Read-only feature — shown on any saved card, no write access required.
export function CardSummary({
  boardId,
  cardId,
}: {
  boardId: number;
  cardId: number | string;
}) {
  const { text, streaming, error, run, hasRun } = useCardSummary(
    boardId,
    cardId,
    true,
  );

  return (
    <div className="flex flex-col gap-2">
      <div>
        <button
          type="button"
          onClick={run}
          disabled={streaming}
          className="cf-mono uppercase inline-flex items-center gap-1.5 rounded px-2.5 py-1 transition-opacity disabled:opacity-60"
          style={{
            fontSize: "10px",
            letterSpacing: "0.14em",
            border: "1px solid var(--cf-edge)",
            color: "var(--cf-text-dim)",
            background: "rgba(0,0,0,0.15)",
          }}
        >
          {streaming
            ? "Summarising…"
            : text
              ? "↻ Re-summarise"
              : "✨ Summarise thread"}
        </button>
      </div>

      {(hasRun || error) && (
        <div
          className="rounded px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap"
          style={{
            border: "1px solid var(--cf-edge)",
            background: "rgba(0,0,0,0.12)",
            color: error ? "var(--cf-red)" : "var(--cf-text)",
            minHeight: "1.75rem",
          }}
        >
          {error ?? text}
          {streaming && (
            <span
              aria-hidden
              className="ml-0.5 animate-pulse"
              style={{ color: "var(--cf-phosphor)" }}
            >
              ▍
            </span>
          )}
        </div>
      )}
    </div>
  );
}
