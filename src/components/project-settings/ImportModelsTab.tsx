"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type Feedback,
  FeedbackBanner,
  friendlyMessage,
  PanelHeading,
} from "@/components/settings/shared";
import type {
  ImportFieldRule,
  ImportModelInterface,
} from "@/interfaces/ImportModelInterface";
import type { ProjectInterface } from "@/interfaces/ProjectInterface";
import {
  createImportModel,
  deleteImportModel,
  listImportModels,
  updateImportModel,
} from "@/lib/api";
import {
  previewCount,
  previewFirstCard,
  sampleKeys,
} from "@/lib/importModelPreview";
import {
  IMPORT_MODEL_TEMPLATES,
  type ImportModelTemplate,
} from "@/lib/importModelTemplates";
import ImportPatchbay from "./ImportPatchbay";

interface Props {
  project: ProjectInterface;
}

interface Draft {
  id?: number;
  name: string;
  mode: "many" | "one";
  item_path: string;
  fields: ImportFieldRule[];
}

const BLANK: Draft = { name: "", mode: "many", item_path: "", fields: [] };

// Project settings › Import Models (YON-122). Lists the project's custom models and
// edits the selected one on a patch-cable board with a live preview. The two
// built-in shapes (flat cards, Opportunity Canvas) are always available at import
// time and aren't editable here.
export default function ImportModelsTab({ project }: Props) {
  const [models, setModels] = useState<ImportModelInterface[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [sampleText, setSampleText] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    listImportModels(project.id)
      .then((m) => alive && setModels(m))
      .catch(
        () =>
          alive &&
          setFeedback({ type: "error", message: "Could not load models." }),
      );
    return () => {
      alive = false;
    };
  }, [project.id]);

  function selectModel(m: ImportModelInterface) {
    setDraft({
      id: m.id,
      name: m.name,
      mode: m.mode,
      item_path: m.item_path ?? "",
      fields: m.fields ?? [],
    });
    setSampleText(m.sample ? JSON.stringify(m.sample, null, 2) : "");
    setFeedback(null);
  }

  function newModel() {
    setDraft({ ...BLANK });
    setSampleText("");
    setFeedback(null);
  }

  // Pre-fill a fresh (unsaved) draft from a starter template + its filled sample.
  function startFromTemplate(t: ImportModelTemplate) {
    setDraft({
      name: t.label,
      mode: t.mode,
      item_path: t.item_path,
      fields: t.fields,
    });
    setSampleText(JSON.stringify(t.sample, null, 2));
    setFeedback(null);
  }

  // Parse the sample once; feeds the patchbay keys + preview. Invalid JSON simply
  // yields no keys rather than blocking editing.
  const parsedSample = useMemo(() => {
    if (sampleText.trim() === "") return undefined;
    try {
      return JSON.parse(sampleText);
    } catch {
      return undefined;
    }
  }, [sampleText]);
  const sampleInvalid = sampleText.trim() !== "" && parsedSample === undefined;

  const shape = draft
    ? {
        mode: draft.mode,
        item_path: draft.item_path || null,
        fields: draft.fields,
      }
    : null;
  const keys =
    shape && parsedSample !== undefined ? sampleKeys(shape, parsedSample) : [];
  const preview =
    shape && parsedSample !== undefined
      ? previewFirstCard(shape, parsedSample)
      : null;
  const count =
    shape && parsedSample !== undefined ? previewCount(shape, parsedSample) : 0;

  async function save() {
    if (!draft) return;
    if (draft.name.trim() === "") {
      setFeedback({ type: "error", message: "Give the model a name." });
      return;
    }
    if (draft.fields.length === 0) {
      setFeedback({ type: "error", message: "Wire at least one field." });
      return;
    }
    setSaving(true);
    setFeedback(null);
    const body = {
      name: draft.name.trim(),
      mode: draft.mode,
      item_path: draft.item_path.trim() || null,
      fields: draft.fields,
      sample: parsedSample,
    };
    try {
      if (draft.id) {
        const updated = await updateImportModel(project.id, draft.id, body);
        setModels((prev) =>
          prev.map((m) => (m.id === updated.id ? updated : m)),
        );
        selectModel(updated);
      } else {
        const created = await createImportModel(project.id, body);
        setModels((prev) =>
          [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
        );
        selectModel(created);
      }
      setFeedback({ type: "success", message: "Model saved." });
    } catch (e) {
      setFeedback({
        type: "error",
        message: friendlyMessage(e, "Could not save the model."),
      });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!draft?.id) return;
    setSaving(true);
    try {
      await deleteImportModel(project.id, draft.id);
      setModels((prev) => prev.filter((m) => m.id !== draft.id));
      setDraft(null);
      setFeedback({ type: "success", message: "Model deleted." });
    } catch (e) {
      setFeedback({
        type: "error",
        message: friendlyMessage(e, "Could not delete the model."),
      });
    } finally {
      setSaving(false);
    }
  }

  const patch = (p: Partial<Draft>) =>
    setDraft((d) => (d ? { ...d, ...p } : d));

  return (
    <div className="flex flex-col gap-5">
      <PanelHeading>Import models</PanelHeading>
      <p
        className="cf-mono text-[11px] leading-relaxed"
        style={{ color: "var(--cf-text-muted)" }}
      >
        Teach the importer new JSON shapes. A model says where the cards live
        and wires each source key onto a card field. Any board in this project
        can pick one when importing — alongside the built-in{" "}
        <span style={{ color: "var(--cf-phosphor)" }}>Flat cards</span> and{" "}
        <span style={{ color: "var(--cf-phosphor)" }}>Opportunity Canvas</span>{" "}
        shapes.
      </p>

      <FeedbackBanner feedback={feedback} />

      {/* model chooser */}
      <div className="flex flex-wrap items-center gap-2">
        {models.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => selectModel(m)}
            className="aero-btn aero-btn--ghost text-[10px] uppercase tracking-widest px-3 py-2"
            style={
              draft?.id === m.id
                ? {
                    borderColor: "var(--cf-phosphor)",
                    color: "var(--cf-phosphor)",
                  }
                : undefined
            }
          >
            {m.name}
          </button>
        ))}
        {models.length === 0 && (
          <span
            className="cf-mono text-[10px]"
            style={{ color: "var(--cf-text-dim)" }}
          >
            No models yet.
          </span>
        )}
        <button
          type="button"
          onClick={newModel}
          className="aero-btn aero-btn--cyan text-[10px] uppercase tracking-widest px-3 py-2 font-bold"
        >
          + New model
        </button>
      </div>

      {/* starter templates */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="cf-mono text-[9px] uppercase tracking-widest"
          style={{ color: "var(--cf-text-dim)" }}
        >
          Start from a template
        </span>
        {IMPORT_MODEL_TEMPLATES.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => startFromTemplate(t)}
            title={t.blurb}
            className="aero-btn aero-btn--ghost text-[10px] uppercase tracking-widest px-3 py-2"
          >
            {t.label}
          </button>
        ))}
      </div>

      {draft && (
        <div className="flex flex-col gap-4">
          {/* header row */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="Model name"
              className="glass-input cf-mono text-sm"
              style={{ padding: "8px 10px", flex: "1 1 200px" }}
            />
            <div
              className="flex rounded-md overflow-hidden"
              style={{ border: "1px solid var(--cf-edge)" }}
            >
              {(["many", "one"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => patch({ mode: m })}
                  className="cf-mono text-[9px] uppercase tracking-widest px-3 py-2 cursor-pointer"
                  style={
                    draft.mode === m
                      ? {
                          background: "var(--cf-phosphor)",
                          color: "var(--cf-ink)",
                          fontWeight: 700,
                        }
                      : { color: "var(--cf-text-dim)" }
                  }
                >
                  {m}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2">
              <span
                className="cf-mono text-[9px] uppercase tracking-widest"
                style={{ color: "var(--cf-text-dim)" }}
              >
                Items at
              </span>
              <input
                value={draft.item_path}
                onChange={(e) => patch({ item_path: e.target.value })}
                placeholder="e.g. data.tickets · blank = root"
                className="glass-input cf-mono text-[11px]"
                style={{ padding: "6px 8px", width: 200 }}
              />
            </label>
          </div>

          {/* sample */}
          <div className="flex flex-col gap-1.5">
            <span
              className="cf-mono text-[9px] uppercase tracking-widest"
              style={{ color: "var(--cf-text-dim)" }}
            >
              Sample JSON — loads the source keys + preview
            </span>
            <textarea
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              spellCheck={false}
              placeholder='{ "results": [ { "subject": "…" } ] }'
              className="glass-input cf-mono w-full resize-y block"
              style={{
                minHeight: 90,
                fontSize: 11,
                lineHeight: 1.5,
                padding: "8px 10px",
              }}
            />
            {sampleInvalid && (
              <span
                className="cf-mono text-[10px]"
                style={{ color: "var(--cf-red)" }}
              >
                Sample isn’t valid JSON yet.
              </span>
            )}
          </div>

          {/* patchbay */}
          <ImportPatchbay
            sourceKeys={keys}
            fields={draft.fields}
            onChange={(fields) => patch({ fields })}
          />

          {/* live preview */}
          <div className="flex flex-col gap-1.5">
            <span
              className="cf-mono text-[9px] uppercase tracking-widest"
              style={{ color: "var(--cf-text-dim)" }}
            >
              Produces{" "}
              {count > 0 ? `${count} card${count === 1 ? "" : "s"}` : "—"} ·
              preview of the first
            </span>
            <PreviewCard card={preview} />
          </div>

          {/* actions */}
          <div className="flex items-center gap-2">
            {draft.id && (
              <button
                type="button"
                onClick={remove}
                disabled={saving}
                className="aero-btn aero-btn--magenta text-xs uppercase tracking-widest px-4 py-2 disabled:opacity-40"
              >
                Delete
              </button>
            )}
            <span className="flex-1" />
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="aero-btn aero-btn--cyan text-xs uppercase tracking-widest font-bold px-5 py-2 disabled:opacity-40"
            >
              {saving ? "Saving…" : draft.id ? "Save changes" : "Create model"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// A cassette "printed readout" card rendering the model's live output.
function PreviewCard({ card }: { card: ReturnType<typeof previewFirstCard> }) {
  if (!card || Object.keys(card).length === 0) {
    return (
      <div
        className="rounded-lg px-4 py-3 cf-mono text-[11px]"
        style={{
          background: "var(--cf-screen)",
          color: "var(--cf-text-dim)",
          border: "1px solid #23271d",
        }}
      >
        Nothing to preview — wire some fields and paste a matching sample.
      </div>
    );
  }
  const tags = Array.isArray(card.tags) ? card.tags : [];
  return (
    <div
      className="rounded-lg px-4 py-3"
      style={{
        background: "linear-gradient(180deg,#e4ddc8,var(--cf-cream))",
        color: "var(--cf-ink)",
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold">
          {String(card.name ?? "(no name)")}
        </span>
        {card.priority != null && (
          <span
            className="ml-auto text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
            style={{ background: "var(--cf-amber)", color: "#3a1300" }}
          >
            {String(card.priority)}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px]">
        {card.column != null && (
          <span
            className="px-2 py-0.5 rounded"
            style={{ background: "#4a463f", color: "var(--cf-cream)" }}
          >
            {String(card.column)}
          </span>
        )}
        {card.due_date != null && (
          <span
            className="px-2 py-0.5 rounded"
            style={{ background: "#c9c1a6", color: "#3a3626" }}
          >
            due {String(card.due_date)}
          </span>
        )}
        {card.value != null && (
          <span
            className="px-2 py-0.5 rounded"
            style={{ background: "#c9c1a6", color: "#3a3626" }}
          >
            {String(card.value)}
          </span>
        )}
        {tags.map((t) => (
          <span
            key={t}
            className="px-1.5 py-0.5 rounded"
            style={{ background: "#cbb27a", color: "#3a2e12" }}
          >
            {t}
          </span>
        ))}
      </div>
      {card.description != null && (
        <p className="mt-2 text-[11px]" style={{ color: "#4a4636" }}>
          {String(card.description).slice(0, 160)}
        </p>
      )}
      {card.contact && (
        <p className="mt-2 text-[10px]" style={{ color: "#6a6552" }}>
          contact ·{" "}
          {[card.contact.name, card.contact.email, card.contact.phone]
            .filter(Boolean)
            .map(String)
            .join(" · ")}
        </p>
      )}
    </div>
  );
}
