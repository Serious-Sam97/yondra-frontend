"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { SprintReport } from "@/components/ui/SprintReport";
import type { BoardInterface } from "@/interfaces/BoardInterface";
import type { SprintInterface } from "@/interfaces/SprintInterface";
import { ApiError, fetchBoard } from "@/lib/api";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

type Params = { id: string; sprintId: string };

export default function SprintReportPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id, sprintId } = use(params);
  const router = useRouter();

  const [board, setBoard] = useState<BoardInterface | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const boardHref = `/boards/${id}`;
  const sprint: SprintInterface | undefined = (board?.sprints ?? []).find(
    (s) => s.id === Number(sprintId),
  );

  useDocumentTitle(
    sprint?.name
      ? `Yondra - ${sprint.name} · Report`
      : "Yondra - Sprint report",
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchBoard(Number(id), controller.signal)
      .then((data: BoardInterface) => setBoard(data))
      .catch((e) => {
        if (controller.signal.aborted) return;
        if (e instanceof ApiError && (e.status === 404 || e.status === 403)) {
          setLoadError(
            "This board doesn't exist or you no longer have access to it.",
          );
        } else {
          setLoadError(
            "Could not load the sprint report. Check your connection and try again.",
          );
        }
      });
    return () => controller.abort();
  }, [id]);

  if (loadError || (board && !sprint)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-panel flex flex-col items-center gap-4 px-8 py-10 text-center max-w-sm">
          <p
            className="cf-mono text-sm font-bold uppercase tracking-widest"
            style={{ color: "var(--cf-red)" }}
          >
            Report unavailable
          </p>
          <p
            className="cf-mono text-xs"
            style={{ color: "var(--cf-text-muted)" }}
          >
            {loadError ?? "This sprint no longer exists on this board."}
          </p>
          <button
            type="button"
            onClick={() => router.push(boardHref)}
            className="aero-btn aero-btn--cyan text-xs uppercase tracking-widest font-bold px-4 py-2 cursor-pointer"
          >
            Back to board
          </button>
        </div>
      </div>
    );
  }

  if (!board || !sprint) {
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
    <div className="min-h-screen px-4 py-6 md:px-8 md:py-10 max-w-6xl mx-auto">
      <SprintReport
        variant="page"
        boardId={board.id}
        sprint={sprint}
        sprints={board.sprints ?? []}
        cards={(board.cards ?? []).filter((c) => c.sprint_id === sprint.id)}
        onClose={() => router.push(boardHref)}
      />
    </div>
  );
}
