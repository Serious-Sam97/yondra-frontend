import type { ProjectInterface } from "./ProjectInterface";

// Shape returned by GET /api/dashboard (DashboardModelRepository).

export interface DashVitals {
  overdue: number;
  // How many days late the stalest overdue card is (null when nothing overdue).
  overdue_oldest_days: number | null;
  due_today: number;
  // Cards due within the next 7 days (today included) + the nearest due date.
  due_week: number;
  next_due: string | null;
  in_progress: number;
  in_progress_boards: number;
  done_7d: number;
  // Prior 7-day window (14d→7d ago) for an honest week-over-week delta.
  done_prev_7d: number;
  pipeline: number;
}

export interface DashCard {
  id: number;
  name: string;
  board_id: number;
  board_name: string | null;
  section: string | null;
  priority: "low" | "medium" | "high" | "urgent" | null;
  due_date: string | null;
  story_points: number | null;
  value: number | null;
  ticket_key: string;
}

export interface DashQueue {
  overdue: DashCard[];
  today: DashCard[];
  high: DashCard[];
}

export interface DashSprint {
  name: string;
  board_name: string | null;
  goal: string | null;
  committed: number;
  completed: number;
  remaining: number;
  days_total: number | null;
  days_left: number | null;
  days_elapsed: number | null;
}

export interface DashCrmStage {
  name: string;
  value: number;
  count: number;
}

export interface DashCrmAging {
  id: number;
  board_id: number;
  name: string;
  stage: string | null;
  value: number | null;
  days_idle: number;
}

export interface DashCrmTopDeal {
  id: number;
  board_id: number;
  name: string;
  value: number;
  stage: string | null;
}

export interface DashCrm {
  currency: string;
  open_total: number;
  won_mtd: number;
  open_count: number;
  // Biggest open deal — lets the UI name the whale when one deal dominates.
  top_deal: DashCrmTopDeal | null;
  stages: DashCrmStage[];
  aging: DashCrmAging[];
}

export interface DashPr {
  title: string | null;
  number: number | null;
  state: string | null;
  checks_state: string | null;
  url: string | null;
}

export interface DashActivity {
  id: number;
  board_id: number;
  type: string | null;
  actor: string | null;
  description: string;
  created_at: string;
}

// Per-project live signal: open-work progress + freshest activity timestamp.
export interface DashProjectMeta {
  id: number;
  done: number;
  total: number;
  last_activity: string | null;
}

export interface DashboardPayload {
  vitals: DashVitals;
  queue: DashQueue;
  throughput: number[];
  sprint: DashSprint | null;
  crm: DashCrm | null;
  prs: DashPr[];
  activity: DashActivity[];
  projects: { owned: ProjectInterface[]; member: ProjectInterface[] };
  projects_meta: DashProjectMeta[];
}
