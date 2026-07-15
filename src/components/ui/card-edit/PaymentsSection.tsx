"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  CardPaymentsPayload,
  PaymentMilestoneEventRow,
} from "@/interfaces/PaymentInterface";
import { addCardPayment, deleteCardPayment, fetchCardPayments } from "@/lib/api";

interface Props {
  boardId: number;
  cardId: number;
  currency: string;
  isReadOnly?: boolean;
}

const money = (n: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return n.toFixed(2);
  }
};

// Colour + glyph for a milestone-event's message outcome.
function statusChip(e: PaymentMilestoneEventRow): { text: string; color: string } {
  const parts: string[] = [];
  if (e.message_status === "sent")
    parts.push(`${e.message_channel ?? "message"} sent`);
  else if (e.message_status === "failed") parts.push("message failed");
  else if (e.message_status === "skipped") parts.push("message skipped");
  if (e.moved_to_section_id) parts.push("moved stage");
  const text = parts.length ? parts.join(" · ") : "logged";
  const color =
    e.message_status === "failed"
      ? "var(--cf-red)"
      : e.message_status === "skipped"
        ? "var(--cf-amber)"
        : "var(--cf-phosphor)";
  return { text, color };
}

export function PaymentsSection({
  boardId,
  cardId,
  currency,
  isReadOnly,
}: Props) {
  const [data, setData] = useState<CardPaymentsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchCardPayments(boardId, cardId)
      .then((d) => alive && setData(d))
      .catch(() => alive && setError("Could not load payments."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [boardId, cardId]);

  const summary = data?.summary;
  const pct = summary?.payment_pct ?? null;
  const pctClamped = pct != null ? Math.max(0, Math.min(100, pct)) : 0;

  const canAdd = useMemo(() => {
    const n = Number.parseFloat(amount.replace(",", "."));
    return Number.isFinite(n) && n > 0;
  }, [amount]);

  const submit = async () => {
    const n = Number.parseFloat(amount.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await addCardPayment(boardId, cardId, {
        amount: n,
        note: note.trim() || null,
      });
      setData(updated);
      setAmount("");
      setNote("");
    } catch {
      setError("Could not record the payment.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (paymentId: number) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await deleteCardPayment(boardId, cardId, paymentId);
      setData(updated);
    } catch {
      setError("Could not remove the payment.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <p className="cf-mono text-xs" style={{ color: "var(--cf-text-muted)" }}>
        Loading…
      </p>
    );
  }

  const cur = summary?.currency ?? currency;

  return (
    <div className="flex flex-col gap-3">
      {/* Summary: paid / value + progress bar */}
      <div
        className="flex flex-col gap-2 rounded-md px-3 py-3"
        style={{
          background: "linear-gradient(to bottom, #101408, #0d1005)",
          border: "1px solid color-mix(in srgb, var(--cf-edge) 75%, black)",
          boxShadow: "inset 0 2px 8px rgba(0,0,0,0.6)",
        }}
      >
        <div className="flex items-baseline justify-between gap-2">
          <span
            className="cf-mono tabular-nums"
            style={{
              fontSize: "16px",
              color: "var(--cf-phosphor)",
              textShadow:
                "0 0 8px color-mix(in srgb, var(--cf-phosphor) 45%, transparent)",
            }}
          >
            {money(summary?.amount_paid ?? 0, cur)}
          </span>
          <span
            className="cf-mono"
            style={{ fontSize: "11px", color: "var(--cf-text-dim)" }}
          >
            {summary?.value != null
              ? `of ${money(summary.value, cur)}`
              : "no deal value"}
          </span>
        </div>
        {/* progress rail */}
        <div
          className="w-full rounded-full overflow-hidden"
          style={{ height: 6, background: "rgba(0,0,0,0.5)" }}
        >
          <div
            style={{
              width: `${pctClamped}%`,
              height: "100%",
              background: "var(--cf-phosphor)",
              boxShadow: "0 0 8px var(--cf-phosphor)",
              transition: "width 200ms ease",
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span
            className="cf-mono tabular-nums"
            style={{ fontSize: "10px", color: "var(--cf-text-muted)" }}
          >
            {pct != null ? `${pct}% paid` : "set a deal value to track %"}
          </span>
          {summary?.amount_remaining != null && summary.amount_remaining > 0 && (
            <span
              className="cf-mono tabular-nums"
              style={{ fontSize: "10px", color: "var(--cf-amber)" }}
            >
              {money(summary.amount_remaining, cur)} remaining
            </span>
          )}
        </div>
      </div>

      {/* Milestone firing history */}
      {data && data.events.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {data.events.map((e) => {
            const chip = statusChip(e);
            return (
              <div
                key={`${e.threshold_pct}-${e.triggered_at}`}
                className="flex items-center gap-2"
              >
                <span
                  className="cf-led"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    flex: "0 0 auto",
                    background: chip.color,
                    boxShadow: `0 0 6px ${chip.color}`,
                  }}
                />
                <span
                  className="cf-mono tabular-nums"
                  style={{ fontSize: "11px", color: "var(--cf-text)" }}
                >
                  {e.threshold_pct}%
                </span>
                <span
                  className="cf-mono"
                  style={{ fontSize: "11px", color: "var(--cf-text-muted)" }}
                >
                  {e.label ? `${e.label} · ` : ""}
                  {chip.text}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Ledger */}
      {data && data.payments.length > 0 && (
        <div className="flex flex-col gap-1">
          {data.payments.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 rounded px-2 py-1.5"
              style={{ background: "rgba(255,255,255,0.02)" }}
            >
              <span
                className="cf-mono tabular-nums flex-shrink-0"
                style={{ fontSize: "12px", color: "var(--cf-text)" }}
              >
                {money(p.amount, cur)}
              </span>
              <span
                className="cf-mono flex-1 min-w-0 truncate"
                style={{ fontSize: "11px", color: "var(--cf-text-muted)" }}
              >
                {p.note || ""}
              </span>
              <span
                className="cf-mono flex-shrink-0"
                style={{ fontSize: "10px", color: "var(--cf-text-dim)" }}
              >
                {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : ""}
              </span>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  disabled={busy}
                  aria-label="Remove payment"
                  className="cf-mono flex-shrink-0 cursor-pointer disabled:opacity-50"
                  style={{ fontSize: "12px", color: "var(--cf-text-muted)" }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add payment */}
      {!isReadOnly && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Amount (${cur})`}
            className="glass-input text-xs px-2 py-1.5 w-28 tabular-nums"
          />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="glass-input text-xs px-2 py-1.5 flex-1 min-w-0"
          />
          <button
            type="button"
            onClick={submit}
            disabled={busy || !canAdd}
            className="btn-physical cf-mono text-xs uppercase font-bold cursor-pointer disabled:opacity-50 px-3 py-1.5"
            style={{ color: "var(--cf-phosphor)" }}
          >
            {busy ? "…" : "Add"}
          </button>
        </div>
      )}

      {error && (
        <p className="cf-mono text-xs" style={{ color: "var(--cf-red)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
