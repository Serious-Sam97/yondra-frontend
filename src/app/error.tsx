"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/telemetry";

// Route-segment error boundary: catches render/effect throws anywhere under the
// root layout so a crash shows this panel instead of a white screen. The layout
// (backdrop, app bar, providers) stays mounted around it.
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    reportError(error, { boundary: "segment", digest: error.digest });
  }, [error]);

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4">
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
          Something went wrong
        </p>
        <p
          className="cf-mono text-xs"
          style={{ color: "var(--cf-text-muted)" }}
        >
          An unexpected error interrupted the app. Your data is safe — try
          again, or head back home.
        </p>
        <div className="flex items-center gap-3 mt-1">
          <button
            type="button"
            onClick={reset}
            className="aero-btn aero-btn--cyan text-xs uppercase tracking-widest font-bold px-4 py-2 cursor-pointer"
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="aero-btn aero-btn--ghost text-xs uppercase tracking-widest font-bold px-4 py-2"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
