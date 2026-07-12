"use client";

import type * as React from "react";
import type { AppNotification } from "@/hooks/useNotifications";

/**
 * The notifications dropdown card — shared by the top header and the dashboard
 * sidebar. Each shell supplies its own trigger button and anchors this panel.
 */
export default function NotificationsPanel({
  notifications,
  unreadCount,
  onItemClick,
  onMarkAll,
  onClose,
  anchorTop = "52px",
  align = "right",
  extraStyle,
}: {
  notifications: AppNotification[];
  unreadCount: number;
  onItemClick: (n: AppNotification) => void;
  onMarkAll: () => void;
  onClose: () => void;
  anchorTop?: string;
  align?: "left" | "right";
  extraStyle?: React.CSSProperties;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className={`modal-content aero-menu absolute ${align === "left" ? "left-2" : "right-2"} z-50 w-80 overflow-hidden`}
        style={{ top: anchorTop, maxHeight: "420px", ...extraStyle }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid var(--cf-edge)" }}
        >
          <p
            className="cf-label font-bold"
            style={{ color: "var(--cf-phosphor)" }}
          >
            Notifications
          </p>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAll}
                className="btn-physical text-xs cursor-pointer cf-mono"
                style={{ color: "var(--cf-phosphor)" }}
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="btn-physical text-xs cursor-pointer"
              style={{ color: "var(--cf-text-muted)" }}
            >
              ✕
            </button>
          </div>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: "360px" }}>
          {notifications.length === 0 && (
            <p
              className="text-xs text-center py-8 cf-mono"
              style={{ color: "var(--cf-text-muted)" }}
            >
              No notifications yet.
            </p>
          )}
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => onItemClick(n)}
              className="btn-physical w-full text-left px-4 py-3 block"
              style={{
                borderBottom: "1px solid var(--cf-edge)",
                background: !n.read_at
                  ? "rgba(154,166,126,0.08)"
                  : "transparent",
                cursor: n.deep_link ? "pointer" : "default",
              }}
            >
              <div className="flex items-start gap-2">
                {!n.read_at && (
                  <span
                    className="cf-led flex-shrink-0"
                    aria-hidden
                    style={{
                      marginTop: 4,
                      width: 6,
                      height: 6,
                      background: "var(--cf-amber)",
                      boxShadow: "0 0 5px var(--cf-amber)",
                    }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs" style={{ color: "var(--cf-text)" }}>
                    {n.message}
                  </p>
                  <p
                    className="text-xs mt-0.5 cf-mono"
                    style={{ color: "var(--cf-text-muted)" }}
                  >
                    {new Date(n.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
