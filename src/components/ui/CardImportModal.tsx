"use client";

import { useId, useRef, useState } from "react";
import Modal from "@/components/shared/Modal";
import { ApiError, type CardImportResult, importCards } from "@/lib/api";

interface CardImportModalProps {
  boardId: number;
  // Column names shown as hints so the user knows what `section` values map to.
  sectionNames: string[];
  onClose: () => void;
  // Fired once per successful import so the parent can surface a toast / count.
  onImported?: (result: CardImportResult) => void;
}

// A compact, self-documenting sample so a first-time user has something to run.
const SAMPLE = `[
  {
    "name": "Design landing page",
    "description": "Hero + pricing section",
    "priority": "high",
    "column": "To Do",
    "tags": ["design", "web"],
    "due_date": "2026-08-15",
    "story_points": 5
  },
  {
    "title": "Wire up analytics",
    "column": "In Progress"
  }
]`;

// An Opportunity Canvas is accepted too — it becomes one card with a structured
// summary. Minimal example (see opportunity-canvas.en.json for every field).
const CANVAS_SAMPLE = `{
  "schemaVersion": "1.1",
  "document": { "code": "OC-2026-001" },
  "opportunity": {
    "name": "Acme warehouse rollout",
    "client": "Acme Corp",
    "segment": "Logistics"
  },
  "contact": { "name": "Jane Doe", "emailOrPhone": "jane@acme.com" },
  "problem": { "description": "Manual stock counts cause errors." },
  "impact": { "types": ["Financial", "Operational"] },
  "commercialContext": { "expectedBudget": "120000", "urgency": "high" },
  "objective": { "desiredDeadline": "2026-10-01" }
}`;

