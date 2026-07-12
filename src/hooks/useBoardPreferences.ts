"use client";

import { useCallback, useEffect, useState } from "react";
import type { Template } from "@/components/ui/CardEdit";
import { getTemplates } from "@/lib/api";
import { loadDemoTemplates } from "@/lib/demoStorage";

interface UseBoardPreferencesParams {
  boardId: number;
  isDemo: boolean;
  demoId: string;
  // Per-board localStorage namespace (demo id or board id).
  storageKey: string;
}

// Per-board, per-device preferences: WIP limits and the board background live in
// localStorage (they're personal, not shared); card templates are fetched once.
export function useBoardPreferences({
  boardId,
  isDemo,
  demoId,
  storageKey,
}: UseBoardPreferencesParams) {
  const [wipLimits, setWipLimits] = useState<Record<number, number | null>>({});
  const [boardBg, setBoardBg] = useState<string>("");
  const [isBgOpen, setIsBgOpen] = useState(false);
  const [boardTemplates, setBoardTemplates] = useState<Template[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || (!isDemo && boardId === 0)) return;
    const raw = localStorage.getItem(`yondra_wip_${storageKey}`);
    setWipLimits(raw ? JSON.parse(raw) : {});
    setBoardBg(localStorage.getItem(`yondra_bg_${storageKey}`) ?? "");
    if (isDemo) {
      setBoardTemplates(loadDemoTemplates(demoId));
    } else if (boardId !== 0) {
      getTemplates(boardId)
        .then((data) => setBoardTemplates(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, [storageKey]);

  // useCallback so every memoized Section shares one handler identity. `wipLimits`
  // is a real dependency (the persisted snapshot is built from it) — it only
  // changes when a limit is edited, never on unrelated Board re-renders.
  const handleSetWipLimit = useCallback(
    (sectionId: number, limit: number | null) => {
      const next = { ...wipLimits, [sectionId]: limit };
      setWipLimits(next);
      localStorage.setItem(`yondra_wip_${storageKey}`, JSON.stringify(next));
    },
    [wipLimits, storageKey],
  );

  const handleSetBg = (bg: string) => {
    setBoardBg(bg);
    localStorage.setItem(`yondra_bg_${storageKey}`, bg);
    setIsBgOpen(false);
  };

  return {
    wipLimits,
    boardBg,
    isBgOpen,
    setIsBgOpen,
    boardTemplates,
    handleSetWipLimit,
    handleSetBg,
  };
}
