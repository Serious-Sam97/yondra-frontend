"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/telemetry";

// Last-resort boundary: catches errors thrown by the root layout itself. It
// replaces the entire document, so it must render its own <html>/<body> and
// cannot rely on globals.css — everything is inlined (cassette-futurism tokens
// copied from globals.css so the panel still looks like the app).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    reportError(error, { boundary: "global", digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          background: "#16150f",
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            maxWidth: "384px",
            width: "100%",
            padding: "40px 32px",
            textAlign: "center",
            border: "1.5px solid #4a463f",
            borderRadius: "8px",
            background: "linear-gradient(to bottom, #312f29, #262420)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.1), 0 6px 18px rgba(0,0,0,0.45)",
            color: "#e8e4d6",
          }}
        >
          <p
            style={{
              margin: "0 0 12px",
              fontSize: "13px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#ff5a4d",
            }}
          >
            Something went wrong
          </p>
          <p
            style={{
              margin: "0 0 20px",
              fontSize: "12px",
              lineHeight: 1.6,
              color: "#a39d8c",
            }}
          >
            A fatal error took the app down. Reload to get back to work.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "10px 20px",
              fontSize: "12px",
              fontWeight: 700,
              fontFamily: "inherit",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#2a2418",
              border: "1.5px solid #8f835f",
              borderRadius: "5px",
              background:
                "linear-gradient(to bottom, #d8cfaa, #c2b78c 52%, #aa9e72)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.5), 0 3px 0 #5e5436, 0 4px 7px rgba(0,0,0,0.4)",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
