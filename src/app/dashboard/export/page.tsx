"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import "../dashboard.css";
import "./export.css";
import type {
  DealStatus,
  DealsExport,
} from "@/interfaces/DealsExportInterface";
import { downloadDealsCsv, fetchDealsExport } from "@/lib/api";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

// ── period presets ────────────────────────────────────────────────────────────

type PresetKey = "thismonth" | "6m" | "12m" | "ytd";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "thismonth", label: "This month" },
  { key: "6m", label: "Last 6 months" },
  { key: "12m", label: "Last 12 months" },
  { key: "ytd", label: "This year" },
];

const STATUSES: { key: DealStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
  { key: "open", label: "Open" },
];

function ym(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Resolve a preset to an inclusive {from,to} month range ending this month.
function presetRange(key: PresetKey): { from: string; to: string } {
  const now = new Date();
  const to = ym(now);
  if (key === "thismonth") return { from: to, to };
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

function todayLong(): string {
  return new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ── page ──────────────────────────────────────────────────────────────────────

function ExportInner() {
  useDocumentTitle("Yondra - Export deals");
  const params = useSearchParams();
  // A per-board "Export" link lands here prefiltered: ?board=<id>.
  const boardId = useMemo(() => {
    const raw = params.get("board");
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, [params]);

  const [preset, setPreset] = useState<PresetKey>("12m");
  const [status, setStatus] = useState<DealStatus>("all");
  const [data, setData] = useState<DealsExport | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const range = useMemo(() => presetRange(preset), [preset]);
  const query = useMemo(
    () => ({ ...range, status, board_id: boardId }),
    [range, status, boardId],
  );

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    fetchDealsExport(query)
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
  }, [query]);

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

  const columns = data?.columns ?? [];
  const rows = data?.rows ?? [];
  const noCrm = !loading && data != null && data.count === 0 && !data.currency;

  async function onDownloadCsv() {
    setDownloading(true);
    try {
      await downloadDealsCsv(query);
    } catch {
      // swallow — same central 401 handling; CSV failures are non-fatal here.
    } finally {
      setDownloading(false);
    }
  }

  // Render a table cell: money columns get currency formatting, the status
  // cell gets a colour chip, everything else prints as-is.
  function cell(
    col: DealsExport["columns"][number],
    row: DealsExport["rows"][number],
  ) {
    const v = row[col.key];
    if (col.type === "money") {
      return <span className="ex-money">{money(Number(v) || 0)}</span>;
    }
    if (col.key === "status") {
      const s = String(v).toLowerCase();
      return <span className={`ex-chip ex-${s}`}>{String(v)}</span>;
    }
    return <span>{String(v ?? "")}</span>;
  }

  return (
    <div className="yd-root">
      <div className="yd-wrap ex-wrap">
        {/* toolbar (screen only) */}
        <div className="ex-top ex-noprint">
          <div className="ex-title">
            <Link
              href={boardId ? `/boards/${boardId}` : "/dashboard"}
              className="ex-back"
              aria-label="Back"
            >
              ‹ {boardId ? "Board" : "Dashboard"}
            </Link>
            <h1>Export deals</h1>
            <span className="yd-label">
              {data ? `${data.from} → ${data.to}` : "…"}
            </span>
          </div>
          <div className="ex-actions">
            <button
              type="button"
              className="ex-btn"
              onClick={onDownloadCsv}
              disabled={loading || downloading || rows.length === 0}
            >
              {downloading ? "Preparing…" : "↓ CSV"}
            </button>
            <button
              type="button"
              className="ex-btn ex-btn-primary"
              onClick={() => window.print()}
              disabled={loading || rows.length === 0}
            >
              ⎙ Print / PDF
            </button>
          </div>
        </div>

        {/* filters (screen only) */}
        <div className="ex-filters ex-noprint">
          <div className="ex-fgroup">
            <span className="ex-flabel">Period</span>
            {PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`ex-seg${preset === p.key ? " on" : ""}`}
                onClick={() => setPreset(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="ex-fgroup">
            <span className="ex-flabel">Status</span>
            {STATUSES.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`ex-seg${status === s.key ? " on" : ""}`}
                onClick={() => setStatus(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {noCrm && (
          <div className="yd-panel ex-noprint">
            <div className="yd-empty">
              No CRM board yet. Deal exports are drawn from CRM-type boards —
              create one to start exporting your pipeline.
            </div>
          </div>
        )}

        {!noCrm && (
          <>
            {/* headline stats (screen only) */}
            <div className="yd-panel ex-noprint">
              <div className="yd-hd">
                <span className="yd-led g" />
                <span className="yd-label">
                  {STATUSES.find((s) => s.key === status)?.label} deals ·
                  selected period
                </span>
                <span className="yd-count">
                  {data ? data.generated_for : "…"}
                </span>
              </div>
              <div className="ex-stats">
                <Stat label="Deals" value={data ? String(data.count) : "…"} />
                <Stat
                  label="Total value"
                  value={
                    data
                      ? data.multi_currency
                        ? "mixed"
                        : money(data.total_value)
                      : "…"
                  }
                  accent="var(--yd-phosphor)"
                />
                <Stat
                  label="Total paid"
                  value={
                    data
                      ? data.multi_currency
                        ? "mixed"
                        : money(data.total_paid)
                      : "…"
                  }
                  accent="var(--yd-cyan)"
                />
              </div>
              {data?.multi_currency && (
                <div className="ex-mixed">
                  Deals span multiple currencies — money totals are hidden.
                  Filter to a single pipeline for currency totals.
                </div>
              )}
            </div>

            {/* the report — this is what prints */}
            <div className="yd-panel ex-report">
              {/* print-only masthead */}
              <div className="ex-masthead">
                <div>
                  <div className="ex-brand">Yondra</div>
                  <div className="ex-sub">Deals export</div>
                </div>
                <div className="ex-meta">
                  <div>
                    {STATUSES.find((s) => s.key === status)?.label} ·{" "}
                    {data
                      ? `${longMonth(data.from)} → ${longMonth(data.to)}`
                      : ""}
                  </div>
                  <div>{data?.generated_for}</div>
                  <div>Generated {todayLong()}</div>
                </div>
              </div>

              <div className="ex-tablewrap">
                <table className="ex-table">
                  <thead>
                    <tr>
                      {columns.map((c) => (
                        <th
                          key={c.key}
                          className={c.type === "money" ? "num" : undefined}
                        >
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading && rows.length === 0 && (
                      <tr>
                        <td
                          className="ex-loading"
                          colSpan={columns.length || 1}
                        >
                          Loading…
                        </td>
                      </tr>
                    )}
                    {!loading && rows.length === 0 && (
                      <tr>
                        <td
                          className="ex-loading"
                          colSpan={columns.length || 1}
                        >
                          No deals match this filter.
                        </td>
                      </tr>
                    )}
                    {rows.map((row, i) => (
                      <tr key={`${row.ticket}-${i}`}>
                        {columns.map((c) => (
                          <td
                            key={c.key}
                            className={c.type === "money" ? "num" : undefined}
                          >
                            {cell(c, row)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  {rows.length > 0 && !data?.multi_currency && (
                    <tfoot>
                      <tr>
                        {columns.map((c) => {
                          if (c.key === "deal") {
                            return (
                              <td key={c.key} className="ex-total-l">
                                {rows.length} deal{rows.length === 1 ? "" : "s"}
                              </td>
                            );
                          }
                          if (c.key === "value") {
                            return (
                              <td key={c.key} className="num ex-total">
                                {money(data?.total_value ?? 0)}
                              </td>
                            );
                          }
                          if (c.key === "paid") {
                            return (
                              <td key={c.key} className="num ex-total">
                                {money(data?.total_paid ?? 0)}
                              </td>
                            );
                          }
                          return <td key={c.key} />;
                        })}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="yd-tile ex-tile">
      <div className="v" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      <div className="l">{label}</div>
    </div>
  );
}

export default function ExportPage() {
  // useSearchParams requires a Suspense boundary in the app router.
  return (
    <Suspense fallback={null}>
      <ExportInner />
    </Suspense>
  );
}
