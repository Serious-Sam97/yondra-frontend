"use client";

import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faBug,
  faBullseye,
  faCheck,
  faChevronDown,
  faClockRotateLeft,
  faCube,
  faCubes,
  faDice,
  faEllipsis,
  faFloppyDisk,
  faGripVertical,
  faLink,
  faListCheck,
  faPaperclip,
  faPause,
  faPlay,
  faPlus,
  faRocket,
  faScrewdriverWrench,
  faTrash,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Icon from "@/components/ui/Icon";
import { useCardAi } from "@/hooks/useCardAi";
import type { useSentinelCard } from "@/hooks/useSentinelCard";
import { useStepLibrary } from "@/hooks/useStepLibrary";
import { useTestPlans } from "@/hooks/useTestPlans";
import {
  type DataMatrix,
  deriveCaseStatus,
  type Evidence,
  type GherkinKeyword,
  type GherkinLine,
  headerState,
  type ReusableStep,
  type RunItem,
  type RunStatus,
  rollupStatus,
  STATUS_META,
  type StepRef,
  type TestCase,
  type TestType,
  VERDICT_META,
  type Verdict,
} from "@/interfaces/QAInterface";
import { uploadInlineImage } from "@/lib/api";

type Library = ReturnType<typeof useStepLibrary>;
type Plans = ReturnType<typeof useTestPlans>;

const CHIP_BG = "#1c1a16";
const TYPES: TestType[] = ["manual", "automated", "performance", "security"];
const KEYWORDS: GherkinKeyword[] = ["DADO", "QUANDO", "ENTÃO", "E"];
const VERDICTS: Verdict[] = [
  "approved",
  "rejected",
  "blocked",
  "awaiting_info",
];

// A timeline block resolved from a step_ref — global blocks read title/lines live from
// the library (so edits propagate); local blocks carry them inline.
type ResolvedBlock = {
  key: string;
  scope: "local" | "global";
  stepId: number | null;
  title: string;
  lines: GherkinLine[];
  evidence: Evidence[];
  missing: boolean;
};

function resolveBlock(
  ref: StepRef,
  idx: number,
  stepsById: Record<number, ReusableStep>,
): ResolvedBlock {
  if (ref.step_id != null) {
    const step = stepsById[ref.step_id];
    return {
      key: `g${ref.step_id}`,
      scope: "global",
      stepId: ref.step_id,
      title: step?.title ?? `Step #${ref.step_id}`,
      lines: step?.gherkin_lines ?? [],
      evidence: ref.evidence ?? [],
      missing: !step,
    };
  }
  return {
    key: ref.local_key ?? `l${idx}`,
    scope: "local",
    stepId: null,
    title: ref.title ?? "Local block",
    lines: ref.lines ?? [],
    evidence: ref.evidence ?? [],
    missing: false,
  };
}

function StatusLed({
  status,
  size = 8,
}: {
  status: keyof typeof STATUS_META;
  size?: number;
}) {
  const { color } = STATUS_META[status];
  return (
    <span
      className="cf-led flex-shrink-0"
      style={{
        background: color,
        boxShadow: `0 0 5px ${color}`,
        width: size,
        height: size,
      }}
    />
  );
}

// Section heading with a FontAwesome glyph.
function SectionHead({
  icon,
  children,
  color = "var(--cf-phosphor)",
}: {
  icon: IconDefinition;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <div
      className="cf-mono uppercase flex items-center gap-2"
      style={{ fontSize: "11px", letterSpacing: "0.16em", color }}
    >
      <Icon icon={icon} style={{ fontSize: "11px" }} />
      {children}
    </div>
  );
}

function MiniLabel({
  icon,
  children,
}: {
  icon?: IconDefinition;
  children: React.ReactNode;
}) {
  return (
    <span
      className="cf-mono uppercase flex items-center gap-1.5"
      style={{
        fontSize: "10px",
        letterSpacing: "0.14em",
        color: "var(--cf-text-dim)",
      }}
    >
      {icon && <Icon icon={icon} style={{ fontSize: "9px" }} />}
      {children}
    </span>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function localKey() {
  return `l_${Math.random().toString(36).slice(2, 9)}`;
}

export function SentinelPanel({
  session,
  boardId,
  cardId,
  canWrite,
}: {
  session: ReturnType<typeof useSentinelCard>;
  boardId: number;
  cardId?: number | string;
  canWrite: boolean;
}) {
  const s = session;
  const {
    cases,
    selectedCaseId,
    setSelectedCaseId,
    busy,
    createCase,
    saveCase,
    removeCase,
    launchRun,
  } = s;
  const selected = cases.find((c) => c.id === selectedCaseId) ?? null;
  const rollup = rollupStatus(cases);
  const library = useStepLibrary(boardId, true);
  const plansLib = useTestPlans(boardId, true);

  // AI test-case generation — streams a Gherkin draft from the card, then creates a new
  // case seeded with it (auto-selected). Uses the same AiDriver pipeline as the rest.
  const ai = useCardAi(boardId, cardId, canWrite && !!cardId);
  const wantSeed = useRef(false);
  useEffect(() => {
    if (!wantSeed.current || ai.streaming) return;
    wantSeed.current = false;
    const gherkin = ai.text.trim();
    if (ai.action === "tests" && gherkin && !gherkin.startsWith("# Not enough")) {
      (async () => {
        try {
          const c = await createCase("AI test case");
          if (c) await saveCase(c.id, { gherkin });
        } catch {
          /* the hook surfaces failures via its own busy/error handling */
        }
      })();
    }
  }, [ai.streaming, ai.action, ai.text, createCase, saveCase]);
  const generateTests = () => {
    wantSeed.current = true;
    ai.run("tests");
  };
  const renderAi = (sizeCls: string, label: string) =>
    canWrite && cardId ? (
      <button
        type="button"
        onClick={generateTests}
        disabled={ai.streaming || busy}
        className={`ai-btn ${sizeCls}`}
      >
        {ai.streaming ? "Generating…" : label}
      </button>
    ) : null;
  // Compact chip for the tab row; larger button for the empty state.
  const aiTabButton = renderAi("", "AI case");
  const aiBigButton = renderAi("ai-btn--lg", "Generate with AI");

  // ── Empty state ───────────────────────────────────────────────────────────
  if (cases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
        <p style={{ color: "var(--cf-text-muted)", fontSize: "13px" }}>
          No test cases on this card yet.
        </p>
        <p
          className="cf-mono"
          style={{ color: "var(--cf-text-dim)", fontSize: "11px" }}
        >
          Document a test, run it as a checklist — the card header reflects the
          verdict.
        </p>
        {canWrite && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => createCase("New test case")}
              disabled={busy}
              className="aero-btn aero-btn--cyan px-5 py-2 uppercase tracking-widest font-bold text-xs disabled:opacity-50 inline-flex items-center gap-2"
            >
              <Icon icon={faPlus} /> New test case
            </button>
            {aiBigButton}
          </div>
        )}
        {ai.error && (
          <p className="cf-mono" style={{ fontSize: "11px", color: "var(--cf-red)" }}>
            {ai.error}
          </p>
        )}
      </div>
    );
  }

  const breakdown = (["failed", "not_run", "blocked", "passed"] as const)
    .map((st) => ({
      st,
      n: cases.filter((c) => deriveCaseStatus(c) === st).length,
    }))
    .filter((x) => x.n > 0);

  return (
    <div className="flex flex-col">
      {/* Header — card-level rollup + selected-case verdict tag */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b flex-wrap gap-3"
        style={{ borderColor: "var(--cf-edge)" }}
      >
        <div className="flex items-center gap-2.5">
          {rollup && <StatusLed status={rollup} size={11} />}
          <div>
            <div style={{ fontSize: "12px", color: "var(--cf-text)" }}>
              CARD STATUS · {cases.length} case{cases.length !== 1 ? "s" : ""}
            </div>
            <div className="flex gap-2.5 mt-0.5">
              {breakdown.map(({ st, n }) => (
                <span
                  key={st}
                  className="cf-mono"
                  style={{ fontSize: "10px", color: STATUS_META[st].color }}
                >
                  ● {n} {STATUS_META[st].label.toLowerCase()}
                </span>
              ))}
            </div>
          </div>
        </div>
        {selected && <VerdictTag testCase={selected} />}
      </div>

      {/* Case tabs — same underline + sliding-indicator logic as the card modal */}
      <CaseTabs
        cases={cases}
        selectedCaseId={selectedCaseId}
        onSelect={setSelectedCaseId}
        canWrite={canWrite}
        busy={busy}
        onNew={() => createCase("New test case")}
        aiButton={aiTabButton}
      />
      {ai.error && (
        <p
          className="cf-mono px-5 pt-1"
          style={{ fontSize: "11px", color: "var(--cf-red)" }}
        >
          {ai.error}
        </p>
      )}

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
          onVerdict={(v) => s.setVerdict(selected.id, v)}
          onCiToken={() => s.generateCiToken(selected.id)}
        />
      )}
    </div>
  );
}

