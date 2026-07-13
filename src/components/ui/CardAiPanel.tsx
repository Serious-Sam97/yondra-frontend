"use client";

import { useState } from "react";
import { useCardAi } from "@/hooks/useCardAi";
import type { AiAction } from "@/lib/api";
import { mdToHtml } from "@/lib/mdToHtml";

// AI actions for the description area of a card, behind a single dropdown to keep the
// editor uncluttered: summarise the thread, draft/expand the description, generate a
// checklist, and rewrite the current text (improve / translate). Results stream live and
// can be APPLIED where it makes sense — describe/rewrite insert into the description
// (Markdown-rendered), checklist adds items. (Test-case generation lives in the Sentinel
// tab.) Read-only generation; applying goes through the normal module writes.
export function CardAiPanel({
  boardId,
  cardId,
  currentText,
  readOnly = false,
  onApplyDescription,
  onAddChecklist,
}: {
  boardId: number;
  cardId: number | string;
  currentText: string;
  readOnly?: boolean;
  onApplyDescription: (html: string) => void;
  onAddChecklist?: (items: string[]) => void | Promise<void>;
}) {
  const ai = useCardAi(boardId, cardId, true);
  const [open, setOpen] = useState(false);
  const [applied, setApplied] = useState<string | null>(null);

  // The description is rich-text HTML; send the model clean text so its output inserts
  // back cleanly.
  const plainText = () =>
    currentText
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const translate = () => {
    const language =
      typeof window !== "undefined"
        ? window.prompt("Translate the description into which language?")
        : null;
    if (language && language.trim()) {
      ai.run("rewrite", {
        mode: "translate",
        language: language.trim(),
        text: plainText(),
      });
    }
  };

  const items: Array<{ label: string; onClick: () => void }> = [
    { label: "Summarise thread", onClick: () => ai.run("summarize") },
    {
      label: "Draft description",
      onClick: () => ai.run("describe", { text: plainText() }),
    },
    { label: "Generate checklist", onClick: () => ai.run("checklist") },
    {
      label: "Improve writing",
      onClick: () => ai.run("rewrite", { mode: "improve", text: plainText() }),
    },
    { label: "Translate…", onClick: translate },
  ];

  // Parse "- item" lines from a checklist result, dropping the sparse-card placeholder.
  const checklistItems = (): string[] =>
    ai.text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => /^[-*]\s+/.test(l))
      .map((l) => l.replace(/^[-*]\s+/, "").trim())
      .filter((l) => l !== "" && !l.startsWith("(Not enough detail"));

  const insertable: AiAction[] = ["describe", "rewrite"];

  // The apply button label for the finished action, or null when nothing applies.
  const applyLabel = ((): string | null => {
    if (ai.action && insertable.includes(ai.action))
      return "Insert into description";
    if (ai.action === "checklist")
      return onAddChecklist && checklistItems().length ? "Add to checklist" : null;
    return null;
  })();

  const apply = async () => {
    try {
      if (ai.action && insertable.includes(ai.action)) {
        onApplyDescription(mdToHtml(ai.text));
        setApplied("Inserted into description");
      } else if (ai.action === "checklist" && onAddChecklist) {
        const list = checklistItems();
        if (list.length) {
          await onAddChecklist(list);
          setApplied(`Added ${list.length} item${list.length > 1 ? "s" : ""} to checklist`);
        }
      }
    } catch {
      setApplied("Couldn't apply — try again");
    }
  };

  const chip = (label: string, onClick: () => void, accent = false) => (
    <button
      type="button"
      onClick={onClick}
      className="cf-mono uppercase rounded px-2 py-1"
      style={{
        fontSize: "10px",
        letterSpacing: "0.12em",
        border: `1px solid ${accent ? "var(--cf-phosphor)" : "var(--cf-edge)"}`,
        color: accent ? "var(--cf-phosphor)" : "var(--cf-text-dim)",
        background: "rgba(0,0,0,0.15)",
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-2">
      {/* Single dropdown trigger — keeps the editor clean */}
      <div className="relative self-start">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={ai.streaming}
          className="ai-btn"
        >
          {ai.streaming ? "Working…" : "AI assist"}
          <span aria-hidden style={{ fontSize: "8px" }}>
            ▼
          </span>
        </button>

        {open && !ai.streaming && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <div
              className="absolute left-0 z-50 mt-1 min-w-[190px] overflow-hidden rounded"
              style={{
                border: "1px solid var(--cf-edge)",
                background: "var(--cf-screen, #1a1414)",
                boxShadow: "0 6px 20px rgba(0,0,0,0.45)",
              }}
            >
              {items.map((it) => (
                <button
                  key={it.label}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setApplied(null);
                    it.onClick();
                  }}
                  className="cf-mono block w-full px-3 py-2 text-left transition-colors"
                  style={{
                    fontSize: "11px",
                    color: "var(--cf-text)",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {it.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {ai.hasRun && (
        <div className="flex flex-col gap-1.5">
          <div
            className="rounded px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap"
            style={{
              border: "1px solid var(--cf-edge)",
              background: "rgba(0,0,0,0.12)",
              color: ai.error ? "var(--cf-red)" : "var(--cf-text)",
              minHeight: "1.75rem",
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
          </div>

          {!ai.streaming && !ai.error && ai.text !== "" && (
            <div className="flex flex-wrap items-center gap-1.5">
              {applyLabel && !applied && !readOnly && chip(applyLabel, apply, true)}
              {applied && (
                <span
                  className="cf-mono"
                  style={{ fontSize: "10px", color: "var(--cf-phosphor)" }}
                >
                  ✓ {applied}
                </span>
              )}
              {chip("Copy", () => {
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                  navigator.clipboard.writeText(ai.text);
                }
              })}
              {chip("Dismiss", () => {
                setApplied(null);
                ai.reset();
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
