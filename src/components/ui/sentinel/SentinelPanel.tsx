'use client'

import { useEffect, useRef, useState } from 'react'
import { uploadInlineImage } from '@/lib/api'
import type { useSentinelCard } from '@/hooks/useSentinelCard'
import { useStepLibrary } from '@/hooks/useStepLibrary'
import { useTestPlans } from '@/hooks/useTestPlans'
import {
  deriveCaseStatus,
  rollupStatus,
  STATUS_META,
  type DataMatrix,
  type RunStatus,
  type StepRef,
  type TestCase,
  type TestType,
} from '@/interfaces/QAInterface'

type Library = ReturnType<typeof useStepLibrary>
type Plans = ReturnType<typeof useTestPlans>

const CHIP_BG = '#1c1a16'
const TYPES: TestType[] = ['manual', 'automated', 'performance', 'security']
const RUN_STATUSES: RunStatus[] = ['passed', 'failed', 'blocked']

function StatusLed({ status, size = 8 }: { status: keyof typeof STATUS_META; size?: number }) {
  const { color } = STATUS_META[status]
  return (
    <span
      className="cf-led flex-shrink-0"
      style={{ background: color, boxShadow: `0 0 5px ${color}`, width: size, height: size }}
    />
  )
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

export function SentinelPanel({
  session,
  boardId,
  canWrite,
}: {
  session: ReturnType<typeof useSentinelCard>
  boardId: number
  canWrite: boolean
}) {
  const s = session
  const { cases, selectedCaseId, setSelectedCaseId, busy, createCase, saveCase, removeCase, launchRun } = s
  const selected = cases.find((c) => c.id === selectedCaseId) ?? null
  const rollup = rollupStatus(cases)
  const library = useStepLibrary(boardId, true)
  const plansLib = useTestPlans(boardId, true)

  // ── Empty state ───────────────────────────────────────────────────────────
  if (cases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
        <p style={{ color: 'var(--cf-text-muted)', fontSize: '13px' }}>No test cases on this card yet.</p>
        <p className="cf-mono" style={{ color: 'var(--cf-text-dim)', fontSize: '11px' }}>
          Document a test, then log runs — the card header reflects the latest result.
        </p>
        {canWrite && (
          <button
            onClick={() => createCase('New test case')}
            disabled={busy}
            className="aero-btn aero-btn--cyan px-5 py-2 uppercase tracking-widest font-bold text-xs disabled:opacity-50"
          >
            + New test case
          </button>
        )}
      </div>
    )
  }

  const breakdown = (['failed', 'not_run', 'blocked', 'passed'] as const)
    .map((st) => ({ st, n: cases.filter((c) => deriveCaseStatus(c) === st).length }))
    .filter((x) => x.n > 0)

  return (
    <div className="flex flex-col">
      {/* Header — card-level rollup + breakdown */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b flex-wrap gap-2"
        style={{ borderColor: 'var(--cf-edge)' }}
      >
        <div className="flex items-center gap-2.5">
          {rollup && <StatusLed status={rollup} size={11} />}
          <div>
            <div style={{ fontSize: '12px', color: 'var(--cf-text)' }}>
              CARD STATUS · {cases.length} case{cases.length !== 1 ? 's' : ''}
            </div>
            <div className="flex gap-2.5 mt-0.5">
              {breakdown.map(({ st, n }) => (
                <span key={st} className="cf-mono" style={{ fontSize: '10px', color: STATUS_META[st].color }}>
                  ● {n} {STATUS_META[st].label.toLowerCase()}
                </span>
              ))}
            </div>
          </div>
        </div>
        {canWrite && (
          <button
            onClick={() => createCase('New test case')}
            disabled={busy}
            className="aero-btn aero-btn--cyan px-3 py-1.5 uppercase tracking-widest font-bold text-[10px] disabled:opacity-50"
          >
            + New case
          </button>
        )}
      </div>

      {/* Test-case navigator */}
      <div className="flex gap-2 px-5 py-3 border-b overflow-x-auto" style={{ borderColor: 'var(--cf-edge)' }}>
        {cases.map((c) => {
          const st = deriveCaseStatus(c)
          const on = c.id === selectedCaseId
          return (
            <button
              key={c.id}
              onClick={() => setSelectedCaseId(c.id)}
              className="flex flex-col gap-1 rounded-lg px-3 py-2 text-left flex-shrink-0 cursor-pointer"
              style={{
                minWidth: 150,
                background: 'var(--cf-screen)',
                border: `1px solid ${on ? STATUS_META[st].color : 'var(--cf-edge)'}`,
                boxShadow: on ? `inset 0 0 0 1px ${STATUS_META[st].color}55` : undefined,
              }}
            >
              <span className="flex items-center gap-2">
                <StatusLed status={st} />
                <span className="cf-mono truncate" style={{ fontSize: '12px', color: on ? 'var(--cf-text)' : 'var(--cf-text-muted)' }}>
                  {c.title}
                </span>
              </span>
              <span className="cf-mono" style={{ fontSize: '10px', color: 'var(--cf-text-dim)' }}>
                {c.type} · {c.runs.length} run{c.runs.length !== 1 ? 's' : ''}
              </span>
            </button>
          )
        })}
      </div>

      {selected && (
        <CaseDetail
          key={selected.id}
          testCase={selected}
          boardId={boardId}
          library={library}
          plans={plansLib}
          canWrite={canWrite}
          busy={busy}
          onSave={(patch) => saveCase(selected.id, patch)}
          onDelete={() => removeCase(selected.id)}
          onRun={(payload) => launchRun(selected.id, payload)}
          onLinkBug={() => s.linkBug(selected.id)}
        />
      )}
    </div>
  )
}

// ── Selected case: documentation workbench + execution ────────────────────────
type RunPayload = {
  status: RunStatus
  environment?: string
  device?: string
  logs?: string
  evidence?: { url: string; kind?: string }[]
}

function CaseDetail({
  testCase,
  boardId,
  library,
  plans,
  canWrite,
  busy,
  onSave,
  onDelete,
  onRun,
  onLinkBug,
}: {
  testCase: TestCase
  boardId: number
  library: Library
  plans: Plans
  canWrite: boolean
  busy: boolean
  onSave: (patch: Record<string, unknown>) => void
  onDelete: () => void
  onRun: (payload: RunPayload) => void
  onLinkBug: () => void
}) {
  const [draft, setDraft] = useState(testCase)
  useEffect(() => setDraft(testCase), [testCase])
  const set = (patch: Partial<TestCase>) => setDraft((d) => ({ ...d, ...patch }))

  const label = (t: string) => (
    <span className="cf-mono uppercase" style={{ fontSize: '10px', letterSpacing: '0.14em', color: 'var(--cf-text-dim)' }}>
      {t}
    </span>
  )

  return (
    <div className="grid md:grid-cols-2">
      {/* Documentation */}
      <div className="flex flex-col gap-3 px-5 py-4 border-b md:border-b-0 md:border-r" style={{ borderColor: 'var(--cf-edge)' }}>
        {label(`Documentation · v${testCase.version}${testCase.editor ? ` · ${testCase.editor.name}` : ''}`)}
        <input
          value={draft.title}
          disabled={!canWrite}
          onChange={(e) => set({ title: e.target.value })}
          className="glass-input cf-lcd text-sm"
          placeholder="Test case title"
        />
        <div className="flex gap-2">
          <select value={draft.type} disabled={!canWrite} onChange={(e) => set({ type: e.target.value as TestType })} className="glass-input cf-lcd text-xs flex-1 cursor-pointer">
            {TYPES.map((t) => <option key={t} value={t} className="text-black">{t}</option>)}
          </select>
          <input value={draft.target_env ?? ''} disabled={!canWrite} onChange={(e) => set({ target_env: e.target.value })} placeholder="Target env" className="glass-input cf-lcd text-xs flex-1" />
        </div>

        {label('BDD · Gherkin')}
        <textarea value={draft.gherkin ?? ''} disabled={!canWrite} onChange={(e) => set({ gherkin: e.target.value })} rows={4} placeholder="Dado / Quando / Então…" className="glass-input cf-mono text-xs resize-none" style={{ lineHeight: 1.6 }} />

        <div className="flex gap-2">
          <div className="flex-1 flex flex-col gap-1">{label('Pré-condições')}
            <textarea value={draft.preconditions ?? ''} disabled={!canWrite} onChange={(e) => set({ preconditions: e.target.value })} rows={2} className="glass-input cf-mono text-xs resize-none" /></div>
          <div className="flex-1 flex flex-col gap-1">{label('Pós-condições')}
            <textarea value={draft.postconditions ?? ''} disabled={!canWrite} onChange={(e) => set({ postconditions: e.target.value })} rows={2} className="glass-input cf-mono text-xs resize-none" /></div>
        </div>

        {label('Passos modulares')}
        <StepComposer
          refs={draft.step_refs ?? []}
          library={library}
          canWrite={canWrite}
          onChange={(refs) => set({ step_refs: refs })}
        />

        {label('Massa de dados · data-driven')}
        <DataMatrixEditor
          value={draft.data_matrix ?? { columns: [], rows: [] }}
          canWrite={canWrite}
          onChange={(m) => set({ data_matrix: m })}
        />

        {label('Planos / suítes')}
        <TestPlanLinks
          linked={draft.test_plan_ids ?? []}
          plans={plans}
          canWrite={canWrite}
          onChange={(ids) => set({ test_plan_ids: ids })}
        />

        {canWrite && (
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => onSave({ title: draft.title, type: draft.type, target_env: draft.target_env, gherkin: draft.gherkin, preconditions: draft.preconditions, postconditions: draft.postconditions, step_refs: draft.step_refs ?? [], data_matrix: draft.data_matrix ?? { columns: [], rows: [] }, test_plan_ids: draft.test_plan_ids ?? [] })}
              disabled={busy}
              className="aero-btn aero-btn--cyan px-4 py-1.5 uppercase tracking-widest font-bold text-[10px] disabled:opacity-50"
            >
              Save
            </button>
            <button onClick={onDelete} disabled={busy} className="aero-btn aero-btn--ghost px-3 py-1.5 uppercase tracking-widest font-bold text-[10px] disabled:opacity-50 ml-auto">
              Delete case
            </button>
          </div>
        )}
      </div>

      {/* Execution */}
      <div className="flex flex-col gap-3 px-5 py-4">
        {label('Reports · append-only')}
        {canWrite && <RunLauncher boardId={boardId} busy={busy} onRun={onRun} />}

        <div className="flex flex-col gap-2 mt-1">
          {testCase.runs.length === 0 && (
            <p className="cf-mono" style={{ fontSize: '11px', color: 'var(--cf-text-dim)' }}>No runs yet — log the first one.</p>
          )}
          {testCase.runs.map((r) => (
            <div key={r.id} className="rounded-lg px-3 py-2" style={{ background: 'var(--cf-screen)', border: `1px solid ${STATUS_META[r.status].color}55` }}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <StatusLed status={r.status} />
                  <span className="cf-mono" style={{ fontSize: '12px', color: STATUS_META[r.status].color }}>{STATUS_META[r.status].label}</span>
                </span>
                {r.executor && (
                  <span title={r.executor.name} className="rounded-full flex items-center justify-center text-white font-bold" style={{ width: 20, height: 20, fontSize: 9, background: '#1976D2', border: '1.5px solid rgba(255,255,255,0.8)' }}>
                    {initials(r.executor.name)}
                  </span>
                )}
              </div>
              <div className="cf-mono mt-1" style={{ fontSize: '10px', color: 'var(--cf-text-dim)' }}>
                {[r.environment, r.device, r.executed_at ? new Date(r.executed_at).toLocaleString() : null].filter(Boolean).join(' · ') || '—'}
              </div>
              {r.logs && (
                <div className="cf-mono mt-1.5 px-2 py-1 rounded-sm" style={{ background: CHIP_BG, fontSize: '10px', color: 'var(--cf-red)', whiteSpace: 'pre-wrap' }}>{r.logs}</div>
              )}
              {r.evidence.length > 0 && (
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  {r.evidence.map((ev, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <a key={i} href={ev.url} target="_blank" rel="noreferrer" className="block rounded-sm overflow-hidden flex-shrink-0" style={{ width: 44, height: 32, border: '1px solid var(--cf-edge)' }}>
                      <img src={ev.url} alt="evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Linked bug (bidirectional coupling) */}
        {testCase.bug_card_id ? (
          <div className="rounded-lg px-3 py-2 flex items-center justify-between" style={{ background: 'var(--cf-screen)', border: `1px solid ${testCase.awaiting_retest ? 'var(--cf-cyan)' : 'var(--cf-edge)'}` }}>
            <span className="flex items-center gap-2">
              <StatusLed status="failed" />
              <span className="cf-mono" style={{ fontSize: '12px', color: 'var(--cf-text)' }}>Bug linked</span>
            </span>
            {testCase.awaiting_retest && (
              <span className="cf-mono px-2 py-0.5 rounded-sm" style={{ background: CHIP_BG, color: 'var(--cf-cyan)', fontSize: '10px' }}>Awaiting retest</span>
            )}
          </div>
        ) : canWrite && deriveCaseStatus(testCase) === 'failed' ? (
          <button onClick={onLinkBug} disabled={busy} className="aero-btn aero-btn--magenta px-4 py-1.5 uppercase tracking-widest font-bold text-[10px] disabled:opacity-50 self-start">
            Create bug from failure
          </button>
        ) : null}
      </div>
    </div>
  )
}

// Data-driven matrix editor: variable columns × value rows. Lives in the case draft
// (saved with the case), so edits are local until Save.
function DataMatrixEditor({ value, canWrite, onChange }: { value: DataMatrix; canWrite: boolean; onChange: (m: DataMatrix) => void }) {
  const columns = value.columns ?? []
  const rows = value.rows ?? []

  const addCol = () => onChange({ columns: [...columns, `var${columns.length + 1}`], rows: rows.map((r) => [...r, '']) })
  const setCol = (i: number, name: string) => onChange({ ...value, columns: columns.map((c, ci) => (ci === i ? name : c)) })
  const removeCol = (i: number) => onChange({ columns: columns.filter((_, ci) => ci !== i), rows: rows.map((r) => r.filter((_, ci) => ci !== i)) })
  const addRow = () => onChange({ columns, rows: [...rows, columns.map(() => '')] })
  const removeRow = (ri: number) => onChange({ columns, rows: rows.filter((_, r) => r !== ri) })
  const setCell = (ri: number, ci: number, v: string) => onChange({ columns, rows: rows.map((r, i) => (i === ri ? r.map((c, j) => (j === ci ? v : c)) : r)) })

  const cellInput = 'bg-transparent focus:outline-none w-full cf-mono'
  const th = { border: '1px solid #33463a', padding: '2px 4px', background: '#101812' } as const
  const td = { border: '1px solid #33463a', padding: '0 4px' } as const

  if (columns.length === 0) {
    return canWrite ? (
      <button onClick={addCol} className="aero-btn aero-btn--ghost px-3 py-1.5 uppercase tracking-widest font-bold text-[10px] self-start">+ Add variable</button>
    ) : (
      <p className="cf-mono" style={{ fontSize: '11px', color: 'var(--cf-text-dim)' }}>No data set.</p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto">
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              {columns.map((c, ci) => (
                <th key={ci} style={th}>
                  <span className="flex items-center gap-1">
                    <input value={c} disabled={!canWrite} onChange={(e) => setCol(ci, e.target.value)} className={cellInput} style={{ color: 'var(--cf-cyan)', fontSize: '11px' }} />
                    {canWrite && <button onClick={() => removeCol(ci)} className="cursor-pointer" style={{ color: 'var(--cf-text-dim)', fontSize: '10px' }}>✕</button>}
                  </span>
                </th>
              ))}
              {canWrite && <th style={th}><button onClick={addCol} className="cursor-pointer" style={{ color: 'var(--cf-phosphor)', fontSize: '12px' }}>+</button></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>
                {columns.map((_, ci) => (
                  <td key={ci} style={td}>
                    <input value={r[ci] ?? ''} disabled={!canWrite} onChange={(e) => setCell(ri, ci, e.target.value)} className={cellInput} style={{ color: 'var(--cf-cream)', fontSize: '11px', padding: '3px 0' }} />
                  </td>
                ))}
                {canWrite && <td style={td}><button onClick={() => removeRow(ri)} className="cursor-pointer" style={{ color: 'var(--cf-text-dim)', fontSize: '10px' }}>✕</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canWrite && (
        <button onClick={addRow} className="aero-btn aero-btn--ghost px-3 py-1 uppercase tracking-widest font-bold text-[10px] self-start">+ Row</button>
      )}
    </div>
  )
}

// Modular steps: references into the board's step library. Each ref resolves live
// from stepsById, so editing a step here reflects in every case that uses it.
function StepComposer({
  refs,
  library,
  canWrite,
  onChange,
}: {
  refs: StepRef[]
  library: Library
  canWrite: boolean
  onChange: (refs: StepRef[]) => void
}) {
  const { stepsById, steps, create, update, busy } = library
  const [newTitle, setNewTitle] = useState('')

  const addRef = (stepId: number) => {
    if (!refs.some((r) => r.step_id === stepId)) onChange([...refs, { step_id: stepId }])
  }
  const removeRef = (stepId: number) => onChange(refs.filter((r) => r.step_id !== stepId))
  const createAndAdd = async () => {
    const t = newTitle.trim()
    if (!t) return
    const step = await create(t)
    setNewTitle('')
    onChange([...refs, { step_id: step.id }])
  }
  const available = steps.filter((s) => !refs.some((r) => r.step_id === s.id))

  return (
    <div className="flex flex-col gap-2">
      {refs.length === 0 && (
        <p className="cf-mono" style={{ fontSize: '11px', color: 'var(--cf-text-dim)' }}>
          No steps referenced — add from the library or create one.
        </p>
      )}
      {refs.map((ref, idx) => {
        const step = stepsById[ref.step_id]
        return (
          <div key={ref.step_id} className="rounded-lg px-3 py-2 flex flex-col gap-1.5" style={{ background: 'var(--cf-screen)', border: '1px solid var(--cf-edge)' }}>
            {step ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="cf-mono" style={{ fontSize: '11px', color: 'var(--cf-text-dim)' }}>{idx + 1}</span>
                  <input
                    defaultValue={step.title}
                    disabled={!canWrite}
                    onBlur={(e) => { if (e.target.value.trim() && e.target.value !== step.title) update(step.id, { title: e.target.value.trim() }) }}
                    className="cf-mono flex-1 bg-transparent focus:outline-none border-b"
                    style={{ fontSize: '12px', color: 'var(--cf-text)', borderColor: 'transparent' }}
                  />
                  <span className="cf-mono px-1.5 rounded-sm" style={{ background: CHIP_BG, color: 'var(--cf-cyan)', fontSize: '9px' }}>◈ LIB</span>
                  {canWrite && <button onClick={() => removeRef(step.id)} aria-label="Remove step" className="cursor-pointer" style={{ color: 'var(--cf-text-dim)', fontSize: '11px' }}>✕</button>}
                </div>
                <textarea
                  defaultValue={step.content ?? ''}
                  disabled={!canWrite}
                  onBlur={(e) => { if ((e.target.value || null) !== (step.content ?? null)) update(step.id, { content: e.target.value || null }) }}
                  rows={2}
                  placeholder="Step content (edits propagate to every case using this step)"
                  className="glass-input cf-mono text-xs resize-none"
                />
              </>
            ) : (
              <div className="flex items-center justify-between">
                <span className="cf-mono" style={{ fontSize: '11px', color: 'var(--cf-red)' }}>Step #{ref.step_id} was deleted</span>
                {canWrite && <button onClick={() => removeRef(ref.step_id)} className="cursor-pointer" style={{ color: 'var(--cf-text-dim)', fontSize: '11px' }}>✕</button>}
              </div>
            )}
          </div>
        )
      })}

      {canWrite && (
        <div className="flex gap-2 flex-wrap items-center">
          {available.length > 0 && (
            <select
              value=""
              onChange={(e) => { if (e.target.value) addRef(Number(e.target.value)) }}
              className="glass-input cf-lcd text-xs cursor-pointer"
              style={{ width: 'auto' }}
            >
              <option value="" className="text-black">+ From library…</option>
              {available.map((s) => <option key={s.id} value={s.id} className="text-black">{s.title}</option>)}
            </select>
          )}
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') createAndAdd() }}
            placeholder="New step title"
            className="glass-input cf-lcd text-xs flex-1"
            style={{ minWidth: 120 }}
          />
          <button onClick={createAndAdd} disabled={busy || !newTitle.trim()} className="aero-btn aero-btn--ghost px-3 py-1.5 uppercase tracking-widest font-bold text-[10px] disabled:opacity-50">
            Create
          </button>
        </div>
      )}
    </div>
  )
}

// Link the case to test plans (suites). Stored on the case as test_plan_ids.
function TestPlanLinks({ linked, plans, canWrite, onChange }: { linked: number[]; plans: Plans; canWrite: boolean; onChange: (ids: number[]) => void }) {
  const { plansById, plans: list, create, busy } = plans
  const [newName, setNewName] = useState('')

  const add = (id: number) => { if (!linked.includes(id)) onChange([...linked, id]) }
  const remove = (id: number) => onChange(linked.filter((x) => x !== id))
  const createAndAdd = async () => {
    const n = newName.trim()
    if (!n) return
    const p = await create(n)
    setNewName('')
    onChange([...linked, p.id])
  }
  const available = list.filter((p) => !linked.includes(p.id))

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5 flex-wrap items-center">
        {linked.length === 0 && (
          <span className="cf-mono" style={{ fontSize: '11px', color: 'var(--cf-text-dim)' }}>Not in any plan.</span>
        )}
        {linked.map((id) => {
          const p = plansById[id]
          return (
            <span key={id} className="cf-mono inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm" style={{ background: CHIP_BG, color: 'var(--cf-cyan)', fontSize: '11px' }}>
              ◈ {p?.name ?? `Plan #${id}`}
              {canWrite && <button onClick={() => remove(id)} className="cursor-pointer" style={{ color: 'var(--cf-text-dim)', fontSize: '10px' }}>✕</button>}
            </span>
          )
        })}
      </div>
      {canWrite && (
        <div className="flex gap-2 flex-wrap items-center">
          {available.length > 0 && (
            <select value="" onChange={(e) => { if (e.target.value) add(Number(e.target.value)) }} className="glass-input cf-lcd text-xs cursor-pointer" style={{ width: 'auto' }}>
              <option value="" className="text-black">+ Link plan…</option>
              {available.map((p) => <option key={p.id} value={p.id} className="text-black">{p.name}</option>)}
            </select>
          )}
          <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') createAndAdd() }} placeholder="New plan — e.g. Regressão v2.0" className="glass-input cf-lcd text-xs flex-1" style={{ minWidth: 140 }} />
          <button onClick={createAndAdd} disabled={busy || !newName.trim()} className="aero-btn aero-btn--ghost px-3 py-1.5 uppercase tracking-widest font-bold text-[10px] disabled:opacity-50">Create</button>
        </div>
      )}
    </div>
  )
}

function RunLauncher({ boardId, busy, onRun }: { boardId: number; busy: boolean; onRun: (p: RunPayload) => void }) {
  const [status, setStatus] = useState<RunStatus | null>(null)
  const [environment, setEnvironment] = useState('')
  const [device, setDevice] = useState('')
  const [logs, setLogs] = useState('')
  const [evidence, setEvidence] = useState<{ url: string; kind?: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const { url } = await uploadInlineImage(boardId, file)
        if (url) setEvidence((prev) => [...prev, { url, kind: 'image' }])
      }
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const reset = () => {
    setStatus(null); setEnvironment(''); setDevice(''); setLogs(''); setEvidence([])
  }

  return (
    <div className="rounded-lg p-3 flex flex-col gap-2" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--cf-edge)' }}>
      <div className="flex gap-2">
        {RUN_STATUSES.map((st) => {
          const on = status === st
          return (
            <button
              key={st}
              onClick={() => setStatus(st)}
              className="cf-mono uppercase tracking-widest font-bold px-2.5 py-1 rounded-sm text-[10px] cursor-pointer flex items-center gap-1.5"
              style={{
                color: on ? '#0d1410' : STATUS_META[st].color,
                background: on ? STATUS_META[st].color : CHIP_BG,
                boxShadow: on ? `0 0 8px ${STATUS_META[st].color}55` : undefined,
              }}
            >
              {STATUS_META[st].label}
            </button>
          )
        })}
      </div>
      <div className="flex gap-2">
        <input value={environment} onChange={(e) => setEnvironment(e.target.value)} placeholder="Environment" className="glass-input cf-lcd text-xs flex-1" />
        <input value={device} onChange={(e) => setDevice(e.target.value)} placeholder="Device / platform" className="glass-input cf-lcd text-xs flex-1" />
      </div>
      <textarea value={logs} onChange={(e) => setLogs(e.target.value)} rows={2} placeholder="Logs (optional)" className="glass-input cf-mono text-xs resize-none" />

      {/* Evidence (prints) */}
      <div className="flex items-center gap-2 flex-wrap">
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="cf-mono uppercase tracking-widest font-bold px-2.5 py-1 rounded-sm text-[10px] cursor-pointer disabled:opacity-50"
          style={{ color: 'var(--cf-cyan)', background: CHIP_BG }}
        >
          {uploading ? 'Uploading…' : '▦ Add evidence'}
        </button>
        {evidence.map((ev, i) => (
          <span key={i} className="relative rounded-sm overflow-hidden flex-shrink-0" style={{ width: 40, height: 30, border: '1px solid var(--cf-edge)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ev.url} alt="evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button
              onClick={() => setEvidence((prev) => prev.filter((_, j) => j !== i))}
              className="absolute top-0 right-0 flex items-center justify-center cursor-pointer"
              style={{ width: 14, height: 14, background: 'rgba(0,0,0,0.7)', color: 'var(--cf-red)', fontSize: 10, lineHeight: 1 }}
              aria-label="Remove evidence"
            >
              ✕
            </button>
          </span>
        ))}
      </div>

      <button
        onClick={() => {
          if (!status) return
          onRun({
            status,
            environment: environment || undefined,
            device: device || undefined,
            logs: logs || undefined,
            evidence: evidence.length ? evidence : undefined,
          })
          reset()
        }}
        disabled={busy || !status}
        className="aero-btn aero-btn--cyan px-4 py-1.5 uppercase tracking-widest font-bold text-[10px] disabled:opacity-40 self-start"
      >
        ▶ Log run
      </button>
    </div>
  )
}
