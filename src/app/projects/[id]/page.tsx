"use client";

import {
  faArrowLeft,
  faBars,
  faBorderAll,
  faCrown,
  faGear,
  faList,
  faMagnifyingGlass,
  faPen,
  faPlus,
  faRotateLeft,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import BoardCard from "@/components/projects/BoardCard";
import MembersPanel from "@/components/projects/MembersPanel";
import ProjectRail from "@/components/projects/ProjectRail";
import { useProjects } from "@/components/projects/ProjectsProvider";
import StatTile from "@/components/projects/StatTile";
import Modal from "@/components/shared/Modal";
import {
  type BoardFormData,
  BoardFormModal,
} from "@/components/ui/BoardFormModal";
import Icon from "@/components/ui/Icon";
import type {
  ProjectBoard,
  ProjectInterface,
} from "@/interfaces/ProjectInterface";
import {
  createBoard,
  createProject,
  deleteBoard,
  fetchProject,
  fetchProjects,
  unarchiveBoard,
  updateBoard,
} from "@/lib/api";
import { fetchUser } from "@/lib/auth";
import { boardProgress, PROJECT_COLORS } from "@/lib/ui";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

type SortKey = "recent" | "name" | "progress" | "cards";

function NewProjectModal({
  onCreate,
  onClose,
}: {
  onCreate: (p: ProjectInterface) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      onCreate(await createProject({ name: name.trim(), color }));
    } catch {
      setLoading(false);
    }
  };
  return (
    <form
      onSubmit={submit}
      className="aero-menu rounded-2xl p-6 w-[90vw] max-w-sm flex flex-col gap-4"
    >
      <p
        className="cf-label uppercase tracking-[0.25em] font-bold"
        style={{ fontSize: 10, color: "var(--cf-text-muted)" }}
      >
        New project
      </p>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Project name…"
        className="glass-input cf-lcd text-sm"
      />
      <div className="flex gap-2 flex-wrap">
        {PROJECT_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            aria-label={`Color ${c}`}
            style={{
              backgroundColor: c,
              width: 24,
              height: 24,
              borderRadius: 6,
              borderColor:
                color === c ? "var(--cf-phosphor)" : "var(--cf-edge)",
              boxShadow: color === c ? `0 0 10px ${c}` : undefined,
            }}
            className={`border-2 cursor-pointer transition-all ${color === c ? "scale-125" : ""}`}
          />
        ))}
      </div>
      <div className="flex justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="aero-btn aero-btn--ghost uppercase tracking-widest font-bold px-4 py-1.5 text-[10px]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="aero-btn aero-btn--cyan uppercase tracking-widest font-bold px-5 py-1.5 text-[10px] disabled:opacity-50"
        >
          {loading ? "…" : "Create"}
        </button>
      </div>
    </form>
  );
}

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params.id);

  const { user, owned, member, hydrated, setAll } = useProjects();

  const [project, setProject] = useState<ProjectInterface | null>(null);
  const [contentLoading, setContentLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showArchived, setShowArchived] = useState(false);

  useDocumentTitle(
    project?.name ? `Yondra - ${project.name}` : "Yondra - Project",
  );

  type ModalState =
    | { type: "board-new" }
    | { type: "board-edit"; board: ProjectBoard }
    | { type: "project-new" }
    | null;
  const [modal, setModal] = useState<ModalState>(null);

  useEffect(() => {
    setContentLoading(true);
    setModal(null);
    setEditMode(false);
    setShowArchived(false);
    setQuery("");

    if (!hydrated) {
      (async () => {
        try {
          const [u, projectData, all] = await Promise.all([
            fetchUser(),
            fetchProject(projectId),
            fetchProjects(),
          ]);
          setAll(u ?? null, all?.owned ?? [], all?.member ?? []);
          if (projectData) setProject(projectData);
        } catch {
          router.push("/dashboard");
        } finally {
          setContentLoading(false);
        }
      })();
    } else {
      fetchProject(projectId)
        .then((data) => {
          setProject(data);
          setContentLoading(false);
        })
        .catch(() => router.push("/dashboard"));
      fetchProjects()
        .then((all) => setAll(user, all?.owned ?? [], all?.member ?? []))
        .catch(() => {
          /* keep cached rail */
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const boards: ProjectBoard[] = useMemo(
    () => project?.boards ?? [],
    [project],
  );
  const archivedBoards: ProjectBoard[] = project?.archived_boards ?? [];
  const isOwner = project?.owner_id === user?.id;
  const myRole = project?.members?.find((m) => m.id === user?.id)?.role;
  const canManage = isOwner || myRole === "owner";
  const roleLabel = isOwner ? "Owner" : (myRole ?? "Member");

  const totals = useMemo(() => {
    let done = 0,
      total = 0;
    for (const b of boards) {
      const bp = boardProgress(b);
      done += bp.done;
      total += bp.total;
    }
    return {
      cards: total,
      pct: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }, [boards]);

  const visibleBoards = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = boards.filter((b) => b.name.toLowerCase().includes(q));
    return list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "progress")
        return boardProgress(b).pct - boardProgress(a).pct;
      if (sort === "cards") return (b.cards_count ?? 0) - (a.cards_count ?? 0);
      return (
        new Date(b.updated_at ?? 0).getTime() -
        new Date(a.updated_at ?? 0).getTime()
      );
    });
  }, [boards, query, sort]);

  // ── handlers ──
  async function handleSaveBoard(data: BoardFormData) {
    if (modal?.type === "board-edit") {
      const updated = await updateBoard(data.id!, {
        name: data.name,
        description: data.description,
        project_id: data.project_id,
      });
      if (data.project_id !== project!.id) {
        setProject((p) => ({
          ...p!,
          boards: (p!.boards ?? []).filter((b) => b.id !== data.id),
          boards_count: Math.max(0, (p!.boards_count ?? 1) - 1),
        }));
        router.push(`/projects/${data.project_id}`);
      } else {
        setProject((p) => ({
          ...p!,
          boards: (p!.boards ?? []).map((b) =>
            b.id === data.id ? { ...b, ...updated } : b,
          ),
        }));
      }
      setModal(null);
      return;
    }
    const saved = await createBoard({
      name: data.name,
      description: data.description,
      project_id: data.project_id,
      type: data.type,
      currency: data.currency,
    });
    setProject((p) => ({
      ...p!,
      boards: [
        ...(p!.boards ?? []),
        {
          ...saved,
          cards_count: 0,
          flow: { todo: 0, doing: 0, done: 0 },
          owner: user ?? undefined,
          shared_with: [],
        },
      ],
      boards_count: (p!.boards_count ?? 0) + 1,
    }));
    setModal(null);
  }

  async function handleDeleteBoard(boardId: number) {
    await deleteBoard(boardId);
    setProject((p) => ({
      ...p!,
      boards: (p!.boards ?? []).filter((b) => b.id !== boardId),
      boards_count: Math.max(0, (p!.boards_count ?? 1) - 1),
    }));
    setModal(null);
  }

  async function handleRestore(boardId: number) {
    const restored = archivedBoards.find((b) => b.id === boardId);
    await unarchiveBoard(boardId);
    setProject((p) => ({
      ...p!,
      archived_boards: (p!.archived_boards ?? []).filter(
        (b) => b.id !== boardId,
      ),
      boards: restored
        ? [...(p!.boards ?? []), { ...restored, archived_at: null }]
        : (p!.boards ?? []),
      boards_count: (p!.boards_count ?? 0) + 1,
    }));
  }

  function handleBoardClick(board: ProjectBoard) {
    if (editMode && isOwner) {
      setModal({ type: "board-edit", board });
      return;
    }
    router.push(`/boards/${board.id}`);
  }

  function handleCreateProject(p: ProjectInterface) {
    setAll(user, [...owned, p], member);
    setModal(null);
    router.push(`/projects/${p.id}`);
  }

  if (!hydrated && contentLoading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ minHeight: "calc(100vh - var(--app-header-h, 56px))" }}
      >
        <p
          className="cf-mono uppercase tracking-widest chrome-text"
          style={{ fontSize: 12, color: "var(--cf-phosphor)" }}
        >
          Loading…
        </p>
      </div>
    );
  }

  const IconKey = ({
    icon,
    label,
    onClick,
    variant = "ghost",
  }: {
    icon: typeof faGear;
    label: string;
    onClick: () => void;
    variant?: "ghost" | "cyan" | "magenta";
  }) => (
    <button
      onClick={onClick}
      className={`aero-btn aero-btn--${variant} uppercase tracking-widest font-bold px-3 py-1.5 text-[9px] inline-flex items-center gap-1.5`}
    >
      <Icon icon={icon} /> <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div
      className="flex overflow-hidden"
      style={{ height: "calc(100vh - var(--app-header-h, 56px))" }}
    >
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Left rail ── */}
      <aside
        className={`glass-panel rounded-none z-40 lg:z-auto flex flex-col h-full w-56 flex-shrink-0 fixed lg:relative transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ borderRight: "1px solid var(--cf-edge)" }}
      >
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 px-4 py-4 hover:bg-[#1c1a16] transition-colors cursor-pointer"
          style={{ borderBottom: "1px solid var(--cf-edge)" }}
        >
          <Icon
            icon={faArrowLeft}
            style={{ fontSize: 10, color: "var(--cf-text-muted)" }}
          />
          <span
            className="cf-label uppercase tracking-widest font-bold"
            style={{ fontSize: 9, color: "var(--cf-text)" }}
          >
            All projects
          </span>
        </button>
        <div className="flex-1 min-h-0">
          <ProjectRail
            owned={owned}
            member={member}
            activeId={projectId}
            onSelect={(id) => {
              router.push(`/projects/${id}`);
              setSidebarOpen(false);
            }}
            onNewProject={() => {
              setModal({ type: "project-new" });
              setSidebarOpen(false);
            }}
          />
        </div>
      </aside>

      {/* ── Main ── */}
      <main
        className="flex-1 flex flex-col overflow-hidden"
        style={{
          opacity: contentLoading ? 0.35 : 1,
          pointerEvents: contentLoading ? "none" : undefined,
          transition: "opacity 200ms ease",
        }}
      >
        {/* status strip */}
        <div className="flex gap-1 px-5 pt-3">
          {[
            "var(--cf-phosphor)",
            "var(--cf-amber)",
            "var(--cf-cyan)",
            "var(--cf-red)",
            "var(--cf-amber)",
            "var(--cf-phosphor)",
          ].map((c, i) => (
            <div
              key={i}
              style={{ background: c, boxShadow: `0 0 5px ${c}`, height: 3 }}
              className="flex-1 rounded-sm"
            />
          ))}
        </div>

        {/* hero */}
        <div
          className="px-5 pt-4 pb-4"
          style={{ borderBottom: "1.5px solid var(--cf-edge)" }}
        >
          <div className="flex items-start gap-3 flex-wrap">
            <button
              className="lg:hidden p-1 cursor-pointer mt-1"
              style={{ color: "var(--cf-text)" }}
              onClick={() => setSidebarOpen((s) => !s)}
            >
              <Icon icon={faBars} />
            </button>
            <span
              className="cf-led flex-shrink-0 mt-2"
              style={{
                width: 13,
                height: 13,
                background: project?.color,
                boxShadow: `0 0 10px ${project?.color}`,
              }}
            />
            <div className="min-w-0">
              <p
                className="chrome-text font-bold"
                style={{ fontSize: 26, lineHeight: 1 }}
              >
                {project?.name}
              </p>
              {project?.description && (
                <p
                  className="cf-mono mt-1"
                  style={{ fontSize: 11, color: "var(--cf-text-muted)" }}
                >
                  {project.description}
                </p>
              )}
              <span
                className="inline-flex items-center gap-1.5 uppercase mt-2"
                style={{
                  fontSize: 8.5,
                  letterSpacing: "0.12em",
                  color: "var(--cf-amber)",
                  border: "1px solid rgba(255,176,0,0.5)",
                  background: "rgba(255,176,0,0.14)",
                  borderRadius: 4,
                  padding: "3px 8px",
                }}
              >
                <Icon icon={faCrown} style={{ fontSize: 9 }} /> {roleLabel}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap ml-auto">
              {canManage && (
                <IconKey
                  icon={faUsers}
                  label="Members"
                  onClick={() =>
                    router.push(`/projects/${projectId}/settings?tab=members`)
                  }
                />
              )}
              {canManage && (
                <IconKey
                  icon={faGear}
                  label="Settings"
                  onClick={() => router.push(`/projects/${projectId}/settings`)}
                />
              )}
              {isOwner && (
                <IconKey
                  icon={faPen}
                  label={editMode ? "Done" : "Edit"}
                  variant={editMode ? "magenta" : "ghost"}
                  onClick={() => setEditMode((e) => !e)}
                />
              )}
              {isOwner && (
                <IconKey
                  icon={faPlus}
                  label="Board"
                  variant="cyan"
                  onClick={() => setModal({ type: "board-new" })}
                />
              )}
            </div>
          </div>

          {/* stat tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3.5">
            <StatTile label="Boards" value={boards.length} />
            <StatTile label="Cards" value={totals.cards} />
            <StatTile
              label="Progress"
              value={totals.pct}
              suffix="%"
              bar={totals.pct}
            />
            <StatTile label="Members" value={project?.members?.length ?? 0} />
          </div>
        </div>

        {/* toolbar */}
        <div className="flex items-center gap-2 px-5 py-3 flex-wrap">
          <div className="relative flex-1 min-w-[150px]">
            <Icon
              icon={faMagnifyingGlass}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 12,
                color: "#5a6050",
              }}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter boards"
              className="glass-input cf-mono"
              style={{ fontSize: 11, paddingLeft: 28 }}
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="cf-mono cursor-pointer"
            style={{
              border: "1.5px solid var(--cf-edge)",
              background: "#2a2823",
              color: "var(--cf-text)",
              fontSize: 10,
              borderRadius: 5,
              padding: "7px 8px",
            }}
          >
            <option value="recent">Recent</option>
            <option value="name">Name</option>
            <option value="progress">Progress</option>
            <option value="cards">Cards</option>
          </select>
          <div
            className="inline-flex rounded-md overflow-hidden"
            style={{ border: "1.5px solid var(--cf-edge)" }}
          >
            {(["grid", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-label={`${v} view`}
                className="px-2.5 py-1.5 cursor-pointer"
                style={{
                  background: view === v ? "#3a3832" : "#2a2823",
                  color: view === v ? "var(--cf-cyan)" : "var(--cf-text-dim)",
                }}
              >
                <Icon
                  icon={v === "grid" ? faBorderAll : faList}
                  style={{ fontSize: 13 }}
                />
              </button>
            ))}
          </div>
          {archivedBoards.length > 0 && (
            <button
              onClick={() => setShowArchived((s) => !s)}
              className="cf-mono uppercase inline-flex items-center gap-2 cursor-pointer"
              style={{
                fontSize: 9,
                letterSpacing: "0.08em",
                color: showArchived ? "var(--cf-cyan)" : "var(--cf-text-muted)",
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 15,
                  borderRadius: 8,
                  background: showArchived
                    ? "rgba(111,224,255,0.25)"
                    : "#11140f",
                  border: `1px solid ${showArchived ? "var(--cf-cyan)" : "var(--cf-edge)"}`,
                  position: "relative",
                  display: "inline-block",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 1,
                    left: showArchived ? 14 : 1,
                    width: 11,
                    height: 11,
                    borderRadius: "50%",
                    background: showArchived
                      ? "var(--cf-cyan)"
                      : "var(--cf-text-dim)",
                    boxShadow: showArchived
                      ? "0 0 6px var(--cf-cyan)"
                      : undefined,
                    transition: "left .15s",
                  }}
                />
              </span>
              Archived ({archivedBoards.length})
            </button>
          )}
        </div>

        {/* board grid / archived / empty */}
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {showArchived ? (
            <div
              className={
                view === "grid" ? "grid gap-3.5" : "flex flex-col gap-3.5"
              }
              style={
                view === "grid"
                  ? {
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(248px, 1fr))",
                    }
                  : undefined
              }
            >
              {archivedBoards.map((b) => (
                <div key={b.id} className="relative opacity-80">
                  <BoardCard
                    board={b}
                    projectColor={project?.color ?? "#888"}
                    onClick={() => router.push(`/boards/${b.id}`)}
                  />
                  {canManage && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(b.id);
                      }}
                      className="aero-btn aero-btn--ghost absolute top-2 right-2 uppercase tracking-widest font-bold px-2 py-1 text-[8px] inline-flex items-center gap-1"
                    >
                      <Icon icon={faRotateLeft} style={{ fontSize: 8 }} />{" "}
                      Restore
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : boards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p style={{ fontSize: 40, color: "var(--cf-edge)" }}>▦</p>
              <p
                className="cf-label uppercase tracking-widest mt-3"
                style={{ fontSize: 11, color: "var(--cf-text-muted)" }}
              >
                No boards yet
              </p>
              {isOwner && (
                <button
                  onClick={() => setModal({ type: "board-new" })}
                  className="aero-btn aero-btn--cyan mt-4 uppercase tracking-widest font-bold px-4 py-2 text-[9px]"
                >
                  + Create first board
                </button>
              )}
            </div>
          ) : visibleBoards.length === 0 ? (
            <p
              className="cf-mono text-center py-10"
              style={{ fontSize: 11, color: "var(--cf-text-dim)" }}
            >
              No boards match “{query}”.
            </p>
          ) : (
            <div
              className={
                view === "grid" ? "grid gap-3.5" : "flex flex-col gap-3.5"
              }
              style={
                view === "grid"
                  ? {
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(248px, 1fr))",
                    }
                  : undefined
              }
            >
              {visibleBoards.map((b) => (
                <BoardCard
                  key={b.id}
                  board={b}
                  projectColor={project?.color ?? "#888"}
                  editMode={editMode}
                  isOwner={isOwner}
                  onClick={() => handleBoardClick(b)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── Right panel: members (wide screens) ── */}
      <aside
        className="glass-panel rounded-none hidden lg:flex flex-col w-56 flex-shrink-0 overflow-hidden"
        style={{
          borderLeft: "1px solid var(--cf-edge)",
          opacity: contentLoading ? 0.35 : 1,
          pointerEvents: contentLoading ? "none" : undefined,
          transition: "opacity 200ms ease",
        }}
      >
        {project && <MembersPanel project={project} />}
      </aside>

      {/* ── Modals ── */}
      {modal && (
        <Modal onClose={() => setModal(null)}>
          {modal.type === "board-new" && (
            <BoardFormModal
              board={null}
              projectId={project!.id}
              projectColor={project!.color}
              ownedProjects={owned}
              onSave={handleSaveBoard}
              onClose={() => setModal(null)}
            />
          )}
          {modal.type === "board-edit" && (
            <BoardFormModal
              board={modal.board}
              projectId={project!.id}
              projectColor={project!.color}
              ownedProjects={owned}
              onSave={handleSaveBoard}
              onDelete={() => handleDeleteBoard(modal.board.id)}
              onClose={() => setModal(null)}
            />
          )}
          {modal.type === "project-new" && (
            <NewProjectModal
              onCreate={handleCreateProject}
              onClose={() => setModal(null)}
            />
          )}
        </Modal>
      )}
    </div>
  );
}
