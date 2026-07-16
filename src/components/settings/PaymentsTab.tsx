"use client";

import { useEffect, useState } from "react";
import type { BoardInterface } from "@/interfaces/BoardInterface";
import type {
  InvoiceIssuer,
  PaymentChannel,
  PaymentMilestone,
} from "@/interfaces/PaymentInterface";
import {
  createPaymentMilestone,
  deletePaymentMilestone,
  getPaymentMilestones,
  updateBoard,
  updatePaymentMilestone,
} from "@/lib/api";
import {
  type Feedback,
  FeedbackBanner,
  friendlyMessage,
  PanelHeading,
} from "./shared";

interface Props {
  board: BoardInterface;
}

// A milestone row in the editor. Negative ids are unsaved drafts.
type Row = PaymentMilestone;

const VARIABLES = [
  "contact_name",
  "amount_paid",
  "amount_remaining",
  "payment_pct",
  "deal_value",
  "milestone_label",
];

let draftSeq = -1;

function draftRow(): Row {
  return {
    id: draftSeq--,
    board_id: 0,
    threshold_pct: 50,
    label: "",
    notify: true,
    channel: "auto",
    whatsapp_template_name: "",
    language: "en",
    email_subject: "",
    email_body: "",
    move_to_section_id: null,
    generate_invoice: false,
    enabled: true,
    position: 0,
  };
}

