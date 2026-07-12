"use client";

import Image from "next/image";
import * as React from "react";
import YondraIcon from "@/components/icons/yondra.png";
import NotificationsPanel from "@/components/layout/NotificationsPanel";
import { useSystem } from "@/contexts/SystemContext";
import { useNotifications } from "@/hooks/useNotifications";
import type { UserSummary } from "@/interfaces/ProjectInterface";
import { logout } from "@/lib/auth";
import { avatarColor, initials } from "@/lib/ui";

const IconDashboard = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden
  >
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
const IconProjects = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden
  >
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
);
const IconActivity = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden
  >
    <path d="M3 12h4l2-6 4 14 2-8h6" />
  </svg>
);

/** Left rail for the dashboard home base. Absorbs the header's notifications
 *  bell + user menu (both driven by the shared useNotifications hook). */
export default function DashboardSidebar({
  user,
  projectsCount,
  boardsCount,
  onNewProject,
}: {
  user: UserSummary | null;
  projectsCount: number;
  boardsCount: number;
  onNewProject: () => void;
}) {
  const { notifications, unreadCount, markOneRead, markAllRead } =
    useNotifications(user?.id);
  const { setIsLogged } = useSystem();
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const bellRef = React.useRef<HTMLButtonElement>(null);
  const [notifPos, setNotifPos] = React.useState<{ top: number; left: number }>(
    { top: 60, left: 16 },
  );

  // Position the dropdown from the bell's on-screen rect and render it fixed,
  // so the narrow sidebar can't clip or clamp its width.
  const openNotif = () => {
    setMenuOpen(false);
    if (!notifOpen && bellRef.current) {
      const r = bellRef.current.getBoundingClientRect();
      const w = 320;
      setNotifPos({
        top: Math.round(r.bottom + 6),
        left: Math.round(
          Math.max(8, Math.min(r.left, window.innerWidth - w - 12)),
        ),
      });
    }
    setNotifOpen((o) => !o);
  };

  const [activeNav, setActiveNav] = React.useState<
    "dashboard" | "projects" | "activity"
  >("dashboard");
  const jump = (id: string, key: "dashboard" | "projects" | "activity") => {
    setActiveNav(key);
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    if (id !== "yd-top") {
      el.classList.remove("yd-flash");
      void el.offsetWidth; // restart the animation even if it's already in view
      el.classList.add("yd-flash");
      window.setTimeout(() => el.classList.remove("yd-flash"), 1300);
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsLogged(false);
    window.location.href = "/login";
  };

  return (
    <aside className="yd-panel yd-side">
      <div className="yd-brand">
        <Image src={YondraIcon} alt="Yondra" width={30} height={30} />
        <b>YONDRA</b>
        <button
          ref={bellRef}
          className="yd-bell"
          aria-label="Notifications"
          onClick={openNotif}
        >
          <svg
            viewBox="0 0 24 24"
            width={15}
            height={15}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="yd-ndot">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        {notifOpen && (
          <NotificationsPanel
            notifications={notifications}
            unreadCount={unreadCount}
            onItemClick={(n) => {
              setNotifOpen(false);
              markOneRead(n);
            }}
            onMarkAll={markAllRead}
            onClose={() => setNotifOpen(false)}
            align="left"
            extraStyle={{
              position: "fixed",
              top: notifPos.top,
              left: notifPos.left,
              right: "auto",
              width: 320,
              maxWidth: "82vw",
              maxHeight: "70vh",
              zIndex: 60,
            }}
          />
        )}
      </div>

      <button
        className={`yd-nav ${activeNav === "dashboard" ? "on" : ""}`}
        type="button"
        onClick={() => jump("yd-top", "dashboard")}
      >
        <IconDashboard />
        Dashboard
      </button>
      <button
        className={`yd-nav ${activeNav === "projects" ? "on" : ""}`}
        type="button"
        onClick={() => jump("yd-projects", "projects")}
      >
        <IconProjects />
        Projects
      </button>
      <button
        className={`yd-nav ${activeNav === "activity" ? "on" : ""}`}
        type="button"
        onClick={() => jump("yd-activity", "activity")}
      >
        <IconActivity />
        Activity
      </button>

      <div className="yd-sp" />

      <button className="yd-newbtn" type="button" onClick={onNewProject}>
        + New project
      </button>

      <div className="yd-userwrap">
        {menuOpen && (
          <div className="yd-usermenu">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                window.location.href = "/profile";
              }}
            >
              Profile
            </button>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                color: "var(--yd-red)",
                borderTop: "1px solid var(--yd-edge)",
              }}
            >
              Logout
            </button>
          </div>
        )}
        <button
          className="yd-userchip"
          type="button"
          onClick={() => {
            setNotifOpen(false);
            setMenuOpen((o) => !o);
          }}
        >
          <span
            className="yd-ava"
            style={{ background: user ? avatarColor(user.id) : "#888" }}
          >
            {user ? initials(user.name) : "?"}
          </span>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                color: "#e7e2d4",
                fontWeight: 700,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user?.name ?? "…"}
            </div>
            <div className="yd-label" style={{ letterSpacing: ".02em" }}>
              {projectsCount} proj · {boardsCount} brd
            </div>
          </div>
          <svg
            className="yd-cv"
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
