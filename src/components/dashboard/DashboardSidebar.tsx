"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import YondraIcon from "@/components/icons/yondra.png";
import { TapeWindow } from "@/components/dashboard/HiFiPanels";
import NotificationsPanel from "@/components/layout/NotificationsPanel";
import { useSystem } from "@/contexts/SystemContext";
import { useNotifications } from "@/hooks/useNotifications";
import type { DashCard } from "@/interfaces/DashboardInterface";
import type { UserSummary } from "@/interfaces/ProjectInterface";
import { logout } from "@/lib/auth";
import { avatarColor, initials } from "@/lib/ui";

/** Walnut side panel of the "home hi-fi" dashboard (design/dashboard-suggestion.png).
 *  Absorbs the header's notifications bell + user menu (both driven by the
 *  shared useNotifications hook). */
export default function DashboardSidebar({
  user,
  projectsCount,
  boardsCount,
  latestProjectId,
  onNewProject,
  nowPlaying,
  playing = false,
  onOpenCard,
}: {
  user: UserSummary | null;
  projectsCount: number;
  boardsCount: number;
  // Freshest project — the Projects entry opens its library page.
  latestProjectId: number | null;
  onNewProject: () => void;
  // The card on the deck right now (an in-progress one, else the next cue).
  nowPlaying?: DashCard | null;
  playing?: boolean;
  onOpenCard?: (c: DashCard) => void;
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

  const handleLogout = async () => {
    await logout();
    setIsLogged(false);
    window.location.href = "/login";
  };

  const pathname = usePathname() ?? "";
  const navLink = (href: string | null, label: string, count?: number) => {
    const on =
      href != null &&
      (href === "/dashboard" ? pathname === href : pathname.startsWith(href));
    const body = (
      <>
        <i aria-hidden />
        {label}
        {count != null && <span>{String(count).padStart(2, "0")}</span>}
      </>
    );
    // Projects has nowhere to go until the first project exists.
    if (href == null)
      return (
        <span className="hf-nav off" aria-disabled="true">
          {body}
        </span>
      );
    return (
      <Link
        className={`hf-nav${on ? " on" : ""}`}
        href={href}
        aria-current={on ? "page" : undefined}
      >
        {body}
      </Link>
    );
  };

  return (
    <aside className="hf-side">
      <div className="hf-brand">
        <Image src={YondraIcon} alt="Yondra" width={34} height={34} />
        <div>
          <b>YONDRA</b>
          <small>HOME HI-FI · MK-VII</small>
        </div>
        <button
          ref={bellRef}
          type="button"
          className="hf-bell"
          aria-label="Notifications"
          onClick={openNotif}
        >
          <svg
            viewBox="0 0 24 24"
            width={14}
            height={14}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="hf-ndot">
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

      <nav className="hf-navs">
        {navLink("/dashboard", "Dashboard")}
        {navLink(
          latestProjectId != null ? `/projects/${latestProjectId}` : null,
          "Projects",
          projectsCount,
        )}
        <div className="hf-navsec">Reports</div>
        {navLink("/dashboard/revenue", "Revenue")}
        {navLink("/dashboard/conversion", "Conversion")}
        {navLink("/dashboard/loss", "Loss")}
        {navLink("/dashboard/export", "Export")}
      </nav>

      {nowPlaying && (
        <button
          type="button"
          className={`hf-np${playing ? " on" : ""}`}
          onClick={() => onOpenCard?.(nowPlaying)}
        >
          <span className="h">
            <i aria-hidden />
            {playing ? "Now playing" : "Next up"}
            <small>{nowPlaying.ticket_key}</small>
          </span>
          <span className="shell" aria-hidden>
            <span className="lbl">
              <b>{nowPlaying.name}</b>
            </span>
            <TapeWindow done={0.4} spin={playing} className="win" />
          </span>
          <span className="sub">
            {[nowPlaying.board_name, nowPlaying.section]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </button>
      )}

      <button className="hf-newp" type="button" onClick={onNewProject}>
        + New project
      </button>

      <div className="hf-mewrap">
        {menuOpen && (
          <div className="hf-usermenu">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                window.location.href = "/profile";
              }}
            >
              Profile
            </button>
            <button type="button" className="out" onClick={handleLogout}>
              Logout
            </button>
          </div>
        )}
        <button
          className="hf-me"
          type="button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => {
            setNotifOpen(false);
            setMenuOpen((o) => !o);
          }}
        >
          <span
            className="hf-av"
            style={{ backgroundColor: user ? avatarColor(user.id) : "#8a7356" }}
          >
            {user ? initials(user.name) : "?"}
          </span>
          <span className="who">
            <b>{user?.name ?? "…"}</b>
            <small>
              {projectsCount} box set{projectsCount === 1 ? "" : "s"} ·{" "}
              {boardsCount} tape{boardsCount === 1 ? "" : "s"}
            </small>
          </span>
        </button>
      </div>
    </aside>
  );
}
