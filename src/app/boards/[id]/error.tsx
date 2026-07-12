"use client";

import { useEffect } from "react";

// Board-scoped error boundary: a crash inside the board (drag-and-drop, card
// modal, realtime merge) shows this panel while the app shell — backdrop, app
// bar, navigation — stays alive, instead of taking the whole page down.
export default function BoardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-panel flex flex-col items-center gap-4 px-8 py-10 text-center max-w-sm w-full">
        <span
          className="cf-led"
          style={{
            background: "var(--cf-red)",
            boxShadow: "0 0 8px var(--cf-red)",
          }}
        />
        <p
          className="cf-mono text-sm font-bold uppercase tracking-widest"
          style={{ color: "var(--cf-red)" }}
        >
          Board crashed
        </p>
        <p
          className="cf-mono text-xs"
          style={{ color: "var(--cf-text-muted)" }}
        >
          Something went wrong while rendering this board. Reload it, or head
          back to the dashboard.
        </p>
        <div className="flex items-center gap-3 mt-1">
          <button
            type="button"
            onClick={reset}
            className="aero-btn aero-btn--cyan text-xs uppercase tracking-widest font-bold px-4 py-2 cursor-pointer"
          >
            Reload board
          </button>
          <a
            href="/dashboard"
            className="aero-btn aero-btn--ghost text-xs uppercase tracking-widest font-bold px-4 py-2"
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
