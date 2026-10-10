"use client";

import { type RefObject, useEffect } from "react";
import { useVortexWorld, type VortexWorldApi } from "./useVortexWorld";

// T-03 · the MK-IV world (the hundred little things) runs in its own lazily
// loaded component instead of inside his core. The assistant talks to it
// through `hostRef`; a teammate's shared prank and the presence channel are
// handed over as soon as it mounts.

export type World = ReturnType<typeof useVortexWorld>;
type Presence = Parameters<World["attachPresence"]>[0];

export default function WorldHost({
  api,
  hostRef,
  sharedPrank,
  presence,
  onReady,
}: {
  api: VortexWorldApi;
  hostRef: RefObject<World | null>;
  sharedPrank: RefObject<((name: string) => void) | null>;
  presence: RefObject<Presence>;
  onReady: () => void;
}) {
  const w = useVortexWorld(api);
  hostRef.current = w;
  // biome-ignore lint/correctness/useExhaustiveDependencies: once, on mount
  useEffect(() => {
    w.sharedPrank.current = (name) => sharedPrank.current?.(name);
    if (presence.current) w.attachPresence(presence.current);
    onReady();
    return () => {
      hostRef.current = null;
    };
  }, []);
  return null;
}
