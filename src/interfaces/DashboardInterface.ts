import type { ProjectInterface } from "./ProjectInterface";

// Shape returned by GET /api/dashboard (DashboardModelRepository).

export interface DashVitals {
  overdue: number;
  due_today: number;
  in_progress: number;
  done_7d: number;
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

export interface DashCrm {
  currency: string;
  open_total: number;
  won_mtd: number;
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

export interface DashboardPayload {
  vitals: DashVitals;
  queue: DashQueue;
  throughput: number[];
  sprint: DashSprint | null;
  crm: DashCrm | null;
  prs: DashPr[];
  activity: DashActivity[];
  projects: { owned: ProjectInterface[]; member: ProjectInterface[] };
}
