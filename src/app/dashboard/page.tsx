"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import "./dashboard.css";
import { getEcho } from "@/lib/echo";
import Modal from "@/components/shared/Modal";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import NeedleGauge from "@/components/dashboard/NeedleGauge";
import OmniSearch from "@/components/dashboard/OmniSearch";
import ThroughputLCD from "@/components/dashboard/ThroughputLCD";
import BurndownLCD from "@/components/dashboard/BurndownLCD";
import type { DashboardPayload, DashCard, DashCrm } from "@/interfaces/DashboardInterface";
import type {
  ProjectBoard,
  ProjectFormData,
  ProjectInterface,
  UserSummary,
} from "@/interfaces/ProjectInterface";
import { createProject, fetchDashboard } from "@/lib/api";
import { fetchUser } from "@/lib/auth";
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
  const diff = Math.floor((Date.now() - new Date(`${due}T00:00:00`).getTime()) / 86400000);
  return diff > 0 ? `${diff}d late` : "due";
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
  card,
  barColor,
  chipClass,
  chipText,
  onClick,
}: {
  card: DashCard;
  barColor: string;
  chipClass: string;
  chipText: string;
  onClick: () => void;
}) {
  return (
    <button className="yd-qrow" type="button" onClick={onClick}>
      <span className="yd-qbar" style={{ background: barColor }} />
      <span className="yd-pri" style={{ background: priColor(card.priority), boxShadow: `0 0 6px ${priColor(card.priority)}` }} />
      <span className="yd-qmain">
        <span className="yd-qname">{card.name}</span>
        <span className="yd-qmeta">
          {card.board_name}
          {card.section ? ` · ${card.section}` : ""}
          {card.story_points ? <span className="yd-pts">{card.story_points} pts</span> : null}
        </span>
      </span>
      <span className={`yd-chip ${chipClass}`}>{chipText}</span>
    </button>
  );
}

// ── cream project card ───────────────────────────────────────────────────────

function ProjectCard({ project, onOpen, onBoard }: {
  project: ProjectInterface;
  onOpen: () => void;
  onBoard: (b: ProjectBoard) => void;
}) {
  const boards: ProjectBoard[] = project.boards ?? [];
  const totalCards = boards.reduce((s, b) => s + (b.cards_count ?? 0), 0);
  return (
    <div className="yd-pcard" onClick={onOpen} role="button" tabIndex={0}>
      <div className="yd-pstrip" style={{ background: project.color }} />
      <div className="yd-pbody">
        <div className="yd-phead">
          <span className="yd-pled" style={{ background: project.color, boxShadow: `0 0 5px ${project.color}` }} />
          <div className="yd-pname">{project.name}</div>
        </div>
        <div className="yd-pmeta">{project.boards_count ?? boards.length} boards · {totalCards} cards</div>
        <div className="yd-ptabs">
          {boards.map((b) => (
            <button
              key={b.id}
              type="button"
              className="yd-ptab"
              onClick={(e) => { e.stopPropagation(); onBoard(b); }}
            >
              {b.name}
            </button>
          ))}
          {boards.length === 0 && <span className="yd-pmeta">No boards yet</span>}
        </div>
      </div>
      <div className="yd-pfoot">
        <span className="yd-pbars" aria-hidden />
        <span className="yd-pref">REF #{String(project.id).padStart(3, "0")}</span>
      </div>
    </div>
  );
}

// ── CRM pipeline ─────────────────────────────────────────────────────────────

