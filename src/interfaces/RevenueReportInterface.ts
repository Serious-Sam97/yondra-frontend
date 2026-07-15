// Shape returned by GET /api/reports/revenue (RevenueReportRepository). YON-64.
// An "approved quote" is a CRM card marked done; a "client" is its contact.

export interface RevenueMonth {
  month: string; // "YYYY-MM"
  revenue: number; // SUM(value) of cards won that month
  count: number; // approved quotes won that month
  clients: number; // distinct clients won that month
}

export interface RevenueReport {
  // null when the user has no CRM boards (empty, zero-filled series still returned).
  currency: string | null;
  from: string; // "YYYY-MM"
  to: string; // "YYYY-MM"
  months: RevenueMonth[];
  total_revenue: number;
  total_count: number;
  total_clients: number;
}
