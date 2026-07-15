"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { Board } from "@/components/layout/Board";
import type { BoardInterface } from "@/interfaces/BoardInterface";
import { ApiError, deleteBoard, fetchBoard } from "@/lib/api";
import { fetchUser } from "@/lib/auth";
import {
  deleteDemoBoard,
  loadDemoBoardData,
  loadDemoBoards,
} from "@/lib/demoStorage";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

type Params = { id: string };

export default function BoardPage({ params }: { params: Promise<Params> }) {
  const { id } = use(params);
  const router = useRouter();

  const [board, setBoard] = useState<BoardInterface>({
    id: 0,
    name: "",
    description: "",
    cards: [],
    sections: [],
    user_id: undefined,
    owner: undefined,
    shared_with: [],
  });
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const isDemo = id === "demo" || id.startsWith("demo-");
  const isOwner = board.user_id === currentUserId;

  useDocumentTitle(board.name ? `Yondra - ${board.name}` : "Yondra");
  // Prefer the server-computed, project-aware capabilities; fall back to the local
  // board-owner/share check for demo boards (which have no backend).
  const canWrite = isDemo || board.can_write === true || isOwner;
  const isReadOnly = !canWrite;

  const boardUsers = isDemo
    ? []
    : [board.owner, ...(board.shared_with ?? [])].filter(
        (u): u is NonNullable<typeof u> => !!u,
      );

  const canManage = isDemo || board.can_manage === true || isOwner;

  async function handleDeleteBoard() {
    if (isDemo) {
      deleteDemoBoard(id);
      router.push("/demo");
      return;
    }
    await deleteBoard(board.id);
    router.push(
      board.project_id ? `/projects/${board.project_id}` : "/dashboard",
    );
  }

  useEffect(() => {
    if (isDemo) {
      const boards = loadDemoBoards();
      const boardMeta = boards.find((b) => b.id === id);
      const demo = loadDemoBoardData(id);
      setBoard({
        id: 0,
        name: boardMeta?.name ?? "Demo Board",
        type: boardMeta?.type ?? "kanban",
        currency: boardMeta?.currency ?? "BRL",
        description:
          boardMeta?.description ??
          "Try it out — everything is saved in your browser.",
        sections: demo.sections,
        cards: demo.cards,
        tags: demo.tags,
        sprints: demo.sprints ?? [],
        shared_with: [],
      });
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);

    Promise.all([
      fetchBoard(Number(id), controller.signal),
      fetchUser(controller.signal),
    ])
      .then(([data, user]) => {
        setBoard({
          id: data.id,
          name: data.name,
          type: data.type ?? "kanban",
          currency: data.currency ?? "BRL",
          description: data.description ?? "",
          sections: data.sections ?? [],
          cards: data.cards ?? [],
          tags: data.tags ?? [],
          sprints: data.sprints ?? [],
          user_id: data.user_id,
          project_id: data.project_id ?? null,
          ticket_prefix: data.ticket_prefix ?? null,
          done_section_id: data.done_section_id ?? null,
          qa_enabled: data.qa_enabled ?? false,
          owner: data.owner,
          shared_with: data.shared_with ?? [],
          can_write: data.can_write,
          can_manage: data.can_manage,
        });
        setCurrentUserId(user?.id ?? null);
        setLoading(false);
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        setLoading(false);
        if (e instanceof ApiError && (e.status === 404 || e.status === 403)) {
          setLoadError(
            "This board doesn't exist or you no longer have access to it.",
          );
        } else {
          setLoadError(
            "Could not load the board. Check your connection and try again.",
          );
        }
      });

    return () => controller.abort();
  }, [id]);

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-panel flex flex-col items-center gap-4 px-8 py-10 text-center max-w-sm">
          <p
            className="cf-mono text-sm font-bold uppercase tracking-widest"
            style={{ color: "var(--cf-red)" }}
          >
            Board unavailable
          </p>
          <p
            className="cf-mono text-xs"
            style={{ color: "var(--cf-text-muted)" }}
          >
            {loadError}
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="aero-btn aero-btn--cyan text-xs uppercase tracking-widest font-bold px-4 py-2 cursor-pointer"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div
          className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
          style={{
            borderColor: "var(--cf-phosphor)",
            borderTopColor: "transparent",
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-3 pb-6 md:px-8 md:pt-4 md:pb-8">
      {/* Board — the neon status rail + identity (Back · name · Settings · Share)
          now live fused into the board faceplate itself (BoardTopBar). */}
      <Board
        id={board.id}
        name={board.name}
        projectId={board.project_id ?? null}
        type={board.type}
        currency={board.currency}
        description={board.description}
        ticket_prefix={board.ticket_prefix}
        cards={board.cards}
        sections={board.sections}
        sprints={board.sprints}
        size="75"
        isDemo={isDemo}
        demoId={id}
        boardUsers={boardUsers}
        tags={board.tags ?? []}
        isReadOnly={isReadOnly}
        currentUserId={currentUserId ?? 0}
        qaEnabled={board.qa_enabled ?? false}
        settingsOpen={settingsOpen}
        onSettingsClose={() => setSettingsOpen(false)}
        canManage={canManage}
        showShare={!isDemo}
        backTitle={
          isDemo
            ? "Back to demo"
            : board.project_id
              ? "Back to project"
              : "Back to boards"
        }
        onBack={() =>
          router.push(
            isDemo
              ? "/demo"
              : board.project_id
                ? `/projects/${board.project_id}`
                : "/dashboard",
          )
        }
        onOpenSettings={() =>
          isDemo
            ? setSettingsOpen(true)
            : router.push(`/boards/${id}/settings`)
        }
        onOpenShare={() =>
          router.push(`/boards/${id}/settings?tab=members`)
        }
        onBoardMetaSaved={(n, d, prefix) =>
          setBoard((b) => ({
            ...b,
            name: n,
            description: d,
            ticket_prefix: prefix || null,
          }))
        }
        onDeleteBoard={handleDeleteBoard}
      />
    </div>
  );
}
