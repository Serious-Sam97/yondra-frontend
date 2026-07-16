"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import "../dashboard.css";
// Reuses the revenue report's page styling (period toolbar, LCD chart, tiles,
// breakdown table) — the two reports are visually identical.
import "../revenue/revenue.css";
import ConversionBars from "@/components/dashboard/ConversionBars";
import type {
  ConversionMonth,
  ConversionReport,
} from "@/interfaces/ConversionReportInterface";
import { fetchConversionReport } from "@/lib/api";
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

const pct = (rate: number) => `${(rate * 100).toFixed(1)}%`;

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

export default function ConversionPage() {
  useDocumentTitle("Yondra - Conversion");
  const [preset, setPreset] = useState<PresetKey>("12m");
  const [data, setData] = useState<ConversionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<ConversionMonth | null>(null);

  const range = useMemo(() => presetRange(preset), [preset]);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    fetchConversionReport(range)
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

  const months = data?.months ?? [];
  const activeMonths = months.filter((m) => m.won > 0).length;
  const best = months.reduce<ConversionMonth | null>(
    (a, m) => (a == null || m.rate > a.rate ? m : a),
    null,
  );
  // Headline is the AVERAGE monthly rate (matches the per-month bars) — not the
  // range aggregate won/total, which over a long window balloons past any single
  // month and misreads as a monthly figure.
  const avgMonthly = months.length
    ? months.reduce((s, m) => s + m.rate, 0) / months.length
    : 0;

  const noCrm = !loading && data != null && data.has_crm === false;

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
            <h1>Conversion</h1>
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
              No CRM board yet. Conversion is drawn from deals won on CRM-type
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
                <span className="yd-label">Conversion · selected period</span>
                <span className="yd-count">
                  {activeMonths}/{months.length} active mo
                </span>
              </div>
              <div className="yd-vit rv-vit">
                <Stat
                  label="Avg / month"
                  value={data ? pct(avgMonthly) : "…"}
                  sub={
                    best && best.rate > 0
                      ? `best ${longMonth(best.month)} · ${pct(best.rate)}`
                      : "none won yet"
                  }
                  accent="var(--yd-phosphor)"
                />
                <Stat
                  label="Won"
                  value={data ? String(data.total_won) : "…"}
                  sub="cards reached Won"
                  accent="var(--yd-cyan)"
                />
                <Stat
                  label="Total cards"
                  value={data ? String(data.total_cards) : "…"}
                  sub="on CRM boards now"
                  accent="var(--yd-gold)"
                />
              </div>
            </div>

            {/* bar chart */}
            <div className="yd-panel">
              <div className="yd-hd">
                <span className="yd-led g" />
                <span className="yd-label">Conversion rate · per month</span>
                <span className="yd-count rv-readout">
                  {hovered
                    ? `${longMonth(hovered.month)} · ${pct(hovered.rate)} · ${hovered.won} won / ${hovered.total} total`
                    : best && best.rate > 0
                      ? `peak ${pct(best.rate)}`
                      : "no wins in range"}
                </span>
              </div>
              <ConversionBars months={months} onHover={setHovered} />
            </div>

            {/* month breakdown */}
            <div className="yd-panel">
              <div className="yd-hd">
                <span className="yd-led c" />
                <span className="yd-label">Breakdown</span>
              </div>
              <div className="rv-table cv-table" role="table">
                <div className="rv-tr rv-th" role="row">
                  <span role="columnheader">Month</span>
                  <span role="columnheader">Won</span>
                  <span role="columnheader">Total</span>
                  <span role="columnheader">Rate</span>
                </div>
                {[...months].reverse().map((m) => (
                  <div
                    className={`rv-tr${m.won === 0 ? " dim" : ""}`}
                    role="row"
                    key={m.month}
                  >
                    <span role="cell">{longMonth(m.month)}</span>
                    <span role="cell">{m.won}</span>
                    <span role="cell">{m.total}</span>
                    <span role="cell" className="rv-money">
                      {pct(m.rate)}
                    </span>
                  </div>
                ))}
                {months.length === 0 && (
                  <div className="yd-empty">Nothing in this range.</div>
                )}
              </div>
            </div>
          </>
        )}

        <div className="yd-foot">Yondra // conversion report</div>
      </div>
    </div>
  );
}
