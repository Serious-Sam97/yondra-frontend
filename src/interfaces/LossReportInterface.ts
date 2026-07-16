// Shape returned by GET /api/reports/loss (LossReportRepository). YON-66.
// A "lost deal" is a CRM card with lost_at set; `reasons` is the by-reason
// breakdown (the report's headline).

export interface LossMonth {
  month: string; // "YYYY-MM"
  lost_value: number; // SUM(value) of deals lost that month
  count: number; // deals lost that month
}

export interface LossReasonStat {
  reason: string;
  count: number; // deals lost for this reason (over the whole range)
  value: number; // SUM(value) lost for this reason
}

export interface LossReport {
  // null when the user has no CRM boards (empty, zero-filled series still returned).
  currency: string | null;
  from: string; // "YYYY-MM"
  to: string; // "YYYY-MM"
  months: LossMonth[];
  reasons: LossReasonStat[]; // most-frequent first
  total_lost_value: number;
  total_count: number;
}
