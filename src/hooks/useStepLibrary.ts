"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GherkinLine, ReusableStep } from "@/interfaces/QAInterface";
import { createStep, deleteStep, getSteps, updateStep } from "@/lib/api";
import { getEcho } from "@/lib/echo";

type IncomingEvent = { type: string; payload: unknown };

// The board's global reusable-step library, normalized by id. Editing a step (here
// or in another tab) patches `stepsById`, so every StepComposer that resolves a
// step from this map re-renders — that's the "edit once, propagates everywhere".
export function useStepLibrary(boardId: number | undefined, enabled: boolean) {
  const [stepsById, setStepsById] = useState<Record<number, ReusableStep>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!enabled || !boardId) return;
    let cancelled = false;
    const controller = new AbortController();

    getSteps(boardId, controller.signal)
      .then((data) => {
        if (cancelled) return;
        const map: Record<number, ReusableStep> = {};
        for (const s of data?.steps ?? []) map[s.id] = s;
        setStepsById(map);
      })
      .catch(() => {});

    const channel = getEcho().private(`board.${boardId}`);
    const handler = (e: IncomingEvent) => {
      if (e.type === "qa.step.updated") {
        const s = e.payload as ReusableStep;
        setStepsById((m) => ({ ...m, [s.id]: s }));
      } else if (e.type === "qa.step.deleted") {
        const id = (e.payload as { id: number }).id;
        setStepsById((m) => {
          const n = { ...m };
          delete n[id];
          return n;
        });
      }
    };
    channel.listen(".board.event", handler);

    return () => {
      cancelled = true;
      controller.abort();
      channel.stopListening(".board.event", handler);
    };
  }, [enabled, boardId]);

  const steps = useMemo(
    () =>
      Object.values(stepsById).sort((a, b) => a.title.localeCompare(b.title)),
    [stepsById],
  );

  const run = useCallback(async <T>(fn: () => Promise<T>) => {
    setBusy(true);
    try {
      return await fn();
    } finally {
      setBusy(false);
    }
  }, []);

  const create = useCallback(
    (
      title: string,
      opts?: { content?: string; gherkin_lines?: GherkinLine[] },
    ) =>
      run(async () => {
        const s: ReusableStep = await createStep(boardId!, { title, ...opts });
        setStepsById((m) => ({ ...m, [s.id]: s }));
        return s;
      }),
    [run, boardId],
  );

  const update = useCallback(
    (
      id: number,
      patch: {
        title?: string;
        content?: string | null;
        gherkin_lines?: GherkinLine[];
      },
    ) =>
      run(async () => {
        const s: ReusableStep = await updateStep(boardId!, id, patch);
        setStepsById((m) => ({ ...m, [s.id]: s }));
        return s;
      }),
    [run, boardId],
  );

  const remove = useCallback(
    (id: number) =>
      run(async () => {
        await deleteStep(boardId!, id);
        setStepsById((m) => {
          const n = { ...m };
          delete n[id];
          return n;
        });
      }),
    [run, boardId],
  );

  return { stepsById, steps, busy, create, update, remove };
}
