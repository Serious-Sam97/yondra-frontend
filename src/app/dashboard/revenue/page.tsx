"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import "../dashboard.css";
import "./revenue.css";
import RevenueBars from "@/components/dashboard/RevenueBars";
import type {
  RevenueMonth,
  RevenueReport,
} from "@/interfaces/RevenueReportInterface";
import { fetchRevenueReport } from "@/lib/api";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

// ── period presets ────────────────────────────────────────────────────────────

type PresetKey = "6m" | "12m" | "ytd";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "6m", label: "Last 6 months" },
  { key: "12m", label: "Last 12 months" },
  { key: "ytd", label: "This year" },
];

function ym(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Resolve a preset to an inclusive {from,to} month range ending this month.
function presetRange(key: PresetKey): { from: string; to: string } {
  const now = new Date();
  const to = ym(now);
  if (key === "ytd") return { from: `${now.getFullYear()}-01`, to };
  const back = key === "6m" ? 5 : 11;
  const start = new Date(now.getFullYear(), now.getMonth() - back, 1);
  return { from: ym(start), to };
}

// "July 2026" — full label for the hovered-month readout.
function longMonth(m: string): string {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

// ── stat tile ─────────────────────────────────────────────────────────────────

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

// ── page ──────────────────────────────────────────────────────────────────────

export default function RevenuePage() {
  useDocumentTitle("Yondra - Revenue");
  const [preset, setPreset] = useState<PresetKey>("12m");
  const [data, setData] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<RevenueMonth | null>(null);

  const range = useMemo(() => presetRange(preset), [preset]);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    fetchRevenueReport(range)
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
  const activeMonths = months.filter((m) => m.count > 0).length;
  const avgPerMonth =
    months.length && data ? data.total_revenue / months.length : 0;
  const best = months.reduce<RevenueMonth | null>(
    (a, m) => (a == null || m.revenue > a.revenue ? m : a),
    null,
  );

  const noCrm = !loading && data != null && data.currency === null;

  return (
    <div className="yd-root">
      <div className="yd-wrap rv-wrap">
        {/* topbar */}
        <div className="rv-top">
          <div className="rv-title">
            <Link href="/dashboard" className="rv-back" aria-label="Back to dashboard">
              ‹ Dashboard
            </Link>
            <h1>Revenue</h1>
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
              No CRM board yet. Revenue is drawn from deals won on CRM-type
              boards — create one to start tracking.
            </div>
          </div>
        )}

        {!noCrm && (
          <>
            {/* headline stats */}
            <div className="yd-panel">
              <div className="yd-hd">
                <span className="yd-led g" />
                <span className="yd-label">Won · selected period</span>
                <span className="yd-count">
                  {activeMonths}/{months.length} active mo
                </span>
              </div>
              <div className="yd-vit rv-vit">
                <Stat
                  label="Revenue"
                  value={data ? money(data.total_revenue) : "…"}
                  sub={
                    data
                      ? `${money(avgPerMonth)}/mo avg`
                      : "…"
                  }
                  accent="var(--yd-phosphor)"
                />
                <Stat
                  label="Approved quotes"
                  value={data ? String(data.total_count) : "…"}
                  sub={
                    best && best.count > 0
                      ? `best ${longMonth(best.month)}`
                      : "none won yet"
                  }
                  accent="var(--yd-cyan)"
                />
                <Stat
                  label="Clients"
                  value={data ? String(data.total_clients) : "…"}
                  sub="distinct, won in range"
                  accent="var(--yd-gold)"
                />
              </div>
            </div>

            {/* bar chart */}
            <div className="yd-panel">
              <div className="yd-hd">
                <span className="yd-led g" />
                <span className="yd-label">Revenue · per month</span>
                <span className="yd-count rv-readout">
                  {hovered
                    ? `${longMonth(hovered.month)} · ${money(hovered.revenue)} · ${hovered.count} won · ${hovered.clients} client${hovered.clients === 1 ? "" : "s"}`
                    : best && best.revenue > 0
                      ? `peak ${money(best.revenue)}`
                      : "no revenue in range"}
                </span>
              </div>
              <RevenueBars months={months} money={money} onHover={setHovered} />
            </div>

            {/* month breakdown — the table a month-end close actually reads from */}
            <div className="yd-panel">
              <div className="yd-hd">
                <span className="yd-led c" />
                <span className="yd-label">Breakdown</span>
              </div>
              <div className="rv-table" role="table">
                <div className="rv-tr rv-th" role="row">
                  <span role="columnheader">Month</span>
                  <span role="columnheader">Revenue</span>
                  <span role="columnheader">Quotes</span>
                  <span role="columnheader">Clients</span>
                </div>
                {[...months].reverse().map((m) => (
                  <div
                    className={`rv-tr${m.count === 0 ? " dim" : ""}`}
                    role="row"
                    key={m.month}
                  >
                    <span role="cell">{longMonth(m.month)}</span>
                    <span role="cell" className="rv-money">
                      {money(m.revenue)}
                    </span>
                    <span role="cell">{m.count}</span>
                    <span role="cell">{m.clients}</span>
                  </div>
                ))}
                {months.length === 0 && (
                  <div className="yd-empty">Nothing in this range.</div>
                )}
              </div>
            </div>
          </>
        )}

        <div className="yd-foot">Yondra // revenue report</div>
      </div>
    </div>
  );
}
