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
import { pollWhileVisible } from "@/lib/poll";

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
    return pollWhileVisible(refetch, 120000);
  }, [enabled, isLogged, refetch]);

  // Live push over Reverb on the user's private channel.
  React.useEffect(() => {
    if (!enabled || !isLogged || !userId) return;
    const channelName = `App.Models.User.${userId}`;
    let channel: ReturnType<ReturnType<typeof getEcho>["private"]> | null =
      null;
    const handler = (payload: AppNotification) => {
      pushToast({
        type: payload?.type,
        message: payload?.message ?? "New notification",
        deepLink: payload?.deep_link ?? null,
      });
      pushActivity(`alert · ${payload?.message ?? "notification"}`);
      refetch();
    };
    try {
      channel = getEcho().private(channelName);
      channel.listen(".notification", handler);
    } catch {
      // Echo/Reverb not configured — polling still covers it.
    }
    return () => {
      // Detach only our handler — useVortexChat rides this same user channel, so
      // leave() would kill its stream. Logout is a full navigation, which closes
      // the socket anyway.
      channel?.stopListening(".notification", handler);
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
