"use client";

import { faBell } from "@fortawesome/free-solid-svg-icons";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import NotificationsPanel from "@/components/layout/NotificationsPanel";
import Icon from "@/components/ui/Icon";
import { useConsole } from "@/contexts/ConsoleContext";
import { useHeaderBus } from "@/contexts/HeaderBusContext";
import { useSystem } from "@/contexts/SystemContext";
import { useNotifications } from "@/hooks/useNotifications";
import type {
  DashboardPayload,
  DashCard,
} from "@/interfaces/DashboardInterface";
import type { ProjectBoard } from "@/interfaces/ProjectInterface";
import { fetchDashboard, fetchProject, searchWorkspace } from "@/lib/api";
import { fetchBoards, fetchUser, logout } from "@/lib/auth";
import YondraIcon from "../icons/yondra.png";

// ═══════════════════════════════════════════════════════════════════════════
// MK-VII "control surface" header: a dual-rack console where every module is
// wired to a real action — patch-bay navigation, MODE view keys, a live
// activity scope, the needs-you alert, quick-add, search, WIP faders, and a
// board-aware context readout. The sub-rail folds on scroll or via the latch.
// ═══════════════════════════════════════════════════════════════════════════

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function routeLabel(p?: string | null): string {
  if (!p) return "YONDRA";
  if (p.startsWith("/dashboard")) return "DASHBOARD";
  if (p.startsWith("/boards")) return "BOARD";
  if (p.startsWith("/projects")) return "PROJECT";
  if (p.startsWith("/profile")) return "PROFILE";
  if (p.startsWith("/demo")) return "DEMO MODE";
  if (p.startsWith("/login")) return "AUTH / LOGIN";
  if (p.startsWith("/register")) return "AUTH / REGISTER";
  if (p.startsWith("/forgot-password")) return "AUTH / FORGOT PASSWORD";
  if (p.startsWith("/reset-password")) return "AUTH / RESET PASSWORD";
  return "YONDRA";
}

function daysLate(due: string | null): number {
  if (!due) return 0;
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(`${due}T00:00:00`).getTime()) / 86400000),
  );
}

function fmtDay(d: string): string {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function money(n: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

const MODE_DEFS: { key: string; label: string }[] = [
  { key: "kanban", label: "Board" },
  { key: "list", label: "List" },
  { key: "backlog", label: "Bklg" },
  { key: "calendar", label: "Cal" },
  { key: "analytics", label: "Stats" },
  { key: "plans", label: "QA" },
];

// ── activity oscilloscope: dark-ink trace on the pale LCD; pulses on events ──
function ScopeCanvas({ pulseKey }: { pulseKey: number }) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const pulseRef = React.useRef(0);

  React.useEffect(() => {
    if (pulseKey > 0) pulseRef.current = performance.now();
  }, [pulseKey]);

  React.useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const rm =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const dpr = window.devicePixelRatio || 1;
    let raf = 0;

    const size = () => {
      const r = cv.getBoundingClientRect();
      cv.width = Math.max(1, r.width * dpr);
      cv.height = Math.max(1, r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return r;
    };
    let r = size();
    const ro = new ResizeObserver(() => {
      r = size();
    });
    ro.observe(cv);

    const draw = (t: number) => {
      const W = r.width;
      const H = r.height;
      const mid = H * 0.4;
      // Event pulse: trace amplitude spikes when the console logs a line, then decays.
      const since = t - pulseRef.current;
      const pulse = pulseRef.current > 0 ? Math.exp(-since / 1200) * 2.2 : 0;
      const amp = 4 * (1 + pulse);
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(38,46,24,0.1)";
      ctx.lineWidth = 1;
      for (let gx = 0; gx < W; gx += 22) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, H);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(38,46,24,0.92)";
      ctx.lineWidth = 1.6;
      ctx.shadowColor = "rgba(38,46,24,0.4)";
      ctx.shadowBlur = 3;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 2) {
        const p = x / W;
        const y =
          mid +
          Math.sin(p * 9 + t * 0.0016) * amp +
          Math.sin(p * 23 - t * 0.0028) * amp * 0.45;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
      if (!rm) raf = requestAnimationFrame(draw);
    };
    if (rm) draw(1200);
    else raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} aria-hidden />;
}

