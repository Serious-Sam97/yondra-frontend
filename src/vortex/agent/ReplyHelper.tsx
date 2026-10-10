"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

// G-12 · "help me reply": three drafts (short, diplomatic, what you meant).
// Picking one only fills your composer — he never posts anything himself.

export default function ReplyHelper({
  draft,
  onPick,
}: {
  draft: string;
  onPick: (text: string) => void;
}) {
  const [opts, setOpts] = useState<Record<string, string> | null>(null);
  const [busy, setBusy] = useState(false);
  const cardId =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("card");
  if (!cardId) return null;
  const ask = async () => {
    setBusy(true);
    try {
      setOpts(
        await apiFetch<Record<string, string>>("/api/mascot/agent/replies", {
          method: "POST",
          body: JSON.stringify({
            card: Number(cardId),
            draft: draft.replace(/<[^>]+>/g, " ").trim() || null,
          }),
        }),
      );
    } catch {
      setOpts({ short: "the tape jammed. write it yourself, like an animal." });
    } finally {
      setBusy(false);
    }
  };
  return (
    <span className="vxg-reply">
      <button
        type="button"
        className="aero-btn px-3 py-1.5 font-bold cursor-pointer"
        style={{ fontSize: "11px" }}
        onClick={() => void ask()}
        disabled={busy}
      >
        {busy ? "he's thinking…" : "help me reply"}
      </button>
      {opts && (
        <span className="opts">
          {(["short", "diplomatic", "meant"] as const)
            .filter((k) => opts[k])
            .map((k) => (
              <button
                key={k}
                type="button"
                title={k}
                onClick={() => {
                  onPick(`<p>${opts[k].replace(/</g, "&lt;")}</p>`);
                  setOpts(null);
                }}
              >
                <b>{k === "meant" ? "what you meant" : k}</b> {opts[k]}
              </button>
            ))}
        </span>
      )}
    </span>
  );
}
