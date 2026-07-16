"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import "./dashboard.css";
import BurndownLCD from "@/components/dashboard/BurndownLCD";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import OmniSearch from "@/components/dashboard/OmniSearch";
import ThroughputLCD from "@/components/dashboard/ThroughputLCD";
import Modal from "@/components/shared/Modal";
import type {
  DashboardPayload,
  DashCard,
  DashCrm,
  DashProjectMeta,
} from "@/interfaces/DashboardInterface";
import type {
  ProjectBoard,
  ProjectFormData,
  ProjectInterface,
  UserSummary,
} from "@/interfaces/ProjectInterface";
import { createProject, fetchDashboard } from "@/lib/api";
import { fetchUser } from "@/lib/auth";
import { getEcho } from "@/lib/echo";
import { PROJECT_COLORS } from "@/lib/ui";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

// ── helpers ────────────────────────────────────────────────────────────────

const priColor = (p: DashCard["priority"]) =>
  p === "urgent" || p === "high"
    ? "var(--yd-red)"
    : p === "medium"
      ? "var(--yd-amber)"
      : "var(--yd-green)";

function daysLate(due: string | null): string {
  if (!due) return "late";
  const diff = Math.floor(
    (Date.now() - new Date(`${due}T00:00:00`).getTime()) / 86400000,
  );
  return diff > 0 ? `${diff}d late` : "due";
}

