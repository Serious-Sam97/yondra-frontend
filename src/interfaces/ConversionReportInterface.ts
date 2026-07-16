// Shape returned by GET /api/reports/conversion (ConversionReportRepository).
// YON-65. `rate` is a 0..1 fraction (won that month ÷ total cards on the CRM
// boards) the UI renders as a percentage; `total` is the same for every month.

export interface ConversionMonth {
  month: string; // "YYYY-MM"
  won: number; // cards that reached Won that month
  total: number; // total cards on the CRM boards (constant across months)
  rate: number; // won / total, 0..1
}

export interface ConversionReport {
  // false when the user has no CRM boards (empty, zero-filled series still returned).
  has_crm: boolean;
  from: string; // "YYYY-MM"
  to: string; // "YYYY-MM"
  months: ConversionMonth[];
  total_won: number; // wins across the whole range
  total_cards: number; // denominator (current non-archived CRM cards)
  conversion_rate: number; // total_won / total_cards, 0..1
}
