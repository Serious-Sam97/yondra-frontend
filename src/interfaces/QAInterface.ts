// Sentinel (QA) — a card owns N TestCases, each TestCase owns N TestRuns (reports).
// TestCase = versioned documentation; TestRun = append-only execution.

export type RunStatus = 'passed' | 'failed' | 'blocked'
export type CaseStatus = RunStatus | 'not_run' | 'awaiting_retest'
export type TestType = 'manual' | 'automated' | 'performance' | 'security'

export interface QaUserRef {
  id: number
  name: string
}

// Global reusable step (per board), referenced from a case by id so editing propagates.
export interface ReusableStep {
  id: number
  board_id: number
  title: string
  content: string | null
}

export interface StepRef {
  step_id: number
  overrides?: string | null
}

// Data-driven matrix: variable columns × value rows, injected across executions.
export interface DataMatrix {
  columns: string[]
  rows: string[][]
}

// Suite / plan (per board), cross-card, re-executable per release.
export interface TestPlan {
  id: number
  board_id: number
  name: string
  description: string | null
  cases_count: number
}

export interface TestRun {
  id: number
  status: RunStatus
  executor: QaUserRef | null
  environment: string | null
  device: string | null
  executed_at: string | null
  evidence: { url: string; kind?: string }[]
  logs: string | null
}

export interface TestCase {
  id: number
  card_id: number
  board_id: number
  title: string
  type: TestType
  target_env: string | null
  gherkin: string | null
  preconditions: string | null
  postconditions: string | null
  step_refs: StepRef[]
  data_matrix: DataMatrix
  test_plan_ids: number[]
  bug_card_id: number | null
  awaiting_retest: boolean
  position: number
  version: number
  planner: QaUserRef | null
  editor: QaUserRef | null
  latest_status: CaseStatus
  runs: TestRun[]
}

// Status of a single case = its newest run (or not_run). Kept as a pure helper so the
// UI never trusts a stored field.
export function deriveCaseStatus(c: TestCase): CaseStatus {
  if (c.awaiting_retest) return 'awaiting_retest'
  return c.runs.length ? c.runs[0].status : 'not_run'
}

// Card-level rollup across all cases — worst-wins.
export function rollupStatus(cases: TestCase[]): CaseStatus | null {
  if (cases.length === 0) return null
  const s = cases.map(deriveCaseStatus)
  if (s.includes('failed')) return 'failed'
  if (s.includes('not_run')) return 'not_run'
  if (s.includes('awaiting_retest')) return 'awaiting_retest'
  if (s.includes('blocked')) return 'blocked'
  return 'passed'
}

// Cassette LED colour + label per status.
export const STATUS_META: Record<CaseStatus | 'none', { color: string; label: string }> = {
  passed:          { color: 'var(--cf-phosphor)', label: 'Passed' },
  failed:          { color: 'var(--cf-red)',      label: 'Failed' },
  blocked:         { color: 'var(--cf-amber)',    label: 'Blocked' },
  not_run:         { color: 'var(--cf-text-dim)', label: 'Not run' },
  awaiting_retest: { color: 'var(--cf-cyan)',     label: 'Awaiting retest' },
  none:            { color: 'var(--cf-text-dim)', label: 'No tests' },
}