// Custom JSON card importer (YON-121). Paste or upload a JSON model, validate it
// client-side, POST it, and report how many cards were created plus any per-row
// errors the server rejected. Imported cards also arrive over the board realtime
// channel, so the board updates itself; this modal only reports the outcome.
export function CardImportModal({
  boardId,
  sectionNames,
  onClose,
  onImported,
}: CardImportModalProps) {
  const [text, setText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CardImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaId = useId();

  function loadFile(file: File) {
    setSubmitError(null);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? "");
      setText(content);
      validate(content);
    };
    reader.onerror = () => setParseError("Could not read that file.");
    reader.readAsText(file);
  }

  // Parse-only check so the Import button can stay disabled on malformed JSON and
  // the user sees the syntax error before submitting.
  function validate(value: string): unknown | undefined {
    const trimmed = value.trim();
    if (trimmed === "") {
      setParseError(null);
      return undefined;
    }
    try {
      const parsed = JSON.parse(trimmed);
      setParseError(null);
      return parsed;
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Invalid JSON.");
      return undefined;
    }
  }

  async function submit() {
    const parsed = validate(text);
    if (parsed === undefined) return;
    setBusy(true);
    setSubmitError(null);
    setResult(null);
    try {
      const res = await importCards(boardId, parsed);
      onImported?.(res);
      // Fully successful → close; the new cards are already on the board (and
      // their tags merged via onImported). Keep the modal open only when some
      // rows were skipped, so the user can see what failed and why.
      if (res.error_count === 0) {
        onClose();
        return;
      }
      setResult(res);
    } catch (e) {
      if (e instanceof ApiError) {
        // The 422 body is JSON with a `message`; fall back to the raw text.
        let message = e.body;
        try {
          message = JSON.parse(e.body).message ?? e.body;
        } catch {
          /* keep raw body */
        }
        setSubmitError(message || "Import failed.");
      } else {
        setSubmitError("Import failed.");
      }
    } finally {
      setBusy(false);
    }
  }

  const canImport = text.trim() !== "" && !parseError && !busy;

  return (
    <Modal onClose={onClose}>
      <div
        className="aero-menu p-6 w-[95vw] max-w-lg flex flex-col gap-4"
        style={{ maxHeight: "85vh" }}
      >
        <div className="flex items-center justify-between flex-shrink-0">
          <p
            className="cf-mono text-xs uppercase tracking-widest"
            style={{ color: "var(--cf-phosphor)" }}
          >
            Import cards from JSON
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

        <div className="flex flex-col gap-3 overflow-y-auto">
          <p
            className="cf-mono text-[10px] leading-relaxed"
            style={{ color: "var(--cf-text-muted)" }}
          >
            Paste an array of card objects, a{" "}
            <code>{`{ "cards": [...] }`}</code> object, or a single card. Each
            needs a <code>name</code> (or <code>title</code>). Optional:{" "}
            <code>description</code>, <code>priority</code> (low/medium/high),{" "}
            <code>due_date</code>, <code>story_points</code>, <code>value</code>
            , <code>tags</code>, and <code>column</code> to target a board
            column by name.
          </p>

          <p
            className="cf-mono text-[10px] leading-relaxed"
            style={{ color: "var(--cf-text-muted)" }}
          >
            An <strong>Opportunity Canvas</strong> JSON is also accepted — it
            becomes one card with a structured summary, its contact linked, and
            tags from the impact types and drivers.
          </p>

          {sectionNames.length > 0 && (
            <p
              className="cf-mono text-[10px]"
              style={{ color: "var(--cf-text-muted)" }}
            >
              Columns: {sectionNames.join(" · ")}. Unspecified cards land in{" "}
              <span style={{ color: "var(--cf-phosphor)" }}>
                {sectionNames[0]}
              </span>
              .
            </p>
          )}

          <label htmlFor={textareaId} className="sr-only">
            Card JSON
          </label>
          <textarea
            id={textareaId}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setResult(null);
              validate(e.target.value);
            }}
            spellCheck={false}
            placeholder="Paste JSON here…"
            className="glass-input cf-mono text-xs px-3 py-2 w-full resize-y"
            style={{ minHeight: "180px" }}
          />

          {parseError && (
            <p className="cf-mono text-[10px]" style={{ color: "#ff5a4d" }}>
              JSON error: {parseError}
            </p>
          )}
          {submitError && (
            <p className="cf-mono text-[10px]" style={{ color: "#ff5a4d" }}>
              {submitError}
            </p>
          )}

          {result && (
            <div
              className="rounded-lg px-3 py-2 flex flex-col gap-1"
              style={{ background: "var(--cf-graphite)" }}
            >
              <p
                className="cf-mono text-xs"
                style={{ color: "var(--cf-phosphor)" }}
              >
                Created {result.created_count} card
                {result.created_count === 1 ? "" : "s"}
                {result.error_count > 0 && `, ${result.error_count} skipped`}.
              </p>
              {result.errors.map((err) => (
                <p
                  key={`${err.index}-${err.message}`}
                  className="cf-mono text-[10px]"
                  style={{ color: "#ff5a4d" }}
                >
                  Row {err.index + 1}: {err.message}
                </p>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) loadFile(file);
                e.target.value = ""; // allow re-selecting the same file
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aero-btn aero-btn--ghost text-[10px] uppercase tracking-widest px-3 py-2 cursor-pointer"
            >
              Upload .json
            </button>
            <button
              type="button"
              onClick={() => {
                setText(SAMPLE);
                setResult(null);
                validate(SAMPLE);
              }}
              className="aero-btn aero-btn--ghost text-[10px] uppercase tracking-widest px-3 py-2 cursor-pointer"
            >
              Insert sample
            </button>
            <button
              type="button"
              onClick={() => {
                setText(CANVAS_SAMPLE);
                setResult(null);
                validate(CANVAS_SAMPLE);
              }}
              className="aero-btn aero-btn--ghost text-[10px] uppercase tracking-widest px-3 py-2 cursor-pointer"
            >
              Canvas sample
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="aero-btn aero-btn--ghost text-xs uppercase tracking-widest px-4 py-2 cursor-pointer"
          >
            {result ? "Done" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canImport}
            className="aero-btn aero-btn--cyan text-xs uppercase tracking-widest font-bold px-4 py-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? "Importing…" : "Import"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
