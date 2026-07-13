"use client";

import { useEffect } from "react";
import { useCardAi } from "@/hooks/useCardAi";
import type { WaConversation } from "@/hooks/useWhatsappThread";

const waStatusMark = (status: string | null) => {
  switch (status) {
    case "read":
      return { mark: "✓✓", color: "var(--cf-cyan, #38bdf8)" };
    case "delivered":
      return { mark: "✓✓", color: "var(--cf-text-muted)" };
    case "sent":
      return { mark: "✓", color: "var(--cf-text-muted)" };
    case "failed":
      return { mark: "⚠", color: "var(--cf-red)" };
    default:
      return { mark: "·", color: "var(--cf-text-muted)" };
  }
};

interface WhatsAppSectionProps {
  waThread: WaConversation | null;
  newWaReply: string;
  setNewWaReply: (v: string) => void;
  waSending: boolean;
  waError: string | null;
  handleSendWaReply: () => void;
  // When present (saved card + live backend), an AI "Draft reply" affordance streams a
  // suggested reply into the box. Absent on demo/new cards.
  boardId?: number;
  cardId?: number | string;
}

// Presentational WhatsApp tab/section of the card editor — the thread state and
// realtime subscription live in useWhatsappThread (called from CardEdit). The one bit
// of local logic is the optional AI reply draft, which streams into the reply box.
export function WhatsAppSection({
  waThread,
  newWaReply,
  setNewWaReply,
  waSending,
  waError,
  handleSendWaReply,
  boardId,
  cardId,
}: WhatsAppSectionProps) {
  const ai = useCardAi(boardId, cardId, !!boardId && !!cardId);
  // Mirror the streamed reply draft into the box as tokens arrive; after it finishes the
  // user edits freely (their edits don't change ai.text, so this won't clobber them).
  useEffect(() => {
    if (ai.action === "reply") setNewWaReply(ai.text);
  }, [ai.text, ai.action, setNewWaReply]);
  if (!waThread) return null;
  const windowClosed = !waThread.window_open;
  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2"
        style={{
          border: "1px solid var(--cf-edge)",
          background: "rgba(0,0,0,0.14)",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontWeight: "bold",
            color: "var(--cf-text)",
          }}
        >
          {waThread.contact_name || waThread.wa_phone}
        </span>
        <span
          style={{ fontSize: "10px", color: "var(--cf-text-muted)" }}
          className="cf-mono"
        >
          {waThread.wa_phone}
        </span>
        <span
          className="cf-mono ml-auto uppercase tracking-widest"
          style={{
            fontSize: "9px",
            color: windowClosed ? "var(--cf-text-muted)" : "var(--cf-phosphor)",
          }}
        >
          {windowClosed ? "window closed" : "window open"}
        </span>
      </div>

      {/* Thread */}
      <div className="flex flex-col gap-2">
        {waThread.messages.map((m) => {
          const out = m.direction === "out";
          const s = waStatusMark(m.status);
          return (
            <div
              key={m.id}
              className="flex flex-col max-w-[85%]"
              style={{ alignSelf: out ? "flex-end" : "flex-start" }}
            >
              <div
                className="rounded-lg px-3 py-1.5"
                style={{
                  background: out
                    ? "rgba(37,211,102,0.12)"
                    : "rgba(255,255,255,0.05)",
                  border: `1px solid ${out ? "rgba(37,211,102,0.35)" : "var(--cf-edge)"}`,
                  color: "var(--cf-text)",
                  fontSize: "12px",
                }}
              >
                {m.body || (
                  <span style={{ color: "var(--cf-text-muted)" }}>
                    [{m.type}]
                  </span>
                )}
              </div>
              <div
                className="flex items-center gap-1 mt-0.5"
                style={{ alignSelf: out ? "flex-end" : "flex-start" }}
              >
                <span
                  style={{ fontSize: "9px", color: "var(--cf-text-muted)" }}
                  className="cf-mono"
                >
                  {new Date(m.created_at).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {out && (
                  <span
                    style={{ fontSize: "10px", color: s.color }}
                    title={m.status ?? ""}
                  >
                    {s.mark}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {waThread.messages.length === 0 && (
          <p
            style={{ fontSize: "12px", color: "var(--cf-text-muted)" }}
            className="cf-mono text-center py-2"
          >
            No messages yet.
          </p>
        )}
      </div>

      {/* Reply composer */}
      {windowClosed ? (
        <p
          style={{ fontSize: "11px", color: "var(--cf-text-muted)" }}
          className="cf-mono py-2"
        >
          The 24-hour reply window has closed. An approved template is required
          to message this contact again.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {!!boardId && !!cardId && (
            <button
              type="button"
              onClick={() => ai.run("reply")}
              disabled={ai.streaming || waSending}
              className="ai-btn self-start"
            >
              {ai.streaming ? "Drafting…" : "Draft reply"}
            </button>
          )}
          {ai.error && (
            <p
              style={{ fontSize: "11px", color: "var(--cf-red)" }}
              className="cf-mono"
            >
              {ai.error}
            </p>
          )}
          <textarea
            value={newWaReply}
            onChange={(e) => setNewWaReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                handleSendWaReply();
            }}
            placeholder="Reply on WhatsApp… (⌘/Ctrl+Enter to send)"
            rows={2}
            className="rounded-lg px-3 py-2 resize-none"
            style={{
              border: "1px solid var(--cf-edge)",
              background: "rgba(0,0,0,0.14)",
              color: "var(--cf-text)",
              fontSize: "12px",
            }}
          />
          {waError && (
            <p
              style={{ fontSize: "11px", color: "var(--cf-red)" }}
              className="cf-mono"
            >
              {waError}
            </p>
          )}
          <button
            onClick={handleSendWaReply}
            disabled={!newWaReply.trim() || waSending || ai.streaming}
            style={{ fontSize: "11px" }}
            className="aero-btn aero-btn--cyan self-end px-4 py-1.5 font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {waSending ? "Sending…" : "Send"}
          </button>
        </div>
      )}
    </div>
  );
}
