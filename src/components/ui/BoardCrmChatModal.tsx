"use client";

import { useEffect, useRef, useState } from "react";
import Modal from "@/components/shared/Modal";
import { useCrmChat } from "@/hooks/useCrmChat";

const SUGGESTIONS = [
  "Which jobs are approved?",
  "What's in progress right now?",
  "Any jobs overdue?",
  "What did we win this month?",
];

// Board-level CRM assistant (YON-69). A multi-turn chat grounded in the board's current
// pipeline — ask which jobs are approved / in progress / won, who the client is, what a
// deal is worth. Read-only: the model answers from a live snapshot, never mutates.
export function BoardCrmChatModal({
  boardId,
  onClose,
}: {
  boardId: number;
  onClose: () => void;
}) {
  const { messages, streamingText, streaming, error, send } = useCrmChat(
    boardId,
    true,
  );
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the newest turn in view as it streams.
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on any transcript change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, streamingText, error]);

  const submit = (text: string) => {
    if (streaming || text.trim() === "") return;
    send(text);
    setInput("");
    inputRef.current?.focus();
  };

  const empty = messages.length === 0 && !streaming;

  return (
    <Modal onClose={onClose}>
      <div
        className="aero-menu p-6 w-[95vw] max-w-xl flex flex-col gap-4"
        style={{ height: "80vh" }}
      >
        <div className="flex items-center justify-between flex-shrink-0">
          <p
            className="cf-mono text-xs uppercase tracking-widest"
            style={{ color: "var(--cf-phosphor)" }}
          >
            Ask the CRM
          </p>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer transition-colors"
            style={{ color: "var(--cf-text-muted)" }}
          >
            ✕
          </button>
        </div>

        {/* Transcript */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto rounded px-3 py-3 flex flex-col gap-3"
          style={{
            border: "1px solid var(--cf-edge)",
            background: "rgba(0,0,0,0.14)",
          }}
        >
          {empty && (
            <div className="m-auto flex flex-col items-center gap-3 text-center">
              <p className="text-sm" style={{ color: "var(--cf-text-muted)" }}>
                Ask about the state of your pipeline — approvals, what&apos;s in
                progress, deals won or lost, clients, values, due dates.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => submit(s)}
                    className="aero-btn aero-btn--ghost text-xs px-3 py-1.5 rounded-full cursor-pointer"
                    style={{ color: "var(--cf-text-muted)" }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: append-only transcript, never reordered
            <Bubble key={i} from={m.role}>
              {m.content}
            </Bubble>
          ))}

          {streaming && (
            <Bubble from="assistant">
              {streamingText || (
                <span style={{ color: "var(--cf-text-muted)" }}>
                  Reading the pipeline…
                </span>
              )}
              {streamingText && (
                <span
                  aria-hidden
                  className="ml-0.5 animate-pulse"
                  style={{ color: "var(--cf-phosphor)" }}
                >
                  ▍
                </span>
              )}
            </Bubble>
          )}

          {error && (
            <p className="text-sm px-1" style={{ color: "var(--cf-red)" }}>
              {error}
            </p>
          )}
        </div>

        {/* Composer */}
        <form
          className="flex items-center gap-2 flex-shrink-0"
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about a job, client, or stage…"
            className="flex-1 rounded px-3 py-2 text-sm outline-none"
            style={{
              border: "1px solid var(--cf-edge)",
              background: "rgba(0,0,0,0.2)",
              color: "var(--cf-text)",
            }}
          />
          <button
            type="submit"
            disabled={streaming || input.trim() === ""}
            className="ai-btn"
          >
            {streaming ? "…" : "Ask"}
          </button>
        </form>
      </div>
    </Modal>
  );
}

function Bubble({
  from,
  children,
}: {
  from: "user" | "assistant";
  children: React.ReactNode;
}) {
  const isUser = from === "user";
  return (
    <div
      className={`max-w-[85%] rounded px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
        isUser ? "self-end" : "self-start"
      }`}
      style={{
        border: "1px solid var(--cf-edge)",
        background: isUser ? "rgba(158,206,106,0.12)" : "rgba(0,0,0,0.22)",
        color: "var(--cf-text)",
      }}
    >
      {children}
    </div>
  );
}
