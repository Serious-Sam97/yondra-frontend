// Shape returned by GET /api/reports/deals (DealsExportRepository). YON-67.
// A flat, exportable ledger of CRM deals — one row per deal — feeding the
// on-screen preview, the CSV download, and the printable report.

export type DealStatus = "all" | "won" | "lost" | "open";

export interface DealsColumn {
  key: string;
  label: string;
  type: "text" | "money" | "date";
}

// Rows are keyed by column key; money cells are numbers, everything else strings.
export type DealsRow = Record<string, string | number>;

export interface DealsExport {
  columns: DealsColumn[];
  rows: DealsRow[];
  from: string; // "YYYY-MM"
  to: string; // "YYYY-MM"
  status: DealStatus;
  // null when the export spans multiple currencies (money totals are then hidden).
  currency: string | null;
  multi_currency: boolean;
  total_value: number;
  total_paid: number;
  count: number;
  generated_for: string; // human label: "3 CRM pipelines" / board name
}

export interface DealsExportParams {
  from?: string;
  to?: string;
  status?: DealStatus;
  board_id?: number;
}