function CrmPanel({ crm, onOpenCard }: { crm: DashCrm; onOpenCard: (boardId: number, cardId: number) => void }) {
  const maxStage = Math.max(...crm.stages.map((s) => s.value), 1);
  return (
    <div className="yd-panel">
      <div className="yd-hd yd-crmhd"><span className="yd-led a" /><span className="yd-label">Pipeline · CRM</span><span className="yd-count" style={{ color: "var(--yd-gold)" }}>{money(crm.open_total, crm.currency)}</span></div>
      <div className="yd-crmval">
        <div><span className="big">{money(crm.open_total, crm.currency)}</span><div className="yd-label" style={{ marginTop: 3 }}>open</div></div>
        <div style={{ textAlign: "right" }}><div className="yd-label">Won · MTD</div><div style={{ fontSize: 15, fontWeight: 700, color: "var(--yd-phosphor)", marginTop: 2 }}>{money(crm.won_mtd, crm.currency)}</div></div>
      </div>
      <div className="yd-fn">
        {crm.stages.map((s) => (
          <div className="yd-fn-row" key={s.name}>
            <span className="yd-fn-lb">{s.name}</span>
            <span className="yd-fn-tk"><span className="yd-fn-f2" style={{ width: `${(s.value / maxStage) * 100}%` }} /></span>
            <span className="yd-fn-val">{money(s.value, crm.currency)}</span>
          </div>
        ))}
      </div>
      {crm.aging.length > 0 && (
        <>
          <div className="yd-qglbl"><span className="yd-led r" />Aging · SLA<span className="rule" /></div>
          {crm.aging.slice(0, 4).map((a) => (
            <button className="yd-drow" type="button" key={a.id} onClick={() => onOpenCard(a.board_id, a.id)}>
              <span className="yd-qbar" style={{ background: a.days_idle > 7 ? "var(--yd-red)" : "var(--yd-amber)", height: 18 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="yd-dn">{a.name}</div>
                <div className="yd-label" style={{ letterSpacing: ".04em", marginTop: 2 }}>{a.stage} · <span className="yd-dv">{a.value != null ? money(a.value, crm.currency) : ""}</span></div>
              </div>
              <span className={`yd-chip ${a.days_idle > 7 ? "red" : "amber"}`}>{a.days_idle}d</span>
            </button>
          ))}
          {crm.aging.length > 4 && (
            <div className="yd-label" style={{ padding: "8px 12px" }}>+{crm.aging.length - 4} more aging</div>
          )}
        </>
      )}
    </div>
  );
}

// ── new project modal ────────────────────────────────────────────────────────

function NewProjectModal({ onSave, onClose }: {
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
    await onSave({ name: name.trim(), description: description.trim() || null, color });
    setLoading(false);
  }

  return (
    <div className="aero-menu p-6 w-[90vw] max-w-md flex flex-col gap-5">
      <p className="cf-label uppercase tracking-[0.25em] font-bold" style={{ fontSize: 10, color: "var(--cf-phosphor)" }}>New project</p>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name…" className="glass-input" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional…" rows={2} className="glass-input resize-none" />
        <div className="flex gap-2 flex-wrap">
          {PROJECT_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)}
              style={{ backgroundColor: c, width: 22, height: 22, borderRadius: 4, boxShadow: color === c ? `0 0 8px ${c}` : "none" }}
              className={`border-2 transition-all ${color === c ? "border-white scale-125" : "border-transparent"}`} />
          ))}
        </div>
        <div className="flex items-center justify-between pt-2">
          <button type="button" onClick={onClose} className="aero-btn aero-btn--ghost px-4 py-2 text-sm">Cancel</button>
          <button type="submit" disabled={loading || !name.trim()} className="aero-btn aero-btn--cyan px-4 py-2 text-sm disabled:opacity-50">{loading ? "…" : "Create"}</button>
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
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await fetchDashboard();
      if (d) setData(d);
    } catch {
      // 401s redirect centrally via apiFetch; ignore transient errors.
    }
  }, []);

  useEffect(() => {
    fetchUser().then((u) => u && setUser(u)).catch(() => {});
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
    for (const p of [...(data?.projects.owned ?? []), ...(data?.projects.member ?? [])])
      for (const b of p.boards ?? []) ids.add(b.id);
    return Array.from(ids).sort((a, b) => a - b).join(",");
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
      names.forEach((name) => echo?.private(name).listen(".board.event", handler));
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
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const v = data?.vitals;
  const activity = data?.activity ?? [];

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
                <div className="yd-label" style={{ marginBottom: 2 }}>{greeting}</div>
                <div className="h">{user?.name ?? "…"}</div>
              </div>
              <OmniSearch />
              <div className="yd-screen yd-clock">
                <div className="t">{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                <div className="d">{now.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })}</div>
              </div>
            </div>

            {/* vitals — analog needle gauges */}
            <div className="yd-panel">
              <div className="yd-hd"><span className="yd-led c" /><span className="yd-label">Vitals</span><span className="yd-count" style={{ color: "#8f897a" }}>live</span></div>
              <div className="yd-meters">
                <div className="yd-meter">
                  <NeedleGauge value={v?.overdue ?? 0} max={8} color="#c85e4c" danger />
                  <div className="mv" style={{ color: "var(--yd-red)" }}>{v?.overdue ?? "–"}</div><div className="ml">Overdue</div>
                </div>
                <div className="yd-meter">
                  <NeedleGauge value={v?.due_today ?? 0} max={8} color="#d99a34" danger />
                  <div className="mv" style={{ color: "var(--yd-amber)" }}>{v?.due_today ?? "–"}</div><div className="ml">Due today</div>
                </div>
                <div className="yd-meter">
                  <NeedleGauge value={v?.in_progress ?? 0} max={16} color="#9ec46a" />
                  <div className="mv" style={{ color: "var(--yd-phosphor)" }}>{v?.in_progress ?? "–"}</div><div className="ml">In progress</div>
                </div>
                <div className="yd-meter">
                  <NeedleGauge value={v?.done_7d ?? 0} max={30} color="#6aa2c2" />
                  <div className="mv" style={{ color: "var(--yd-cyan)" }}>{v?.done_7d ?? "–"}</div><div className="ml">Done · 7d</div>
                </div>
                <div className="yd-meter">
                  <NeedleGauge value={data?.crm?.open_total ?? 0} max={(data?.crm?.open_total ?? 0) * 1.3 || 1} color="#dcae57" />
                  <div className="mv" style={{ color: "var(--yd-gold)" }}>{data?.crm ? money(data.crm.open_total, data.crm.currency) : "—"}</div><div className="ml">Pipeline</div>
                </div>
              </div>
            </div>

            {/* main grid */}
            <div className="yd-grid">
              {/* left column: needs you + projects */}
              <div className="yd-stack">

              {/* needs you */}
              <div className="yd-panel">
                <div className="yd-hd"><span className="yd-led g" /><span className="yd-label" style={{ fontSize: 13 }}>Needs you</span>
                  <span className="yd-count">{(data?.queue.overdue.length ?? 0) + (data?.queue.today.length ?? 0) + (data?.queue.high.length ?? 0)} items</span>
                </div>

                {data && data.queue.overdue.length === 0 && data.queue.today.length === 0 && data.queue.high.length === 0 && (
                  <div className="yd-empty">Nothing needs you right now. Nice.</div>
                )}

                {(data?.queue.overdue.length ?? 0) > 0 && (
                  <>
                    <div className="yd-qglbl"><span className="yd-led r" />Overdue<span className="rule" /></div>
                    {data?.queue.overdue.map((c) => (
                      <QueueRow key={c.id} card={c} barColor="var(--yd-red)" chipClass="red" chipText={daysLate(c.due_date)} onClick={() => router.push(`/boards/${c.board_id}?card=${c.id}`)} />
                    ))}
                  </>
                )}
                {(data?.queue.today.length ?? 0) > 0 && (
                  <>
                    <div className="yd-qglbl"><span className="yd-led a" />Due today<span className="rule" /></div>
                    {data?.queue.today.map((c) => (
                      <QueueRow key={c.id} card={c} barColor="var(--yd-amber)" chipClass="amber" chipText="today" onClick={() => router.push(`/boards/${c.board_id}?card=${c.id}`)} />
                    ))}
                  </>
                )}
                {(data?.queue.high.length ?? 0) > 0 && (
                  <>
                    <div className="yd-qglbl"><span className="yd-led c" />High priority<span className="rule" /></div>
                    {data?.queue.high.map((c) => (
                      <QueueRow key={c.id} card={c} barColor="var(--yd-cyan)" chipClass="cyan" chipText={c.due_date ?? "soon"} onClick={() => router.push(`/boards/${c.board_id}?card=${c.id}`)} />
                    ))}
                  </>
                )}
              </div>

              {/* projects — scannable grid, filling the left column */}
              <div className="yd-panel" id="yd-projects">
                <div className="yd-hd"><span className="yd-led c" /><span className="yd-label">Projects</span><span className="yd-count" style={{ color: "#8f897a" }}>{projects.length} · {boardsCount} boards</span></div>
                <div className="yd-pgrid">
                  {projects.map((p) => (
                    <ProjectCard key={p.id} project={p} onOpen={() => router.push(`/projects/${p.id}`)} onBoard={(b) => router.push(`/boards/${b.id}`)} />
                  ))}
                  {data && projects.length === 0 && (
                    <div className="yd-empty">No projects yet — create your first.</div>
                  )}
                </div>
              </div>

              </div>{/* /left column */}

              {/* right rail: charts + CRM + PRs */}
              <div className="yd-stack">

                {/* throughput */}
                <div className="yd-panel">
                  <div className="yd-hd"><span className="yd-led g" /><span className="yd-label">Throughput · cards/day</span><span className="yd-count" style={{ color: "#8f897a" }}>14d</span></div>
                  <ThroughputLCD data={data?.throughput ?? []} />
                </div>

                {/* sprint burndown */}
                {data?.sprint && (
                  <div className="yd-panel">
                    <div className="yd-hd"><span className="yd-led g" /><span className="yd-label">{data.sprint.name} · burndown</span><span className="yd-count">{data.sprint.completed}/{data.sprint.committed}</span></div>
                    <BurndownLCD committed={data.sprint.committed} remaining={data.sprint.remaining} daysTotal={data.sprint.days_total} daysElapsed={data.sprint.days_elapsed} />
                    <div className="yd-kv"><span className="k">Remaining</span><span className="v">{data.sprint.remaining} pts</span></div>
                    <div className="yd-kv"><span className="k">Days left</span><span className="v">{data.sprint.days_left ?? "–"}</span></div>
                  </div>
                )}

                {/* CRM pipeline (only when a CRM board exists) */}
                {data?.crm && <CrmPanel crm={data.crm} onOpenCard={(boardId, cardId) => router.push(`/boards/${boardId}?card=${cardId}`)} />}

                {/* pull requests */}
                {(data?.prs.length ?? 0) > 0 && (
                  <div className="yd-panel">
                    <div className="yd-hd"><span className="yd-led v" /><span className="yd-label">Pull requests</span><span className="yd-count" style={{ color: "var(--yd-violet)" }}>{data?.prs.length} open</span></div>
                    {data?.prs.map((pr, i) => (
                      <div className="yd-pr" key={i}>
                        <span className={`yd-led ${prLed(pr.checks_state)}`} />
                        <span className="yd-pr-t">{pr.title ?? "Pull request"}</span>
                        <span className="yd-pr-n">#{pr.number} {checksSym(pr.checks_state)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* activity strip */}
            <div className="yd-actstrip" id="yd-activity">
              <div className="yd-actlive"><span className="yd-led g" /><span className="yd-label l">Live</span></div>
              <div className="yd-feedcol">
                {activity.length === 0 && <div className="yd-tline"><span className="ts">--:--</span> &gt; standby…</div>}
                {activity.slice(0, 3).map((a) => (
                  <div className="yd-tline" key={a.id}>
                    <span className="ts">{new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    {a.actor ? <b>{a.actor}</b> : null} {a.description}
                  </div>
                ))}
                <div className="yd-tline"><span className="ts">{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span> &gt; monitoring<span className="yd-tcur" /></div>
              </div>
              <div className="yd-actctrls">
                <span className="yd-mled r" /><span className="yd-mled r" /><span className="yd-mled a" />
              </div>
            </div>

            <div className="yd-foot">Yondra // command center</div>
          </main>
        </div>
      </div>

      {showNew && (
        <Modal onClose={() => setShowNew(false)}>
          <NewProjectModal onSave={handleCreate} onClose={() => setShowNew(false)} />
        </Modal>
      )}
    </div>
  );
}
