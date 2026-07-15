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

// The backend caps a single import request at 200 cards (CardImportParser::MAX_CARDS).
// When a merged multi-file batch exceeds that, we split it into sequential requests
// of this size so the whole drop still lands instead of getting rejected wholesale.
const CHUNK_SIZE = 200;

// Pull the list of card objects a single parsed file contributes to a merged batch.
// Accepts the same three shapes the server does — a bare array, a { cards: [...] }
// envelope, or a single object (a plain card, or an Opportunity Canvas doc, both of
// which the backend resolves per-row) — so files of mixed shapes can be dropped
// together and flattened into one array.
function cardsFromParsed(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (parsed !== null && typeof parsed === "object") {
    const cards = (parsed as { cards?: unknown }).cards;
    if (Array.isArray(cards)) return cards;
    return [parsed];
  }
  return [parsed];
}

function isJsonFile(file: File): boolean {
  return file.type === "application/json" || /\.json$/i.test(file.name);
}

// Canonical card field → the key spellings the backend accepts for it (mirrors
// CardImportParser::ALIASES). Used to light up the FIELDS chips for whatever the
// pasted JSON actually contains, so the legend reflects the buffer.
const FIELD_ALIASES: Record<string, string[]> = {
  name: ["name", "title", "summary", "subject"],
  description: ["description", "desc", "body", "details", "content", "notes"],
  priority: ["priority"],
  due_date: ["due_date", "due", "dueDate", "deadline"],
  story_points: ["story_points", "storyPoints", "points", "estimate"],
  value: ["value", "amount", "deal_value", "dealValue"],
  tags: ["tags", "labels", "tag"],
  column: ["section", "column", "status", "stage", "list"],
};

// Chips shown after the required name* chip, in display order.
const OPTIONAL_FIELDS = [
  "description",
  "priority",
  "due_date",
  "story_points",
  "value",
  "tags",
  "column",
];

// Which canonical fields appear across the flat card objects in a parsed buffer.
// Returns null for empty/invalid JSON or an Opportunity Canvas (whose fields are
// derived server-side, not written flat) so the legend falls back to neutral.
function presentFieldsIn(
  text: string,
  hasParseError: boolean,
): Set<string> | null {
  const t = text.trim();
  if (t === "" || hasParseError) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(t);
  } catch {
    return null;
  }
  const cards = cardsFromParsed(parsed).filter(
    (c): c is Record<string, unknown> =>
      c !== null && typeof c === "object" && !Array.isArray(c),
  );
  // Only flat cards (those carrying a name/title alias) drive the legend.
  const flat = cards.filter((c) => FIELD_ALIASES.name.some((k) => k in c));
  if (flat.length === 0) return null;

  const present = new Set<string>();
  for (const card of flat) {
    for (const [canon, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.some((a) => a in card)) present.add(canon);
    }
  }
  return present;
}

// One line in the STATUS readout: an LED + phosphor/red mono text.
function StatusRow({
  tone,
  children,
}: {
  tone: "green" | "amber" | "red" | "off";
  children: string;
}) {
  const color =
    tone === "red"
      ? "var(--cf-red)"
      : tone === "green"
        ? "var(--cf-phosphor)"
        : "var(--cf-text-muted)";
  return (
    <div className="flex items-center gap-2.5">
      <span className={`cf-led ci-led--${tone}`} aria-hidden="true" />
      <span
        className="cf-mono"
        style={{ fontSize: 12, letterSpacing: "0.06em", color }}
      >
        {children}
      </span>
    </div>
  );
}

