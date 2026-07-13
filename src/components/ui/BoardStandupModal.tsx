"use client";

import { useEffect, useRef } from "react";
import Modal from "@/components/shared/Modal";
import { useBoardAi } from "@/hooks/useBoardAi";

// Board-level AI standup / sprint summary. Streams "what's in progress / done / blocked"
// from the board's columns and cards. Runs once on open; regenerate on demand.
export function BoardStandupModal({
  boardId,
  onClose,
}: {
  boardId: number;
  onClose: () => void;
}) {
  const ai = useBoardAi(boardId, true);
  const { run } = ai;

  // Kick off automatically once when the modal opens. The ref guard prevents a re-run
  // when `run`'s identity changes (it depends on `streaming`), which would otherwise
  // regenerate on completion.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    run();
  }, [run]);

  return (
    <Modal onClose={onClose}>
      <div
        className="aero-menu p-6 w-[95vw] max-w-lg flex flex-col gap-4"
        style={{ maxHeight: "80vh" }}
      >
        <div className="flex items-center justify-between flex-shrink-0">
          <p
            className="cf-mono text-xs uppercase tracking-widest"
            style={{ color: "var(--cf-phosphor)" }}
          >
            Standup summary
          </p>
          <button
            onClick={onClose}
            className="cursor-pointer transition-colors"
            style={{ color: "var(--cf-text-muted)" }}
          >
            ✕
          </button>
        </div>

        <div
          className="rounded px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap overflow-y-auto"
          style={{
            border: "1px solid var(--cf-edge)",
            background: "rgba(0,0,0,0.14)",
            color: ai.error ? "var(--cf-red)" : "var(--cf-text)",
            minHeight: "6rem",
          }}
        >
          {ai.error ?? ai.text}
          {ai.streaming && (
            <span
              aria-hidden
              className="ml-0.5 animate-pulse"
              style={{ color: "var(--cf-phosphor)" }}
            >
              ▍
            </span>
          )}
          {!ai.hasRun && (
            <span style={{ color: "var(--cf-text-muted)" }}>Reading the board…</span>
          )}
        </div>

        <div className="flex justify-end flex-shrink-0">
          <button
            type="button"
            onClick={run}
            disabled={ai.streaming}
            className="ai-btn"
          >
            {ai.streaming ? "Generating…" : "↻ Regenerate"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