// Header tag — the human verdict wins; else the run-derived status.
function VerdictTag({ testCase }: { testCase: TestCase }) {
  const { color, label } = headerState(testCase);
  return (
    <span
      className="cf-mono inline-flex items-center gap-2 px-3 py-1.5 rounded-lg uppercase"
      style={{
        color,
        border: `1.5px solid ${color}`,
        background: CHIP_BG,
        fontSize: "12px",
        letterSpacing: "0.1em",
      }}
    >
      <span
        className="cf-led"
        style={{
          width: 9,
          height: 9,
          background: color,
          boxShadow: `0 0 6px ${color}`,
        }}
      />
      {label}
    </span>
  );
}

// Underline tabs with a springy sliding indicator (mirrors CardEdit's tab logic).
function CaseTabs({
  cases,
  selectedCaseId,
  onSelect,
  canWrite,
  busy,
  onNew,
  aiButton,
}: {
  cases: TestCase[];
  selectedCaseId: number | null;
  onSelect: (id: number) => void;
  canWrite: boolean;
  busy: boolean;
  onNew: () => void;
  aiButton?: ReactNode;
}) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [ind, setInd] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });
  const activeIdx = cases.findIndex((c) => c.id === selectedCaseId);

  useLayoutEffect(() => {
    const elm = tabRefs.current[activeIdx];
    if (elm) setInd({ left: elm.offsetLeft, width: elm.offsetWidth });
  }, [activeIdx, cases.length]);

  return (
    <div
      className="relative flex gap-4 px-5 pt-2.5 border-b overflow-x-auto items-center"
      style={{ borderColor: "var(--cf-edge)" }}
    >
      {cases.map((c, i) => {
        const st = deriveCaseStatus(c);
        const on = c.id === selectedCaseId;
        const led = STATUS_META[st].color;
        return (
          <button
            key={c.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            onClick={() => onSelect(c.id)}
            className="cf-mono uppercase tracking-widest font-bold pb-2.5 cursor-pointer transition-colors flex items-center gap-1.5 flex-shrink-0"
            style={{
              color: on ? "var(--cf-text)" : "var(--cf-text-muted)",
              fontSize: "10px",
            }}
          >
            <span
              className="cf-led"
              style={{
                width: 6,
                height: 6,
                background: led,
                boxShadow: on || st !== "not_run" ? `0 0 6px ${led}` : "none",
              }}
            />
            {c.title}
            <span
              className="cf-mono px-1.5 rounded-sm"
              style={{
                background: CHIP_BG,
                color: "var(--cf-phosphor)",
                fontSize: "10px",
              }}
            >
              {c.runs.length}
            </span>
          </button>
        );
      })}
      {canWrite && (
        <div className="ml-auto mb-1.5 flex items-center gap-2 flex-shrink-0">
          {aiButton}
          <button
            onClick={onNew}
            disabled={busy}
            className="aero-btn aero-btn--cyan px-3 py-1 uppercase tracking-widest font-bold text-[10px] disabled:opacity-50 flex-shrink-0 inline-flex items-center gap-1.5"
          >
            <Icon icon={faPlus} /> New case
          </button>
        </div>
      )}
      <div
        style={{
          position: "absolute",
          bottom: -1,
          left: ind.left,
          width: ind.width,
          height: 2,
          backgroundColor: "var(--cf-phosphor)",
          borderRadius: 1,
          boxShadow: "0 0 8px var(--cf-phosphor)",
          transition:
            "left 240ms cubic-bezier(0.34,1.56,0.64,1), width 240ms cubic-bezier(0.34,1.56,0.64,1)",
        }}
      />
    </div>
  );
}