// A secondary detail line under a StatusRow (a skipped file, a rejected row).
function StatusDetail({ children }: { children: string }) {
  return (
    <p
      className="cf-mono"
      style={{
        fontSize: 10,
        color: "var(--cf-red)",
        paddingLeft: 18,
        letterSpacing: "0.04em",
      }}
    >
      {children}
    </p>
  );
}

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
  const [dragging, setDragging] = useState(false);
  // Readout after a multi-file drop/upload: how many files merged, how many cards,
  // and which files were skipped (with why). Null for a single file / plain paste.
  const [loadSummary, setLoadSummary] = useState<{
    files: number;
    cards: number;
    skipped: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaId = useId();

  // Read one file and drop its raw text into the box, preserving the user's exact
  // formatting. Used for the single-file case; multiple files go through mergeFiles.
  async function loadFile(file: File) {
    setSubmitError(null);
    setResult(null);
    setLoadSummary(null);
    try {
      const content = await file.text();
      setText(content);
      validate(content);
    } catch {
      setParseError("Could not read that file.");
    }
  }

  // Handle one or more dropped/selected files. A single file keeps its text verbatim;
  // multiple files are each parsed, flattened to their cards, and merged into one
  // array so the whole drop imports as a single batch. Unreadable / invalid files are
  // skipped (never abort the merge) and reported in the load summary.
  async function loadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter(isJsonFile);
    if (files.length === 0) {
      setParseError("Please drop .json files.");
      return;
    }
    if (files.length === 1) {
      await loadFile(files[0]);
      return;
    }

    setSubmitError(null);
    setResult(null);
    setParseError(null);

    const merged: unknown[] = [];
    const skipped: string[] = [];
    let ok = 0;
    for (const file of files) {
      try {
        merged.push(...cardsFromParsed(JSON.parse(await file.text())));
        ok += 1;
      } catch (e) {
        skipped.push(
          `${file.name}: ${e instanceof Error ? e.message : "invalid JSON"}`,
        );
      }
    }

    if (merged.length === 0) {
      setText("");
      setParseError(
        skipped.length
          ? `No valid JSON found. ${skipped.join("; ")}`
          : "No cards found in the dropped files.",
      );
      setLoadSummary(null);
      return;
    }

    const combined = JSON.stringify(merged, null, 2);
    setText(combined);
    validate(combined);
    setLoadSummary({ files: ok, cards: merged.length, skipped });
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

  // Send the whole batch, transparently splitting it into CHUNK_SIZE requests when it
  // exceeds the server's per-request cap so a large merged drop always lands. Results
  // are aggregated back into one shape; error indices are offset to stay global so the
  // "Row N" readout still points at the right card in the combined array.
  async function importAll(parsed: unknown): Promise<CardImportResult> {
    const cards = cardsFromParsed(parsed);
    if (cards.length <= CHUNK_SIZE) {
      return importCards(boardId, parsed);
    }

    const agg: CardImportResult = {
      created: [],
      created_count: 0,
      errors: [],
      error_count: 0,
    };
    for (let i = 0; i < cards.length; i += CHUNK_SIZE) {
      const res = await importCards(boardId, cards.slice(i, i + CHUNK_SIZE));
      agg.created.push(...res.created);
      agg.created_count += res.created_count;
      agg.errors.push(...res.errors.map((e) => ({ ...e, index: e.index + i })));
      agg.error_count += res.error_count;
    }
    return agg;
  }

  async function submit() {
    const parsed = validate(text);
    if (parsed === undefined) return;
    setBusy(true);
    setSubmitError(null);
    setResult(null);
    try {
      const res = await importAll(parsed);
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

  // Replace the buffer contents (sample buttons + typing) and re-validate, clearing
  // any prior result / merge summary so the STATUS readout reflects only what's live.
  function setContent(value: string) {
    setText(value);
    setResult(null);
    setLoadSummary(null);
    validate(value);
  }

  const canImport = text.trim() !== "" && !parseError && !busy;

  // How many cards currently sit in the buffer — feeds the STATUS "ready" readout
  // and the count on the Import key. 0 while empty or mid-syntax-error.
  const readyCount = (() => {
    const t = text.trim();
    if (t === "" || parseError) return 0;
    try {
      return cardsFromParsed(JSON.parse(t)).length;
    } catch {
      return 0;
    }
  })();

  // Fields the current buffer actually uses — lights up the matching chips.
  const presentFields = presentFieldsIn(text, parseError !== null);

  return (
    <Modal onClose={onClose}>
      <div
        className="ci-panel relative w-[95vw] max-w-lg p-5 flex flex-col gap-3.5"
        style={{ maxHeight: "88vh" }}
      >
        <span
          className="cf-screw absolute"
          style={{ top: 9, left: 9 }}
          aria-hidden="true"
        />
        <span
          className="cf-screw absolute"
          style={{ top: 9, right: 9 }}
          aria-hidden="true"
        />
        <span
          className="cf-screw absolute"
          style={{ bottom: 9, left: 9 }}
          aria-hidden="true"
        />
        <span
          className="cf-screw absolute"
          style={{ bottom: 9, right: 9 }}
          aria-hidden="true"
        />

        {/* faceplate: LED bank + title + close */}
        <div className="flex items-center gap-3 flex-shrink-0 px-1">
          <div className="flex gap-1.5" aria-hidden="true">
            <span
              className={`cf-led ${readyCount > 0 ? "ci-led--green" : "ci-led--off"}`}
            />
            <span
              className={`cf-led ${loadSummary ? "ci-led--amber" : "ci-led--off"}`}
            />
            <span
              className={`cf-led ${parseError || submitError ? "ci-led--red" : "ci-led--off"}`}
            />
          </div>
          <p
            className="cf-mono text-xs uppercase tracking-widest flex-1"
            style={{
              color: "var(--cf-phosphor)",
              textShadow:
                "0 0 8px color-mix(in srgb, var(--cf-phosphor) 40%, transparent)",
            }}
          >
            Import Cards · JSON Loader
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cf-mono cursor-pointer transition-colors"
            style={{ color: "var(--cf-text-muted)" }}
          >
            ✕
          </button>
        </div>

        {/* Drop target spans the whole scrolling body so files can be dropped on the
            bay or the buffer; `dragging` only lights up the bay. preventDefault on
            dragOver/drop stops the browser opening the dropped file. Drag-drop is a
            pure enhancement over the Browse key + textarea, so the a11y rule for
            interactive handlers on a static wrapper doesn't apply here. */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: drop zone augments the accessible Browse key + textarea */}
        <div
          className="flex flex-col gap-3.5 overflow-y-auto px-1"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files?.length) loadFiles(e.dataTransfer.files);
          }}
        >
          {/* SOURCE — cartridge bay */}
          <div className="flex flex-col gap-2">
            <p className="ci-zone">Source · drop or paste</p>
            <div
              className={`ci-bay flex flex-col items-center gap-2.5 ${dragging ? "ci-bay--drag" : ""}`}
            >
              <span className="ci-slot" aria-hidden="true" />
              <p
                className="cf-mono uppercase text-center"
                style={{
                  fontSize: 12,
                  letterSpacing: "0.1em",
                  color: "var(--cf-text)",
                }}
              >
                Drop{" "}
                <b style={{ color: "var(--cf-phosphor)" }}>.json cartridges</b>{" "}
                here
              </p>
              <p
                className="cf-mono text-center"
                style={{ fontSize: 10, color: "var(--cf-text-dim)" }}
              >
                one file or many — dropped files merge into one batch
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-0.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) loadFiles(e.target.files);
                    e.target.value = ""; // allow re-selecting the same file(s)
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aero-btn aero-btn--ghost text-[10px] uppercase tracking-widest px-3 py-2"
                  style={{ color: "var(--cf-phosphor)" }}
                >
                  ⤓ Browse files
                </button>
                <button
                  type="button"
                  onClick={() => setContent(SAMPLE)}
                  className="aero-btn aero-btn--ghost text-[10px] uppercase tracking-widest px-3 py-2"
                >
                  Insert sample
                </button>
                <button
                  type="button"
                  onClick={() => setContent(CANVAS_SAMPLE)}
                  className="aero-btn aero-btn--ghost text-[10px] uppercase tracking-widest px-3 py-2"
                >
                  Canvas sample
                </button>
              </div>
            </div>
          </div>

          {/* BUFFER — editable LCD screen */}
          <div className="flex flex-col gap-2">
            <p className="ci-zone">Buffer · editable</p>
            <label htmlFor={textareaId} className="sr-only">
              Card JSON
            </label>
            <textarea
              id={textareaId}
              value={text}
              onChange={(e) => setContent(e.target.value)}
              spellCheck={false}
              placeholder="Paste JSON here, or drop .json files above…"
              className="glass-input cf-mono w-full resize-y block"
              style={{
                minHeight: 150,
                fontSize: 12,
                lineHeight: 1.55,
                padding: "12px 14px",
              }}
            />
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className="cf-mono"
                style={{
                  fontSize: 9,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--cf-text-dim)",
                  marginRight: 2,
                }}
              >
                Fields
              </span>
              <span className="ci-chip ci-chip--req">name*</span>
              {OPTIONAL_FIELDS.map((f) => (
                <span
                  key={f}
                  className={`ci-chip ${presentFields?.has(f) ? "ci-chip--on" : ""}`}
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* STATUS — LCD readout */}
          <div className="flex flex-col gap-2">
            <p className="ci-zone">Status</p>
            <div className="ci-status flex flex-col gap-1.5">
              {parseError ? (
                <StatusRow tone="red">{`Syntax error — ${parseError}`}</StatusRow>
              ) : submitError ? (
                <StatusRow tone="red">{submitError}</StatusRow>
              ) : result ? (
                <>
                  <StatusRow tone="green">
                    {`Created ${result.created_count} card${
                      result.created_count === 1 ? "" : "s"
                    }${
                      result.error_count > 0
                        ? `, ${result.error_count} skipped`
                        : ""
                    }.`}
                  </StatusRow>
                  {result.errors.map((err) => (
                    <StatusDetail key={`${err.index}-${err.message}`}>
                      {`Row ${err.index + 1}: ${err.message}`}
                    </StatusDetail>
                  ))}
                </>
              ) : loadSummary ? (
                <>
                  <StatusRow tone="green">
                    {`Merged ${loadSummary.cards} card${
                      loadSummary.cards === 1 ? "" : "s"
                    } from ${loadSummary.files} file${
                      loadSummary.files === 1 ? "" : "s"
                    }.`}
                  </StatusRow>
                  {loadSummary.skipped.map((s) => (
                    <StatusDetail key={s}>{`Skipped ${s}`}</StatusDetail>
                  ))}
                </>
              ) : readyCount > 0 ? (
                <StatusRow tone="green">
                  {`${readyCount} card${readyCount === 1 ? "" : "s"} ready`}
                </StatusRow>
              ) : (
                <StatusRow tone="off">Awaiting input</StatusRow>
              )}
              {sectionNames.length > 0 && (
                <p
                  className="cf-mono"
                  style={{
                    fontSize: 10,
                    color: "var(--cf-text-dim)",
                    paddingLeft: 18,
                    letterSpacing: "0.08em",
                  }}
                >
                  columns: {sectionNames.join(" · ")} — unspecified land in{" "}
                  {sectionNames[0]}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* transport footer */}
        <div className="flex items-center gap-2 flex-shrink-0 px-1">
          <button
            type="button"
            onClick={onClose}
            className="aero-btn aero-btn--ghost text-xs uppercase tracking-widest px-4 py-2"
          >
            {result ? "Done" : "Cancel"}
          </button>
          <span className="flex-1" />
          <button
            type="button"
            onClick={submit}
            disabled={!canImport}
            className="aero-btn aero-btn--cyan text-xs uppercase tracking-widest font-bold px-5 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy
              ? "Importing…"
              : `Import${readyCount > 0 ? ` ${readyCount}` : ""} ▸`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
