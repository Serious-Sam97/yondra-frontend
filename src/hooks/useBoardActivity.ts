"use client";

import { useState } from "react";
import { getActivity } from "@/lib/api";

export interface ActivityEntry {
  id: number;
  description: string;
  created_at: string;
}

interface UseBoardActivityParams {
  boardId: number;
  isDemo: boolean;
}

// Activity log modal: opens instantly, then fills with the fetched log
// (demo boards have no server log, so the list stays empty).
export function useBoardActivity({ boardId, isDemo }: UseBoardActivityParams) {
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);

  const handleOpenActivity = async () => {
    setIsActivityOpen(true);
    if (!isDemo) {
      const data = await getActivity(boardId).catch(() => []);
      setActivityLog(Array.isArray(data) ? data : []);
    }
  };

  return { isActivityOpen, setIsActivityOpen, activityLog, handleOpenActivity };
}