// "Jul 14" — concrete date chips instead of vague "soon".
function fmtDay(d: string | Date): string {
  const dt = typeof d === "string" ? new Date(`${d}T00:00:00`) : d;
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// "2h ago" / "3d ago" — live-signal stamp on project cards.
function rel(ts: string): string {
  const s = (Date.now() - new Date(ts).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function money(n: number, currency?: string): string {
  if (!currency) return String(Math.round(n));
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

const prLed = (s: string | null) =>
  s === "success" ? "g" : s === "failure" ? "r" : s === "pending" ? "a" : "c";
const checksSym = (s: string | null) =>
  s === "success" ? "✓" : s === "failure" ? "✗" : s === "pending" ? "…" : "";

function useClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

// ── queue ───────────────────────────────────────────────────────────────────

function QueueRow({
  name,
  meta,
  points,
  barColor,
  dotColor,
  chipClass,
  chipText,
  onClick,
}: {
  name: string;
  meta: string;
  points?: number | null;
  barColor: string;
  dotColor: string;
  chipClass: string;
  chipText: string;
  onClick: () => void;
}) {
  return (
    <button className="yd-qrow" type="button" onClick={onClick}>
      <span className="yd-qbar" style={{ background: barColor }} />
      <span
        className="yd-pri"
        style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}` }}
      />
      <span className="yd-qmain">
        <span className="yd-qname">{name}</span>
        <span className="yd-qmeta">
          {meta}
          {points ? <span className="yd-pts">{points} pts</span> : null}
        </span>
      </span>
      <span className={`yd-chip ${chipClass}`}>{chipText}</span>
    </button>
  );
}

// board · section · value context line for a queue card.
function cardMeta(card: DashCard, currency?: string): string {
  let meta = card.board_name ?? "";
  if (card.section) meta += ` · ${card.section}`;
  if (card.value != null) meta += ` · ${money(card.value, currency)}`;
  return meta;
}

// ── cream project card ───────────────────────────────────────────────────────

const MAX_BOARD_CHIPS = 4;

function ProjectCard({
  project,
  meta,
  onOpen,
  onBoard,
}: {
  project: ProjectInterface;
  meta?: DashProjectMeta;
  onOpen: () => void;
  onBoard: (b: ProjectBoard) => void;
}) {
  const boards: ProjectBoard[] = project.boards ?? [];
  const totalCards = boards.reduce((s, b) => s + (b.cards_count ?? 0), 0);
  const shownBoards = boards.slice(0, MAX_BOARD_CHIPS);
  const moreBoards = boards.length - shownBoards.length;
  return (
    <div className="yd-pcard" onClick={onOpen} role="button" tabIndex={0}>
      <div className="yd-pstrip" style={{ background: project.color }} />
      <div className="yd-pbody">
        <div className="yd-phead">
          <span
            className="yd-pled"
            style={{
              background: project.color,
              boxShadow: `0 0 5px ${project.color}`,
            }}
          />
          <div className="yd-pname">{project.name}</div>
        </div>
        <div className="yd-pmeta">
          {project.boards_count ?? boards.length} boards · {totalCards} cards
          {meta?.last_activity ? ` · active ${rel(meta.last_activity)}` : ""}
        </div>
        {meta && meta.total > 0 && (
          <div className="yd-pprog">
            <span className="rail">
              <span
                className="fill"
                style={{ width: `${(meta.done / meta.total) * 100}%` }}
              />
            </span>
            <span className="pc">
              {meta.done}/{meta.total}
            </span>
          </div>
        )}
        <div className="yd-ptabs">
          {shownBoards.map((b) => (
            <button
              key={b.id}
              type="button"
              className="yd-ptab"
              onClick={(e) => {
                e.stopPropagation();
                onBoard(b);
              }}
            >
              {b.name}
            </button>
          ))}
          {moreBoards > 0 && (
            <button
              type="button"
              className="yd-ptab more"
              onClick={(e) => {
                e.stopPropagation();
                onOpen();
              }}
            >
              +{moreBoards} more
            </button>
          )}
          {boards.length === 0 && (
            <span className="yd-pmeta">No boards yet</span>
          )}
        </div>
      </div>
      <div className="yd-pfoot">
        <span className="yd-pbars" aria-hidden />
        <span className="yd-pref">
          REF #{String(project.id).padStart(3, "0")}
        </span>
      </div>
    </div>
  );
}

// ── CRM pipeline ─────────────────────────────────────────────────────────────

function CrmPanel({
  crm,
  onOpenCard,
}: {
  crm: DashCrm;
  onOpenCard: (boardId: number, cardId: number) => void;
}) {
  // Bar width = share of open value, so a 690× spread between stages reads as
  // one. The old max-stage scaling made R$49k and R$34M look almost equal.
  const total = crm.stages.reduce((s, x) => s + x.value, 0) || 1;
  const topStage = crm.stages.reduce(
    (a, b) => (b.value > a.value ? b : a),
    crm.stages[0],
  );
  const dealShare = crm.top_deal ? crm.top_deal.value / total : 0;
  const stageShare = topStage ? topStage.value / total : 0;
  return (
    <div className="yd-panel">
      <div className="yd-hd yd-crmhd">
        <span className="yd-led a" />
        <span className="yd-label">Pipeline · CRM</span>
        <Link href="/dashboard/conversion" className="yd-count yd-crmlink">
          Conversion →
        </Link>
        <Link href="/dashboard/revenue" className="yd-count yd-crmlink">
          Revenue →
        </Link>
      </div>
      <div className="yd-crmval">
        <div>
          <span className="big">{money(crm.open_total, crm.currency)}</span>
          <div className="yd-label" style={{ marginTop: 3 }}>
            open · {crm.open_count} deal{crm.open_count === 1 ? "" : "s"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="yd-label">Won · MTD</div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--yd-phosphor)",
              marginTop: 2,
            }}
          >
            {money(crm.won_mtd, crm.currency)}
          </div>
        </div>
      </div>
      <div className="yd-fn">
        {crm.stages.map((s) => (
          <div className="yd-fn-row" key={s.name}>
            <span className="yd-fn-lb">{s.name}</span>
            <span className="yd-fn-tk">
              <span
                className="yd-fn-f2"
                style={{
                  width: `${Math.max((s.value / total) * 100, s.value > 0 ? 1.5 : 0)}%`,
                }}
              />
            </span>
            <span className="yd-fn-val">
              {money(s.value, crm.currency)}
              <span className="ct"> · {s.count}</span>
            </span>
          </div>
        ))}
      </div>
      {dealShare >= 0.7 && crm.top_deal ? (
        <div className="yd-whale">
          ⚠ {Math.round(dealShare * 100)}% of open value is one deal —{" "}
          {crm.top_deal.name}
          {crm.top_deal.stage ? ` (${crm.top_deal.stage})` : ""}.
        </div>
      ) : stageShare >= 0.7 && topStage ? (
        <div className="yd-whale">
          ⚠ {Math.round(stageShare * 100)}% of open value sits in{" "}
          {topStage.name} ({topStage.count} deal
          {topStage.count === 1 ? "" : "s"}).
        </div>
      ) : null}
      {crm.aging.length > 0 && (
        <>
          <div className="yd-qglbl">
            <span className="yd-led r" />
            Aging · longest idle
            <span className="rule" />
          </div>
          {crm.aging.slice(0, 4).map((a) => (
            <button
              className="yd-drow"
              type="button"
              key={a.id}
              onClick={() => onOpenCard(a.board_id, a.id)}
            >
              <span
                className="yd-qbar"
                style={{
                  background:
                    a.days_idle > 7 ? "var(--yd-red)" : "var(--yd-amber)",
                  height: 18,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="yd-dn">{a.name}</div>
                <div
                  className="yd-label"
                  style={{ letterSpacing: ".04em", marginTop: 2 }}
                >
                  {a.stage} ·{" "}
                  <span className="yd-dv">
                    {a.value != null ? money(a.value, crm.currency) : ""}
                  </span>
                </div>
              </div>
              <span className={`yd-chip ${a.days_idle > 7 ? "red" : "amber"}`}>
                {a.days_idle}d
              </span>
            </button>
          ))}
          {crm.aging.length > 4 && (
            <div className="yd-label" style={{ padding: "8px 12px" }}>
              +{crm.aging.length - 4} more aging
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── new project modal ────────────────────────────────────────────────────────

function NewProjectModal({
  onSave,
  onClose,
}: {
  onSave: (d: ProjectFormData) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PROJECT_COLORS[0] ?? "#1976D2");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await onSave({
      name: name.trim(),
      description: description.trim() || null,
      color,
    });
    setLoading(false);
  }

  return (
    <div className="aero-menu p-6 w-[90vw] max-w-md flex flex-col gap-5">
      <p
        className="cf-label uppercase tracking-[0.25em] font-bold"
        style={{ fontSize: 10, color: "var(--cf-phosphor)" }}
      >
        New project
      </p>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Project name…"
          className="glass-input"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional…"
          rows={2}
          className="glass-input resize-none"
        />
        <div className="flex gap-2 flex-wrap">
          {PROJECT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              style={{
                backgroundColor: c,
                width: 22,
                height: 22,
                borderRadius: 4,
                boxShadow: color === c ? `0 0 8px ${c}` : "none",
              }}
              className={`border-2 transition-all ${color === c ? "border-white scale-125" : "border-transparent"}`}
            />
          ))}
        </div>
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onClose}
            className="aero-btn aero-btn--ghost px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="aero-btn aero-btn--cyan px-4 py-2 text-sm disabled:opacity-50"
          >
            {loading ? "…" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  useDocumentTitle("Yondra - Dashboard");
  const router = useRouter();
  const now = useClock();
  const [user, setUser] = useState<UserSummary | null>(null);
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await fetchDashboard();
      if (d) {
        setData(d);
        setUpdatedAt(new Date());
      }
    } catch {
      // 401s redirect centrally via apiFetch; ignore transient errors.
    }
  }, []);

  useEffect(() => {
    fetchUser()
      .then((u) => u && setUser(u))
      .catch(() => {});
    load();
  }, [load]);

  // Keep the home base fresh even if the socket drops.
  useEffect(() => {
    const t = setInterval(load, 45000);
    return () => clearInterval(t);
  }, [load]);

  // Realtime: refetch (debounced) whenever any visible board broadcasts a change.
  // Stable string key so a same-set refetch doesn't churn subscriptions.
  const boardIdsKey = useMemo(() => {
    const ids = new Set<number>();
    for (const p of [
      ...(data?.projects.owned ?? []),
      ...(data?.projects.member ?? []),
    ])
      for (const b of p.boards ?? []) ids.add(b.id);
    return Array.from(ids)
      .sort((a, b) => a - b)
      .join(",");
  }, [data?.projects]);

  useEffect(() => {
    if (!boardIdsKey) return;
    let echo: ReturnType<typeof getEcho> | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const handler = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(load, 800);
    };
    const names = boardIdsKey.split(",").map((id) => `board.${id}`);
    try {
      echo = getEcho();
      names.forEach((name) =>
        echo?.private(name).listen(".board.event", handler),
      );
    } catch {
      // Reverb not configured — the 45s poll still refreshes.
    }
    return () => {
      if (timer) clearTimeout(timer);
      names.forEach((name) => {
        try {
          echo?.private(name).stopListening(".board.event", handler);
          echo?.leave(name);
        } catch {
          // ignore teardown errors
        }
      });
    };
  }, [boardIdsKey, load]);

  async function handleCreate(form: ProjectFormData) {
    const created = await createProject(form);
    setShowNew(false);
    router.push(`/projects/${created.id}`);
  }

  const projects: ProjectInterface[] = [
    ...(data?.projects.owned ?? []),
    ...(data?.projects.member ?? []),
  ];
  const boardsCount = projects.reduce((s, p) => s + (p.boards_count ?? 0), 0);

  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const v = data?.vitals;
  const activity = data?.activity ?? [];
  const currency = data?.crm?.currency;

  // Done-per-week delta for the vitals tile (only stat with exact history).
  const doneDelta = v ? v.done_7d - v.done_prev_7d : 0;

  // Needs-you: one flat list — overdue, due today, high priority, then CRM
  // deals idling in a stage (deduped against cards already queued).
  const queueCards = [
    ...(data?.queue.overdue ?? []),
    ...(data?.queue.today ?? []),
    ...(data?.queue.high ?? []),
  ];
  const queueIds = new Set(queueCards.map((c) => c.id));
  const idleDeals = (data?.crm?.aging ?? [])
    .filter((a) => !queueIds.has(a.id) && a.days_idle >= 5)
    .slice(0, 2);
  const needsCount = queueCards.length + idleDeals.length;

  // Throughput anchors: average, peak (with date), today.
  const tp = data?.throughput ?? [];
  const tpAvg = tp.length ? tp.reduce((s, n) => s + n, 0) / tp.length : 0;
  const tpPeak = tp.length ? Math.max(...tp) : 0;
  const tpPeakDate = tp.length
    ? new Date(Date.now() - (tp.length - 1 - tp.indexOf(tpPeak)) * 86400000)
    : null;
  const tpToday = tp.length ? tp[tp.length - 1] : 0;

  // Sprint pace: completed vs the ideal line at today's position.
  const sp = data?.sprint;
  const spExpected =
    sp?.days_total && sp.days_elapsed != null
      ? sp.committed * (sp.days_elapsed / sp.days_total)
      : null;
  const spBehind =
    spExpected != null && sp != null && sp.completed < spExpected;
  const spNeeded =
    sp?.days_left && sp.days_left > 0 && sp.remaining > 0
      ? sp.remaining / sp.days_left
      : null;

  const projectMeta = new Map(
    (data?.projects_meta ?? []).map((m) => [m.id, m]),
  );

  return (
    <div className="yd-root">
      <div className="yd-wrap">
        <div className="yd-shell">
          <DashboardSidebar
            user={user}
            projectsCount={projects.length}
            boardsCount={boardsCount}
            onNewProject={() => setShowNew(true)}
          />

          <main id="yd-top">
            {/* topbar */}
            <div className="yd-topbar">
              <div className="yd-greet">
                <div className="yd-label" style={{ marginBottom: 2 }}>
                  {greeting}
                </div>
                <div className="h">{user?.name ?? "…"}</div>
              </div>
              <OmniSearch />
              <div className="yd-screen yd-clock">
                <div className="t">
                  {now.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div className="d">
                  {now.toLocaleDateString("en-US", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </div>
              </div>
            </div>

            {/* vitals — honest LCD tiles: big numeral + factual sub-line.
                (Needle gauges implied a bounded scale these counts don't have.) */}
            <div className="yd-panel">
              <div className="yd-hd">
                <span className="yd-led c" />
                <span className="yd-label">Vitals</span>
                <span className="yd-count" style={{ color: "#8f897a" }}>
                  {updatedAt
                    ? `updated ${updatedAt.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : "…"}
                </span>
              </div>
              <div className="yd-vit">
                <div className="yd-tile">
                  <div
                    className="v"
                    style={{
                      color: v?.overdue ? "var(--yd-red)" : "#8f897a",
                    }}
                  >
                    {v?.overdue ?? "–"}
                  </div>
                  <div className="l">Overdue</div>
                  <div className="s">
                    {v
                      ? v.overdue > 0 && v.overdue_oldest_days != null
                        ? `oldest ${v.overdue_oldest_days}d late`
                        : "all clear"
                      : "…"}
                  </div>
                </div>
                <div className="yd-tile">
                  <div
                    className="v"
                    style={{
                      color: v?.due_today ? "var(--yd-amber)" : "#8f897a",
                    }}
                  >
                    {v?.due_today ?? "–"}
                  </div>
                  <div className="l">Due today</div>
                  <div className="s">
                    {v ? (v.due_today > 0 ? "on deck" : "clear") : "…"}
                  </div>
                </div>
                <div className="yd-tile">
                  <div
                    className="v"
                    style={{
                      color: v?.due_week ? "var(--yd-amber)" : "#8f897a",
                    }}
                  >
                    {v?.due_week ?? "–"}
                  </div>
                  <div className="l">Due this week</div>
                  <div className="s">
                    {v
                      ? v.next_due
                        ? `next: ${fmtDay(v.next_due)}`
                        : "nothing scheduled"
                      : "…"}
                  </div>
                </div>
                <div className="yd-tile">
                  <div className="v" style={{ color: "var(--yd-phosphor)" }}>
                    {v?.in_progress ?? "–"}
                  </div>
                  <div className="l">In progress</div>
                  <div className="s">
                    {v
                      ? `across ${v.in_progress_boards} board${
                          v.in_progress_boards === 1 ? "" : "s"
                        }`
                      : "…"}
                  </div>
                </div>
                <div className="yd-tile">
                  <div className="v" style={{ color: "var(--yd-cyan)" }}>
                    {v?.done_7d ?? "–"}
                  </div>
                  <div className="l">Done · 7d</div>
                  <div
                    className="s"
                    style={
                      doneDelta > 0
                        ? { color: "var(--yd-phosphor)" }
                        : doneDelta < 0
                          ? { color: "var(--yd-amber)" }
                          : undefined
                    }
                  >
                    {v
                      ? doneDelta > 0
                        ? `▲ +${doneDelta} vs prior 7d`
                        : doneDelta < 0
                          ? `▼ ${doneDelta} vs prior 7d`
                          : "= prior 7d"
                      : "…"}
                  </div>
                </div>
              </div>
            </div>

            {/* main grid */}
            <div className="yd-grid">
              {/* left column: needs you + projects */}
              <div className="yd-stack">
                {/* needs you — one flat scannable list; the chip carries the
                    concrete fact (3d late / due Jul 14 / idle 6d) */}
                <div className="yd-panel">
                  <div className="yd-hd">
                    <span className="yd-led g" />
                    <span className="yd-label" style={{ fontSize: 13 }}>
                      Needs you
                    </span>
                    <span className="yd-count">{needsCount} items</span>
                  </div>

                  {data && needsCount === 0 && (
                    <div className="yd-empty">
                      Nothing needs you right now. Nice.
                    </div>
                  )}

                  {data?.queue.overdue.map((c) => (
                    <QueueRow
                      key={`q${c.id}`}
                      name={c.name}
                      meta={cardMeta(c, currency)}
                      points={c.story_points}
                      barColor="var(--yd-red)"
                      dotColor={priColor(c.priority)}
                      chipClass="red"
                      chipText={daysLate(c.due_date)}
                      onClick={() =>
                        router.push(`/boards/${c.board_id}?card=${c.id}`)
                      }
                    />
                  ))}
                  {data?.queue.today.map((c) => (
                    <QueueRow
                      key={`q${c.id}`}
                      name={c.name}
                      meta={cardMeta(c, currency)}
                      points={c.story_points}
                      barColor="var(--yd-amber)"
                      dotColor={priColor(c.priority)}
                      chipClass="amber"
                      chipText="due today"
                      onClick={() =>
                        router.push(`/boards/${c.board_id}?card=${c.id}`)
                      }
                    />
                  ))}
                  {data?.queue.high.map((c) => (
                    <QueueRow
                      key={`q${c.id}`}
                      name={c.name}
                      meta={cardMeta(c, currency)}
                      points={c.story_points}
                      barColor="var(--yd-amber)"
                      dotColor={priColor(c.priority)}
                      chipClass="amber"
                      chipText={
                        c.due_date
                          ? `due ${fmtDay(c.due_date)}`
                          : "high priority"
                      }
                      onClick={() =>
                        router.push(`/boards/${c.board_id}?card=${c.id}`)
                      }
                    />
                  ))}
                  {idleDeals.map((a) => (
                    <QueueRow
                      key={`i${a.id}`}
                      name={a.name}
                      meta={`CRM · stuck in ${a.stage ?? "stage"}${
                        a.value != null ? ` · ${money(a.value, currency)}` : ""
                      }`}
                      barColor="var(--yd-amber)"
                      dotColor="var(--yd-amber)"
                      chipClass="dim"
                      chipText={`idle ${a.days_idle}d`}
                      onClick={() =>
                        router.push(`/boards/${a.board_id}?card=${a.id}`)
                      }
                    />
                  ))}
                </div>

                {/* projects — scannable grid, filling the left column */}
                <div className="yd-panel" id="yd-projects">
                  <div className="yd-hd">
                    <span className="yd-led c" />
                    <span className="yd-label">Projects</span>
                    <span className="yd-count" style={{ color: "#8f897a" }}>
                      {projects.length} · {boardsCount} boards
                    </span>
                  </div>
                  <div className="yd-pgrid">
                    {projects.map((p) => (
                      <ProjectCard
                        key={p.id}
                        project={p}
                        meta={projectMeta.get(p.id)}
                        onOpen={() => router.push(`/projects/${p.id}`)}
                        onBoard={(b) => router.push(`/boards/${b.id}`)}
                      />
                    ))}
                    {data && projects.length === 0 && (
                      <div className="yd-empty">
                        No projects yet — create your first.
                      </div>
                    )}
                  </div>
                </div>

                {/* activity — a real feed panel instead of a cut-off ticker */}
                <div className="yd-panel" id="yd-activity">
                  <div className="yd-hd">
                    <span className="yd-led g" />
                    <span className="yd-label">Activity</span>
                    <span className="yd-count" style={{ color: "#8f897a" }}>
                      {activity.length
                        ? `${activity.length} events`
                        : "standby"}
                    </span>
                  </div>
                  <div className="yd-feed">
                    {activity.length === 0 && (
                      <div className="yd-empty">Nothing logged yet.</div>
                    )}
                    {activity.slice(0, 8).map((a) => (
                      <div className="yd-feedrow" key={a.id}>
                        <span className="ts">
                          {new Date(a.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="tx">
                          {a.actor ? <b>{a.actor}</b> : null} {a.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* /left column */}

              {/* right rail: charts + CRM + PRs */}
              <div className="yd-stack">
                {/* throughput */}
                <div className="yd-panel">
                  <div className="yd-hd">
                    <span className="yd-led g" />
                    <span className="yd-label">Throughput · cards/day</span>
                    <span className="yd-count" style={{ color: "#8f897a" }}>
                      14d
                    </span>
                  </div>
                  <ThroughputLCD data={data?.throughput ?? []} />
                  {tp.length > 0 && (
                    <div className="yd-cap">
                      avg {tpAvg.toFixed(1)}/day · peak {tpPeak}
                      {tpPeakDate ? ` (${fmtDay(tpPeakDate)})` : ""} · today{" "}
                      {tpToday}
                    </div>
                  )}
                </div>

                {/* sprint burndown */}
                {sp && (
                  <div className="yd-panel">
                    <div className="yd-hd">
                      <span className="yd-led g" />
                      <span className="yd-label">
                        {sp.board_name ? `${sp.board_name} · ` : ""}
                        {sp.name} · burndown
                      </span>
                      <span className="yd-count">
                        {sp.completed}/{sp.committed}
                      </span>
                    </div>
                    <BurndownLCD
                      committed={sp.committed}
                      remaining={sp.remaining}
                      daysTotal={sp.days_total}
                      daysElapsed={sp.days_elapsed}
                    />
                    <div className="yd-bdleg">
                      <span>
                        <i className="sw a" /> actual
                      </span>
                      <span>
                        <i className="sw i" /> ideal
                      </span>
                      {spExpected != null && (
                        <span
                          className={`yd-chip ${spBehind ? "amber" : "green"}`}
                          style={{ marginLeft: "auto" }}
                        >
                          {spBehind ? "behind pace" : "on pace"}
                        </span>
                      )}
                    </div>
                    <div className="yd-kv">
                      <span className="k">Remaining</span>
                      <span className="v">{sp.remaining} pts</span>
                    </div>
                    <div className="yd-kv">
                      <span className="k">Days left</span>
                      <span className="v">{sp.days_left ?? "–"}</span>
                    </div>
                    {spNeeded != null && (
                      <div className="yd-kv">
                        <span className="k">Required pace</span>
                        <span className="v">{spNeeded.toFixed(1)} pts/day</span>
                      </div>
                    )}
                  </div>
                )}

                {/* CRM pipeline (only when a CRM board exists) */}
                {data?.crm && (
                  <CrmPanel
                    crm={data.crm}
                    onOpenCard={(boardId, cardId) =>
                      router.push(`/boards/${boardId}?card=${cardId}`)
                    }
                  />
                )}

                {/* pull requests */}
                {(data?.prs.length ?? 0) > 0 && (
                  <div className="yd-panel">
                    <div className="yd-hd">
                      <span className="yd-led v" />
                      <span className="yd-label">Pull requests</span>
                      <span
                        className="yd-count"
                        style={{ color: "var(--yd-violet)" }}
                      >
                        {data?.prs.length} open
                      </span>
                    </div>
                    {data?.prs.map((pr, i) => (
                      <div className="yd-pr" key={i}>
                        <span className={`yd-led ${prLed(pr.checks_state)}`} />
                        <span className="yd-pr-t">
                          {pr.title ?? "Pull request"}
                        </span>
                        <span className="yd-pr-n">
                          #{pr.number} {checksSym(pr.checks_state)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="yd-foot">Yondra // command center</div>
          </main>
        </div>
      </div>

      {showNew && (
        <Modal onClose={() => setShowNew(false)}>
          <NewProjectModal
            onSave={handleCreate}
            onClose={() => setShowNew(false)}
          />
        </Modal>
      )}
    </div>
  );
}
