"use client";

import { useEffect, useState } from "react";
import type { BoardInterface } from "@/interfaces/BoardInterface";
import {
  deleteEmailAutomation,
  type EmailStageSend,
  getEmailAutomations,
  updateBoard,
  upsertEmailAutomation,
} from "@/lib/api";
import {
  type Feedback,
  FeedbackBanner,
  friendlyMessage,
  PanelHeading,
} from "./shared";

interface Props {
  board: BoardInterface;
  onSaved: (patch: Partial<BoardInterface>) => void;
}

interface Row {
  section_id: number;
  section_name: string;
  subject: string;
  body: string;
  enabled: boolean;
  paused_at: string | null;
  exists: boolean;
  last_send: EmailStageSend | null;
}

// Variables the backend interpolates into a stage email's subject/body.
const VARIABLES = [
  "contact_name",
  "card_name",
  "deal_value",
  "deadline",
  "stage",
  "ticket_key",
];

export default function EmailTab({ board, onSaved }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [spamSafe, setSpamSafe] = useState(board.email_spam_safe !== false);
  const [requireOptin, setRequireOptin] = useState(
    board.require_optin_before_email === true,
  );
  const [savingFlag, setSavingFlag] = useState(false);

  const saveFlag = async (
    key: "email_spam_safe" | "require_optin_before_email",
    value: boolean,
  ) => {
    // Optimistic: flip local state, revert on failure.
    if (key === "email_spam_safe") setSpamSafe(value);
    else setRequireOptin(value);
    setSavingFlag(true);
    setFeedback(null);
    try {
      const updated = await updateBoard(board.id, { [key]: value });
      onSaved({
        email_spam_safe: updated.email_spam_safe,
        require_optin_before_email: updated.require_optin_before_email,
      });
    } catch (e) {
      if (key === "email_spam_safe") setSpamSafe(!value);
      else setRequireOptin(!value);
      setFeedback({
        type: "error",
        message: friendlyMessage(e, "Could not update the setting."),
      });
    } finally {
      setSavingFlag(false);
    }
  };

  useEffect(() => {
    getEmailAutomations(board.id)
      .then((data) =>
        setRows(
          data.map((r) => ({
            section_id: r.section_id,
            section_name: r.section_name,
            subject: r.automation?.subject ?? "",
            body: r.automation?.body ?? "",
            enabled: r.automation?.enabled ?? true,
            paused_at: r.automation?.paused_at ?? null,
            exists: !!r.automation,
            last_send: r.last_send ?? null,
          })),
        ),
      )
      .catch(() =>
        setFeedback({
          type: "error",
          message: "Could not load email automations.",
        }),
      )
      .finally(() => setLoading(false));
  }, [board.id]);

  const patchRow = (sectionId: number, patch: Partial<Row>) =>
    setRows((prev) =>
      prev.map((r) => (r.section_id === sectionId ? { ...r, ...patch } : r)),
    );

  const saveRow = async (row: Row, resume = false) => {
    if (!row.subject.trim() || !row.body.trim()) {
      setFeedback({
        type: "error",
        message: "Subject and body are both required.",
      });
      return;
    }
    setSavingId(row.section_id);
    setFeedback(null);
    try {
      const saved = await upsertEmailAutomation(board.id, row.section_id, {
        subject: row.subject.trim(),
        body: row.body.trim(),
        enabled: row.enabled,
        resume,
      });
      patchRow(row.section_id, {
        exists: true,
        paused_at: saved.paused_at,
        enabled: saved.enabled,
      });
      setFeedback({
        type: "success",
        message: `Saved “${row.section_name}” email template.`,
      });
    } catch (e) {
      setFeedback({
        type: "error",
        message: friendlyMessage(e, "Could not save the template."),
      });
    } finally {
      setSavingId(null);
    }
  };

  const removeRow = async (row: Row) => {
    setSavingId(row.section_id);
    try {
      await deleteEmailAutomation(board.id, row.section_id);
      patchRow(row.section_id, {
        exists: false,
        subject: "",
        body: "",
        enabled: true,
        paused_at: null,
      });
      setFeedback({
        type: "success",
        message: `Removed “${row.section_name}” email template.`,
      });
    } catch (e) {
      setFeedback({
        type: "error",
        message: friendlyMessage(e, "Could not remove the template."),
      });
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <p className="cf-mono text-xs" style={{ color: "var(--cf-text-muted)" }}>
        Loading…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <PanelHeading>Stage email automations</PanelHeading>
        <p
          className="cf-mono text-xs"
          style={{ color: "var(--cf-text-muted)" }}
        >
          When a card enters a column, its contact is emailed the column&apos;s
          template. Needs a contact with an email on the card. Variables:{" "}
          {VARIABLES.map((v) => (
            <code
              key={v}
              className="cf-mono"
              style={{ color: "var(--cf-cyan, #6fe0ff)", marginRight: 6 }}
            >{`{{${v}}}`}</code>
          ))}
        </p>
      </div>

      <FeedbackBanner feedback={feedback} />

      {/* Deliverability toggles (YON-51 / YON-52) */}
      <div
        className="flex flex-col gap-3 rounded-xl p-4"
        style={{
          border: "1px solid var(--cf-edge)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <PanelHeading>Deliverability</PanelHeading>
        <label
          className="cf-mono text-xs flex items-start gap-2 cursor-pointer"
          style={{ color: "var(--cf-text-muted)" }}
        >
          <input
            type="checkbox"
            checked={spamSafe}
            disabled={savingFlag}
            onChange={(e) => saveFlag("email_spam_safe", e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <span style={{ color: "var(--cf-text)", fontWeight: 700 }}>
              Spam-safe formatting
            </span>
            <br />
            Rewrites currency symbols and quote keywords into a natural,
            Gmail-friendly form before sending, so quotes land in the inbox
            instead of spam.
          </span>
        </label>
        <label
          className="cf-mono text-xs flex items-start gap-2 cursor-pointer"
          style={{ color: "var(--cf-text-muted)" }}
        >
          <input
            type="checkbox"
            checked={requireOptin}
            disabled={savingFlag}
            onChange={(e) =>
              saveFlag("require_optin_before_email", e.target.checked)
            }
            className="mt-0.5"
          />
          <span>
            <span style={{ color: "var(--cf-text)", fontWeight: 700 }}>
              Require opt-in before emailing
            </span>
            <br />
            Only send stage emails to contacts who confirmed via the opt-in link
            sent after their form submission. New form contacts get that email
            automatically.
          </span>
        </label>
      </div>

      <div className="flex flex-col gap-3">
        {rows.map((row) => {
          const busy = savingId === row.section_id;
          return (
            <div
              key={row.section_id}
              className="flex flex-col gap-2.5 rounded-xl p-4"
              style={{
                border: "1px solid var(--cf-edge)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className="cf-label"
                  style={{ color: "var(--cf-text)", fontWeight: 700 }}
                >
                  {row.section_name}
                </span>
                <div className="flex items-center gap-3">
                  {row.paused_at && (
                    <span
                      className="cf-mono text-xs uppercase"
                      style={{ color: "var(--cf-amber)" }}
                    >
                      Paused
                    </span>
                  )}
                  <label
                    className="cf-mono text-xs flex items-center gap-1.5 cursor-pointer"
                    style={{ color: "var(--cf-text-muted)" }}
                  >
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      onChange={(e) =>
                        patchRow(row.section_id, { enabled: e.target.checked })
                      }
                    />
                    Enabled
                  </label>
                </div>
              </div>

              <input
                type="text"
                value={row.subject}
                onChange={(e) =>
                  patchRow(row.section_id, { subject: e.target.value })
                }
                placeholder="Subject — e.g. {{contact_name}}, let's move forward"
                className="glass-input w-full text-xs px-3 py-2"
              />
              <textarea
                value={row.body}
                onChange={(e) =>
                  patchRow(row.section_id, { body: e.target.value })
                }
                rows={5}
                placeholder={
                  "Body — e.g.\nHi {{contact_name}}, your proposal for {{deal_value}} is ready. To lock this in, reply before {{deadline}}."
                }
                className="glass-input w-full text-xs px-3 py-2 resize-y"
              />

              <div className="flex items-center justify-between gap-3">
                <span
                  className="cf-mono text-xs"
                  style={{ color: "var(--cf-text-dim)" }}
                >
                  {row.last_send?.sent_at
                    ? `Last sent ${new Date(row.last_send.sent_at).toLocaleString()} → ${row.last_send.email}`
                    : "Never sent"}
                </span>
                <div className="flex items-center gap-2">
                  {row.exists && (
                    <button
                      onClick={() => removeRow(row)}
                      disabled={busy}
                      className="btn-physical cf-mono text-xs uppercase cursor-pointer disabled:opacity-50"
                      style={{ color: "var(--cf-text-muted)" }}
                    >
                      Remove
                    </button>
                  )}
                  {row.paused_at && (
                    <button
                      onClick={() => saveRow(row, true)}
                      disabled={busy}
                      className="btn-physical cf-mono text-xs uppercase font-bold cursor-pointer disabled:opacity-50"
                      style={{ color: "var(--cf-amber)" }}
                    >
                      Resume
                    </button>
                  )}
                  <button
                    onClick={() => saveRow(row)}
                    disabled={busy}
                    className="btn-physical cf-mono text-xs uppercase font-bold cursor-pointer disabled:opacity-50"
                    style={{ color: "var(--cf-phosphor)" }}
                  >
                    {busy ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