// ── Selected case: builder (left) + execution (right) ─────────────────────────
type RunPayload = {
  status: RunStatus;
  environment?: string;
  device?: string;
  logs?: string;
  evidence?: Evidence[];
  items?: RunItem[];
};

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
  onVerdict,
  onCiToken,
}: {
  testCase: TestCase;
  boardId: number;
  library: Library;
  plans: Plans;
  canWrite: boolean;
  busy: boolean;
  onSave: (patch: Record<string, unknown>) => void;
  onDelete: () => void;
  onRun: (payload: RunPayload) => void;
  onLinkBug: () => void;
  onVerdict: (v: Verdict | null) => void;
  onCiToken: () => void;
}) {
  const [draft, setDraft] = useState(testCase);
  useEffect(() => setDraft(testCase), [testCase]);
  const set = (patch: Partial<TestCase>) =>
    setDraft((d) => ({ ...d, ...patch }));

  const resolvedBlocks = (draft.step_refs ?? []).map((ref, i) =>
    resolveBlock(ref, i, library.stepsById),
  );

  return (
    <div className="grid md:grid-cols-2">
      {/* ── LEFT: Test builder ───────────────────────────────────────────── */}
      <div
        className="flex flex-col gap-3 px-5 py-4 border-b md:border-b-0 md:border-r"
        style={{ borderColor: "var(--cf-edge)" }}
      >
        <SectionHead icon={faScrewdriverWrench}>
          Test builder
          <span style={{ color: "var(--cf-text-dim)", fontSize: "10px" }}>
            · v{testCase.version}
            {testCase.editor ? ` · ${testCase.editor.name}` : ""}
          </span>
        </SectionHead>

        <input
          value={draft.title}
          disabled={!canWrite}
          onChange={(e) => set({ title: e.target.value })}
          className="glass-input cf-lcd text-sm"
          placeholder="Test case title"
        />
        <div className="flex gap-2">
          <select
            value={draft.type}
            disabled={!canWrite}
            onChange={(e) => set({ type: e.target.value as TestType })}
            className="glass-input cf-lcd text-xs flex-1 cursor-pointer"
          >
            {TYPES.map((t) => (
              <option key={t} value={t} className="text-black">
                {t}
              </option>
            ))}
          </select>
          <input
            value={draft.target_env ?? ""}
            disabled={!canWrite}
            onChange={(e) => set({ target_env: e.target.value })}
            placeholder="Target env"
            className="glass-input cf-lcd text-xs flex-1"
          />
        </div>

        {/* BDD block builder */}
        {canWrite && (
          <BddBuilder
            library={library}
            onAddBlock={(ref) =>
              set({ step_refs: [...(draft.step_refs ?? []), ref] })
            }
          />
        )}

        {/* Timeline of blocks (drag & drop) */}
        <MiniLabel icon={faCubes}>Timeline · drag to reorder</MiniLabel>
        <Timeline
          blocks={resolvedBlocks}
          refs={draft.step_refs ?? []}
          library={library}
          boardId={boardId}
          canWrite={canWrite}
          onChange={(refs) => set({ step_refs: refs })}
        />

        {canWrite && (
          <AddFromLibrary
            library={library}
            refs={draft.step_refs ?? []}
            onChange={(refs) => set({ step_refs: refs })}
          />
        )}

        <MiniLabel icon={faDice}>Test data · data-driven</MiniLabel>
        <DataMatrixEditor
          value={draft.data_matrix ?? { columns: [], rows: [] }}
          canWrite={canWrite}
          onChange={(m) => set({ data_matrix: m })}
        />

        <MiniLabel>Plans / suites</MiniLabel>
        <TestPlanLinks
          linked={draft.test_plan_ids ?? []}
          plans={plans}
          canWrite={canWrite}
          onChange={(ids) => set({ test_plan_ids: ids })}
        />

        {canWrite && (
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() =>
                onSave({
                  title: draft.title,
                  type: draft.type,
                  target_env: draft.target_env,
                  gherkin: draft.gherkin,
                  preconditions: draft.preconditions,
                  postconditions: draft.postconditions,
                  step_refs: draft.step_refs ?? [],
                  data_matrix: draft.data_matrix ?? { columns: [], rows: [] },
                  test_plan_ids: draft.test_plan_ids ?? [],
                })
              }
              disabled={busy}
              className="aero-btn aero-btn--cyan px-4 py-1.5 uppercase tracking-widest font-bold text-[10px] disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Icon icon={faFloppyDisk} /> Save case
            </button>
            <button
              onClick={onDelete}
              disabled={busy}
              className="aero-btn aero-btn--ghost px-3 py-1.5 uppercase tracking-widest font-bold text-[10px] disabled:opacity-50 ml-auto"
            >
              Delete case
            </button>
          </div>
        )}
      </div>

      {/* ── RIGHT: Execution & verdict ───────────────────────────────────── */}
      <div className="flex flex-col gap-3 px-5 py-4">
        <SectionHead icon={faRocket}>Execution &amp; verdict</SectionHead>

        {/* Quality Gate */}
        <QualityGate
          current={testCase.verdict}
          canWrite={canWrite}
          busy={busy}
          onVerdict={onVerdict}
        />

        {/* Controls + webhook */}
        {canWrite && (
          <ExecutionControls
            testCase={testCase}
            blocks={resolvedBlocks}
            boardId={boardId}
            busy={busy}
            onRun={onRun}
            onCiToken={onCiToken}
          />
        )}

        {/* Run history */}
        <MiniLabel icon={faClockRotateLeft}>
          Test run history · click to expand
        </MiniLabel>
        <div className="flex flex-col gap-2">
          {testCase.runs.length === 0 && (
            <p
              className="cf-mono"
              style={{ fontSize: "11px", color: "var(--cf-text-dim)" }}
            >
              No runs yet — start the first one.
            </p>
          )}
          {testCase.runs.map((r) => (
            <RunRow key={r.id} run={r} />
          ))}
        </div>

        {/* Linked bug */}
        {testCase.bug_card_id ? (
          <div
            className="rounded-lg px-3 py-2 flex items-center justify-between"
            style={{
              background: "var(--cf-screen)",
              border: `1px solid ${testCase.awaiting_retest ? "var(--cf-cyan)" : "var(--cf-edge)"}`,
            }}
          >
            <span className="flex items-center gap-2">
              <StatusLed status="failed" />
              <span
                className="cf-mono"
                style={{ fontSize: "12px", color: "var(--cf-text)" }}
              >
                Bug linked
              </span>
            </span>
            {testCase.awaiting_retest && (
              <span
                className="cf-mono px-2 py-0.5 rounded-sm"
                style={{
                  background: CHIP_BG,
                  color: "var(--cf-cyan)",
                  fontSize: "10px",
                }}
              >
                Awaiting retest
              </span>
            )}
          </div>
        ) : canWrite && deriveCaseStatus(testCase) === "failed" ? (
          <button
            onClick={onLinkBug}
            disabled={busy}
            className="aero-btn aero-btn--magenta px-4 py-1.5 uppercase tracking-widest font-bold text-[10px] disabled:opacity-50 self-start inline-flex items-center gap-1.5"
          >
            <Icon icon={faBug} /> Create bug from failure
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ── BDD block builder: structured Gherkin lines + destination toggle ──────────
function BddBuilder({
  library,
  onAddBlock,
}: {
  library: Library;
  onAddBlock: (ref: StepRef) => void;
}) {
  const [title, setTitle] = useState("");
  const [lines, setLines] = useState<GherkinLine[]>([
    { keyword: "DADO", text: "" },
    { keyword: "QUANDO", text: "" },
    { keyword: "ENTÃO", text: "" },
  ]);
  const [scope, setScope] = useState<"local" | "global">("local");

  const setLine = (i: number, patch: Partial<GherkinLine>) =>
    setLines((ls) => ls.map((l, li) => (li === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((ls) => [...ls, { keyword: "E", text: "" }]);
  const removeLine = (i: number) =>
    setLines((ls) => ls.filter((_, li) => li !== i));

  const reset = () => {
    setTitle("");
    setLines([
      { keyword: "DADO", text: "" },
      { keyword: "QUANDO", text: "" },
      { keyword: "ENTÃO", text: "" },
    ]);
    setScope("local");
  };

  const save = async () => {
    const t = title.trim() || "Untitled block";
    const filled = lines.filter((l) => l.text.trim());
    if (scope === "global") {
      // Persist to the board library and reference it — edits will propagate.
      const step = await library.create(t, { gherkin_lines: filled });
      onAddBlock({ step_id: step.id, scope: "global" });
    } else {
      onAddBlock({
        local_key: localKey(),
        scope: "local",
        title: t,
        lines: filled,
      });
    }
    reset();
  };

  return (
    <div
      className="rounded-lg p-3 flex flex-col gap-2.5"
      style={{
        background: "rgba(0,0,0,0.2)",
        border: "1px solid var(--cf-edge)",
      }}
    >
      <MiniLabel icon={faPlus}>New block (BDD)</MiniLabel>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title — e.g. Validate coupon"
        className="glass-input cf-lcd text-sm"
      />
      <div className="flex flex-col gap-1.5">
        {lines.map((l, i) => (
          <div key={i} className="flex gap-2">
            <select
              value={l.keyword}
              onChange={(e) =>
                setLine(i, { keyword: e.target.value as GherkinKeyword })
              }
              className="glass-input cf-mono text-xs cursor-pointer"
              style={{ flex: "0 0 104px" }}
            >
              {KEYWORDS.map((k) => (
                <option key={k} value={k} className="text-black">
                  {k}
                </option>
              ))}
            </select>
            <input
              value={l.text}
              onChange={(e) => setLine(i, { text: e.target.value })}
              placeholder="describe the step…"
              className="glass-input cf-mono text-xs flex-1"
            />
            {lines.length > 1 && (
              <button
                onClick={() => removeLine(i)}
                aria-label="Remove line"
                className="cursor-pointer"
                style={{ color: "var(--cf-text-dim)", fontSize: "11px" }}
              >
                <Icon icon={faXmark} />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={addLine}
        className="aero-btn aero-btn--ghost px-3 py-1 uppercase tracking-widest font-bold text-[10px] self-start inline-flex items-center gap-1.5"
      >
        <Icon icon={faPlus} /> Add And / Or
      </button>

      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="cf-mono uppercase"
          style={{
            fontSize: "10px",
            letterSpacing: "0.12em",
            color: "var(--cf-text-dim)",
          }}
        >
          Destination
        </span>
        {(["local", "global"] as const).map((sc) => {
          const on = scope === sc;
          return (
            <button
              key={sc}
              onClick={() => setScope(sc)}
              className="cf-mono flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] cursor-pointer"
              style={{
                border: `1px solid ${on ? "var(--cf-cyan)" : "var(--cf-edge)"}`,
                color: on ? "var(--cf-cyan)" : "var(--cf-text-muted)",
                background: "var(--cf-screen)",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  border: "1.5px solid currentColor",
                  background: on ? "currentColor" : "transparent",
                  boxShadow: on ? "inset 0 0 0 2px var(--cf-screen)" : "none",
                }}
              />
              {sc === "local" ? "This test only" : "Global library"}
            </button>
          );
        })}
      </div>
      <button
        onClick={save}
        disabled={library.busy}
        className="aero-btn aero-btn--cyan px-4 py-1.5 uppercase tracking-widest font-bold text-[10px] disabled:opacity-50 self-start inline-flex items-center gap-1.5"
      >
        <Icon icon={faFloppyDisk} /> Save block to timeline
      </button>
    </div>
  );
}

// ── Timeline: accordion blocks with native drag & drop reorder ────────────────
function Timeline({
  blocks,
  refs,
  library,
  boardId,
  canWrite,
  onChange,
}: {
  blocks: ResolvedBlock[];
  refs: StepRef[];
  library: Library;
  boardId: number;
  canWrite: boolean;
  onChange: (refs: StepRef[]) => void;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const dragFrom = useRef<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  if (blocks.length === 0) {
    return (
      <p
        className="cf-mono"
        style={{ fontSize: "11px", color: "var(--cf-text-dim)" }}
      >
        No blocks — create one above or search the library.
      </p>
    );
  }

  const move = (from: number, to: number) => {
    if (from === to) return;
    const next = [...refs];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    onChange(next);
  };

  const patchRef = (idx: number, patch: Partial<StepRef>) =>
    onChange(refs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const removeRef = (idx: number) => onChange(refs.filter((_, i) => i !== idx));

  return (
    <div className="flex flex-col gap-2">
      {blocks.map((b, idx) => {
        const isOpen = open[b.key] ?? false;
        return (
          <div
            key={b.key}
            draggable={canWrite}
            onDragStart={() => {
              dragFrom.current = idx;
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(idx);
            }}
            onDragLeave={() => setOver((o) => (o === idx ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              if (dragFrom.current != null) move(dragFrom.current, idx);
              dragFrom.current = null;
              setOver(null);
            }}
            className="rounded-lg overflow-hidden"
            style={{
              background: "var(--cf-screen)",
              border: `1px solid ${over === idx ? "var(--cf-cyan)" : "var(--cf-edge)"}`,
              boxShadow: over === idx ? "0 0 0 1px var(--cf-cyan)" : undefined,
            }}
          >
            <div
              className="flex items-center gap-2.5 px-3 py-2 cursor-pointer"
              onClick={() => setOpen((o) => ({ ...o, [b.key]: !isOpen }))}
            >
              {canWrite && (
                <span
                  className="cursor-grab select-none"
                  style={{ color: "var(--cf-text-dim)", fontSize: "11px" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Icon icon={faGripVertical} />
                </span>
              )}
              <Icon
                icon={b.scope === "global" ? faCube : faBullseye}
                style={{
                  fontSize: "11px",
                  color:
                    b.scope === "global"
                      ? "var(--cf-cyan)"
                      : "var(--cf-phosphor)",
                }}
              />
              <span
                className="cf-mono truncate flex-1"
                style={{
                  fontSize: "12.5px",
                  color: b.missing ? "var(--cf-red)" : "var(--cf-text)",
                }}
              >
                {b.title}
              </span>
              <span
                className="cf-mono px-1.5 rounded-sm"
                style={{
                  background: CHIP_BG,
                  color:
                    b.scope === "global"
                      ? "var(--cf-cyan)"
                      : "var(--cf-phosphor)",
                  fontSize: "9px",
                }}
              >
                {b.scope === "global" ? "LIB" : "LOCAL"}
              </span>
              {b.evidence.length > 0 && (
                <span
                  className="cf-mono flex items-center gap-1"
                  style={{ color: "var(--cf-cyan)", fontSize: "10px" }}
                >
                  <Icon icon={faPaperclip} style={{ fontSize: "9px" }} />
                  {b.evidence.length}
                </span>
              )}
              <Icon
                icon={faChevronDown}
                style={{
                  color: "var(--cf-text-dim)",
                  fontSize: "10px",
                  transform: isOpen ? "rotate(180deg)" : "none",
                  transition: "transform .15s",
                }}
              />
            </div>

            {isOpen && (
              <div
                className="flex flex-col gap-2 px-3 pb-3"
                style={{ paddingLeft: canWrite ? 34 : 12 }}
              >
                <BlockLines
                  block={b}
                  refIdx={idx}
                  library={library}
                  canWrite={canWrite}
                  onPatchLocal={(lines) => patchRef(idx, { lines })}
                />
                <BlockEvidence
                  boardId={boardId}
                  evidence={b.evidence}
                  canWrite={canWrite}
                  onChange={(evidence) => patchRef(idx, { evidence })}
                />
                {canWrite && (
                  <button
                    onClick={() => removeRef(idx)}
                    className="aero-btn aero-btn--ghost px-2.5 py-1 uppercase tracking-widest font-bold text-[9px] self-start inline-flex items-center gap-1.5"
                  >
                    <Icon icon={faTrash} style={{ fontSize: "8px" }} /> Remove
                    block
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Gherkin lines of a block. Global blocks edit the library step (propagates); local
// blocks edit the case draft.
function BlockLines({
  block,
  library,
  canWrite,
  onPatchLocal,
}: {
  block: ResolvedBlock;
  refIdx: number;
  library: Library;
  canWrite: boolean;
  onPatchLocal: (lines: GherkinLine[]) => void;
}) {
  if (block.missing) {
    return (
      <span
        className="cf-mono"
        style={{ fontSize: "11px", color: "var(--cf-red)" }}
      >
        Global block removed from the library.
      </span>
    );
  }

  const lines = block.lines;
  const setLine = (i: number, text: string) => {
    const next = lines.map((l, li) => (li === i ? { ...l, text } : l));
    if (block.scope === "global" && block.stepId != null)
      library.update(block.stepId, { gherkin_lines: next });
    else onPatchLocal(next);
  };

  if (lines.length === 0) {
    return (
      <span
        className="cf-mono"
        style={{ fontSize: "11px", color: "var(--cf-text-dim)" }}
      >
        Block has no Gherkin lines.
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {lines.map((l, i) => (
        <div key={i} className="flex gap-2 items-start">
          <span
            className="cf-mono uppercase"
            style={{
              color: "var(--cf-amber)",
              fontSize: "10px",
              minWidth: 58,
              paddingTop: 3,
            }}
          >
            {l.keyword}
          </span>
          {canWrite ? (
            <input
              defaultValue={l.text}
              onBlur={(e) => {
                if (e.target.value !== l.text) setLine(i, e.target.value);
              }}
              className="cf-mono flex-1 bg-transparent focus:outline-none border-b"
              style={{
                fontSize: "11.5px",
                color: "var(--cf-cream)",
                borderColor: "transparent",
              }}
            />
          ) : (
            <span
              className="cf-mono flex-1"
              style={{ fontSize: "11.5px", color: "var(--cf-cream)" }}
            >
              {l.text}
            </span>
          )}
        </div>
      ))}
      {block.scope === "global" && (
        <span
          className="cf-mono"
          style={{ fontSize: "9px", color: "var(--cf-text-dim)" }}
        >
          edits propagate to every case using this block
        </span>
      )}
    </div>
  );
}

// Documental evidence attached to a block (persisted in the case's step_ref).
function BlockEvidence({
  boardId,
  evidence,
  canWrite,
  onChange,
}: {
  boardId: number;
  evidence: Evidence[];
  canWrite: boolean;
  onChange: (e: Evidence[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handle = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const next = [...evidence];
      for (const file of Array.from(files)) {
        const { url } = await uploadInlineImage(boardId, file);
        if (url) next.push({ url, kind: "image" });
      }
      onChange(next);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {evidence.map((ev, i) => (
        <a
          key={i}
          href={ev.url}
          target="_blank"
          rel="noreferrer"
          className="block rounded-sm overflow-hidden flex-shrink-0"
          style={{ width: 40, height: 30, border: "1px solid var(--cf-edge)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ev.url}
            alt="evidence"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </a>
      ))}
      {canWrite && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => handle(e.target.files)}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="cf-mono uppercase tracking-widest font-bold px-2.5 py-1 rounded-sm text-[9px] cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
            style={{ color: "var(--cf-cyan)", background: CHIP_BG }}
          >
            <Icon icon={faPaperclip} style={{ fontSize: "9px" }} />{" "}
            {uploading ? "Uploading…" : "Attach evidence"}
          </button>
        </>
      )}
    </div>
  );
}

function AddFromLibrary({
  library,
  refs,
  onChange,
}: {
  library: Library;
  refs: StepRef[];
  onChange: (refs: StepRef[]) => void;
}) {
  const used = new Set(
    refs.filter((r) => r.step_id != null).map((r) => r.step_id),
  );
  const available = library.steps.filter((s) => !used.has(s.id));
  if (available.length === 0) return null;
  return (
    <select
      value=""
      onChange={(e) => {
        if (e.target.value)
          onChange([
            ...refs,
            { step_id: Number(e.target.value), scope: "global" },
          ]);
      }}
      className="glass-input cf-lcd text-xs cursor-pointer self-start"
      style={{ width: "auto" }}
    >
      <option value="" className="text-black">
        Search global library…
      </option>
      {available.map((s) => (
        <option key={s.id} value={s.id} className="text-black">
          {s.title}
        </option>
      ))}
    </select>
  );
}

// ── Quality Gate: human verdict buttons ───────────────────────────────────────
function QualityGate({
  current,
  canWrite,
  busy,
  onVerdict,
}: {
  current: Verdict | null;
  canWrite: boolean;
  busy: boolean;
  onVerdict: (v: Verdict | null) => void;
}) {
  return (
    <div
      className="rounded-lg p-3 flex flex-col gap-2"
      style={{
        background: "rgba(0,0,0,0.2)",
        border: "1px solid var(--cf-edge)",
      }}
    >
      <MiniLabel>Final verdict · quality gate</MiniLabel>
      <div className="grid grid-cols-2 gap-2">
        {VERDICTS.map((v) => {
          const meta = VERDICT_META[v];
          const on = current === v;
          return (
            <button
              key={v}
              onClick={() => canWrite && onVerdict(on ? null : v)}
              disabled={!canWrite || busy}
              className="cf-mono uppercase flex items-center justify-center gap-2 py-2.5 rounded-md text-[11px] cursor-pointer disabled:cursor-default"
              style={{
                letterSpacing: "0.08em",
                border: `1.5px solid ${meta.color}`,
                background: on ? meta.color : CHIP_BG,
                color: on ? "#141810" : "var(--cf-text-muted)",
                fontWeight: on ? 700 : 400,
                boxShadow: on ? `0 0 8px ${meta.color}66` : undefined,
              }}
            >
              <Icon icon={meta.icon} /> {meta.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Execution controls: start interactive run + webhook CI ────────────────────
function ExecutionControls({
  testCase,
  blocks,
  boardId,
  busy,
  onRun,
  onCiToken,
}: {
  testCase: TestCase;
  blocks: ResolvedBlock[];
  boardId: number;
  busy: boolean;
  onRun: (payload: RunPayload) => void;
  onCiToken: () => void;
}) {
  const [live, setLive] = useState(false);
  const [showHook, setShowHook] = useState(false);

  return (
    <div
      className="rounded-lg p-3 flex flex-col gap-2"
      style={{
        background: "rgba(0,0,0,0.2)",
        border: "1px solid var(--cf-edge)",
      }}
    >
      <MiniLabel>Execution controls</MiniLabel>

      {live ? (
        <LiveRun
          blocks={blocks}
          boardId={boardId}
          busy={busy}
          onCancel={() => setLive(false)}
          onFinalize={(payload) => {
            onRun(payload);
            setLive(false);
          }}
        />
      ) : (
        <>
          <button
            onClick={() => setLive(true)}
            disabled={busy || blocks.length === 0}
            className="aero-btn aero-btn--cyan px-4 py-2 uppercase tracking-widest font-bold text-[10px] disabled:opacity-50 w-full justify-center inline-flex items-center gap-2"
          >
            <Icon icon={faPlay} /> Start new execution
          </button>
          {blocks.length === 0 && (
            <span
              className="cf-mono"
              style={{ fontSize: "10px", color: "var(--cf-text-dim)" }}
            >
              Add blocks to the timeline to run.
            </span>
          )}
          <button
            onClick={() => setShowHook((v) => !v)}
            className="aero-btn aero-btn--ghost px-4 py-1.5 uppercase tracking-widest font-bold text-[10px] w-full justify-center inline-flex items-center gap-2"
          >
            <Icon icon={faLink} /> Webhook CI
          </button>
          {showHook && (
            <WebhookPanel
              testCase={testCase}
              busy={busy}
              onCiToken={onCiToken}
            />
          )}
        </>
      )}
    </div>
  );
}

function WebhookPanel({
  testCase,
  busy,
  onCiToken,
}: {
  testCase: TestCase;
  busy: boolean;
  onCiToken: () => void;
}) {
  const base = (process.env.NEXT_PUBLIC_API ?? "").replace(/\/$/, "");
  const url = testCase.ci_token
    ? `${base}/api/webhooks/qa-ci/${testCase.ci_token}`
    : null;
  const [copied, setCopied] = useState(false);

  return (
    <div
      className="rounded-md p-2.5 flex flex-col gap-2"
      style={{
        background: "var(--cf-screen)",
        border: "1px solid var(--cf-cyan)",
      }}
    >
      <span
        className="cf-mono uppercase"
        style={{
          fontSize: "9px",
          letterSpacing: "0.12em",
          color: "var(--cf-cyan)",
        }}
      >
        POST · triggers an automatic run (source: ci)
      </span>
      {url ? (
        <>
          <code
            className="cf-mono"
            style={{
              fontSize: "10px",
              color: "var(--cf-cyan)",
              wordBreak: "break-all",
              background: CHIP_BG,
              padding: "5px 7px",
              borderRadius: 4,
            }}
          >
            {url}
          </code>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (url) {
                  navigator.clipboard?.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }
              }}
              className="aero-btn aero-btn--ghost px-2.5 py-1 uppercase tracking-widest font-bold text-[9px] inline-flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <Icon icon={faCheck} style={{ fontSize: "8px" }} /> Copied
                </>
              ) : (
                "Copy"
              )}
            </button>
            <button
              onClick={onCiToken}
              disabled={busy}
              className="aero-btn aero-btn--ghost px-2.5 py-1 uppercase tracking-widest font-bold text-[9px] disabled:opacity-50"
            >
              Regenerate token
            </button>
          </div>
        </>
      ) : (
        <button
          onClick={onCiToken}
          disabled={busy}
          className="aero-btn aero-btn--cyan px-3 py-1.5 uppercase tracking-widest font-bold text-[10px] disabled:opacity-50 self-start"
        >
          Generate CI token
        </button>
      )}
    </div>
  );
}

// ── Interactive run: per-block checklist, pause (client), finalize (persist) ──
type LiveItem = RunItem & { bugText: string };

function LiveRun({
  blocks,
  boardId,
  busy,
  onCancel,
  onFinalize,
}: {
  blocks: ResolvedBlock[];
  boardId: number;
  busy: boolean;
  onCancel: () => void;
  onFinalize: (payload: RunPayload) => void;
}) {
  const [items, setItems] = useState<LiveItem[]>(
    blocks.map((b) => ({
      block_key: b.key,
      block_title: b.title,
      ok: null,
      evidence: [],
      bug_card_id: null,
      bugText: "",
    })),
  );
  const [paused, setPaused] = useState(false);

  const setItem = (i: number, patch: Partial<LiveItem>) =>
    setItems((its) =>
      its.map((it, ii) => (ii === i ? { ...it, ...patch } : it)),
    );

  const finalize = () => {
    const anyFail = items.some((it) => it.ok === false);
    const anyPass = items.some((it) => it.ok === true);
    const status: RunStatus = anyFail
      ? "failed"
      : anyPass
        ? "passed"
        : "blocked";
    const payloadItems: RunItem[] = items.map((it) => ({
      block_key: it.block_key,
      block_title: it.block_title,
      ok: it.ok,
      evidence: it.evidence,
      bug_card_id: it.bugText.trim()
        ? Number(it.bugText.trim().replace(/\D/g, "")) || null
        : null,
    }));
    onFinalize({ status, items: payloadItems });
  };

  return (
    <div
      className="rounded-md p-2.5 flex flex-col gap-2"
      style={{
        background: "var(--cf-screen)",
        border: "1px solid var(--cf-cyan)",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="cf-led"
          style={{
            width: 8,
            height: 8,
            background: "var(--cf-cyan)",
            boxShadow: "0 0 6px var(--cf-cyan)",
          }}
        />
        <span
          className="cf-mono uppercase"
          style={{
            fontSize: "10px",
            letterSpacing: "0.1em",
            color: "var(--cf-cyan)",
          }}
        >
          {paused ? "Execution paused" : "Execution in progress"}
        </span>
      </div>

      {items.map((it, i) => (
        <div
          key={it.block_key}
          className="flex flex-col gap-1.5 rounded-md px-2.5 py-2"
          style={{ background: "rgba(0,0,0,0.25)" }}
        >
          <div className="flex items-center gap-2">
            <span
              className="cf-mono flex-1 truncate"
              style={{ fontSize: "11.5px", color: "var(--cf-text)" }}
            >
              {it.block_title}
            </span>
            <button
              onClick={() => setItem(i, { ok: it.ok === true ? null : true })}
              aria-label="Pass"
              className="rounded-sm px-2 py-0.5 cursor-pointer text-[11px]"
              style={{
                background: it.ok === true ? "var(--cf-phosphor)" : CHIP_BG,
                color: it.ok === true ? "#141810" : "var(--cf-phosphor)",
              }}
            >
              <Icon icon={faCheck} />
            </button>
            <button
              onClick={() => setItem(i, { ok: it.ok === false ? null : false })}
              aria-label="Fail"
              className="rounded-sm px-2 py-0.5 cursor-pointer text-[11px]"
              style={{
                background: it.ok === false ? "var(--cf-red)" : CHIP_BG,
                color: it.ok === false ? "#141810" : "var(--cf-red)",
              }}
            >
              <Icon icon={faXmark} />
            </button>
          </div>
          {it.ok === false && (
            <div
              className="flex flex-col gap-1.5 pl-1"
              style={{ borderLeft: "2px solid var(--cf-red)" }}
            >
              <BlockEvidence
                boardId={boardId}
                evidence={it.evidence ?? []}
                canWrite
                onChange={(evidence) => setItem(i, { evidence })}
              />
              <input
                value={it.bugText}
                onChange={(e) => setItem(i, { bugText: e.target.value })}
                placeholder="Linked bug (card ID) — required"
                className="glass-input cf-mono text-xs"
                style={{
                  borderColor: it.bugText.trim()
                    ? "var(--cf-edge)"
                    : "var(--cf-red)",
                }}
              />
            </div>
          )}
        </div>
      ))}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => setPaused((p) => !p)}
          className="aero-btn aero-btn--ghost px-3 py-1.5 uppercase tracking-widest font-bold text-[10px] inline-flex items-center gap-1.5"
        >
          <Icon icon={paused ? faPlay : faPause} />{" "}
          {paused ? "Resume" : "Pause test"}
        </button>
        <button
          onClick={finalize}
          disabled={busy}
          className="aero-btn aero-btn--cyan px-3 py-1.5 uppercase tracking-widest font-bold text-[10px] disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          <Icon icon={faFloppyDisk} /> Finalize execution
        </button>
        <button
          onClick={onCancel}
          className="cf-mono uppercase cursor-pointer ml-auto"
          style={{ fontSize: "10px", color: "var(--cf-text-dim)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Run history row: checklist mirror (new) or single-status card (legacy) ────
function RunRow({ run }: { run: TestCase["runs"][number] }) {
  const [open, setOpen] = useState(false);
  const hasChecklist = (run.items ?? []).length > 0;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: "var(--cf-screen)",
        border: `1px solid ${STATUS_META[run.status].color}55`,
      }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <StatusLed status={run.status} />
        <span
          className="cf-mono"
          style={{ fontSize: "12px", color: STATUS_META[run.status].color }}
        >
          {STATUS_META[run.status].label}
        </span>
        {run.source === "ci" && (
          <span
            className="cf-mono px-1.5 rounded-sm"
            style={{
              background: CHIP_BG,
              color: "var(--cf-cyan)",
              fontSize: "9px",
            }}
          >
            CI
          </span>
        )}
        {run.executor && (
          <span
            title={run.executor.name}
            className="rounded-full flex items-center justify-center text-white font-bold"
            style={{
              width: 20,
              height: 20,
              fontSize: 9,
              background: "#1976D2",
              border: "1.5px solid rgba(255,255,255,0.8)",
            }}
          >
            {initials(run.executor.name)}
          </span>
        )}
        <span
          className="cf-mono ml-auto text-right"
          style={{ fontSize: "10px", color: "var(--cf-text-dim)" }}
        >
          {[
            run.environment,
            run.executed_at ? new Date(run.executed_at).toLocaleString() : null,
          ]
            .filter(Boolean)
            .join(" · ") || "—"}
        </span>
        <Icon
          icon={faChevronDown}
          style={{
            color: "var(--cf-text-dim)",
            fontSize: "10px",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform .15s",
          }}
        />
      </div>

      {open && (
        <div className="flex flex-col gap-2 px-3 pb-3">
          {hasChecklist ? (
            <>
              <MiniLabel icon={faListCheck}>Execution checklist</MiniLabel>
              {(run.items ?? []).map((it, i) => {
                const mark =
                  it.ok === true
                    ? faCheck
                    : it.ok === false
                      ? faXmark
                      : faEllipsis;
                const mc =
                  it.ok === true
                    ? "var(--cf-phosphor)"
                    : it.ok === false
                      ? "var(--cf-red)"
                      : "var(--cf-text-dim)";
                return (
                  <div
                    key={i}
                    className="flex flex-col gap-1.5 rounded-md px-2.5 py-2"
                    style={{ background: "rgba(0,0,0,0.25)" }}
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        icon={mark}
                        style={{ color: mc, fontSize: "11px" }}
                      />
                      <span
                        className="cf-mono flex-1"
                        style={{ fontSize: "11.5px", color: "var(--cf-text)" }}
                      >
                        {it.block_title}
                      </span>
                    </div>
                    {it.ok === false && (
                      <div
                        className="flex items-center gap-2 flex-wrap pl-1"
                        style={{ borderLeft: "2px solid var(--cf-red)" }}
                      >
                        {(it.evidence ?? []).map((ev, ei) => (
                          <a
                            key={ei}
                            href={ev.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded-sm overflow-hidden"
                            style={{
                              width: 40,
                              height: 30,
                              border: "1px solid var(--cf-edge)",
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={ev.url}
                              alt="evidence"
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          </a>
                        ))}
                        {it.bug_card_id ? (
                          <span
                            className="cf-mono px-2 py-0.5 rounded-sm inline-flex items-center gap-1.5"
                            style={{
                              background: CHIP_BG,
                              color: "var(--cf-red)",
                              fontSize: "10px",
                              border: "1px solid rgba(255,90,77,0.3)",
                            }}
                          >
                            <Icon icon={faBug} style={{ fontSize: "9px" }} /> #
                            {it.bug_card_id}
                          </span>
                        ) : (
                          <span
                            className="cf-mono"
                            style={{
                              fontSize: "10px",
                              color: "var(--cf-text-dim)",
                            }}
                          >
                            no linked bug
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          ) : (
            <>
              {[run.environment, run.device].filter(Boolean).length > 0 && (
                <span
                  className="cf-mono"
                  style={{ fontSize: "10px", color: "var(--cf-text-dim)" }}
                >
                  {[run.environment, run.device].filter(Boolean).join(" · ")}
                </span>
              )}
              {run.logs && (
                <div
                  className="cf-mono px-2 py-1 rounded-sm"
                  style={{
                    background: CHIP_BG,
                    fontSize: "10px",
                    color: "var(--cf-red)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {run.logs}
                </div>
              )}
              {run.evidence.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {run.evidence.map((ev, i) => (
                    <a
                      key={i}
                      href={ev.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-sm overflow-hidden"
                      style={{
                        width: 44,
                        height: 32,
                        border: "1px solid var(--cf-edge)",
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={ev.url}
                        alt="evidence"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    </a>
                  ))}
                </div>
              )}
              {!run.logs && run.evidence.length === 0 && (
                <span
                  className="cf-mono"
                  style={{ fontSize: "10px", color: "var(--cf-text-dim)" }}
                >
                  Run without checklist (single status).
                </span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Data-driven matrix editor: variable columns × value rows. Lives in the case draft.
function DataMatrixEditor({
  value,
  canWrite,
  onChange,
}: {
  value: DataMatrix;
  canWrite: boolean;
  onChange: (m: DataMatrix) => void;
}) {
  const columns = value.columns ?? [];
  const rows = value.rows ?? [];

  const addCol = () =>
    onChange({
      columns: [...columns, `var${columns.length + 1}`],
      rows: rows.map((r) => [...r, ""]),
    });
  const setCol = (i: number, name: string) =>
    onChange({
      ...value,
      columns: columns.map((c, ci) => (ci === i ? name : c)),
    });
  const removeCol = (i: number) =>
    onChange({
      columns: columns.filter((_, ci) => ci !== i),
      rows: rows.map((r) => r.filter((_, ci) => ci !== i)),
    });
  const addRow = () =>
    onChange({ columns, rows: [...rows, columns.map(() => "")] });
  const removeRow = (ri: number) =>
    onChange({ columns, rows: rows.filter((_, r) => r !== ri) });
  const setCell = (ri: number, ci: number, v: string) =>
    onChange({
      columns,
      rows: rows.map((r, i) =>
        i === ri ? r.map((c, j) => (j === ci ? v : c)) : r,
      ),
    });

  const cellInput = "bg-transparent focus:outline-none w-full cf-mono";
  const th = {
    border: "1px solid #33463a",
    padding: "2px 4px",
    background: "#101812",
  } as const;
  const td = { border: "1px solid #33463a", padding: "0 4px" } as const;

  if (columns.length === 0) {
    return canWrite ? (
      <button
        onClick={addCol}
        className="aero-btn aero-btn--ghost px-3 py-1.5 uppercase tracking-widest font-bold text-[10px] self-start inline-flex items-center gap-1.5"
      >
        <Icon icon={faPlus} /> Add variable
      </button>
    ) : (
      <p
        className="cf-mono"
        style={{ fontSize: "11px", color: "var(--cf-text-dim)" }}
      >
        No test data.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto">
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              {columns.map((c, ci) => (
                <th key={ci} style={th}>
                  <span className="flex items-center gap-1">
                    <input
                      value={c}
                      disabled={!canWrite}
                      onChange={(e) => setCol(ci, e.target.value)}
                      className={cellInput}
                      style={{ color: "var(--cf-cyan)", fontSize: "11px" }}
                    />
                    {canWrite && (
                      <button
                        onClick={() => removeCol(ci)}
                        className="cursor-pointer"
                        style={{
                          color: "var(--cf-text-dim)",
                          fontSize: "10px",
                        }}
                      >
                        <Icon icon={faXmark} />
                      </button>
                    )}
                  </span>
                </th>
              ))}
              {canWrite && (
                <th style={th}>
                  <button
                    onClick={addCol}
                    className="cursor-pointer"
                    style={{ color: "var(--cf-phosphor)", fontSize: "11px" }}
                  >
                    <Icon icon={faPlus} />
                  </button>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>
                {columns.map((_, ci) => (
                  <td key={ci} style={td}>
                    <input
                      value={r[ci] ?? ""}
                      disabled={!canWrite}
                      onChange={(e) => setCell(ri, ci, e.target.value)}
                      className={cellInput}
                      style={{
                        color: "var(--cf-cream)",
                        fontSize: "11px",
                        padding: "3px 0",
                      }}
                    />
                  </td>
                ))}
                {canWrite && (
                  <td style={td}>
                    <button
                      onClick={() => removeRow(ri)}
                      className="cursor-pointer"
                      style={{ color: "var(--cf-text-dim)", fontSize: "10px" }}
                    >
                      <Icon icon={faXmark} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canWrite && (
        <button
          onClick={addRow}
          className="aero-btn aero-btn--ghost px-3 py-1 uppercase tracking-widest font-bold text-[10px] self-start inline-flex items-center gap-1.5"
        >
          <Icon icon={faPlus} /> Row
        </button>
      )}
    </div>
  );
}

// Link the case to test plans (suites). Stored on the case as test_plan_ids.
function TestPlanLinks({
  linked,
  plans,
  canWrite,
  onChange,
}: {
  linked: number[];
  plans: Plans;
  canWrite: boolean;
  onChange: (ids: number[]) => void;
}) {
  const { plansById, plans: list, create, busy } = plans;
  const [newName, setNewName] = useState("");

  const add = (id: number) => {
    if (!linked.includes(id)) onChange([...linked, id]);
  };
  const remove = (id: number) => onChange(linked.filter((x) => x !== id));
  const createAndAdd = async () => {
    const n = newName.trim();
    if (!n) return;
    const p = await create(n);
    setNewName("");
    onChange([...linked, p.id]);
  };
  const available = list.filter((p) => !linked.includes(p.id));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5 flex-wrap items-center">
        {linked.length === 0 && (
          <span
            className="cf-mono"
            style={{ fontSize: "11px", color: "var(--cf-text-dim)" }}
          >
            Not in any plan.
          </span>
        )}
        {linked.map((id) => {
          const p = plansById[id];
          return (
            <span
              key={id}
              className="cf-mono inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm"
              style={{
                background: CHIP_BG,
                color: "var(--cf-cyan)",
                fontSize: "11px",
              }}
            >
              ◈ {p?.name ?? `Plan #${id}`}
              {canWrite && (
                <button
                  onClick={() => remove(id)}
                  className="cursor-pointer"
                  style={{ color: "var(--cf-text-dim)", fontSize: "10px" }}
                >
                  <Icon icon={faXmark} />
                </button>
              )}
            </span>
          );
        })}
      </div>
      {canWrite && (
        <div className="flex gap-2 flex-wrap items-center">
          {available.length > 0 && (
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) add(Number(e.target.value));
              }}
              className="glass-input cf-lcd text-xs cursor-pointer"
              style={{ width: "auto" }}
            >
              <option value="" className="text-black">
                Link plan…
              </option>
              {available.map((p) => (
                <option key={p.id} value={p.id} className="text-black">
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createAndAdd();
            }}
            placeholder="New plan — e.g. Regression v2.0"
            className="glass-input cf-lcd text-xs flex-1"
            style={{ minWidth: 140 }}
          />
          <button
            onClick={createAndAdd}
            disabled={busy || !newName.trim()}
            className="aero-btn aero-btn--ghost px-3 py-1.5 uppercase tracking-widest font-bold text-[10px] disabled:opacity-50"
          >
            Create
          </button>
        </div>
      )}
    </div>
  );
}