export default function PaymentsTab({ board }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [sections, setSections] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  // Invoice issuer (emitente) block — board-level, stamped on every nota fiscal.
  const [issuer, setIssuer] = useState<InvoiceIssuer>(
    board.invoice_issuer ?? {},
  );
  const [savingIssuer, setSavingIssuer] = useState(false);

  const patchIssuer = (patch: Partial<InvoiceIssuer>) =>
    setIssuer((prev) => ({ ...prev, ...patch }));

  const saveIssuer = async () => {
    setSavingIssuer(true);
    setFeedback(null);
    try {
      await updateBoard(board.id, { invoice_issuer: issuer });
      setFeedback({ type: "success", message: "Saved the invoice issuer." });
    } catch (e) {
      setFeedback({
        type: "error",
        message: friendlyMessage(e, "Could not save the issuer."),
      });
    } finally {
      setSavingIssuer(false);
    }
  };

  useEffect(() => {
    getPaymentMilestones(board.id)
      .then((data) => {
        setRows(data.milestones);
        setSections(data.sections);
      })
      .catch(() =>
        setFeedback({
          type: "error",
          message: "Could not load payment milestones.",
        }),
      )
      .finally(() => setLoading(false));
  }, [board.id]);

  const patchRow = (id: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const saveRow = async (row: Row) => {
    if (row.threshold_pct < 1 || row.threshold_pct > 100) {
      setFeedback({ type: "error", message: "Threshold must be 1–100%." });
      return;
    }
    setSavingId(row.id);
    setFeedback(null);
    const payload = {
      threshold_pct: row.threshold_pct,
      label: row.label || null,
      notify: row.notify,
      channel: row.channel,
      whatsapp_template_name: row.whatsapp_template_name || null,
      language: row.language || "en",
      email_subject: row.email_subject || null,
      email_body: row.email_body || null,
      move_to_section_id: row.move_to_section_id,
      generate_invoice: row.generate_invoice,
      enabled: row.enabled,
    };
    try {
      const saved =
        row.id < 0
          ? await createPaymentMilestone(board.id, payload)
          : await updatePaymentMilestone(board.id, row.id, payload);
      setRows((prev) => prev.map((r) => (r.id === row.id ? saved : r)));
      setFeedback({
        type: "success",
        message: `Saved the ${saved.threshold_pct}% milestone.`,
      });
    } catch (e) {
      setFeedback({
        type: "error",
        message: friendlyMessage(e, "Could not save the milestone."),
      });
    } finally {
      setSavingId(null);
    }
  };

  const removeRow = async (row: Row) => {
    if (row.id < 0) {
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      return;
    }
    setSavingId(row.id);
    try {
      await deletePaymentMilestone(board.id, row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setFeedback({
        type: "success",
        message: `Removed the ${row.threshold_pct}% milestone.`,
      });
    } catch (e) {
      setFeedback({
        type: "error",
        message: friendlyMessage(e, "Could not remove the milestone."),
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
        <PanelHeading>Payment milestones</PanelHeading>
        <p
          className="cf-mono text-xs"
          style={{ color: "var(--cf-text-muted)" }}
        >
          When a deal&apos;s paid total crosses a threshold (of the card&apos;s
          value), its actions fire once: message the client and/or move the card
          to a stage. Record payments on a card&apos;s Payments panel. Message
          variables:{" "}
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

      {/* Invoice issuer (emitente) — appears on every generated nota fiscal (YON-68). */}
      <div
        className="flex flex-col gap-2.5 rounded-xl p-4"
        style={{
          border: "1px solid var(--cf-edge)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div className="flex flex-col gap-1">
          <PanelHeading>Nota fiscal issuer</PanelHeading>
          <p
            className="cf-mono text-xs"
            style={{ color: "var(--cf-text-muted)" }}
          >
            Your details as the emitter — stamped on every generated nota
            fiscal. This is a simplified invoice document, not a
            SEFAZ-registered NF-e.
          </p>
        </div>
        <input
          type="text"
          value={issuer.name ?? ""}
          onChange={(e) => patchIssuer({ name: e.target.value })}
          placeholder="Company / your name (defaults to the board name)"
          className="glass-input text-xs px-3 py-2 w-full"
        />
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={issuer.tax_id ?? ""}
            onChange={(e) => patchIssuer({ tax_id: e.target.value })}
            placeholder="CNPJ / CPF"
            className="glass-input text-xs px-3 py-2 flex-1 min-w-[140px]"
          />
          <input
            type="text"
            value={issuer.phone ?? ""}
            onChange={(e) => patchIssuer({ phone: e.target.value })}
            placeholder="Phone"
            className="glass-input text-xs px-3 py-2 flex-1 min-w-[140px]"
          />
        </div>
        <input
          type="text"
          value={issuer.email ?? ""}
          onChange={(e) => patchIssuer({ email: e.target.value })}
          placeholder="Email"
          className="glass-input text-xs px-3 py-2 w-full"
        />
        <input
          type="text"
          value={issuer.address ?? ""}
          onChange={(e) => patchIssuer({ address: e.target.value })}
          placeholder="Address"
          className="glass-input text-xs px-3 py-2 w-full"
        />
        <input
          type="text"
          value={issuer.footer ?? ""}
          onChange={(e) => patchIssuer({ footer: e.target.value })}
          placeholder="Footer note — e.g. payment terms, thank-you line"
          className="glass-input text-xs px-3 py-2 w-full"
        />
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={saveIssuer}
            disabled={savingIssuer}
            className="btn-physical cf-mono text-xs uppercase font-bold cursor-pointer disabled:opacity-50"
            style={{ color: "var(--cf-phosphor)" }}
          >
            {savingIssuer ? "Saving…" : "Save issuer"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {rows.map((row) => {
          const busy = savingId === row.id;
          return (
            <div
              key={row.id}
              className="flex flex-col gap-2.5 rounded-xl p-4"
              style={{
                border: "1px solid var(--cf-edge)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <label
                  className="cf-mono text-xs flex items-center gap-1.5"
                  style={{ color: "var(--cf-text-muted)" }}
                >
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={row.threshold_pct}
                    onChange={(e) =>
                      patchRow(row.id, {
                        threshold_pct: Number.parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="glass-input text-xs px-2 py-1.5 w-16 tabular-nums"
                  />
                  %
                </label>
                <input
                  type="text"
                  value={row.label ?? ""}
                  onChange={(e) => patchRow(row.id, { label: e.target.value })}
                  placeholder="Label — e.g. Deposit"
                  className="glass-input text-xs px-3 py-1.5 flex-1 min-w-[120px]"
                />
                <label
                  className="cf-mono text-xs flex items-center gap-1.5 cursor-pointer"
                  style={{ color: "var(--cf-text-muted)" }}
                >
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(e) =>
                      patchRow(row.id, { enabled: e.target.checked })
                    }
                  />
                  Enabled
                </label>
              </div>

              {/* Actions */}
              <label
                className="cf-mono text-xs flex items-center gap-1.5 cursor-pointer"
                style={{ color: "var(--cf-text-muted)" }}
              >
                <input
                  type="checkbox"
                  checked={row.notify}
                  onChange={(e) =>
                    patchRow(row.id, { notify: e.target.checked })
                  }
                />
                Send a message
              </label>

              {row.notify && (
                <div className="flex flex-col gap-2 pl-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="cf-mono text-xs"
                      style={{ color: "var(--cf-text-dim)" }}
                    >
                      Channel
                    </span>
                    <select
                      value={row.channel}
                      onChange={(e) =>
                        patchRow(row.id, {
                          channel: e.target.value as PaymentChannel,
                        })
                      }
                      className="glass-input text-xs px-2 py-1.5"
                    >
                      <option value="auto">Auto (WhatsApp → email)</option>
                      <option value="whatsapp">WhatsApp only</option>
                      <option value="email">Email only</option>
                    </select>
                  </div>
                  {row.channel !== "email" && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={row.whatsapp_template_name ?? ""}
                        onChange={(e) =>
                          patchRow(row.id, {
                            whatsapp_template_name: e.target.value,
                          })
                        }
                        placeholder="WhatsApp template name"
                        className="glass-input text-xs px-3 py-1.5 flex-1 min-w-0"
                      />
                      <input
                        type="text"
                        value={row.language}
                        onChange={(e) =>
                          patchRow(row.id, { language: e.target.value })
                        }
                        placeholder="en"
                        className="glass-input text-xs px-2 py-1.5 w-16"
                      />
                    </div>
                  )}
                  {row.channel !== "whatsapp" && (
                    <>
                      <input
                        type="text"
                        value={row.email_subject ?? ""}
                        onChange={(e) =>
                          patchRow(row.id, { email_subject: e.target.value })
                        }
                        placeholder="Email subject — e.g. {{contact_name}}, one step left"
                        className="glass-input text-xs px-3 py-2 w-full"
                      />
                      <textarea
                        value={row.email_body ?? ""}
                        onChange={(e) =>
                          patchRow(row.id, { email_body: e.target.value })
                        }
                        rows={4}
                        placeholder={
                          "Body — e.g.\nHi {{contact_name}}, we received {{amount_paid}} ({{payment_pct}}). Please pay the remaining {{amount_remaining}} to receive the work."
                        }
                        className="glass-input text-xs px-3 py-2 w-full resize-y"
                      />
                    </>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="cf-mono text-xs"
                  style={{ color: "var(--cf-text-dim)" }}
                >
                  Then move to
                </span>
                <select
                  value={row.move_to_section_id ?? ""}
                  onChange={(e) =>
                    patchRow(row.id, {
                      move_to_section_id: e.target.value
                        ? Number.parseInt(e.target.value, 10)
                        : null,
                    })
                  }
                  className="glass-input text-xs px-2 py-1.5"
                >
                  <option value="">— don&apos;t move —</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nota fiscal action (YON-68) */}
              <label
                className="cf-mono text-xs flex items-center gap-1.5 cursor-pointer"
                style={{ color: "var(--cf-text-muted)" }}
              >
                <input
                  type="checkbox"
                  checked={row.generate_invoice}
                  onChange={(e) =>
                    patchRow(row.id, { generate_invoice: e.target.checked })
                  }
                />
                Generate a nota fiscal (invoice)
              </label>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => removeRow(row)}
                  disabled={busy}
                  className="btn-physical cf-mono text-xs uppercase cursor-pointer disabled:opacity-50"
                  style={{ color: "var(--cf-text-muted)" }}
                >
                  Remove
                </button>
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
          );
        })}
      </div>

      <button
        onClick={() => setRows((prev) => [...prev, draftRow()])}
        className="btn-physical cf-mono text-xs uppercase font-bold cursor-pointer self-start px-4 py-2"
        style={{ color: "var(--cf-cyan, #6fe0ff)" }}
      >
        + Add milestone
      </button>
    </div>
  );
}