// ── search module: workspace omnisearch restyled for the console ────────────
function HeaderSearch() {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [boards, setBoards] = React.useState<{ id: number; name: string }[]>(
    [],
  );
  const [cards, setCards] = React.useState<
    { id: number; name: string; board_id: number; board_name: string | null }[]
  >([]);
  const [active, setActive] = React.useState(0);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setBoards([]);
      setCards([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await searchWorkspace(term);
        setBoards(res?.boards ?? []);
        setCards(res?.cards ?? []);
        setActive(0);
        setOpen(true);
      } catch {
        // 401 handled centrally
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const flat = [
    ...boards.map((b) => ({ kind: "board" as const, id: b.id, board_id: 0 })),
    ...cards.map((c) => ({
      kind: "card" as const,
      id: c.id,
      board_id: c.board_id,
    })),
  ];
  const go = (item: (typeof flat)[number]) => {
    setOpen(false);
    setQ("");
    if (item.kind === "board") router.push(`/boards/${item.id}`);
    else router.push(`/boards/${item.board_id}?card=${item.id}`);
  };

  return (
    <div ref={boxRef} className="relative flex-1 min-w-0 h-full">
      <div className="ydc-find relative flex items-center gap-2 h-full rounded-[7px] px-3">
        <span style={{ color: "rgba(38,46,24,0.6)", fontSize: 12 }}>⌕</span>
        <input
          ref={inputRef}
          className="ydc-input"
          style={{ color: "var(--cf-ink, #262e18)", fontWeight: 600 }}
          placeholder="Cards, boards, deals…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => {
            if (boards.length || cards.length) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (!open || flat.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, flat.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const it = flat[active];
              if (it) go(it);
            }
          }}
        />
        <span
          className="cf-mono flex-shrink-0"
          style={{
            fontSize: 8,
            letterSpacing: "0.14em",
            color: "rgba(38,46,24,0.55)",
            border: "1px solid rgba(38,46,24,0.3)",
            borderRadius: 4,
            padding: "1px 5px",
            background: "rgba(255,255,255,0.18)",
          }}
        >
          ⌘K
        </span>
      </div>
      {open && (
        <div className="ydc-pop">
          {boards.length === 0 && cards.length === 0 && (
            <div className="grp" style={{ padding: "12px" }}>
              No matches
            </div>
          )}
          {boards.length > 0 && <div className="grp">Boards</div>}
          {boards.map((b, i) => (
            <button
              key={`b${b.id}`}
              type="button"
              className={`row ${active === i ? "onrow" : ""}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => go({ kind: "board", id: b.id, board_id: 0 })}
            >
              <span style={{ color: "var(--cf-phosphor)" }}>▦</span>
              <span className="truncate">{b.name}</span>
            </button>
          ))}
          {cards.length > 0 && <div className="grp">Cards</div>}
          {cards.map((c, i) => {
            const idx = boards.length + i;
            return (
              <button
                key={`c${c.id}`}
                type="button"
                className={`row ${active === idx ? "onrow" : ""}`}
                onMouseEnter={() => setActive(idx)}
                onClick={() =>
                  go({ kind: "card", id: c.id, board_id: c.board_id })
                }
              >
                <span style={{ color: "var(--cf-amber)" }}>•</span>
                <span className="truncate">{c.name}</span>
                <span className="sub ml-auto">{c.board_name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function MenuAppBar() {
  const { isLogged, setIsLogged } = useSystem();
  const { location, activity, pushActivity } = useConsole();
  const { board: bus } = useHeaderBus();
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = React.useState<{ id: number; name: string } | null>(
    null,
  );
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [logOpen, setLogOpen] = React.useState(false);
  const onDashboard = !!pathname?.startsWith("/dashboard");
  const { notifications, unreadCount, markOneRead, markAllRead } =
    useNotifications(user?.id, !onDashboard);

  // Sub-rail folds when scrolling or via the latch (persisted per device).
  const [scrolled, setScrolled] = React.useState(false);
  const [latched, setLatched] = React.useState(false);
  React.useEffect(() => {
    setLatched(localStorage.getItem("yd:consoleLatch") === "1");
  }, []);
  const toggleLatch = () => {
    setLatched((v) => {
      localStorage.setItem("yd:consoleLatch", v ? "0" : "1");
      return !v;
    });
  };
  React.useEffect(() => {
    const onScroll = (e: Event) => {
      const t = e.target as HTMLElement | Document;
      const st =
        t && t !== document && typeof (t as HTMLElement).scrollTop === "number"
          ? (t as HTMLElement).scrollTop
          : window.scrollY;
      setScrolled(st > 6);
    };
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, []);
  const subOpen = isLogged && !latched && !scrolled;

  // Publish real header height for page layouts (calc(100vh - var(...))).
  const headerRef = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const publish = () =>
      document.documentElement.style.setProperty(
        "--app-header-h",
        `${el.offsetHeight}px`,
      );
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => {
    if (!isLogged) return;
    fetchUser()
      .then((u) => setUser(u))
      .catch(() => {});
  }, [isLogged]);

  // ── console log feed ───────────────────────────────────────────────────────
  React.useEffect(() => {
    pushActivity("console online · ready");
  }, [pushActivity]);
  React.useEffect(() => {
    pushActivity(`entered ${routeLabel(pathname)}`);
  }, [pathname, pushActivity]);

  // ── needs-you alert + context readout: dashboard aggregate, 90s poll ──────
  const [dash, setDash] = React.useState<DashboardPayload | null>(null);
  React.useEffect(() => {
    if (!isLogged || onDashboard) return;
    let alive = true;
    const load = () =>
      fetchDashboard()
        .then((d) => {
          if (alive) setDash(d);
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 90000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [isLogged, onDashboard]);

  const queue = dash?.queue;
  const alertTop: {
    card: DashCard;
    chip: string;
    tone: "red" | "amber";
  } | null = queue?.overdue[0]
    ? {
        card: queue.overdue[0],
        chip: `${daysLate(queue.overdue[0].due_date)}d late`,
        tone: "red",
      }
    : queue?.today[0]
      ? { card: queue.today[0], chip: "due today", tone: "amber" }
      : queue?.high[0]
        ? {
            card: queue.high[0],
            chip: queue.high[0].due_date
              ? `due ${fmtDay(queue.high[0].due_date)}`
              : "high priority",
            tone: "amber",
          }
        : null;
  const queueCount = queue
    ? queue.overdue.length + queue.today.length + queue.high.length
    : 0;

  // ── transport: board cycling + resume ──────────────────────────────────────
  const [allBoards, setAllBoards] = React.useState<
    { id: number; name: string }[]
  >([]);
  React.useEffect(() => {
    if (!isLogged) return;
    fetchBoards()
      .then((r) =>
        setAllBoards(
          [...(r.owned ?? []), ...(r.shared ?? [])].map((b) => ({
            id: b.id,
            name: b.name,
          })),
        ),
      )
      .catch(() => {});
  }, [isLogged]);
  const boardIdx = bus
    ? allBoards.findIndex((b) => String(b.id) === String(bus.boardId))
    : -1;
  const goBoardStep = (dir: -1 | 1) => {
    if (allBoards.length === 0) return;
    const next =
      boardIdx < 0 ? 0 : (boardIdx + dir + allBoards.length) % allBoards.length;
    router.push(`/boards/${allBoards[next].id}`);
  };
  const resumeBoard = () => {
    const last = localStorage.getItem("yd:lastBoard");
    if (last && String(bus?.boardId) !== last) router.push(`/boards/${last}`);
  };

  // ── patch-bay: sibling boards as aux jacks ─────────────────────────────────
  const [projectBoards, setProjectBoards] = React.useState<ProjectBoard[]>([]);
  React.useEffect(() => {
    if (!isLogged || !bus?.projectId || bus.isDemo) {
      setProjectBoards([]);
      return;
    }
    fetchProject(bus.projectId)
      .then((p) => setProjectBoards(p.boards ?? []))
      .catch(() => {});
  }, [isLogged, bus?.projectId, bus?.isDemo]);
  const auxBoards = projectBoards
    .filter((b) => String(b.id) !== String(bus?.boardId ?? ""))
    .slice(0, 3);

  // ── quick-add ──────────────────────────────────────────────────────────────
  const [qaText, setQaText] = React.useState("");
  const [qaArmed, setQaArmed] = React.useState(false);
  const [qaFlash, setQaFlash] = React.useState(false);
  const qaRef = React.useRef<HTMLInputElement>(null);
  const canQuickAdd = !!bus?.canWrite && (bus?.sections.length ?? 0) > 0;
  const armQuickAdd = () => {
    if (!canQuickAdd) return;
    setQaArmed(true);
    qaRef.current?.focus();
  };
  const submitQuickAdd = async () => {
    if (!bus || !qaText.trim()) return;
    try {
      await bus.quickCreate(qaText);
      setQaText("");
      setQaFlash(true);
      setTimeout(() => setQaFlash(false), 1200);
    } catch {
      // board surfaces its own sync error
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsLogged(false);
    window.location.href = "/login";
  };

  const displayLocation = location ?? routeLabel(pathname);
  const lastLine = activity[activity.length - 1] ?? null;
  const firstSectionName = bus?.sections[0]?.name ?? "";
  const maxSectionCount = Math.max(
    1,
    ...(bus?.sections.map((s) => s.count) ?? [1]),
  );
  const modeKeys = bus
    ? MODE_DEFS.filter((m) => m.key !== "plans" || bus.qaEnabled)
    : [];

  // Context readout: the number that matters on THIS board type.
  const ctx: { big: string; small: string } | null = bus
    ? bus.boardType === "crm" && dash?.crm
      ? {
          big: money(dash.crm.open_total, dash.crm.currency),
          small: `open · ${dash.crm.open_count} deals · won ${money(dash.crm.won_mtd, dash.crm.currency)}`,
        }
      : bus.boardType === "scrum" && dash?.sprint
        ? {
            big: `${dash.sprint.remaining} PTS`,
            small: `${dash.sprint.days_left ?? "–"}d left · ${
              dash.sprint.days_total &&
              dash.sprint.days_elapsed != null &&
              dash.sprint.completed <
                dash.sprint.committed *
                  (dash.sprint.days_elapsed / dash.sprint.days_total)
                ? "behind pace"
                : "on pace"
            }`,
          }
        : dash?.vitals
          ? {
              big: String(dash.vitals.done_7d),
              small: "done · last 7 days",
            }
          : null
    : null;

  // The dashboard is a self-contained home base with its own sidebar shell.
  if (onDashboard) return null;

  // ── logged-out: plain single strip ─────────────────────────────────────────
  if (!isLogged) {
    return (
      <header
        ref={headerRef}
        className="sticky top-0 z-50 px-2 pt-2 pb-1"
        style={{ background: "#16150f" }}
      >
        <div className="ydc-rack" style={{ padding: "8px 14px" }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => (window.location.href = "/")}
              className="btn-physical flex items-center gap-2.5 cursor-pointer"
              type="button"
            >
              <Image
                src={YondraIcon}
                alt="Yondra"
                width={28}
                height={28}
                className="rounded-lg"
              />
              <span
                className="chrome-text font-medium text-sm hidden sm:block"
                style={{ letterSpacing: "0.18em" }}
              >
                YONDRA
              </span>
            </button>
            <div
              className="ydc-screen flex-1 min-w-0 px-3 py-1.5 overflow-hidden"
              style={{ borderRadius: 6 }}
            >
              <span
                className="cf-lcd truncate block"
                style={{
                  color: "#ffb000",
                  textShadow: "0 0 6px rgba(255,176,0,0.5)",
                  fontSize: 14,
                }}
              >
                ▸ {displayLocation}
              </span>
            </div>
            <button
              onClick={() => (window.location.href = "/login")}
              className="aero-btn aero-btn--ghost text-xs px-4 py-2 cursor-pointer"
              type="button"
            >
              Login
            </button>
            <button
              onClick={() => (window.location.href = "/register")}
              className="aero-btn aero-btn--cyan text-xs px-4 py-2 cursor-pointer"
              type="button"
            >
              Register
            </button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 px-2 pt-2 pb-1.5"
      style={{ background: "#16150f" }}
    >
      <div className="ydc-rack">
        <span className="ydc-ear l" aria-hidden />
        <span className="ydc-ear r">
          <button
            type="button"
            className="ydc-latch"
            onClick={toggleLatch}
            title={
              latched
                ? "Unlatch: expand the tool rail"
                : "Latch: fold the tool rail"
            }
          >
            <i style={{ top: latched ? 3 : 17 }} />
          </button>
        </span>
        <span className="ydc-ruler" aria-hidden />

        {/* ══ MAIN RACK ══════════════════════════════════════════════ */}
        <div className="ydc-row main hidden md:flex">
          {/* 01 · IDENT */}
          <div
            className="ydc-module flex flex-none gap-2.5"
            style={{ padding: "0 14px 0 10px" }}
          >
            <span className="ydc-mlabel">Ident</span>
            <button
              onClick={() => router.push("/dashboard")}
              className="btn-physical flex items-center gap-2.5 cursor-pointer"
              title="Dashboard"
              type="button"
            >
              <Image
                src={YondraIcon}
                alt="Yondra"
                width={30}
                height={30}
                className="rounded-lg"
                style={{ boxShadow: "0 0 12px rgba(154,166,126,0.3)" }}
              />
              <span className="flex flex-col items-start leading-none gap-1">
                <span
                  className="cf-mono font-bold hidden lg:block"
                  style={{
                    fontSize: 12,
                    letterSpacing: "0.26em",
                    color: "var(--cf-text)",
                  }}
                >
                  YONDRA
                </span>
                <span
                  className="cf-mono hidden lg:block"
                  style={{
                    fontSize: 6.5,
                    letterSpacing: "0.3em",
                    color: "var(--cf-text-dim)",
                  }}
                >
                  MK-VII · CTRL
                </span>
              </span>
            </button>
            <span className="hidden xl:flex flex-col gap-1 ml-1">
              {(
                [
                  ["PWR", "var(--cf-phosphor)", true],
                  ["LINK", "var(--cf-cyan)", true],
                  ["ALRT", "var(--cf-amber)", unreadCount > 0],
                ] as const
              ).map(([label, color, lit]) => (
                <span key={label} className="flex items-center gap-1">
                  <span
                    className="cf-led"
                    style={{
                      width: 4,
                      height: 4,
                      background: lit ? color : "#3a3831",
                      boxShadow: lit ? `0 0 5px ${color}` : "none",
                    }}
                  />
                  <span
                    className="cf-mono"
                    style={{
                      fontSize: 5.5,
                      letterSpacing: "0.24em",
                      color: "var(--cf-text-dim)",
                    }}
                  >
                    {label}
                  </span>
                </span>
              ))}
            </span>
          </div>

          {/* 02 · PATCH·NAV */}
          <div
            className="ydc-module flex-none hidden lg:flex"
            style={{ padding: "0 6px" }}
          >
            <span className="ydc-mlabel">Patch · Nav</span>
            <div className="relative h-full" style={{ width: 236 }}>
              <svg
                viewBox="0 0 236 58"
                className="absolute inset-0 overflow-visible w-full h-full"
                aria-hidden
              >
                <defs>
                  <linearGradient id="ydc-cable" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#9aa67e" />
                    <stop offset="1" stopColor="#ffb000" />
                  </linearGradient>
                </defs>
                <path
                  d="M 36 26 C 66 46, 88 46, 118 26"
                  fill="none"
                  stroke={bus?.projectId ? "#3d3a33" : "#2c2a24"}
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <path
                  d="M 118 26 C 148 50, 170 50, 200 26"
                  fill="none"
                  stroke="url(#ydc-cable)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  style={{
                    filter: "drop-shadow(0 0 5px rgba(255,176,0,0.5))",
                    opacity: bus ? 1 : 0.25,
                  }}
                />
              </svg>
              <button
                type="button"
                className="ydc-jack"
                style={{ left: 36, top: 13 }}
                title="Dashboard"
                onClick={() => router.push("/dashboard")}
              />
              <button
                type="button"
                className={`ydc-jack ${bus?.projectId ? "" : "dim"}`}
                style={{ left: 118, top: 13 }}
                title={bus?.projectId ? "Open project" : "No project"}
                onClick={() =>
                  bus?.projectId && router.push(`/projects/${bus.projectId}`)
                }
              />
              <span
                className={`ydc-jack ${bus ? "on" : "dim"}`}
                style={{ left: 200, top: 13 }}
                title={bus?.boardName ?? routeLabel(pathname)}
              />
              {auxBoards.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  className="ydc-jack aux"
                  style={{ left: 62 + i * 60, top: 36 }}
                  title={`Patch over → ${b.name}`}
                  onClick={() => router.push(`/boards/${b.id}`)}
                />
              ))}
              <button
                type="button"
                className="ydc-jlabel"
                style={{ left: 36 }}
                onClick={() => router.push("/dashboard")}
              >
                Dash
              </button>
              <button
                type="button"
                className={`ydc-jlabel ${bus?.projectId ? "" : "dim"}`}
                style={{ left: 118 }}
                onClick={() =>
                  bus?.projectId && router.push(`/projects/${bus.projectId}`)
                }
              >
                Project
              </button>
              <span
                className="ydc-jlabel on"
                style={{ left: 200, cursor: "default" }}
              >
                {bus?.boardName ?? routeLabel(pathname)}
              </span>
            </div>
          </div>

          {/* 03 · MODE */}
          {bus && (
            <div
              className="ydc-module flex-none gap-1 hidden xl:flex"
              style={{ padding: "0 9px" }}
            >
              <span className="ydc-mlabel">Mode</span>
              {modeKeys.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  className={`ydc-mode ${bus.viewMode === m.key ? "on" : ""}`}
                  onClick={() => bus.setViewMode(m.key as typeof bus.viewMode)}
                >
                  <i />
                  {m.label}
                </button>
              ))}
            </div>
          )}

          {/* 04 · CONSOLE scope */}
          <div
            className="ydc-module flex flex-1 min-w-0"
            style={{ padding: 4 }}
          >
            <span className="ydc-mlabel" style={{ zIndex: 2 }}>
              Console
            </span>
            <button
              type="button"
              className="ydc-scope"
              onClick={() => setLogOpen((v) => !v)}
              title="Open the session log"
            >
              <ScopeCanvas pulseKey={lastLine?.id ?? 0} />
              <span
                className="cf-mono absolute"
                style={{
                  top: 3,
                  right: 8,
                  fontSize: 6.5,
                  letterSpacing: "0.24em",
                  color: "rgba(38,46,24,0.5)",
                  zIndex: 1,
                }}
              >
                CH1 · {displayLocation.slice(0, 18)}
              </span>
              <span
                className="cf-mono absolute flex items-center gap-2 truncate"
                style={{
                  left: 10,
                  right: 8,
                  bottom: 3,
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#262e18",
                  zIndex: 1,
                  textAlign: "left",
                }}
              >
                {lastLine ? (
                  <>
                    <span style={{ opacity: 0.55 }}>{lastLine.time}</span>
                    <span className="truncate">{lastLine.text}</span>
                  </>
                ) : (
                  <span style={{ opacity: 0.55 }}>▌ standby…</span>
                )}
                <span
                  style={{
                    width: 5,
                    height: 10,
                    background: "#262e18",
                    animation: "ydc-blink 1.1s steps(1) infinite",
                    flex: "none",
                  }}
                />
              </span>
            </button>
          </div>

          {/* 05 · NEEDS·YOU alert */}
          <div
            className="ydc-module flex flex-none"
            style={{ width: 250, padding: 4 }}
          >
            <span className="ydc-mlabel" style={{ zIndex: 2 }}>
              Needs · You
            </span>
            <button
              type="button"
              className="ydc-screen w-full h-full flex flex-col justify-center gap-0.5 px-3 text-left"
              style={{
                borderRadius: 7,
                border: "none",
                cursor: alertTop ? "pointer" : "default",
              }}
              onClick={() =>
                alertTop &&
                router.push(
                  `/boards/${alertTop.card.board_id}?card=${alertTop.card.id}`,
                )
              }
              title={alertTop ? "Open this card" : "Queue is clear"}
            >
              {alertTop ? (
                <>
                  <span
                    className="cf-mono flex items-center gap-1.5 font-bold uppercase"
                    style={{
                      fontSize: 7.5,
                      letterSpacing: "0.18em",
                      color:
                        alertTop.tone === "red"
                          ? "var(--cf-red)"
                          : "var(--cf-amber)",
                    }}
                  >
                    <span
                      className="cf-led"
                      style={{
                        width: 5,
                        height: 5,
                        background:
                          alertTop.tone === "red"
                            ? "var(--cf-red)"
                            : "var(--cf-amber)",
                        boxShadow: `0 0 6px ${alertTop.tone === "red" ? "var(--cf-red)" : "var(--cf-amber)"}`,
                        animation: "ydc-blink 1.4s steps(1) infinite",
                      }}
                    />
                    {alertTop.chip}
                    {queueCount > 1 && (
                      <span style={{ color: "var(--cf-text-dim)" }}>
                        · +{queueCount - 1} queued
                      </span>
                    )}
                  </span>
                  <span
                    className="cf-mono truncate font-bold"
                    style={{ fontSize: 10.5, color: "var(--cf-text)" }}
                  >
                    {alertTop.card.name}
                  </span>
                </>
              ) : (
                <span
                  className="cf-mono flex items-center gap-1.5 font-bold uppercase"
                  style={{
                    fontSize: 8,
                    letterSpacing: "0.2em",
                    color: dash ? "var(--cf-phosphor)" : "var(--cf-text-dim)",
                  }}
                >
                  <span
                    className="cf-led"
                    style={{
                      width: 5,
                      height: 5,
                      background: dash ? "var(--cf-phosphor)" : "#3a3831",
                      boxShadow: dash ? "0 0 6px var(--cf-phosphor)" : "none",
                    }}
                  />
                  {dash ? "All clear" : "Scanning…"}
                </span>
              )}
            </button>
          </div>

          {/* 06 · OPS */}
          <div
            className="ydc-module flex flex-none gap-3"
            style={{ padding: "0 12px" }}
          >
            <span className="ydc-mlabel">Ops</span>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setNotifOpen((v) => !v);
              }}
              className="ydc-key relative"
              style={{ width: 32, height: 32 }}
              title="Alerts"
            >
              <span
                key={unreadCount}
                className={unreadCount > 0 ? "bell-ring" : ""}
                style={{ color: "var(--cf-amber)", fontSize: 14 }}
              >
                <Icon icon={faBell} />
              </span>
              {unreadCount > 0 && (
                <span
                  className="cf-mono absolute -top-1.5 -right-1.5 min-w-4 h-4 px-0.5 rounded-full flex items-center justify-center font-bold text-white"
                  style={{
                    fontSize: 9,
                    background: "var(--cf-red)",
                    boxShadow: "0 0 8px var(--cf-red)",
                  }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              className="ydc-knob"
              onClick={() => {
                setNotifOpen(false);
                setMenuOpen((v) => !v);
              }}
              title={user?.name}
            >
              <span className="notch" />
              <span className="face">{user ? initials(user.name) : "?"}</span>
            </button>
          </div>
        </div>

        {/* ══ SUB-RAIL (folds on scroll / latch) ═════════════════════ */}
        <div
          className="hidden md:block"
          style={{
            maxHeight: subOpen ? 46 : 0,
            opacity: subOpen ? 1 : 0,
            marginTop: subOpen ? 0 : -6,
            overflow: subOpen ? "visible" : "hidden",
            transition:
              "max-height 240ms ease, opacity 180ms ease, margin-top 240ms ease",
          }}
        >
          <div className="ydc-row sub flex">
            {/* 07 · TRANSPORT */}
            <div
              className="ydc-module flex flex-none gap-1"
              style={{ padding: "12px 9px 6px" }}
            >
              <span className="ydc-mlabel">Transport</span>
              <button
                type="button"
                className="ydc-key"
                style={{ width: 28, height: 20, fontSize: 8 }}
                title="Previous board"
                disabled={allBoards.length === 0}
                onClick={() => goBoardStep(-1)}
              >
                ⏮
              </button>
              <button
                type="button"
                className="ydc-key"
                style={{ width: 28, height: 20, fontSize: 8 }}
                title="Resume last board"
                onClick={resumeBoard}
              >
                ⏵
              </button>
              <button
                type="button"
                className="ydc-key"
                style={{ width: 28, height: 20, fontSize: 8 }}
                title="Next board"
                disabled={allBoards.length === 0}
                onClick={() => goBoardStep(1)}
              >
                ⏭
              </button>
              <button
                type="button"
                className={`ydc-key rec ${qaArmed ? "armed" : ""}`}
                style={{ width: 28, height: 20, fontSize: 8 }}
                title="Arm quick-add"
                disabled={!canQuickAdd}
                onClick={armQuickAdd}
              >
                ⏺
              </button>
            </div>

            {/* 08 · QUICK·ADD */}
            <div
              className="ydc-module flex min-w-0"
              style={{ flex: 1.15, padding: 4 }}
            >
              <span className="ydc-mlabel" style={{ zIndex: 2 }}>
                Quick · Add
              </span>
              <div
                className={`ydc-screen ydc-qadd flex items-center gap-2 w-full h-full px-3 ${qaArmed ? "armed" : ""}`}
                style={{ borderRadius: 7 }}
              >
                <span
                  style={{
                    color: qaFlash ? "var(--cf-phosphor)" : "var(--cf-red)",
                    fontSize: 10,
                    textShadow: `0 0 6px ${qaFlash ? "rgba(154,166,126,0.6)" : "rgba(255,90,77,0.6)"}`,
                    flex: "none",
                  }}
                >
                  {qaFlash ? "✓" : "⏺"}
                </span>
                <input
                  ref={qaRef}
                  className="ydc-input"
                  style={{ color: "var(--cf-cream)" }}
                  disabled={!canQuickAdd}
                  placeholder={
                    qaFlash
                      ? "Created."
                      : canQuickAdd
                        ? `New card on ${bus?.boardName} → ${firstSectionName}… ↵`
                        : "Open a writable board to quick-add"
                  }
                  value={qaText}
                  onChange={(e) => setQaText(e.target.value)}
                  onFocus={() => setQaArmed(true)}
                  onBlur={() => setQaArmed(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitQuickAdd();
                    if (e.key === "Escape") {
                      setQaText("");
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                />
                {qaArmed && qaText.trim() !== "" && (
                  <span
                    className="cf-mono flex-none"
                    style={{
                      fontSize: 7,
                      letterSpacing: "0.14em",
                      color: "var(--cf-text-dim)",
                    }}
                  >
                    ↵ CREATE · ESC CANCEL
                  </span>
                )}
              </div>
            </div>

            {/* 09 · SEARCH */}
            <div
              className="ydc-module flex min-w-0"
              style={{ flex: 1, padding: 4 }}
            >
              <span className="ydc-mlabel" style={{ zIndex: 2 }}>
                Search
              </span>
              <HeaderSearch />
            </div>

            {/* 10 · WIP faders */}
            {bus && bus.sections.length > 0 && (
              <div
                className="ydc-module flex-none gap-2 hidden lg:flex"
                style={{ padding: "0 12px" }}
              >
                <span className="ydc-mlabel">WIP</span>
                {bus.sections.slice(0, 5).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="ydc-fader"
                    title={`${s.name} · ${s.count} cards — jump to column`}
                    onClick={() => bus.jumpToSection(s.id)}
                  >
                    <span className="rail">
                      <span
                        className="cap"
                        style={{
                          top: `${Math.round(78 - (s.count / maxSectionCount) * 70)}%`,
                        }}
                      />
                    </span>
                    <span className="fl">{s.name.slice(0, 4)}</span>
                  </button>
                ))}
              </div>
            )}

            {/* 11 · CONTEXT */}
            {ctx && (
              <div
                className="ydc-module flex-none hidden xl:flex"
                style={{ width: 200, padding: 4 }}
              >
                <span className="ydc-mlabel" style={{ zIndex: 2 }}>
                  Context
                </span>
                <div
                  className="ydc-screen w-full h-full flex flex-col justify-center gap-0.5 px-3"
                  style={{ borderRadius: 7 }}
                >
                  <span
                    className="cf-mono font-bold truncate"
                    style={{
                      fontSize: 11,
                      color: "var(--cf-amber)",
                      textShadow: "0 0 7px rgba(255,176,0,0.45)",
                    }}
                  >
                    {ctx.big}
                  </span>
                  <span
                    className="cf-mono uppercase truncate"
                    style={{
                      fontSize: 6.5,
                      letterSpacing: "0.16em",
                      color: "var(--cf-text-dim)",
                    }}
                  >
                    {ctx.small}
                  </span>
                </div>
              </div>
            )}

            {/* 12 · PWR */}
            <div
              className="ydc-module flex flex-none gap-2"
              style={{ padding: "12px 11px 6px" }}
            >
              <span className="ydc-mlabel">PWR</span>
              <button
                type="button"
                className="ydc-rocker"
                title="Sign out"
                onClick={handleLogout}
              />
              <span
                className="cf-mono self-end pb-1"
                style={{
                  fontSize: 5.5,
                  letterSpacing: "0.2em",
                  color: "var(--cf-text-dim)",
                }}
              >
                MAINS
              </span>
            </div>
          </div>
        </div>

        {/* ══ MOBILE ═════════════════════════════════════════════════ */}
        <div
          className="flex md:hidden items-center gap-2"
          style={{ minHeight: 46 }}
        >
          <button
            onClick={() => router.push("/dashboard")}
            className="btn-physical flex-shrink-0"
            type="button"
          >
            <Image
              src={YondraIcon}
              alt="Yondra"
              width={28}
              height={28}
              className="rounded-lg"
            />
          </button>
          <div
            className="ydc-screen flex-1 min-w-0 px-2.5 py-1 overflow-hidden"
            style={{ borderRadius: 6 }}
          >
            <span
              className="cf-lcd truncate block"
              style={{
                color: "#ffb000",
                fontSize: 13,
                textShadow: "0 0 6px rgba(255,176,0,0.4)",
              }}
            >
              ▸ {displayLocation}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setNotifOpen((v) => !v);
            }}
            className="ydc-key relative flex-shrink-0"
            style={{ width: 32, height: 32 }}
            title="Alerts"
          >
            <span style={{ color: "var(--cf-amber)", fontSize: 14 }}>
              <Icon icon={faBell} />
            </span>
            {unreadCount > 0 && (
              <span
                className="cf-mono absolute -top-1.5 -right-1.5 min-w-4 h-4 px-0.5 rounded-full flex items-center justify-center font-bold text-white"
                style={{
                  fontSize: 9,
                  background: "var(--cf-red)",
                  boxShadow: "0 0 8px var(--cf-red)",
                }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            className="ydc-knob flex-shrink-0"
            style={{ width: 34, height: 34 }}
            onClick={() => {
              setNotifOpen(false);
              setMenuOpen((v) => !v);
            }}
            title={user?.name}
          >
            <span className="notch" />
            <span className="face" style={{ inset: 7 }}>
              {user ? initials(user.name) : "?"}
            </span>
          </button>
        </div>
        {alertTop && (
          <button
            type="button"
            className="ydc-screen flex md:hidden items-center gap-2 px-3 py-1.5 text-left"
            style={{ borderRadius: 6, border: "none" }}
            onClick={() =>
              router.push(
                `/boards/${alertTop.card.board_id}?card=${alertTop.card.id}`,
              )
            }
          >
            <span
              className="cf-led flex-shrink-0"
              style={{
                width: 5,
                height: 5,
                background:
                  alertTop.tone === "red" ? "var(--cf-red)" : "var(--cf-amber)",
                boxShadow: `0 0 6px ${alertTop.tone === "red" ? "var(--cf-red)" : "var(--cf-amber)"}`,
              }}
            />
            <span
              className="cf-mono truncate font-bold"
              style={{ fontSize: 10, color: "var(--cf-text)" }}
            >
              {alertTop.chip.toUpperCase()} · {alertTop.card.name}
            </span>
          </button>
        )}
      </div>

      {/* ── console log drawer ──────────────────────────────────────── */}
      {logOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setLogOpen(false)}
          />
          <div
            className="modal-content absolute z-50"
            style={{
              top: "calc(100% + 4px)",
              left: "50%",
              transform: "translateX(-50%)",
              width: "min(640px, 92vw)",
              background: "linear-gradient(to bottom, #2c2a24, #1d1b17)",
              border: "1px solid var(--cf-edge)",
              borderRadius: 12,
              boxShadow:
                "0 24px 54px rgba(0,0,0,0.65), inset 0 1px 0 var(--cf-edge-lit)",
              padding: 12,
            }}
          >
            <div className="flex items-center gap-2 pb-2.5">
              <span
                className="cf-led"
                style={{
                  width: 6,
                  height: 6,
                  background: "var(--cf-phosphor)",
                  boxShadow: "0 0 6px var(--cf-phosphor)",
                }}
              />
              <span
                className="cf-mono font-bold uppercase"
                style={{
                  fontSize: 8.5,
                  letterSpacing: "0.28em",
                  color: "var(--cf-text-muted)",
                }}
              >
                Console · Session Log
              </span>
              <button
                type="button"
                className="ydc-key ml-auto cf-mono uppercase"
                style={{
                  fontSize: 8,
                  letterSpacing: "0.16em",
                  padding: "3px 10px",
                }}
                onClick={() => setLogOpen(false)}
              >
                ✕ Close
              </button>
            </div>
            <div
              className="rounded-lg px-3.5 py-2.5"
              style={{
                background: "linear-gradient(to bottom, #b4bfa0, #a5b08e)",
                boxShadow: "inset 0 2px 8px rgba(0,0,0,0.45)",
              }}
            >
              {activity.length === 0 && (
                <div
                  className="cf-mono"
                  style={{ fontSize: 11.5, color: "#5a6050" }}
                >
                  ▌ standby…
                </div>
              )}
              {activity.map((a, i) => (
                <div
                  key={a.id}
                  className="cf-mono flex gap-3 py-0.5"
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: "#262e18",
                    opacity: i < activity.length - 3 ? 0.55 : 1,
                  }}
                >
                  <span style={{ opacity: 0.55, flex: "none" }}>{a.time}</span>
                  <span className="truncate">
                    {a.text}
                    {i === activity.length - 1 ? " ▊" : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── dropdowns ───────────────────────────────────────────────── */}
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
          anchorTop="76px"
        />
      )}

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div
            className="modal-content aero-menu absolute right-2 z-50 overflow-hidden min-w-[180px]"
            style={{ top: "76px" }}
          >
            {user && (
              <div
                className="px-4 py-3"
                style={{ borderBottom: "1px solid var(--cf-edge)" }}
              >
                <p
                  className="cf-label mb-1"
                  style={{ color: "var(--cf-phosphor)" }}
                >
                  User
                </p>
                <p
                  className="text-sm font-bold truncate cf-mono"
                  style={{ color: "var(--cf-text)" }}
                >
                  {user.name}
                </p>
              </div>
            )}
            <button
              onClick={() => {
                setMenuOpen(false);
                window.location.href = "/profile";
              }}
              className="btn-physical cf-mono w-full text-left px-4 py-2.5 text-sm cursor-pointer"
              style={{ color: "var(--cf-text)" }}
              type="button"
            >
              Profile
            </button>
            <button
              onClick={handleLogout}
              className="btn-physical cf-mono w-full text-left px-4 py-2.5 text-sm cursor-pointer"
              style={{
                borderTop: "1px solid var(--cf-edge)",
                color: "var(--cf-red)",
              }}
              type="button"
            >
              Logout
            </button>
          </div>
        </>
      )}
    </header>
  );
}
