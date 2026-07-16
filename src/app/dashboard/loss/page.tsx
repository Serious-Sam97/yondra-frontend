"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import "../dashboard.css";
import "../revenue/revenue.css";
import type { LossMonth, LossReport } from "@/interfaces/LossReportInterface";
import { fetchLossReport } from "@/lib/api";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

// ── period presets (mirrors the revenue report) ────────────────────────────────

type PresetKey = "6m" | "12m" | "ytd";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "6m", label: "Last 6 months" },
  { key: "12m", label: "Last 12 months" },
  { key: "ytd", label: "This year" },
];

function ym(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function presetRange(key: PresetKey): { from: string; to: string } {
  const now = new Date();
  const to = ym(now);
  if (key === "ytd") return { from: `${now.getFullYear()}-01`, to };
  const back = key === "6m" ? 5 : 11;
  const start = new Date(now.getFullYear(), now.getMonth() - back, 1);
  return { from: ym(start), to };
}

function longMonth(m: string): string {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: string;
}) {
  return (
    <div className="yd-tile rv-tile">
      <div className="v" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      <div className="l">{label}</div>
      <div className="s">{sub}</div>
    </div>
  );
}

// ── page ────────────────────────────────────────────────────────────────────────

export default function LossPage() {
  useDocumentTitle("Yondra - Loss report");
  const [preset, setPreset] = useState<PresetKey>("12m");
  const [data, setData] = useState<LossReport | null>(null);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => presetRange(preset), [preset]);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    fetchLossReport(range)
      .then((d) => {
        if (!ctrl.signal.aborted) setData(d);
      })
      .catch(() => {
        // 401s redirect centrally via apiFetch; ignore transient errors.
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [range]);

  const currency = data?.currency ?? undefined;
  const money = useMemo(() => {
    return (n: number) =>
      currency
        ? new Intl.NumberFormat(undefined, {
            style: "currency",
            currency,
            maximumFractionDigits: 0,
          }).format(n)
        : String(Math.round(n));
  }, [currency]);

  const months = data?.months ?? [];
  const reasons = data?.reasons ?? [];
  const maxReason = reasons.reduce((a, r) => Math.max(a, r.count), 0);
  const topReason = reasons[0] ?? null;

  const noCrm = !loading && data != null && data.currency === null;

  return (
    <div className="yd-root">
      <div className="yd-wrap rv-wrap">
        {/* topbar */}
        <div className="rv-top">
          <div className="rv-title">
            <Link
              href="/dashboard"
              className="rv-back"
              aria-label="Back to dashboard"
            >
              ‹ Dashboard
            </Link>
            <h1>Loss report</h1>
            <span className="yd-label">
              {data ? `${data.from} → ${data.to}` : "…"}
            </span>
          </div>
          <div className="rv-presets">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`rv-preset${preset === p.key ? " on" : ""}`}
                onClick={() => setPreset(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {noCrm && (
          <div className="yd-panel">
            <div className="yd-empty">
              No CRM board yet. The loss report is drawn from deals marked lost on
              CRM-type boards — create one to start tracking.
            </div>
          </div>
        )}

        {!noCrm && (
          <>
            {/* headline stats */}
            <div className="yd-panel">
              <div className="yd-hd">
                <span className="yd-led r" />
                <span className="yd-label">Lost · selected period</span>
                <span className="yd-count">{months.length} mo</span>
              </div>
              <div className="yd-vit rv-vit">
                <Stat
                  label="Lost value"
                  value={data ? money(data.total_lost_value) : "…"}
                  sub="pipeline value lost"
                  accent="var(--cf-red, #ff5a4d)"
                />
                <Stat
                  label="Deals lost"
                  value={data ? String(data.total_count) : "…"}
                  sub="in selected range"
                  accent="var(--yd-gold)"
                />
                <Stat
                  label="Top reason"
                  value={topReason ? topReason.reason : "—"}
                  sub={topReason ? `${topReason.count} deals` : "none lost yet"}
                  accent="var(--yd-cyan)"
                />
              </div>
            </div>

            {/* by-reason breakdown — the headline of this report */}
            <div className="yd-panel">
              <div className="yd-hd">
                <span className="yd-led r" />
                <span className="yd-label">Why deals were lost</span>
              </div>
              {reasons.length === 0 ? (
                <div className="yd-empty">No deals lost in this range.</div>
              ) : (
                <div className="flex flex-col gap-3" style={{ padding: "4px 2px" }}>
                  {reasons.map((r) => (
                    <div key={r.reason} className="flex flex-col gap-1">
                      <div
                        className="flex items-center justify-between cf-mono"
                        style={{ fontSize: 12, color: "var(--yd-text, #d8d2c4)" }}
                      >
                        <span>{r.reason}</span>
                        <span style={{ color: "var(--yd-text-muted, #8a8578)" }}>
                          {r.count} · {money(r.value)}
                        </span>
                      </div>
                      <div
                        style={{
                          height: 10,
                          borderRadius: 3,
                          background: "rgba(0,0,0,0.35)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${maxReason ? Math.max((r.count / maxReason) * 100, 3) : 0}%`,
                            background: "var(--cf-red, #ff5a4d)",
                            boxShadow: "0 0 8px rgba(255,90,77,0.5)",
                            borderRadius: 3,
                            transition: "width 300ms cubic-bezier(0.16,1,0.3,1)",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* month breakdown */}
            <div className="yd-panel">
              <div className="yd-hd">
                <span className="yd-led c" />
                <span className="yd-label">Per month</span>
              </div>
              <div className="rv-table" role="table">
                <div className="rv-tr rv-th" role="row">
                  <span role="columnheader">Month</span>
                  <span role="columnheader">Lost value</span>
                  <span role="columnheader">Deals</span>
                </div>
                {[...months].reverse().map((m: LossMonth) => (
                  <div
                    className={`rv-tr${m.count === 0 ? " dim" : ""}`}
                    role="row"
                    key={m.month}
                  >
                    <span role="cell">{longMonth(m.month)}</span>
                    <span role="cell" className="rv-money">
                      {money(m.lost_value)}
                    </span>
                    <span role="cell">{m.count}</span>
                  </div>
                ))}
                {months.length === 0 && (
                  <div className="yd-empty">Nothing in this range.</div>
                )}
              </div>
            </div>
          </>
        )}

        <div className="yd-foot">Yondra // loss report</div>
      </div>
    </div>
  );
}
