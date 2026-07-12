"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Sync failure feedback — shown when a server mutation fails and local state was
// reverted. The message auto-dismisses after 4s; re-reporting resets the timer.
export function useSyncError() {
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reportSyncError = useCallback((message: string) => {
    setSyncError(message);
    if (syncErrorTimer.current) clearTimeout(syncErrorTimer.current);
    syncErrorTimer.current = setTimeout(() => setSyncError(null), 4000);
  }, []);
  useEffect(
    () => () => {
      if (syncErrorTimer.current) clearTimeout(syncErrorTimer.current);
    },
    [],
  );

  return { syncError, reportSyncError };
}
