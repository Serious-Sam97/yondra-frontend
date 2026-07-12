"use client";

import { useRouter } from "next/navigation";
import { type Dispatch, type SetStateAction, useState } from "react";
import type { CardInterface } from "@/interfaces/CardInterface";
import type { SprintInterface } from "@/interfaces/SprintInterface";
import {
  completeSprint as apiCompleteSprint,
  createSprint as apiCreateSprint,
  deleteSprint as apiDeleteSprint,
  startSprint as apiStartSprint,
  fetchSprints,
  updateSprint,
} from "@/lib/api";
import {
  demoCompleteSprint,
  demoCreateSprint,
  demoDeleteSprint,
  demoStartSprint,
  demoUpdateSprint,
  loadDemoSprints,
} from "@/lib/demoStorage";

interface UseSprintsParams {
  boardId: number;
  isDemo: boolean;
  demoId: string;
  sprints: SprintInterface[];
  setSprints: Dispatch<SetStateAction<SprintInterface[]>>;
  setCards: Dispatch<SetStateAction<CardInterface[]>>;
  reportSyncError: (message: string) => void;
}

// Scrum sprint lifecycle: create/start/complete/delete/report plus the two sprint
// modals' state. Demo boards mirror the backend locally via demoStorage.
export function useSprints({
  boardId,
  isDemo,
  demoId,
  sprints,
  setSprints,
  setCards,
  reportSyncError,
}: UseSprintsParams) {
  const router = useRouter();
  // Scrum modals: the sprint being completed, and the sprint whose report is open.
  const [completingSprint, setCompletingSprint] =
    useState<SprintInterface | null>(null);
  const [reportSprint, setReportSprint] = useState<SprintInterface | null>(
    null,
  );
  // Real boards open the report on its own route (roomier than a modal); demo boards
  // have no server route to fetch from, so they keep the in-memory modal.
  const openReport = (sprint: SprintInterface) =>
    isDemo
      ? setReportSprint(sprint)
      : router.push(`/boards/${boardId}/report/${sprint.id}`);

  // Re-read the whole sprint list (dates cascade server-side, so a single response isn't enough).
  const refreshSprints = async () => {
    if (isDemo) {
      setSprints(loadDemoSprints(demoId) as SprintInterface[]);
      return;
    }
    try {
      const list = await fetchSprints(boardId);
      if (Array.isArray(list)) setSprints(list);
    } catch {
      /* keep current */
    }
  };

  const handleCreateSprint = async (data: {
    name: string;
    start_date: string;
    end_date: string;
  }) => {
    try {
      if (isDemo)
        demoCreateSprint(demoId, data.name, data.start_date, data.end_date);
      else await apiCreateSprint(boardId, data);
      await refreshSprints();
    } catch {
      reportSyncError("Could not create sprint — try again");
    }
  };

  const handleUpdateSprintDates = async (
    sprintId: number,
    dates: { start_date: string; end_date: string },
  ) => {
    try {
      if (isDemo) demoUpdateSprint(demoId, sprintId, dates);
      else await updateSprint(boardId, sprintId, dates);
      await refreshSprints();
    } catch {
      reportSyncError("Could not update sprint dates — try again");
    }
  };

  const handleStartSprint = async (sprintId: number) => {
    try {
      const saved: SprintInterface = isDemo
        ? (demoStartSprint(demoId, sprintId) as SprintInterface)
        : await apiStartSprint(boardId, sprintId);
      setSprints((prev) =>
        prev.map((s) =>
          s.id === sprintId
            ? saved
            : {
                ...s,
                is_active: false,
                status: s.status === "active" ? "future" : s.status,
              },
        ),
      );
    } catch {
      reportSyncError("Could not start sprint — another may be active");
    }
  };

  const handleDeleteSprint = async (sprintId: number) => {
    const prev = sprints;
    setSprints((p) => p.filter((s) => s.id !== sprintId));
    try {
      if (isDemo) demoDeleteSprint(demoId, sprintId);
      else await apiDeleteSprint(boardId, sprintId);
    } catch {
      setSprints(prev);
      reportSyncError("Could not delete sprint — try again");
    }
  };

  // Complete the active sprint: freeze it, rehome incomplete tickets per the dialog.
  const handleCompleteSprint = async (data: {
    move_to: string;
    new_sprint_name?: string;
  }) => {
    const sprint = completingSprint;
    if (!sprint) return;
    try {
      let completed: SprintInterface;
      let newSprint: SprintInterface | null = null;
      let targetId: number | null;
      if (isDemo) {
        completed = demoCompleteSprint(
          demoId,
          sprint.id,
          data.move_to,
          data.new_sprint_name,
        ) as SprintInterface;
        const all = loadDemoSprints(demoId) as SprintInterface[];
        newSprint =
          data.move_to === "new"
            ? (all.find(
                (s) => s.name === data.new_sprint_name && s.status === "future",
              ) ?? null)
            : null;
        targetId =
          data.move_to === "backlog"
            ? null
            : data.move_to === "new"
              ? (newSprint?.id ?? null)
              : Number(data.move_to);
      } else {
        const res = await apiCompleteSprint(boardId, sprint.id, data);
        completed = res.sprint;
        newSprint = res.new_sprint ?? null;
        targetId = res.target_sprint_id ?? null;
      }
      setSprints((prev) => {
        let next = prev.map((s) => (s.id === completed.id ? completed : s));
        if (newSprint && !next.some((s) => s.id === newSprint!.id))
          next = [...next, newSprint];
        return next;
      });
      // Reflect moved tickets locally: incomplete cards move to the chosen destination.
      setCards((prev) =>
        prev.map((c) =>
          c.sprint_id === sprint.id && !c.done_at
            ? { ...c, sprint_id: targetId }
            : c,
        ),
      );
      setCompletingSprint(null);
    } catch {
      reportSyncError("Could not complete sprint — try again");
    }
  };

  return {
    completingSprint,
    setCompletingSprint,
    reportSprint,
    setReportSprint,
    openReport,
    handleCreateSprint,
    handleUpdateSprintDates,
    handleStartSprint,
    handleDeleteSprint,
    handleCompleteSprint,
  };
}
