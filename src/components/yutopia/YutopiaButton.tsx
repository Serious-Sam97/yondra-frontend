"use client";

import { useState } from "react";
import { useToast } from "@/contexts/ToastContext";
import { openYutopia } from "./open";

// Dashboard key: opens Yutopia (the isometric studio) signed in as you.
export function YutopiaButton() {
  const [busy, setBusy] = useState(false);
  const { pushToast } = useToast();
  return (
    <button
      type="button"
      className="yd-yutopia-key"
      aria-busy={busy}
      disabled={busy}
      title="Open Yutopia — your team's studio, signed in as you"
      onClick={async () => {
        setBusy(true);
        const ok = await openYutopia();
        setBusy(false);
        if (!ok)
          pushToast({
            type: "error",
            message: "Couldn't open Yutopia. Try again in a moment.",
          });
      }}
    >
      <span className="yd-yutopia-key__led" aria-hidden />
      <span className="yd-yutopia-key__stripes" aria-hidden />
      <span className="yd-yutopia-key__label">
        {busy ? "TUNING…" : "YUTOPIA"}
      </span>
    </button>
  );
}
