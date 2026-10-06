"use client";

import {
  faArrowLeft,
  faBorderAll,
  faList,
  faMagnifyingGlass,
  faRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import {
  type CollisionDetection,
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import BoardCard from "@/components/projects/BoardCard";
import BoardSpineRow from "@/components/projects/BoardSpineRow";
import ProjectDeck from "@/components/projects/ProjectDeck";
import ProjectRail from "@/components/projects/ProjectRail";
import SortableBoardCard from "@/components/projects/SortableBoardCard";
import { useProjects } from "@/components/projects/ProjectsProvider";
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
  reorderBoards,
  unarchiveBoard,
  updateBoard,
} from "@/lib/api";
import { fetchUser } from "@/lib/auth";
import { getEcho } from "@/lib/echo";
import {
  boardFlow,
  boardProgress,
  isRecording,
  PROJECT_COLORS,
} from "@/lib/ui";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

type SortKey = "manual" | "recent" | "name" | "progress" | "cards";

// Transport-key labels for the sort group ("cards" reads as tape length).
const SORTS: { key: SortKey; label: string }[] = [
  { key: "manual", label: "Manual" },
  { key: "recent", label: "Recent" },
  { key: "name", label: "Name" },
  { key: "progress", label: "Progress" },
  { key: "cards", label: "Length" },
];

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
  const [sort, setSort] = useState<SortKey>("manual");
  // Board id currently being dragged (drives the DragOverlay preview).
  const [activeDragId, setActiveDragId] = useState<number | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showArchived, setShowArchived] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" focuses the board filter (unless the user is already typing somewhere).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))
      )
        return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  // Live board list: when anyone creates a board in this project, add it here.
  useEffect(() => {
    if (!projectId || Number.isNaN(projectId)) return;

    const channel = getEcho().private(`project.${projectId}`);
    channel.listen(
      ".project.event",
      (e: { type: string; payload: ProjectBoard & { board_id?: number } }) => {
        // A board dragged out to another project (YON-125): drop it from this list.
        if (e.type === "board.removed") {
          const removedId = e.payload.board_id;
          setProject((p) =>
            p
              ? {
                  ...p,
                  boards: (p.boards ?? []).filter((x) => x.id !== removedId),
                  boards_count: Math.max(0, (p.boards_count ?? 1) - 1),
                }
              : p,
          );
          return;
        }
        if (e.type !== "board.created") return;
        const b = e.payload;
        setProject((p) => {
          if (!p || (p.boards ?? []).some((x) => x.id === b.id)) return p; // dedupe (incl. self-echo)
          const item: ProjectBoard = {
            ...b,
            cards_count: b.cards_count ?? 0,
            flow: b.flow ?? { todo: 0, doing: 0, done: 0 },
            shared_with: b.shared_with ?? [],
          };
          return {
            ...p,
            boards: [...(p.boards ?? []), item],
            boards_count: (p.boards_count ?? 0) + 1,
          };
        });
      },
    );

    return () => {
      getEcho().leave(`project.${projectId}`);
    };
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
    let total = 0,
      recording = 0;
    const flow = { todo: 0, doing: 0, done: 0 };
    for (const b of boards) {
      total += boardProgress(b).total;
      const f = boardFlow(b);
      flow.todo += f.todo;
      flow.doing += f.doing;
      flow.done += f.done;
      if (isRecording(b)) recording++;
    }
    return { cards: total, flow, recording };
  }, [boards]);

  const visibleBoards = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = boards.filter((b) => b.name.toLowerCase().includes(q));
    return list.sort((a, b) => {
      if (sort === "manual") return (a.position ?? 0) - (b.position ?? 0);
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
    // Dedupe by id: the `.project.event` self-echo may have already inserted this board
    // (the WS push can beat this POST's response), so skip the optimistic add if it's
    // already present — otherwise the board shows twice until the next refresh.
    setProject((p) => {
      if (!p) return p;
      if ((p.boards ?? []).some((b) => b.id === saved.id)) return p;
      return {
        ...p,
        boards: [
          ...(p.boards ?? []),
          {
            ...saved,
            cards_count: 0,
            flow: { todo: 0, doing: 0, done: 0 },
            owner: user ?? undefined,
            shared_with: [],
          },
        ],
        boards_count: (p.boards_count ?? 0) + 1,
      };
    });
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

  // ── Board drag-and-drop (YON-125) ──
  // Only project owners can reorder / move boards, and only in Manual sort with no
  // active search (a filtered subset can't be re-sequenced unambiguously).
  const dndEnabled = canManage && sort === "manual" && query.trim() === "";

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 350, tolerance: 5 },
    }),
  );

  // Prefer a pointer hit (over a card or a rail channel); fall back to nearest.
  const collisionDetection: CollisionDetection = (args) => {
    const hits = pointerWithin(args);
    return hits.length > 0 ? hits : closestCenter(args);
  };

  const activeDragBoard = boards.find((b) => b.id === activeDragId) ?? null;

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(Number(String(event.active.id).replace("board-", "")));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const activeBoardId = Number(String(active.id).replace("board-", ""));
    const overId = String(over.id);

    // Dropped onto another project's rail channel → move the board there.
    if (overId.startsWith("proj-")) {
      const targetProjectId = Number(overId.replace("proj-", ""));
      if (targetProjectId === projectId) return;
      const moved = boards.find((b) => b.id === activeBoardId);
      if (!moved) return;

      // Optimistically remove from this project; the destination picks it up via
      // the board.created broadcast (or on next load).
      setProject((p) =>
        p
          ? {
              ...p,
              boards: (p.boards ?? []).filter((b) => b.id !== activeBoardId),
              boards_count: Math.max(0, (p.boards_count ?? 1) - 1),
            }
          : p,
      );
      try {
        await updateBoard(activeBoardId, { project_id: targetProjectId });
      } catch {
        // Restore on failure.
        setProject((p) =>
          p
            ? {
                ...p,
                boards: [...(p.boards ?? []), moved],
                boards_count: (p.boards_count ?? 0) + 1,
              }
            : p,
        );
      }
      return;
    }

    // Otherwise: reorder within this project's grid.
    if (String(active.id) === overId) return;
    const oldIndex = visibleBoards.findIndex((b) => b.id === activeBoardId);
    const newIndex = visibleBoards.findIndex((b) => `board-${b.id}` === overId);
    if (oldIndex < 0 || newIndex < 0) return;

    const orderedIds = arrayMove(visibleBoards, oldIndex, newIndex).map(
      (b) => b.id,
    );
    const prevBoards = project?.boards ?? [];
    const posById = new Map(orderedIds.map((id, i) => [id, i]));

    // Optimistically restamp positions so the Manual sort reflects the drop.
    setProject((p) =>
      p
        ? {
            ...p,
            boards: (p.boards ?? []).map((b) =>
              posById.has(b.id) ? { ...b, position: posById.get(b.id) } : b,
            ),
          }
        : p,
    );
    try {
      await reorderBoards(projectId, orderedIds);
    } catch {
      setProject((p) => (p ? { ...p, boards: prevBoards } : p));
    }
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

  return (
    <div
      className="pj-page flex overflow-hidden"
      style={{ height: "calc(100vh - var(--app-header-h, 56px))" }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDragId(null)}
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
              enableBoardDrop={dndEnabled}
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
          className="flex-1 min-w-0 overflow-y-auto"
          style={{
            opacity: contentLoading ? 0.35 : 1,
            pointerEvents: contentLoading ? "none" : undefined,
            transition: "opacity 200ms ease",
          }}
        >
          <div className="px-5 pt-4">
            <ProjectDeck
              project={project}
              roleLabel={roleLabel}
              isOwner={isOwner}
              canManage={canManage}
              editMode={editMode}
              stats={{
                cards: totals.cards,
                boards: boards.length,
                archived: archivedBoards.length,
                recording: totals.recording,
                flow: totals.flow,
              }}
              onToggleSidebar={() => setSidebarOpen((s) => !s)}
              onToggleEdit={() => setEditMode((e) => !e)}
              onNewBoard={() => setModal({ type: "board-new" })}
              onOpenSettings={() =>
                router.push(`/projects/${projectId}/settings`)
              }
              onOpenMembers={() =>
                router.push(`/projects/${projectId}/settings?tab=members`)
              }
            />
          </div>

          {/* toolbar */}
          <div className="flex items-center gap-x-3 gap-y-2.5 px-5 pt-4 pb-3.5 flex-wrap">
            <span className="pt-count">
              <b>{String(boards.length).padStart(2, "0")}</b>
              {boards.length === 1 ? "tape" : "tapes"}
            </span>
            <div className="pt-search">
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
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter boards…"
                aria-label="Filter boards"
                className="glass-input cf-mono"
                style={{ fontSize: 11, paddingLeft: 28, paddingRight: 30 }}
              />
              {!query && <kbd aria-hidden>/</kbd>}
            </div>
            <div
              className="pt-transport"
              role="radiogroup"
              aria-label="Sort boards"
              onKeyDown={(e) => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                e.preventDefault();
                const i = SORTS.findIndex((o) => o.key === sort);
                const next =
                  SORTS[
                    (i + (e.key === "ArrowRight" ? 1 : -1) + SORTS.length) %
                      SORTS.length
                  ];
                setSort(next.key);
                (
                  e.currentTarget.querySelector(
                    `[data-sort="${next.key}"]`,
                  ) as HTMLButtonElement | null
                )?.focus();
              }}
            >
              {SORTS.map((o) => (
                // biome-ignore lint/a11y/useSemanticElements: styled transport keys acting as a radio group (arrow-key nav handled above)
                <button
                  key={o.key}
                  type="button"
                  role="radio"
                  data-sort={o.key}
                  aria-checked={sort === o.key}
                  tabIndex={sort === o.key ? 0 : -1}
                  onClick={() => setSort(o.key)}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <div className="flex-1" />
            {archivedBoards.length > 0 && (
              <button
                type="button"
                role="switch"
                aria-checked={showArchived}
                onClick={() => setShowArchived((s) => !s)}
                className="pt-switch"
              >
                <span className="track">
                  <span className="knob" />
                </span>
                Archived · {archivedBoards.length}
              </button>
            )}
            {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would break the joined key-strip styling */}
            <div className="pt-transport" role="group" aria-label="Layout">
              {(["grid", "list"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  aria-label={`${v} view`}
                  aria-pressed={view === v}
                  style={{ padding: "8px 11px" }}
                >
                  <Icon
                    icon={v === "grid" ? faBorderAll : faList}
                    style={{ fontSize: 12 }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* board grid / archived / empty */}
          <div className="px-5 pb-10">
            {showArchived ? (
              <div
                className={
                  view === "grid"
                    ? "grid gap-x-5 gap-y-6 pt-2"
                    : "flex flex-col gap-2.5 pt-1"
                }
                style={
                  view === "grid"
                    ? {
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(min(300px, 100%), 1fr))",
                      }
                    : undefined
                }
              >
                {archivedBoards.map((b) => {
                  const Item = view === "grid" ? BoardCard : BoardSpineRow;
                  return (
                    <div key={b.id} className="relative">
                      <Item
                        board={b}
                        projectColor={project?.color ?? "#888"}
                        archived
                        onClick={() => router.push(`/boards/${b.id}`)}
                      />
                      {canManage && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRestore(b.id);
                          }}
                          className="cs-restore"
                          style={
                            view === "list"
                              ? {
                                  top: "50%",
                                  right: 110,
                                  transform: "translateY(-50%)",
                                }
                              : undefined
                          }
                        >
                          <Icon icon={faRotateLeft} style={{ fontSize: 8 }} />
                          Restore
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : boards.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16">
                <div className="cs-blank" aria-hidden>
                  <span />
                  <span />
                </div>
                <p
                  className="cf-label uppercase tracking-widest mt-4"
                  style={{ fontSize: 11, color: "var(--cf-text-muted)" }}
                >
                  No tapes on this shelf yet
                </p>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => setModal({ type: "board-new" })}
                    className="aero-btn aero-btn--cyan mt-4 uppercase tracking-widest font-bold px-4 py-2 text-[9px]"
                  >
                    + Record first board
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
                  view === "grid"
                    ? "grid gap-x-5 gap-y-6 pt-2"
                    : "flex flex-col gap-2.5 pt-1"
                }
                style={
                  view === "grid"
                    ? {
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(min(300px, 100%), 1fr))",
                      }
                    : undefined
                }
              >
                {dndEnabled ? (
                  <SortableContext
                    items={visibleBoards.map((b) => `board-${b.id}`)}
                    strategy={rectSortingStrategy}
                  >
                    {visibleBoards.map((b) => (
                      <SortableBoardCard
                        key={b.id}
                        board={b}
                        projectColor={project?.color ?? "#888"}
                        editMode={editMode}
                        isOwner={isOwner}
                        variant={view === "grid" ? "tape" : "row"}
                        onClick={() => handleBoardClick(b)}
                      />
                    ))}
                  </SortableContext>
                ) : (
                  visibleBoards.map((b) => {
                    const Item = view === "grid" ? BoardCard : BoardSpineRow;
                    return (
                      <Item
                        key={b.id}
                        board={b}
                        projectColor={project?.color ?? "#888"}
                        editMode={editMode}
                        isOwner={isOwner}
                        onClick={() => handleBoardClick(b)}
                      />
                    );
                  })
                )}
              </div>
            )}
          </div>
        </main>

        <DragOverlay>
          {/* A shrunken, tilted ghost so the rail's drop targets stay visible. */}
          {activeDragBoard ? (
            <div className={`cs-drag-ghost${view === "list" ? " is-row" : ""}`}>
              {view === "grid" ? (
                <BoardCard
                  board={activeDragBoard}
                  projectColor={project?.color ?? "#888"}
                />
              ) : (
                <BoardSpineRow
                  board={activeDragBoard}
                  projectColor={project?.color ?? "#888"}
                />
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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
