export type SprintStatus = "future" | "active" | "completed";

export interface SprintInterface {
  id: number;
  board_id: number;
  name: string;
  status: SprintStatus;
  goal?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active: boolean;
  started_at?: string | null;
  completed_at?: string | null;
  // Scope frozen at start; result frozen at completion (drive velocity + report).
  committed_points?: number | null;
  committed_count?: number | null;
  completed_points?: number | null;
  completed_count?: number | null;
  // Frozen ticket set at completion (demo mirror of the backend snapshot).
  report_snapshot?: SprintReportTicket[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// A single ticket row in a sprint report.
export interface SprintReportTicket {
  id: number;
  name: string;
  points?: number | null;
  done_at?: string | null;
  assigned_user?: { id: number; name: string } | null;
}

export interface SprintReportData {
  sprint: Partial<SprintInterface>;
  committed_points: number;
  completed_points: number;
  completed: SprintReportTicket[];
  not_completed: SprintReportTicket[];
  burndown: { date: string; remaining: number; ideal: number }[];
}
