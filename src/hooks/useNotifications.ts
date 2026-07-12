"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { useConsole } from "@/contexts/ConsoleContext";
import { useSystem } from "@/contexts/SystemContext";
import { useToast } from "@/contexts/ToastContext";
import {
  type AppNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api";
import { getEcho } from "@/lib/echo";

// The entity now lives with the API boundary; re-exported so existing consumers
// keep importing it from the hook.
export type { AppNotification } from "@/lib/api";

/**
 * Notification state shared by every app shell (top header + dashboard sidebar).
 * Owns the reconcile poll and the live Reverb push so no shell has to re-implement
 * it. Only one shell is mounted at a time, so there's a single subscription.
 */
export function useNotifications(userId?: number, enabled: boolean = true) {
  const { isLogged } = useSystem();
  const { pushToast } = useToast();
  const { pushActivity } = useConsole();
  const router = useRouter();
  const [notifications, setNotifications] = React.useState<AppNotification[]>(
    [],
  );

  const refetch = React.useCallback(
    () =>
      getNotifications()
        .then((d) => setNotifications(Array.isArray(d) ? d : []))
        .catch(() => {}),
    [],
  );

  // Slow reconcile poll — a safety net if the socket drops (push is primary).
  React.useEffect(() => {
    if (!enabled || !isLogged) return;
    refetch();
    const interval = setInterval(refetch, 120000);
    return () => clearInterval(interval);
  }, [enabled, isLogged, refetch]);

  // Live push over Reverb on the user's private channel.
  React.useEffect(() => {
    if (!enabled || !isLogged || !userId) return;
    const channelName = `App.Models.User.${userId}`;
    let echo: ReturnType<typeof getEcho> | null = null;
    try {
      echo = getEcho();
      echo
        .private(channelName)
        .listen(".notification", (payload: AppNotification) => {
          pushToast({
            type: payload?.type,
            message: payload?.message ?? "New notification",
            deepLink: payload?.deep_link ?? null,
          });
          pushActivity(`alert · ${payload?.message ?? "notification"}`);
          refetch();
        });
    } catch {
      // Echo/Reverb not configured — polling still covers it.
    }
    return () => {
      echo?.leave(channelName);
    };
  }, [enabled, isLogged, userId, pushToast, pushActivity, refetch]);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  // Click a notification → mark just that one read, then deep-link to it.
  const markOneRead = React.useCallback(
    (n: AppNotification) => {
      if (!n.read_at) {
        setNotifications((prev) =>
          prev.map((x) =>
            x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x,
          ),
        );
        markNotificationRead(n.id).catch(() => {});
      }
      if (n.deep_link) router.push(n.deep_link);
    },
    [router],
  );

  const markAllRead = React.useCallback(async () => {
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        read_at: n.read_at ?? new Date().toISOString(),
      })),
    );
    await markAllNotificationsRead().catch(() => {});
  }, []);

  return { notifications, unreadCount, refetch, markOneRead, markAllRead };
}
