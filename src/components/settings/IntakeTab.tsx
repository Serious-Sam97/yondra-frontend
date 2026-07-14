"use client";

import {
  faCheck,
  faCopy,
  faFileImport,
  faPlus,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";
import Icon from "@/components/ui/Icon";
import type {
  BoardInterface,
  IntakeFieldMapRule,
  IntakeFieldTarget,
} from "@/interfaces/BoardInterface";
import { updateBoard } from "@/lib/api";
import { type Feedback, FeedbackBanner, PanelHeading } from "./shared";

interface Props {
  board: BoardInterface;
  onSaved: (patch: Partial<BoardInterface>) => void;
}

// Targets offered in the mapping editor, in a sensible display order.
const TARGETS: { value: IntakeFieldTarget; label: string }[] = [
  { value: "title", label: "Card title" },
  { value: "description", label: "Description" },
  { value: "value", label: "Deal value" },
  { value: "tags", label: "Tags" },
  { value: "priority", label: "Priority" },
  { value: "story_points", label: "Story points" },
  { value: "due_date", label: "Due date" },
  { value: "contact_name", label: "Contact name" },
  { value: "contact_email", label: "Contact email" },
  { value: "contact_phone", label: "Contact phone" },
  { value: "ignore", label: "Ignore" },
];

export default function IntakeTab({ board, onSaved }: Props) {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rules, setRules] = useState<IntakeFieldMapRule[]>(
    board.intake_field_map ?? [],
  );
  const [savingMap, setSavingMap] = useState(false);

  const addRule = () =>
    setRules((r) => [...r, { source: "", target: "title" }]);
  const removeRule = (i: number) =>
    setRules((r) => r.filter((_, idx) => idx !== i));
  const patchRule = (i: number, patch: Partial<IntakeFieldMapRule>) =>
    setRules((r) =>
      r.map((rule, idx) => (idx === i ? { ...rule, ...patch } : rule)),
    );

  const saveMap = async () => {
    // Drop blank-source rows; the rest are the persisted mapping.
    const clean = rules
      .map((r) => ({ source: r.source.trim(), target: r.target }))
      .filter((r) => r.source !== "");
    setSavingMap(true);
    setFeedback(null);
    try {
      const updated = await updateBoard(board.id, {
        intake_field_map: clean.length ? clean : null,
      });
      const saved = (updated.intake_field_map ?? []) as IntakeFieldMapRule[];
      setRules(saved);
      onSaved({ intake_field_map: saved });
      setFeedback({ type: "success", message: "Field mapping saved." });
    } catch {
      setFeedback({ type: "error", message: "Failed to save field mapping." });
    } finally {
      setSavingMap(false);
    }
  };

  const connected = board.intake_connected === true;
  const apiBase = process.env.NEXT_PUBLIC_API ?? "";
  const webhookUrl = board.intake_token
    ? `${apiBase}/api/webhooks/intake/${board.intake_token}`
    : "";

  const setEnabled = async (enabled: boolean) => {
    setFeedback(null);
    setSaving(true);
    try {
      const updated = await updateBoard(board.id, { intake_enabled: enabled });
      onSaved({
        intake_connected: updated.intake_connected,
        intake_token: updated.intake_token ?? null,
      });
      setFeedback({
        type: "success",
        message: enabled
          ? "Intake webhook enabled."
          : "Intake webhook disabled.",
      });
    } catch {
      setFeedback({
        type: "error",
        message: "Failed to update intake settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  };

  return (
    <div className="glass-panel p-6 flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Icon
          icon={faFileImport}
          style={{ fontSize: "14px", color: "var(--cf-text)" }}
        />
        <PanelHeading>Intake</PanelHeading>
        {connected && (
          <span
            className="cf-mono uppercase font-bold rounded-sm inline-flex items-center gap-1"
            style={{
              fontSize: "8px",
              letterSpacing: "0.1em",
              padding: "2px 6px",
              color: "var(--cf-phosphor)",
              border: "1px solid var(--cf-phosphor)",
              background: "rgba(154,166,126,0.14)",
            }}
          >
            <Icon icon={faCheck} style={{ fontSize: "8px" }} /> Live
          </span>
        )}
      </div>

      <FeedbackBanner feedback={feedback} />

      <p className="text-sm cf-mono" style={{ color: "var(--cf-text-muted)" }}>
        Point a JotForm (or any form) webhook at this board to auto-create a
        card in the first column for every submission. Contact name, email and
        phone are mapped automatically; attached files land on the card as
        documents.
      </p>

      {connected && webhookUrl ? (
        <div
          className="flex flex-col gap-3 pt-2 border-t"
          style={{ borderColor: "var(--cf-edge)" }}
        >
          <label className="cf-label">Webhook URL</label>
          <p
            className="cf-mono text-[10px]"
            style={{ color: "var(--cf-text-muted)" }}
          >
            In JotForm → Settings → Integrations → Webhooks, paste this URL.
            Every submission opens a card here. Anyone with this URL can create
            cards — regenerate it (disable then enable) if it leaks.
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <input
              readOnly
              value={webhookUrl}
              className="glass-input flex-1"
              style={{ fontSize: "11px" }}
            />
            <button
              onClick={() => copy(webhookUrl)}
              className="aero-btn aero-btn--ghost px-2.5 py-2 flex-shrink-0"
              title="Copy"
            >
              <Icon
                icon={copied ? faCheck : faCopy}
                style={{ fontSize: "10px" }}
              />
            </button>
          </div>
        </div>
      ) : (
        <p
          className="cf-mono text-[10px]"
          style={{ color: "var(--cf-text-dim)" }}
        >
          Enable intake to generate a private webhook URL.
        </p>
      )}

      {/* Field mapping editor (YON-50) */}
      {connected && (
        <div
          className="flex flex-col gap-3 pt-2 border-t"
          style={{ borderColor: "var(--cf-edge)" }}
        >
          <label className="cf-label">Field mapping</label>
          <p
            className="cf-mono text-[10px]"
            style={{ color: "var(--cf-text-muted)" }}
          >
            Route specific form fields onto card attributes. Match by field
            label (case-insensitive, partial). Anything unmapped is still
            detected automatically and appended to the description.
          </p>

          {rules.map((rule, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                value={rule.source}
                onChange={(e) => patchRule(i, { source: e.target.value })}
                placeholder="Form field label (e.g. budget)"
                className="glass-input flex-1"
                style={{ fontSize: "11px" }}
              />
              <span
                className="cf-mono flex-shrink-0"
                style={{ fontSize: "11px", color: "var(--cf-text-dim)" }}
              >
                →
              </span>
              <select
                value={rule.target}
                onChange={(e) =>
                  patchRule(i, { target: e.target.value as IntakeFieldTarget })
                }
                className="glass-input flex-shrink-0"
                style={{ fontSize: "11px", width: "140px" }}
              >
                {TARGETS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => removeRule(i)}
                className="aero-btn aero-btn--ghost px-2 py-2 flex-shrink-0"
                title="Remove rule"
              >
                <Icon icon={faXmark} style={{ fontSize: "10px" }} />
              </button>
            </div>
          ))}

          <div className="flex items-center gap-2">
            <button
              onClick={addRule}
              className="aero-btn aero-btn--ghost px-3 py-2 inline-flex items-center gap-1.5"
              style={{ fontSize: "11px" }}
            >
              <Icon icon={faPlus} style={{ fontSize: "9px" }} /> Add rule
            </button>
            <button
              onClick={saveMap}
              disabled={savingMap}
              className="aero-btn aero-btn--cyan px-4 py-2"
              style={{ fontSize: "11px" }}
            >
              {savingMap ? "Saving…" : "Save mapping"}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        {connected ? (
          <button
            onClick={() => setEnabled(false)}
            disabled={saving}
            className="aero-btn aero-btn--magenta px-4 py-2.5"
          >
            Disable
          </button>
        ) : (
          <span />
        )}
        {!connected && (
          <button
            onClick={() => setEnabled(true)}
            disabled={saving}
            className="aero-btn aero-btn--cyan px-5 py-2.5"
          >
            {saving ? "Enabling…" : "Enable intake"}
          </button>
        )}
      </div>
    </div>
  );
}
