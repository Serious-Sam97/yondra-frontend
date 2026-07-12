// Sentinel (QA) — a card owns N TestCases, each TestCase owns N TestRuns (reports).
// TestCase = versioned documentation; TestRun = append-only execution.

import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faBan,
  faCircleCheck,
  faCircleXmark,
  faHourglassHalf,
} from "@fortawesome/free-solid-svg-icons";

export type RunStatus = "passed" | "failed" | "blocked";
export type CaseStatus = RunStatus | "not_run" | "awaiting_retest";
export type TestType = "manual" | "automated" | "performance" | "security";

// Human Quality Gate parecer — set on a case, distinct from the run-derived status.
export type Verdict = "approved" | "rejected" | "blocked" | "awaiting_info";

export type GherkinKeyword = "DADO" | "QUANDO" | "ENTÃO" | "E";
export interface GherkinLine {
  keyword: GherkinKeyword;
  text: string;
}

export interface QaUserRef {
  id: number;
  name: string;
}

export interface Evidence {
  url: string;
  kind?: string;
}

// Global reusable step (per board), referenced from a case by id so editing propagates.
// A step now carries structured Gherkin lines (content kept for back-compat/notes).
export interface ReusableStep {
  id: number;
  board_id: number;
  title: string;
  content: string | null;
  gherkin_lines?: GherkinLine[];
}

// A timeline block is EITHER a library reference (global, scope resolved from the step)
// OR a case-local block that stores its title + Gherkin lines inline. Both may attach
// documental evidence. Discriminated by presence of step_id vs local_key.
export interface StepRef {
  step_id?: number;
  overrides?: string | null;
  scope?: "local" | "global";
  local_key?: string;
  title?: string;
  lines?: GherkinLine[];
  evidence?: Evidence[];
}

// Per-block result inside a run's optional checklist layer.
export interface RunItem {
  block_key: string;
  block_title: string;
  ok: boolean | null;
  bug_card_id?: number | null;
  evidence?: Evidence[];
  lines?: { keyword: string; ok: boolean }[];
}

// Data-driven matrix: variable columns × value rows, injected across executions.
export interface DataMatrix {
  columns: string[];
  rows: string[][];
}

// Suite / plan (per board), cross-card, re-executable per release.
export interface TestPlan {
  id: number;
  board_id: number;
  name: string;
  description: string | null;
  cases_count: number;
}

// Cross-card plan overview (GET /api/boards/{id}/qa/overview): every plan with
// its linked cases and each case's live status.
export interface TestPlanOverviewCase {
  id: number;
  title: string;
  card_id: number;
  card_name: string | null;
  latest_status: CaseStatus;
}

export interface TestPlanOverview {
  id: number;
  name: string;
  description: string | null;
  cases: TestPlanOverviewCase[];
}

export interface TestRun {
  id: number;
  status: RunStatus;
  executor: QaUserRef | null;
  environment: string | null;
  device: string | null;
  executed_at: string | null;
  evidence: Evidence[];
  logs: string | null;
  items: RunItem[];
  source: "manual" | "ci";
}

export interface TestCase {
  id: number;
  card_id: number;
  board_id: number;
  title: string;
  type: TestType;
  target_env: string | null;
  gherkin: string | null;
  preconditions: string | null;
  postconditions: string | null;
  step_refs: StepRef[];
  data_matrix: DataMatrix;
  test_plan_ids: number[];
  bug_card_id: number | null;
  awaiting_retest: boolean;
  verdict: Verdict | null;
  verdict_by: QaUserRef | null;
  verdict_at: string | null;
  ci_token: string | null;
  position: number;
  version: number;
  planner: QaUserRef | null;
  editor: QaUserRef | null;
  latest_status: CaseStatus;
  runs: TestRun[];
}

// Status of a single case = its newest run (or not_run). Kept as a pure helper so the
// UI never trusts a stored field.
export function deriveCaseStatus(c: TestCase): CaseStatus {
  if (c.awaiting_retest) return "awaiting_retest";
  return c.runs.length ? c.runs[0].status : "not_run";
}

// Card-level rollup across all cases — worst-wins.
export function rollupStatus(cases: TestCase[]): CaseStatus | null {
  if (cases.length === 0) return null;
  const s = cases.map(deriveCaseStatus);
  if (s.includes("failed")) return "failed";
  if (s.includes("not_run")) return "not_run";
  if (s.includes("awaiting_retest")) return "awaiting_retest";
  if (s.includes("blocked")) return "blocked";
  return "passed";
}

// Cassette LED colour + label per status.
export const STATUS_META: Record<
  CaseStatus | "none",
  { color: string; label: string }
> = {
  passed: { color: "var(--cf-phosphor)", label: "Passed" },
  failed: { color: "var(--cf-red)", label: "Failed" },
  blocked: { color: "var(--cf-amber)", label: "Blocked" },
  not_run: { color: "var(--cf-text-dim)", label: "Not run" },
  awaiting_retest: { color: "var(--cf-cyan)", label: "Awaiting retest" },
  none: { color: "var(--cf-text-dim)", label: "No tests" },
};

// Human Quality Gate verdict — LED colour + label + FontAwesome icon. The verdict, when
// set, overrides the run-derived status in the card header.
export const VERDICT_META: Record<
  Verdict,
  { color: string; label: string; icon: IconDefinition }
> = {
  approved: {
    color: "var(--cf-phosphor)",
    label: "Approved",
    icon: faCircleCheck,
  },
  rejected: { color: "var(--cf-red)", label: "Rejected", icon: faCircleXmark },
  blocked: { color: "var(--cf-amber)", label: "Blocked", icon: faBan },
  awaiting_info: {
    color: "var(--cf-cyan)",
    label: "Awaiting info",
    icon: faHourglassHalf,
  },
};

// What the card header shows for a case: the human verdict wins; else the derived status.
export function headerState(c: TestCase): { color: string; label: string } {
  if (c.verdict) return VERDICT_META[c.verdict];
  return STATUS_META[deriveCaseStatus(c)];
}
