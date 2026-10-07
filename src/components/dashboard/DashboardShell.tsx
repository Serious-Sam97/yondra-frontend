"use client";

// Shared shell for /dashboard and its report pages: the walnut side panel,
// the new-project modal and the dashboard aggregate (polled + realtime), which
// pages read through useDashboard().

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { IN_PROGRESS_RE } from "@/components/dashboard/HiFiPanels";
import Modal from "@/components/shared/Modal";
import type { DashboardPayload } from "@/interfaces/DashboardInterface";
import type {
  ProjectFormData,
  ProjectInterface,
  UserSummary,
} from "@/interfaces/ProjectInterface";
import { createProject, fetchDashboard } from "@/lib/api";
import { fetchUser } from "@/lib/auth";
import { getEcho } from "@/lib/echo";
import { pollWhileVisible } from "@/lib/poll";
import { PROJECT_COLORS } from "@/lib/ui";

interface DashboardCtx {
  user: UserSummary | null;
  data: DashboardPayload | null;
  projects: ProjectInterface[];
  // Project with the freshest activity — where "Projects" / "All projects" go.
  latestProjectId: number | null;
}

const Ctx = createContext<DashboardCtx>({
  user: null,
  data: null,
  projects: [],
  latestProjectId: null,
});

export const useDashboard = () => useContext(Ctx);

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

// ── shell ────────────────────────────────────────────────────────────────────

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
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
    fetchUser()
      .then((u) => u && setUser(u))
      .catch(() => {});
    load();
  }, [load]);

  // Keep the home base fresh even if the socket drops.
  useEffect(() => pollWhileVisible(load, 45000), [load]);

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

  const projects = useMemo<ProjectInterface[]>(
    () => [...(data?.projects.owned ?? []), ...(data?.projects.member ?? [])],
    [data?.projects],
  );
  const boardsCount = projects.reduce((s, p) => s + (p.boards_count ?? 0), 0);
  const latestProjectId = useMemo(() => {
    let best: { id: number; at: string } | null = null;
    for (const m of data?.projects_meta ?? [])
      if (m.last_activity && (!best || m.last_activity > best.at))
        best = { id: m.id, at: m.last_activity };
    return best?.id ?? projects[0]?.id ?? null;
  }, [data?.projects_meta, projects]);

  const deck = data?.deck ?? [];
  const playingCard =
    deck.find(
      (c) =>
        !c.blocked_reason?.trim() &&
        c.section &&
        IN_PROGRESS_RE.test(c.section),
    ) ?? null;

  const ctx = useMemo(
    () => ({ user, data, projects, latestProjectId }),
    [user, data, projects, latestProjectId],
  );

  return (
    <Ctx.Provider value={ctx}>
      <div className="hf">
        <DashboardSidebar
          user={user}
          projectsCount={projects.length}
          boardsCount={boardsCount}
          latestProjectId={latestProjectId}
          onNewProject={() => setShowNew(true)}
          nowPlaying={playingCard ?? deck[0] ?? null}
          playing={!!playingCard}
          onOpenCard={(c) => router.push(`/boards/${c.board_id}?card=${c.id}`)}
        />
        <div className="hf-outlet">{children}</div>
      </div>

      {showNew && (
        <Modal onClose={() => setShowNew(false)}>
          <NewProjectModal
            onSave={handleCreate}
            onClose={() => setShowNew(false)}
          />
        </Modal>
      )}
    </Ctx.Provider>
  );
}
