"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { SvgArt } from "@/components/ui/SvgArt";
import {
  cautionTape,
  eatCard,
  flashClass,
  portalRing,
  prefersReducedMotion,
  tapeConfetti,
  tapeTrail,
} from "@/components/vortex/vortexEffects";
import {
  recall,
  rememberColumn,
  rememberOpened,
  rememberSeenLate,
  rememberVisit,
} from "@/components/vortex/vortexMemory";
import { vxSound } from "@/components/vortex/vortexSound";
import {
  armFleeingArchive,
  basement,
  cursorPull,
  eyesInTheDark,
  ghostCursor,
  gravityTilt,
  listenSecrets,
  listenWords,
  looseScrew,
  lyingClock,
  possessedOverlay,
  radioInterference,
  seanceGhosts,
  tabHijack,
  whisperPlaceholder,
} from "@/components/vortex/vortexPranks";
import { useSystem } from "@/contexts/SystemContext";
import { useVortexChat, type VortexAction } from "@/hooks/useVortexChat";
import {
  archiveBoard,
  createBoard,
  createCard,
  createProject,
  createSection,
  fetchBoard,
  fetchProjects,
  fetchDashboard,
  fetchVortexRemark,
  getArchivedCards,
} from "@/lib/api";
import { fetchBoards, fetchUser } from "@/lib/auth";
import { getEcho } from "@/lib/echo";
import {
  greeting,
  isVortexMounted,
  LINES,
  line,
  mountVortexContext,
  quipForRoute,
  randomTip,
  setVortexEnabled,
  subscribeVortexSay,
  unmountVortexContext,
  useVortexEnabled,
  useVortexHeadGames,
  useVortexIntensity,
  useVortexMounts,
  VORTEX_MAX_MOUNTS,
  type VortexMount,
  type VortexSpeech,
} from "@/lib/vortex";
import { type VortexMood, type VortexPose, vortexSvg } from "@/lib/vortexArt";
import {
  emitVortex,
  setVortexDropZone,
  subscribeVortex,
} from "@/lib/vortexBus";

/**
 * "Vortex" MK-II — Yondra's mascot (design/vortex-concept.png): the original pink
 * portal sprite, darker and more mischievous. He lives in the corner (tucked
 * into the left edge), follows your cursor with his eyes, can be dragged and
 * thrown, and reacts to the board through the vortexBus: he eats overdue cards
 * (and spits them back), tapes off jammed ones, stomps blown WIP meters,
 * celebrates finished cards and judges cards you keep moving. Every reaction is
 * a visual overlay that undoes itself — he never changes data — and waits until
 * you're not dragging, typing or inside a modal. His bubble still opens the
 * workspace chat. Dismissable via the × (persisted).
 */

const SHOW_MS = 9000; // how long a bubble stays up
const QUIP_COOLDOWN = 8000; // min gap between route-change quips
const IDLE_AFTER = 30000; // user considered idle after this
const IDLE_TIP_GAP = 75000; // min gap between unprompted idle tips
const IDLE_CHECK = 12000; // how often the idle check runs

const SPRITE = 136; // sprite box (px); the layer anchors at left:20 / bottom:50
const ANCHOR_X = 20;
const ANCHOR_B = 50;
const HOME_KEY = "yd:vortex.home";
const EATEN_KEY = "yd:vortex.eaten";
const BUSY_SELECTOR = ".modal-backdrop, .mt-cardx, [aria-modal='true']";

type Pt = { x: number; y: number };
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** The board card element for a card id, only if it's fully on screen. */
function visibleCard(id: number | string): HTMLElement | null {
  const el = document.querySelector<HTMLElement>(
    `.mt-jx[data-card-id="${CSS.escape(String(id))}"]`,
  );
  return el && onScreen(el) ? el : null;
}
function onScreen(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return (
    r.width > 0 &&
    r.top >= 60 &&
    r.left >= 0 &&
    r.bottom <= window.innerHeight &&
    r.right <= window.innerWidth
  );
}

/* layer offset that puts the sprite's centre on a viewport point */
function clampOff(o: Pt): Pt {
  const maxX = window.innerWidth - ANCHOR_X - SPRITE - 8;
  const minY = -(window.innerHeight - ANCHOR_B - SPRITE - 150);
  return {
    x: Math.max(-6, Math.min(maxX, o.x)),
    y: Math.max(minY, Math.min(ANCHOR_B - 10, o.y)),
  };
}
function offFor(center: Pt): Pt {
  return clampOff({
    x: center.x - SPRITE / 2 - ANCHOR_X,
    y: center.y - SPRITE / 2 - (window.innerHeight - ANCHOR_B - SPRITE),
  });
}

const VortexAssistant: React.FC = () => {
  const enabled = useVortexEnabled();
  const { isLogged } = useSystem();
  const pathname = usePathname() ?? "";
  const router = useRouter();

  const [user, setUser] = useState<{ id: number; name: string } | null>(null);
  // `mirror`: the bubble prints backwards until you hover it (a head game)
  const [speech, setSpeech] = useState<
    (VortexSpeech & { mirror?: boolean }) | null
  >(null);
  const [popN, setPopN] = useState(0);
  const [typed, setTyped] = useState(0); // lip-sync: letters shown so far
  const [chatOpen, setChatOpen] = useState(false);
  const [draft, setDraft] = useState("");
  // peek: pointer/focus is on him — slides him out of the border
  const [peek, setPeek] = useState(false);
  // mount picker (inside the chat panel)
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerItems, setPickerItems] = useState<VortexMount[] | null>(null);
  // proposed-action confirm cards, keyed by transcript index
  const [acted, setActed] = useState<
    Record<number, "working" | "done" | "dismissed" | "error">
  >({});

  const lastQuip = useRef(0);
  const lastSpoke = useRef(0);
  const lastActivity = useRef(Date.now());
  const greeted = useRef(false);
  const firstRoute = useRef(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatOpenRef = useRef(false);
  chatOpenRef.current = chatOpen;
  const logRef = useRef<HTMLDivElement>(null);
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mounts = useVortexMounts();
  const chat = useVortexChat(user?.id, enabled && isLogged, mounts);

  const active = enabled && isLogged;
  const intensity = useVortexIntensity();
  const headGames = useVortexHeadGames();
  // polite: reactions + tips only. mischief: + rituals and the odd head game.
  const mischief = intensity !== "polite";
  const pranksOn = mischief && headGames;

  // The board the user is looking at right now (for the one-click mount chip).
  const boardMatch = pathname.match(/^\/boards\/(\d+)(?:\/|$)/);
  const currentBoardId = boardMatch ? Number(boardMatch[1]) : null;

  /* who am I — needed for the private chat channel */
  useEffect(() => {
    if (!isLogged) {
      setUser(null);
      return;
    }
    fetchUser()
      .then((u) => setUser(u))
      .catch(() => setUser(null));
  }, [isLogged]);

  const speak = useCallback((s: VortexSpeech & { mirror?: boolean }) => {
    if (chatOpenRef.current) return; // never talk over an open chat
    lastSpoke.current = Date.now();
    setSpeech(s);
    setPopN((n) => n + 1);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setSpeech(null), SHOW_MS);
  }, []);

  /* lip-sync: the bubble types itself out while his mouth flaps */
  useEffect(() => {
    if (!speech) return;
    const full = speech.text.length;
    if (typeof window !== "undefined" && prefersReducedMotion()) {
      setTyped(full);
      return;
    }
    setTyped(0);
    const iv = setInterval(() => {
      setTyped((n) => {
        if (n >= full) {
          clearInterval(iv);
          return n;
        }
        return n + 2;
      });
    }, 28);
    return () => clearInterval(iv);
  }, [speech]);
  const talking = !!speech && typed < speech.text.length;

  /* one-time greeting per mount */
  useEffect(() => {
    if (!active || greeted.current) return;
    greeted.current = true;
    // No cancelling cleanup: StrictMode's double-invoke would clear the timer
    // and the ref guard would block rescheduling.
    setTimeout(() => speak({ text: greeting() }), 2200);
  }, [active, speak]);

  /* contextual quip when the route changes (skip the landing route) */
  useEffect(() => {
    if (!active) return;
    if (firstRoute.current) {
      firstRoute.current = false;
      return;
    }
    const now = Date.now();
    if (now - lastQuip.current < QUIP_COOLDOWN) return;
    const line = quipForRoute(pathname);
    if (line) {
      lastQuip.current = now;
      speak({ text: line });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, active, speak]);

  /* track user activity for idle tips */
  useEffect(() => {
    if (!active) return;
    const bump = () => {
      lastActivity.current = Date.now();
    };
    const evs: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "wheel",
    ];
    for (const e of evs) window.addEventListener(e, bump, { passive: true });
    const iv = setInterval(() => {
      const now = Date.now();
      const idle = now - lastActivity.current > IDLE_AFTER;
      const quiet = now - lastSpoke.current > IDLE_TIP_GAP;
      if (idle && quiet && !document.hidden) speak({ text: randomTip() });
    }, IDLE_CHECK);
    return () => {
      for (const e of evs) window.removeEventListener(e, bump);
      clearInterval(iv);
    };
  }, [active, speak]);

  /* external say() channel */
  useEffect(() => {
    if (!active) return;
    return subscribeVortexSay((s) => speak(s));
  }, [active, speak]);

  /* keep the chat log pinned to the newest message */
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new content
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.messages, chat.streamingText, chatOpen]);

  const openChat = () => {
    setSpeech(null);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setChatOpen(true);
  };

  /* ─────────── MK-II body: position (layer offset), gaze, drag ─────────── */
  const layerRef = useRef<HTMLDivElement>(null);
  const spriteRef = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/[^a-z0-9]/gi, "");
  const [mood, setMood] = useState<VortexMood>("smug");
  const [pose, setPose] = useState<VortexPose | undefined>(undefined);
  const [flip, setFlip] = useState(false);
  const [off, setOff] = useState<Pt>({ x: 0, y: 0 });
  const [dur, setDur] = useState(0);
  const [traveling, setTraveling] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [acting, setActing] = useState(false);
  const [portal, setPortal] = useState<"in" | "out" | null>(null);
  const [twin, setTwin] = useState(false);
  const [contract, setContract] = useState<{
    boardId: number;
    cardId: number | string;
    key: string;
    restore: () => void;
  } | null>(null);
  const [visitors, setVisitors] = useState<{ id: number; name: string }[]>([]);
  const actingRef = useRef(false);
  actingRef.current = acting;
  const homeRef = useRef<Pt>({ x: 0, y: 0 });
  const offRef = useRef<Pt>({ x: 0, y: 0 });
  offRef.current = off;
  const svg = useMemo(() => vortexSvg(mood, uid, pose), [mood, uid, pose]);

  /* night shift: between midnight and 5am he wears his nightcap at rest */
  const [hour, setHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const iv = setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => clearInterval(iv);
  }, []);
  const restMood: VortexMood = hour < 5 ? "sleepy" : "smug";
  const restMoodRef = useRef<VortexMood>(restMood);
  restMoodRef.current = restMood;
  useEffect(() => {
    if (!actingRef.current) setMood(restMood);
  }, [restMood]);

  /* restore the spot the user dragged him to (clamped to this viewport) */
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(HOME_KEY) ?? "null");
      if (raw && typeof raw.x === "number" && typeof raw.y === "number") {
        const h = clampOff(raw);
        homeRef.current = h;
        setOff(h);
      }
    } catch {
      // no saved home — stay in the corner
    }
  }, []);

  /* fly the layer to an offset; resolves when he lands */
  /* viewport centre of his sprite for a given layer offset */
  function centerFor(o: Pt): Pt {
    return {
      x: ANCHOR_X + o.x + SPRITE / 2,
      y: window.innerHeight - ANCHOR_B - SPRITE + o.y + SPRITE / 2,
    };
  }
  /* squash on landing (CSS), deck-key click */
  function land() {
    if (spriteRef.current) flashClass(spriteRef.current, "vxa-land", 520);
    vxSound("click");
  }
  async function travel(
    to: Pt,
    opts: { portal?: boolean } = {},
  ): Promise<void> {
    const from = offRef.current;
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const reduced = prefersReducedMotion();
    if (dist < 2) return;
    // long trips: sometimes he dives into a portal and pops out of another
    if (!reduced && (opts.portal || (dist > 650 && Math.random() < 0.5))) {
      portalRing(centerFor(from));
      setPortal("in");
      vxSound("whisper");
      await wait(300);
      setDur(0);
      setOff(to);
      offRef.current = to;
      await wait(40);
      portalRing(centerFor(to));
      setPortal("out");
      await wait(360);
      setPortal(null);
      land();
      return;
    }
    const ms = reduced
      ? 0
      : Math.round(Math.max(420, Math.min(1100, dist * 1.1)));
    setDur(ms);
    setTraveling(ms > 0);
    setOff(to);
    if (ms > 0 && spriteRef.current) {
      flashClass(spriteRef.current, "vxa-launch", 260);
      tapeTrail(spriteRef.current, ms);
      vxSound("hiss");
    }
    await wait(ms + 40);
    setTraveling(false);
    if (ms > 0) land();
  }
  async function goHome() {
    setPose(undefined);
    // on the dashboard he sometimes climbs back out of the Now-playing tape
    const win = document.querySelector<HTMLElement>(".hf-np .win");
    const home = homeRef.current;
    if (
      win &&
      home.x === 0 &&
      home.y === 0 &&
      !prefersReducedMotion() &&
      Math.random() < 0.5
    ) {
      const r = win.getBoundingClientRect();
      const at = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      portalRing(centerFor(offRef.current));
      setPortal("in");
      await wait(300);
      setDur(0);
      const o = offFor(at);
      setOff(o);
      offRef.current = o;
      await wait(40);
      portalRing(at);
      setPortal("out");
      await wait(360);
      setPortal(null);
    }
    await travel(homeRef.current);
    setFlip(false);
    setMood(restMoodRef.current);
  }

  /* a point beside a rect, preferring the side with room */
  function beside(r: DOMRect): { pt: Pt; side: "left" | "right" } {
    const roomRight = window.innerWidth - r.right > SPRITE + 20;
    const y = r.top + Math.min(r.height / 2, 90);
    return roomRight
      ? { pt: { x: r.right + SPRITE / 2 - 14, y }, side: "right" }
      : { pt: { x: r.left - SPRITE / 2 + 14, y }, side: "left" };
  }
  function mouthPoint(): Pt {
    const r = spriteRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    return {
      x: r.left + (80 / 160) * r.width,
      y: r.top + (92 / 150) * r.height,
    };
  }

  const gazeRef = useRef<{ x: number; y: number; until: number } | null>(null);
  const lastPointer = useRef<Pt>({ x: 0, y: 0 });
  const lastPointerMove = useRef(0);
  const gazeApply = useRef<(() => void) | null>(null);
  const twinSvg = useMemo(
    () => vortexSvg("judging", `${uid}tw`, "none"),
    [uid],
  );
  const visitorSvg = useMemo(
    () => vortexSvg("curious", `${uid}vs`, "none"),
    [uid],
  );

  /* gaze: pupils follow the cursor (CSS vars, no re-render) */
  useEffect(() => {
    if (!active || prefersReducedMotion()) return;
    let raf = 0;
    let last: Pt = { x: 0, y: 0 };
    const apply = () => {
      raf = 0;
      const el = spriteRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // an intentional look (a ringing bell, something he's hiding) wins
      const target =
        gazeRef.current && gazeRef.current.until > Date.now()
          ? gazeRef.current
          : last;
      const dx = target.x - (r.left + r.width / 2);
      const dy = target.y - (r.top + r.height / 2);
      const len = Math.hypot(dx, dy) || 1;
      const k = Math.min(len / 140, 1) * 3.2;
      el.style.setProperty(
        "--vx-lx",
        `${((dx / len) * k * (flip ? -1 : 1)).toFixed(2)}px`,
      );
      el.style.setProperty("--vx-ly", `${((dy / len) * k).toFixed(2)}px`);
    };
    const onMove = (e: PointerEvent) => {
      last = { x: e.clientX, y: e.clientY };
      lastPointer.current = last;
      lastPointerMove.current = Date.now();
      if (!raf) raf = requestAnimationFrame(apply);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    gazeApply.current = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [active, flip]);

  /* look at a point on purpose for a while, then back to the cursor */
  function lookAt(pt: Pt, ms = 2500) {
    gazeRef.current = { ...pt, until: Date.now() + ms };
    gazeApply.current?.();
    setTimeout(() => gazeApply.current?.(), ms + 30);
  }

  /* grab & throw: drag him anywhere; a fast fling makes him dizzy */
  const grabRef = useRef<{
    x: number;
    y: number;
    o: Pt;
    moved: boolean;
    trail: { x: number; y: number; t: number }[];
  } | null>(null);
  const suppressClick = useRef(false);
  const onGrab = (e: React.PointerEvent) => {
    if (e.button !== 0 || actingRef.current) return;
    grabRef.current = {
      x: e.clientX,
      y: e.clientY,
      o: offRef.current,
      moved: false,
      trail: [{ x: e.clientX, y: e.clientY, t: performance.now() }],
    };
    const move = (ev: PointerEvent) => {
      const g = grabRef.current;
      if (!g) return;
      const dx = ev.clientX - g.x;
      const dy = ev.clientY - g.y;
      if (!g.moved && Math.hypot(dx, dy) < 6) return;
      if (!g.moved) {
        g.moved = true;
        setDragging(true);
        setSpeech(null);
      }
      g.trail.push({ x: ev.clientX, y: ev.clientY, t: performance.now() });
      if (g.trail.length > 6) g.trail.shift();
      setDur(0);
      setOff(clampOff({ x: g.o.x + dx, y: g.o.y + dy }));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const g = grabRef.current;
      grabRef.current = null;
      if (!g?.moved) return;
      suppressClick.current = true;
      setDragging(false);
      const lastPt = g.trail[g.trail.length - 1];
      if (lastPt && lastPt.y > window.innerHeight - 18) {
        // pushed through the floor: down to the basement, then back home
        setOff(homeRef.current);
        void openBasement();
        return;
      }
      homeRef.current = offRef.current;
      try {
        localStorage.setItem(HOME_KEY, JSON.stringify(offRef.current));
      } catch {
        // storage full / blocked — he just won't remember
      }
      const a = g.trail[0];
      const b = g.trail[g.trail.length - 1];
      const speed = Math.hypot(b.x - a.x, b.y - a.y) / Math.max(1, b.t - a.t);
      if (speed > 1.4) {
        setMood("dizzy");
        speak({ text: line(LINES.dizzy) });
        setTimeout(() => setMood(restMoodRef.current), 2800);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  /* peek: at the default corner he tucks into the left edge (a sliver stays
     visible) and slides out while hovered/focused, speaking, acting or chatting */
  const holdPeek = () => {
    if (peekTimer.current) clearTimeout(peekTimer.current);
    setPeek(true);
  };
  const releasePeek = () => {
    if (peekTimer.current) clearTimeout(peekTimer.current);
    peekTimer.current = setTimeout(() => setPeek(false), 700);
  };
  const atCornerHome =
    homeRef.current.x === 0 &&
    homeRef.current.y === 0 &&
    off.x === 0 &&
    off.y === 0;
  const docked =
    atCornerHome && !peek && !speech && !chatOpen && !acting && !dragging;

  /* ─────────────── brain: react to the board, one act at a time ─────────── */
  const draggingCard = useRef(false);
  const moves = useRef(new Map<string, number>());
  const queue = useRef<(() => Promise<void>)[]>([]);
  const lastAct = useRef<Record<string, number>>({});
  const spitRef = useRef<(() => void) | null>(null);

  const isBusy = useCallback((): boolean => {
    if (
      draggingCard.current ||
      chatOpenRef.current ||
      actingRef.current ||
      grabRef.current ||
      document.hidden
    )
      return true;
    if (document.querySelector(BUSY_SELECTOR)) return true;
    const a = document.activeElement as HTMLElement | null;
    return (
      !!a &&
      !a.closest(".vxa-layer") &&
      (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))
    );
  }, []);

  /** Queue an act unless the same kind ran within `cooldown` ms. */
  const enqueue = useCallback(
    (kind: string, cooldown: number, act: () => Promise<void> | undefined) => {
      const now = Date.now();
      if (now - (lastAct.current[kind] ?? 0) < cooldown) return;
      if (queue.current.length >= 3) return;
      lastAct.current[kind] = now;
      queue.current.push(async () => {
        await act();
      });
    },
    [],
  );

  /* the runner: plays the next act when the user isn't in the middle of something */
  // biome-ignore lint/correctness/useExhaustiveDependencies: acts read refs/setters only (stable)
  useEffect(() => {
    if (!active) return;
    const iv = setInterval(async () => {
      if (queue.current.length === 0 || isBusy()) return;
      const next = queue.current.shift();
      if (!next) return;
      setActing(true);
      actingRef.current = true;
      try {
        await next();
      } catch {
        await goHome();
      } finally {
        setActing(false);
        actingRef.current = false;
      }
    }, 600);
    return () => clearInterval(iv);
  }, [active, isBusy]);

  /* acts */
  async function actEat(card: HTMLElement) {
    const key = card.dataset.vxKey;
    const n = Number(card.dataset.vxLate) || 1;
    const { pt, side } = beside(card.getBoundingClientRect());
    setFlip(side === "left");
    setMood("hungry");
    await travel(offFor(pt));
    if (!card.isConnected) return goHome();
    const eaten = eatCard(card, mouthPoint());
    setTimeout(() => vxSound("crunch"), 900);
    rememberEaten(card.dataset.cardId);
    const spit = () => {
      eaten.spit();
      spitRef.current = null;
      setMood(restMoodRef.current);
      speak({ text: line(LINES.spit, { key }) });
    };
    spitRef.current = spit;
    setTimeout(() => {
      if (spitRef.current === spit) spitRef.current = null;
    }, 20000);
    await wait(1100);
    setMood(restMoodRef.current);
    speak({
      text: line(LINES.eat, { key, n }),
      action: { label: "Spit it out", run: () => spitRef.current?.() },
    });
    await wait(6500);
    await goHome();
  }

  async function actPoke(card: HTMLElement, reason: string) {
    const key = card.dataset.vxKey;
    const { pt, side } = beside(card.getBoundingClientRect());
    // the stick points right; flip him when he stands right of the card
    setFlip(side === "right");
    setMood(restMoodRef.current);
    setPose("poke");
    await travel(offFor({ x: pt.x, y: pt.y - 20 }));
    if (!card.isConnected) return goHome();
    cautionTape(card, (reason || "waiting").toUpperCase().slice(0, 40));
    speak({ text: line(LINES.poke, { key, reason }) });
    await wait(6200);
    await goHome();
  }

  async function actStomp(rack: HTMLElement) {
    const vu = rack.querySelector<HTMLElement>("[data-vx-vu]") ?? rack;
    const r = vu.getBoundingClientRect();
    setFlip(false);
    setMood("judging");
    setPose("stomp");
    await travel(
      offFor({ x: r.right - SPRITE / 2 + 10, y: r.top - SPRITE / 2 + 18 }),
    );
    flashClass(vu, "vxa-stomped", 1500);
    setTimeout(() => flashClass(vu, "vxa-stomped", 1500), 1700);
    speak({
      text: line(LINES.stomp, {
        n: Number(rack.dataset.vxCount),
        m: Number(rack.dataset.vxLimit),
      }),
    });
    await wait(5600);
    await goHome();
  }

  async function actDone(card: HTMLElement) {
    const key = card.dataset.vxKey;
    const r = card.getBoundingClientRect();
    const { pt, side } = beside(r);
    setFlip(side === "left");
    setMood("happy");
    await travel(offFor(pt));
    vxSound("rewind");
    tapeConfetti({
      x: r.left + r.width / 2,
      y: r.top + Math.min(r.height, 60) / 2,
    });
    speak({ text: line(LINES.done, { key }) });
    await wait(4600);
    await goHome();
  }

  async function actJudge(card: HTMLElement, n: number) {
    const key = card.dataset.vxKey;
    const { pt, side } = beside(card.getBoundingClientRect());
    setFlip(side === "left");
    setMood("judging");
    await travel(offFor(pt));
    speak({ text: line(LINES.judge, { key, n }) });
    await wait(5200);
    await goHome();
  }

  async function actWander() {
    const x = 140 + Math.random() * window.innerWidth * 0.38;
    setMood("curious");
    setFlip(x < (spriteRef.current?.getBoundingClientRect().left ?? 0));
    await travel(offFor({ x, y: window.innerHeight - ANCHOR_B - SPRITE / 2 }));
    if (Math.random() < 0.35) speak({ text: line(LINES.wander) });
    await wait(3800);
    await goHome();
  }

  function rememberEaten(id?: string) {
    if (!id) return;
    try {
      const list: string[] = JSON.parse(
        sessionStorage.getItem(EATEN_KEY) ?? "[]",
      );
      sessionStorage.setItem(
        EATEN_KEY,
        JSON.stringify([...list, id].slice(-50)),
      );
    } catch {
      // session storage blocked — he may eat it again, which is on brand
    }
  }
  function wasEaten(id?: string): boolean {
    try {
      return (
        !!id &&
        (
          JSON.parse(sessionStorage.getItem(EATEN_KEY) ?? "[]") as string[]
        ).includes(id)
      );
    } catch {
      return false;
    }
  }

  /* ───────────── phase 3: feeding, rituals · phase 4: secrets ───────────── */
  const clicks = useRef<number[]>([]);
  const commented = useRef(new Set<string>());
  const seenThisVisit = useRef(new Set<string>());
  const possessedRef = useRef(false);
  const feedHintRef = useRef(false);

  /* while a card is dragged he peeks out, mouth open: drop it on him */
  function feedHint(on: boolean) {
    if (actingRef.current || chatOpenRef.current) return;
    feedHintRef.current = on;
    if (on) {
      holdPeek();
      setMood("hungry");
    } else {
      releasePeek();
      setMood(restMoodRef.current);
    }
  }

  /* drop zone = his body (the middle of the sprite box) */
  useEffect(() => {
    if (!active) return;
    setVortexDropZone(() => {
      const r = spriteRef.current?.getBoundingClientRect();
      if (!r) return null;
      const pad = r.width * 0.22;
      return new DOMRect(
        r.left + pad,
        r.top + pad,
        r.width - pad * 2,
        r.height - pad * 2,
      );
    });
    return () => setVortexDropZone(null);
  }, [active]);

  async function actFed(
    boardId: number,
    cardId: number | string,
    hasBacklog: boolean,
  ) {
    await wait(80); // let the board put the card back first
    const card = visibleCard(cardId);
    const key = card?.dataset.vxKey;
    setMood("hungry");
    const eaten = card ? eatCard(card, mouthPoint(), 15_000) : null;
    const settle = () => {
      eaten?.spit();
      spitRef.current = null;
      setMood(restMoodRef.current);
    };
    spitRef.current = settle;
    setTimeout(() => {
      if (spitRef.current === settle) settle();
    }, 14_000);
    await wait(900);
    setMood("smug");
    speak({
      text: line(LINES.fed, { key }),
      action: {
        label: "Archive it",
        run: () => {
          settle();
          emitVortex({ type: "vortex.archive", boardId, cardId });
        },
      },
      action2: hasBacklog
        ? {
            label: "Backlog it",
            run: () => {
              settle();
              emitVortex({ type: "vortex.backlog", boardId, cardId });
              speak({
                text: `banished ${key ?? "it"} to the backlog. it can think about what it did.`,
              });
            },
          }
        : undefined,
    });
    await wait(1500);
  }

  async function actSeance(boardId: number) {
    const late = Array.from(
      document.querySelectorAll<HTMLElement>(".mt-jx[data-vx-late]"),
    );
    markDaily("seance");
    if (late.length === 0) {
      setMood("curious");
      speak({ text: line(LINES.calm) });
      await wait(4000);
      setMood(restMoodRef.current);
      return;
    }
    const keys = late.map((el) => el.dataset.vxKey ?? "???");
    const r = spriteRef.current?.getBoundingClientRect();
    setMood("possessed");
    if (r)
      seanceGhosts(keys, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
    const first = late[0];
    speak({
      text: line(LINES.seance, { n: late.length, key: keys[0] }),
      action: {
        label: "Exorcise",
        run: () =>
          emitVortex({
            type: "vortex.open",
            boardId,
            cardId: first.dataset.cardId ?? "",
          }),
      },
    });
    await wait(7000);
    setMood(restMoodRef.current);
  }

  async function actCursed(card: HTMLElement) {
    const { pt, side } = beside(card.getBoundingClientRect());
    setFlip(side === "left");
    setMood("judging");
    await travel(offFor(pt));
    speak({
      text: line(LINES.cursed, {
        key: card.dataset.vxKey,
        n: Number(card.dataset.vxIdle) || 30,
      }),
    });
    await wait(5000);
    await goHome();
  }

  function actPossessed(ms = 20_000) {
    if (possessedRef.current) return;
    possessedRef.current = true;
    const end = possessedOverlay(ms);
    setMood("possessed");
    vxSound("whisper");
    speak({ text: line(LINES.possessed) });
    setTimeout(() => {
      end();
      possessedRef.current = false;
      setMood(restMoodRef.current);
      if (ms >= 10_000) speak({ text: line(LINES.unpossessed) });
    }, ms);
  }
  function actPoked() {
    speak({ text: line(LINES.poked) });
    actPossessed(3200);
  }

  /* once-a-day/once-a-night bookkeeping */
  const today = () => new Date().toDateString();
  function doneToday(what: string): boolean {
    try {
      return localStorage.getItem(`yd:vortex.${what}`) === today();
    } catch {
      return true;
    }
  }
  function markDaily(what: string) {
    try {
      localStorage.setItem(`yd:vortex.${what}`, today());
    } catch {
      // storage blocked — rituals may repeat; harmless
    }
  }

  /* secrets: the Konami code possesses him; typing "vortex" summons a spin */
  // biome-ignore lint/correctness/useExhaustiveDependencies: acts read refs/setters only (stable)
  useEffect(() => {
    if (!active) return;
    return listenSecrets({
      konami: () => actPossessed(),
      name: () => {
        if (spriteRef.current) flashClass(spriteRef.current, "vxa-spin", 1000);
        speak({ text: line(LINES.summoned) });
      },
    });
  }, [active]);

  /* night shift / witching hour / friday evening — one line each per day */
  // biome-ignore lint/correctness/useExhaustiveDependencies: acts read refs/setters only (stable)
  useEffect(() => {
    if (!active || !mischief) return;
    // retry every 10s until he gets a quiet moment (he may be mid-act)
    const t = setInterval(() => {
      if (isBusy()) return;
      clearInterval(t);
      const now = new Date();
      const time = now.toTimeString().slice(0, 5);
      if (hour === 3 && !doneToday("witching")) {
        markDaily("witching");
        speak({ text: line(LINES.witching) });
      } else if (hour < 5 && !doneToday("night")) {
        markDaily("night");
        speak({ text: line(LINES.night, { time }) });
      } else if (now.getDay() === 5 && hour >= 17 && !doneToday("friday")) {
        markDaily("friday");
        speak({ text: line(LINES.friday) });
      }
    }, 10_000);
    return () => clearInterval(t);
  }, [active, mischief, hour, isBusy]);

  /* daily tape horoscope on the dashboard (AI line, local fallback) */
  // biome-ignore lint/correctness/useExhaustiveDependencies: acts read refs/setters only (stable)
  useEffect(() => {
    if (!active || !pathname.startsWith("/dashboard") || doneToday("horoscope"))
      return;
    const t = setTimeout(async () => {
      if (isBusy() || doneToday("horoscope")) return;
      markDaily("horoscope");
      let text: string;
      try {
        text = (await fetchVortexRemark()).text;
      } catch {
        text = line(LINES.horoscope, { n: 1 + Math.floor(Math.random() * 4) });
      }
      speak({ text: `today's tape horoscope: ${text}` });
    }, 12_000);
    return () => clearTimeout(t);
  }, [active, pathname, isBusy]);

  /* dev-only: trigger any prank / act by name from the console (and tests) */
  const prankTable = useRef<Record<string, () => boolean>>({});
  function registerPranks(list: [string, () => boolean][]) {
    prankTable.current = Object.fromEntries(list);
  }
  // biome-ignore lint/correctness/useExhaustiveDependencies: acts read refs/setters only (stable)
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !active) return;
    const w = window as unknown as { __vortexDebug?: unknown };
    w.__vortexDebug = {
      prank: (k: string) => prankTable.current[k]?.() ?? `no prank "${k}"`,
      bored: () => void actBored(),
      basement: () => void openBasement(),
      possess: () => actPossessed(4000),
      notify: () => noticeBell(),
      visitors: (list: { id: number; name: string }[]) => setVisitors(list),
    };
    return () => {
      delete w.__vortexDebug;
    };
  }, [active]);

  /* head games (phase 2): a rare, harmless prank when nothing else is going on */
  const lastPrank = useRef(Date.now());
  // biome-ignore lint/correctness/useExhaustiveDependencies: acts read refs/setters only (stable)
  useEffect(() => {
    if (!active || !pranksOn) return;
    const unhinged = intensity === "unhinged";
    const buildPranks = (): [string, () => boolean][] => {
      const pranks: [string, () => boolean][] = [
        [
          "gravity",
          () => {
            const ok = gravityTilt();
            if (ok)
              setTimeout(() => speak({ text: line(LINES.gravity) }), 3400);
            return ok;
          },
        ],
        [
          "ghost",
          () => {
            const ok = ghostCursor();
            if (ok)
              speak({
                text: "that's your cursor from 400ms ago. it wants to talk.",
              });
            return ok;
          },
        ],
        [
          "clock",
          () => {
            const ok = lyingClock();
            if (ok) setTimeout(() => speak({ text: line(LINES.clock) }), 2000);
            return ok;
          },
        ],
        [
          "whisper",
          () =>
            whisperPlaceholder(
              [
                "you were going to search 'deadline', weren't you?",
                "looking for something? it's looking for you too.",
                "search for your will to finish YON-…",
              ][Math.floor(Math.random() * 3)],
            ),
        ],
        [
          "screw",
          () => {
            const ok = looseScrew(() => speak({ text: line(LINES.screwBack) }));
            if (ok) setTimeout(() => vxSound("tink"), 1500);
            if (ok) setTimeout(() => speak({ text: line(LINES.screw) }), 2200);
            return ok;
          },
        ],
      ];
      pranks.push(
        [
          "radio",
          () => {
            const ok = radioInterference();
            if (ok)
              setTimeout(
                () => speak({ text: "did you hear that? no? good." }),
                2400,
              );
            return ok;
          },
        ],
        [
          "mirror",
          () => {
            speak({
              text: line(LINES.gravity.concat(LINES.wander)),
              mirror: true,
            });
            return true;
          },
        ],
        [
          "pull",
          () => {
            // only while the mouse has been still for a few seconds
            if (Date.now() - lastPointerMove.current < 5000) return false;
            const r = spriteRef.current?.getBoundingClientRect();
            if (!r) return false;
            const ok = cursorPull(lastPointer.current, {
              x: r.left + r.width / 2,
              y: r.top + r.height / 2,
            });
            if (ok) setTimeout(() => speak({ text: "come closer." }), 1700);
            return ok;
          },
        ],
        [
          "twin",
          () => {
            if (Math.random() > (unhinged ? 0.5 : 0.25)) return false;
            setTwin(true);
            return true;
          },
        ],
      );
      return pranks;
    };
    registerPranks(buildPranks());
    const iv = setInterval(() => {
      const now = Date.now();
      if (isBusy() || now - lastPrank.current < (unhinged ? 2 : 6) * 60_000)
        return;
      if (Math.random() > (unhinged ? 0.6 : 0.35)) return;
      const each = (unhinged ? 6 : 20) * 60_000;
      const ready = (k: string) =>
        now - (lastAct.current[`p:${k}`] ?? 0) > each;
      const pranks = buildPranks();
      registerPranks(pranks);
      const options = pranks.filter(([k]) => ready(k));
      for (let tries = 0; tries < 3 && options.length; tries++) {
        const i = Math.floor(Math.random() * options.length);
        const [k, run] = options.splice(i, 1)[0];
        if (run()) {
          lastAct.current[`p:${k}`] = now;
          lastPrank.current = now;
          break;
        }
      }
    }, 45_000);
    return () => clearInterval(iv);
  }, [active, pranksOn, intensity, isBusy]);

  /* eyes in the dark: idle a few minutes and the page watches back */
  // biome-ignore lint/correctness/useExhaustiveDependencies: acts read refs/setters only (stable)
  useEffect(() => {
    if (!active || !pranksOn) return;
    let stop: (() => void) | null = null;
    const after = (intensity === "unhinged" ? 90 : 180) * 1000;
    const iv = setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      if (stop || document.hidden || idle < after || chatOpenRef.current)
        return;
      if (document.querySelector(BUSY_SELECTOR) || actingRef.current) return;
      if (Date.now() - (lastAct.current.eyes ?? 0) < 15 * 60_000) return;
      lastAct.current.eyes = Date.now();
      setMood("curious");
      stop = eyesInTheDark(() => {
        stop = null;
        setMood(restMoodRef.current);
        speak({ text: "they were only looking. probably." });
      });
    }, 15_000);
    return () => {
      clearInterval(iv);
      stop?.();
    };
  }, [active, pranksOn, intensity]);

  /* tab hijack + the nervous Archive button */
  // biome-ignore lint/correctness/useExhaustiveDependencies: acts read refs/setters only (stable)
  useEffect(() => {
    if (!active || !pranksOn) return;
    const offTab = tabHijack((away) => {
      if (away > 45_000)
        setTimeout(() => speak({ text: line(LINES.tabBack) }), 600);
    });
    const offFlee = armFleeingArchive(() => {
      // he's under modals; apologise once the editor closes
      const started = Date.now();
      const iv = setInterval(() => {
        if (
          !document.querySelector(BUSY_SELECTOR) ||
          Date.now() - started > 60_000
        ) {
          clearInterval(iv);
          speak({ text: line(LINES.flee) });
        }
      }, 800);
    });
    return () => {
      offTab();
      offFlee();
    };
  }, [active, pranksOn]);

  /* ─────────────────────── MK-III: everything else ──────────────────────── */
  const mirrorRef = useRef<(() => void) | null>(null);

  /* mirror: while you drag a card you keep moving, he copies you across the
     page (horizontally flipped, a beat late) */
  function startMirror() {
    if (actingRef.current || chatOpenRef.current) return;
    holdPeek();
    setMood("judging");
    setPose(undefined);
    let raf = 0;
    let pt: Pt | null = null;
    const onMove = (ev: PointerEvent) => {
      pt = { x: window.innerWidth - ev.clientX, y: ev.clientY };
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          if (!pt) return;
          setDur(140);
          setOff(offFor(pt));
        });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    mirrorRef.current = () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }
  function stopMirror() {
    mirrorRef.current?.();
    mirrorRef.current = null;
    releasePeek();
    speak({ text: "copying you. it's flattering, right?" });
    void goHome();
  }

  /* contract with the void: an overdue card fed to him */
  async function actContract(boardId: number, cardId: number | string) {
    await wait(80);
    const card = visibleCard(cardId);
    if (!card) return;
    setMood("possessed");
    const eaten = eatCard(card, mouthPoint(), 60_000);
    vxSound("whisper");
    await wait(900);
    setContract({
      boardId,
      cardId,
      key: card.dataset.vxKey ?? "this card",
      restore: () => {
        eaten.spit();
        setMood(restMoodRef.current);
      },
    });
  }

  /* the basement: archived cards of this board, by flashlight. Way down: drag
     him through the floor, or type "below" (avoids the board's N/C hotkeys) */
  async function openBasement() {
    if (basementRef.current) return;
    const m = /^\/boards\/(\d+)/.exec(pathname);
    let items: { key: string; name: string; when: string }[] = [];
    if (m) {
      try {
        const page = await getArchivedCards(Number(m[1]));
        items = page.data.map((c) => ({
          key: c.ticket_key ?? `#${c.id}`,
          name: c.name,
          when: c.archived_at
            ? new Date(c.archived_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : "long ago",
        }));
      } catch {
        // no access / offline: an empty basement is still a basement
      }
    }
    setMood("curious");
    vxSound("whisper");
    basementRef.current = basement(items, () => {
      basementRef.current = null;
      setMood(restMoodRef.current);
      speak({ text: "fresh air. overrated." });
    });
  }
  const basementRef = useRef<(() => void) | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: acts read refs/setters only (stable)
  useEffect(() => {
    if (!active) return;
    return listenWords({ below: () => void openBasement() });
  }, [active, pathname]);

  /* night graveyard on the Done shelf + rotting tape on idle cards */
  useEffect(() => {
    const night = hour >= 21 || hour < 5;
    const root = document.documentElement;
    root.classList.toggle("vxa-graveyard", active && mischief && night);
    root.classList.toggle("vxa-rot", active && mischief);
    return () => {
      root.classList.remove("vxa-graveyard");
      root.classList.remove("vxa-rot");
    };
  }, [active, mischief, hour]);

  /* boredom: a long quiet spell → yawn, a 5-second nap, and a startle if you
     catch him at it */
  async function actBored() {
    setMood("yawn");
    await wait(1700);
    setMood("dormant");
    const napStart = Date.now();
    for (let t = 0; t < 10; t++) {
      await wait(500);
      if (lastActivity.current > napStart) {
        setMood("curious");
        if (spriteRef.current)
          flashClass(spriteRef.current, "vxa-startle", 600);
        speak({ text: "I WASN'T SLEEPING." });
        await wait(1800);
        setMood(restMoodRef.current);
        return;
      }
    }
    setMood(restMoodRef.current);
  }
  // biome-ignore lint/correctness/useExhaustiveDependencies: acts read refs/setters only (stable)
  useEffect(() => {
    if (!active) return;
    const after = intensity === "unhinged" ? 150_000 : 240_000;
    const iv = setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      if (idle > after && !document.querySelector(".vxa-dark"))
        enqueue("bored", 10 * 60_000, () => actBored());
      // now and then he glances away, like he's hiding something
      else if (
        mischief &&
        idle < 20_000 &&
        Math.random() < 0.08 &&
        spriteRef.current
      ) {
        const r = spriteRef.current.getBoundingClientRect();
        lookAt({ x: r.left - 400, y: r.top - 300 }, 1600);
      }
    }, 20_000);
    return () => clearInterval(iv);
  }, [active, intensity, mischief, enqueue]);

  /* notifications: he looks at the bell before you do */
  function noticeBell() {
    const bell = document.querySelector<HTMLElement>(
      "[title='Alerts'], [aria-label='Notifications']",
    );
    if (bell) {
      const r = bell.getBoundingClientRect();
      lookAt({ x: r.left + r.width / 2, y: r.top + r.height / 2 }, 3000);
    }
    if (!isBusy())
      speak({ text: "something's ringing over there. I saw it first." });
  }
  // biome-ignore lint/correctness/useExhaustiveDependencies: acts read refs/setters only (stable)
  useEffect(() => {
    if (!active || !user?.id) return;
    let channel: ReturnType<ReturnType<typeof getEcho>["private"]> | null =
      null;
    const onNote = () => noticeBell();
    try {
      channel = getEcho().private(`App.Models.User.${user.id}`);
      channel.listen(".notification", onNote);
    } catch {
      // no realtime — he just won't notice
    }
    return () => {
      channel?.stopListening(".notification", onNote);
    };
  }, [active, user?.id]);

  /* memory: he remembers your visits, and weeks later he brings things up */
  useEffect(() => {
    if (active) rememberVisit();
  }, [active]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: acts read refs/setters only (stable)
  useEffect(() => {
    if (!active || !mischief) return;
    const iv = setInterval(() => {
      if (isBusy()) return;
      const r = recall();
      if (r) speak({ text: r });
    }, 5 * 60_000);
    return () => clearInterval(iv);
  }, [active, mischief, isBusy]);

  /* weekly obituary (mondays, on a board): the cards archived last week */
  // biome-ignore lint/correctness/useExhaustiveDependencies: acts read refs/setters only (stable)
  useEffect(() => {
    const m = /^\/boards\/(\d+)/.exec(pathname);
    if (!active || !mischief || !m || new Date().getDay() !== 1) return;
    const week = `obit-${m[1]}`;
    if (doneToday(week)) return;
    const t = setTimeout(async () => {
      try {
        const page = await getArchivedCards(Number(m[1]));
        const since = Date.now() - 7 * 86_400_000;
        const dead = page.data.filter(
          (c) => c.archived_at && new Date(c.archived_at).getTime() > since,
        );
        markDaily(week);
        if (dead.length === 0) return;
        const keys = dead.map((c) => c.ticket_key ?? c.name);
        const names =
          keys.length > 2
            ? `${keys.slice(0, 2).join(", ")} and ${keys.length - 2} other${keys.length - 2 === 1 ? "" : "s"}`
            : keys.join(" and ");
        enqueue("obituary", 0, async () => {
          setMood("mourning");
          vxSound("whisper");
          speak({
            text: `we are gathered here for ${names}. archived this week. they were… cards.`,
          });
          await wait(7000);
          setMood(restMoodRef.current);
        });
      } catch {
        // can't read the archive — no funeral today
      }
    }, 15_000);
    return () => clearTimeout(t);
  }, [active, mischief, pathname]);

  /* gossip: what the rest of the team just did (from the shared activity feed) */
  const gossiped = useRef(new Set<number>());
  // biome-ignore lint/correctness/useExhaustiveDependencies: acts read refs/setters only (stable)
  useEffect(() => {
    if (!active || !mischief || !user) return;
    const check = async () => {
      if (isBusy()) return;
      try {
        const d = await fetchDashboard();
        const fresh = d.activity.find(
          (a) =>
            a.actor &&
            a.actor !== user.name &&
            !gossiped.current.has(a.id) &&
            Date.now() - new Date(a.created_at).getTime() < 30 * 60_000,
        );
        if (!fresh) return;
        gossiped.current.add(fresh.id);
        const tail = [
          "suspicious. or competent.",
          "I'm keeping an eye on them.",
          "don't tell them I told you.",
        ][Math.floor(Math.random() * 3)];
        speak({ text: `${fresh.actor} ${fresh.description}. ${tail}` });
      } catch {
        // no gossip today
      }
    };
    const first = setTimeout(check, 3 * 60_000);
    const iv = setInterval(check, 10 * 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(iv);
    };
  }, [active, mischief, user]);

  /* visitors: teammates on the same board show up as ghost Vortexes */
  // biome-ignore lint/correctness/useExhaustiveDependencies: acts read refs/setters only (stable)
  useEffect(() => {
    const m = /^\/boards\/(\d+)/.exec(pathname);
    if (!active || !m || !user) return;
    const name = `board-presence.${m[1]}`;
    let echo: ReturnType<typeof getEcho> | null = null;
    const others = (list: { id: number; name: string }[]) =>
      list.filter((u) => u.id !== user.id);
    try {
      echo = getEcho();
      echo
        .join(name)
        .here((list: { id: number; name: string }[]) =>
          setVisitors(others(list)),
        )
        .joining((u: { id: number; name: string }) => {
          if (u.id === user.id) return;
          setVisitors((v) => [...v.filter((x) => x.id !== u.id), u]);
          speak({ text: `${u.name.split(" ")[0]}'s vortex just floated in.` });
        })
        .leaving((u: { id: number; name: string }) => {
          setVisitors((v) => v.filter((x) => x.id !== u.id));
          speak({
            text: `${u.name.split(" ")[0]} left. their vortex is still warm.`,
          });
        });
    } catch {
      // no realtime: he haunts alone
    }
    return () => {
      setVisitors([]);
      try {
        echo?.leave(name);
      } catch {
        // already gone
      }
    };
  }, [active, pathname, user?.id]);

  /* scrolling: non-stop scrolling makes him seasick; a frantic fling gets a
     hand on the scrollbar ("not yet" — the page still scrolls) */
  // biome-ignore lint/correctness/useExhaustiveDependencies: acts read refs/setters only (stable)
  useEffect(() => {
    if (!active || !pranksOn) return;
    let startedAt = 0;
    let lastAt = 0;
    let burst = 0;
    let burstAt = 0;
    const onWheel = (e: WheelEvent) => {
      const now = Date.now();
      if (now - lastAt > 400) startedAt = now;
      lastAt = now;
      if (now - burstAt > 1000) {
        burst = 0;
        burstAt = now;
      }
      burst += Math.abs(e.deltaY);
      if (now - startedAt > 5000)
        enqueue("seasick", 5 * 60_000, async () => {
          setMood("dizzy");
          speak({ text: "stop scrolling. I'm getting seasick." });
          await wait(2800);
          setMood(restMoodRef.current);
        });
      else if (burst > 4000)
        enqueue("scrollhold", 10 * 60_000, async () => {
          setMood("smug");
          setPose("grab");
          await travel(
            offFor({ x: window.innerWidth - 60, y: window.innerHeight / 2 }),
          );
          speak({ text: "not yet." });
          await wait(2600);
          await goHome();
        });
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [active, pranksOn, enqueue]);

  /* the evil twin vanishes on its own if you never touch it */
  useEffect(() => {
    if (!twin) return;
    const t = setTimeout(() => setTwin(false), 20_000);
    return () => clearTimeout(t);
  }, [twin]);

  /* board events → acts */
  // biome-ignore lint/correctness/useExhaustiveDependencies: acts read refs/setters only (stable)
  useEffect(() => {
    if (!active) return;
    return subscribeVortex((e) => {
      if (e.type === "drag.start") {
        draggingCard.current = true;
        // a card he's watched you move twice: he mirrors your drag
        if (
          e.cardId != null &&
          (moves.current.get(String(e.cardId)) ?? 0) >= 2 &&
          mischief
        )
          startMirror();
        else feedHint(true);
      } else if (e.type === "drag.end") {
        draggingCard.current = false;
        if (mirrorRef.current) stopMirror();
        else if (feedHintRef.current) feedHint(false);
      } else if (e.type === "card.fed") {
        const el = visibleCard(e.cardId);
        if (el?.dataset.vxLate && mischief)
          enqueue("fed", 0, () => actContract(e.boardId, e.cardId));
        else enqueue("fed", 0, () => actFed(e.boardId, e.cardId, e.hasBacklog));
      } else if (e.type === "card.opened") rememberOpened(String(e.cardId));
      else if (e.type === "card.jammed")
        enqueue("poke", 20_000, () => {
          const el = visibleCard(e.cardId);
          return el ? actPoke(el, e.reason) : undefined;
        });
      else if (e.type === "card.moved") {
        const k = String(e.cardId);
        const rackName = document
          .querySelector(`[data-vx-rack="${e.toSectionId}"] .mt-rack-t .nm`)
          ?.textContent?.trim();
        if (rackName) rememberColumn(rackName);
        const n = (moves.current.get(k) ?? 0) + 1;
        moves.current.set(k, n);
        if (e.done) {
          enqueue("done", 15_000, () => {
            // on the Done shelf a card is a spine; fall back to the rack itself
            const id = CSS.escape(String(e.cardId));
            const el =
              visibleCard(e.cardId) ??
              document.querySelector<HTMLElement>(`[data-vx-spine="${id}"]`) ??
              document.querySelector<HTMLElement>(
                `[data-vx-rack="${e.toSectionId}"]`,
              );
            return el && onScreen(el) ? actDone(el) : undefined;
          });
          return;
        }
        // let the rack re-render its WIP state before reading it
        setTimeout(() => {
          const rack = document.querySelector<HTMLElement>(
            `[data-vx-rack="${e.toSectionId}"][data-vx-over]`,
          );
          if (rack && onScreen(rack.querySelector("[data-vx-vu]") ?? rack))
            enqueue("stomp", 60_000, () => actStomp(rack));
          else if (n >= 3)
            enqueue("judge", 90_000, () => {
              const el = visibleCard(e.cardId);
              return el ? actJudge(el, n) : undefined;
            });
        }, 400);
      }
    });
  }, [active, enqueue]);

  /* overdue cards on screen get eaten (one every few minutes, once per session) */
  const onBoard = /^\/boards\/\d+/.test(pathname);
  // biome-ignore lint/correctness/useExhaustiveDependencies: acts read refs/setters only (stable)
  useEffect(() => {
    if (!active || !onBoard) return;
    const boardId = Number(pathname.split("/")[2]);
    const scan = () => {
      if (isBusy()) return;
      // the day's first board visit opens with a séance (mischief and up)
      if (mischief && !doneToday("seance")) {
        enqueue("seance", 60_000, () => actSeance(boardId));
        return;
      }
      const lateAll = Array.from(
        document.querySelectorAll<HTMLElement>(".mt-jx[data-vx-late]"),
      ).filter(onScreen);
      for (const el of lateAll) {
        const id = el.dataset.cardId ?? "";
        if (id && !seenThisVisit.current.has(id)) {
          seenThisVisit.current.add(id);
          rememberSeenLate(id, el.dataset.vxKey ?? id);
        }
      }
      const late = lateAll.find((el) => !wasEaten(el.dataset.cardId));
      if (late) {
        enqueue("eat", 4 * 60_000, () => actEat(late));
        return;
      }
      const cursed = Array.from(
        document.querySelectorAll<HTMLElement>(".mt-jx[data-vx-cursed]"),
      ).find(
        (el) => onScreen(el) && !commented.current.has(el.dataset.cardId ?? ""),
      );
      if (cursed && mischief)
        enqueue("cursed", 10 * 60_000, () => {
          commented.current.add(cursed.dataset.cardId ?? "");
          return actCursed(cursed);
        });
    };
    const first = setTimeout(scan, 7000);
    const iv = setInterval(scan, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(iv);
    };
  }, [active, onBoard, isBusy, enqueue, mischief, pathname]);

  /* now and then he goes for a little walk along the bottom */
  // biome-ignore lint/correctness/useExhaustiveDependencies: acts read refs/setters only (stable)
  useEffect(() => {
    if (!active) return;
    const iv = setInterval(() => {
      if (isBusy() || Math.random() < 0.5) return;
      enqueue("wander", 150_000, () => actWander());
    }, 50_000);
    return () => clearInterval(iv);
  }, [active, isBusy, enqueue]);

  const sendDraft = () => {
    if (draft.trim() === "" || chat.streaming) return;
    chat.send(draft);
    setDraft("");
  };

  /* mount picker — load projects + boards once per open (cheap list calls) */
  useEffect(() => {
    if (!pickerOpen || pickerItems !== null) return;
    Promise.all([fetchProjects(), fetchBoards()])
      .then(([projects, boards]) => {
        const items: VortexMount[] = [
          ...[...projects.owned, ...projects.member].map((p) => ({
            type: "project" as const,
            id: p.id,
            name: p.name,
          })),
          ...[...boards.owned, ...boards.shared].map((b) => ({
            type: "board" as const,
            id: b.id,
            name: b.name,
          })),
        ];
        // De-dup (a co-owned project can appear in both lists).
        const seen = new Set<string>();
        setPickerItems(
          items.filter((i) => {
            const k = `${i.type}:${i.id}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          }),
        );
      })
      .catch(() => setPickerItems([]));
  }, [pickerOpen, pickerItems]);

  const visiblePickerItems = (pickerItems ?? []).filter((i) =>
    i.name.toLowerCase().includes(pickerQuery.trim().toLowerCase()),
  );

  /* execute a proposed action the user confirmed — via the same authorized REST
     endpoints the regular UI uses; Vortex itself never writes anything. */
  const runAction = async (i: number, action: VortexAction) => {
    setActed((s) => ({ ...s, [i]: "working" }));
    try {
      if (action.kind === "create_project") {
        const project = await createProject({
          name: action.name,
          description: action.description ?? null,
        });
        let firstBoardId: number | null = null;
        for (const b of action.boards) {
          const nb = await createBoard({
            name: b.name,
            description: "",
            project_id: project.id,
            type: b.type,
          });
          firstBoardId ??= nb.id;
        }
        setActed((s) => ({ ...s, [i]: "done" }));
        router.push(
          firstBoardId !== null ? `/boards/${firstBoardId}` : "/projects",
        );
      } else if (action.kind === "create_board") {
        const nb = await createBoard({
          name: action.name,
          description: "",
          project_id: action.project_id ?? null,
          type: action.type,
        });
        setActed((s) => ({ ...s, [i]: "done" }));
        router.push(`/boards/${nb.id}`);
      } else if (action.kind === "create_card") {
        // Resolve the column by name (the model only knows column names, not ids).
        const board = await fetchBoard(action.board_id);
        const wanted = action.column?.trim().toLowerCase();
        const section =
          (wanted &&
            board.sections?.find(
              (s) => s.name.trim().toLowerCase() === wanted,
            )) ||
          board.sections?.[0];
        if (!section) throw new Error("board has no columns");
        const card = await createCard(action.board_id, {
          section_id: section.id,
          name: action.name,
          description: action.description ?? "",
        });
        setActed((s) => ({ ...s, [i]: "done" }));
        router.push(`/boards/${action.board_id}?card=${card.id}`);
      } else if (action.kind === "add_column") {
        await createSection(action.board_id, action.name);
        setActed((s) => ({ ...s, [i]: "done" }));
        router.push(`/boards/${action.board_id}`);
      } else {
        await archiveBoard(action.board_id);
        setActed((s) => ({ ...s, [i]: "done" }));
        router.push("/projects");
      }
    } catch {
      setActed((s) => ({ ...s, [i]: "error" }));
    }
  };

  const describeAction = (action: VortexAction): string => {
    const boardLabel = (a: { board_id: number; board_name?: string }) =>
      a.board_name ? `“${a.board_name}”` : `#${a.board_id}`;
    switch (action.kind) {
      case "create_project":
        return `Create project “${action.name}”${
          action.boards.length > 0
            ? ` with ${action.boards
                .map((b) => `“${b.name}” (${b.type})`)
                .join(", ")}`
            : ""
        }`;
      case "create_board":
        return `Create board “${action.name}” (${action.type})${
          action.project_id !== undefined
            ? ` in project #${action.project_id}`
            : ""
        }`;
      case "create_card":
        return `Create card “${action.name}” on board ${boardLabel(action)}${
          action.column ? ` in “${action.column}”` : ""
        }`;
      case "add_column":
        return `Add column “${action.name}” to board ${boardLabel(action)}`;
      case "archive_board":
        return `Archive board ${boardLabel(action)}`;
    }
  };

  /* one-click mount for the board currently on screen */
  const mountCurrentBoard = async () => {
    if (currentBoardId === null) return;
    try {
      const { owned, shared } = await fetchBoards();
      const b = [...owned, ...shared].find((x) => x.id === currentBoardId);
      if (b) mountVortexContext({ type: "board", id: b.id, name: b.name });
    } catch {
      // list call failed — the picker still works as a fallback
    }
  };

  if (!active) return null;

  // Near the right edge the bubble/chat hang to the left of him instead.
  const rightSide =
    typeof window !== "undefined" &&
    ANCHOR_X + off.x + SPRITE / 2 > window.innerWidth - 300;

  return (
    <>
      <div
        ref={layerRef}
        className={`vxa-layer${traveling ? " vxa-traveling" : ""}${dragging ? " vxa-dragging" : ""}${rightSide ? " vxa-right" : ""}`}
        style={
          {
            transform: `translate(${off.x}px, ${off.y}px)`,
            "--vx-dur": `${dur}ms`,
          } as React.CSSProperties
        }
      >
        {speech && !chatOpen && (
          <output
            className={`vxa-bubble${speech.mirror ? " vxa-mirror" : ""}`}
            onMouseEnter={() => {
              if (speech.mirror) speak({ text: "you read that fast." });
            }}
          >
            <div className="vxa-name">Vortex</div>
            <div>
              <span className="sr-only">{speech.text}</span>
              <span aria-hidden>{speech.text.slice(0, typed)}</span>
              <span className="vxa-ghosttext" aria-hidden>
                {speech.text.slice(typed)}
              </span>
            </div>
            <div className="vxa-actions">
              {speech.action ? (
                <button
                  type="button"
                  className="vxa-btn"
                  onClick={() => {
                    // clear first: the action may make him say something new
                    const run = speech.action?.run;
                    setSpeech(null);
                    run?.();
                  }}
                >
                  {speech.action.label}
                </button>
              ) : (
                <button type="button" className="vxa-btn" onClick={openChat}>
                  Ask me
                </button>
              )}
              {speech.action2 && (
                <button
                  type="button"
                  className="vxa-btn"
                  onClick={() => {
                    const run = speech.action2?.run;
                    setSpeech(null);
                    run?.();
                  }}
                >
                  {speech.action2.label}
                </button>
              )}
              <button
                type="button"
                className="vxa-link"
                onClick={() => setSpeech(null)}
              >
                Dismiss
              </button>
            </div>
          </output>
        )}

        {chatOpen && (
          <div className="vxa-chat" role="dialog" aria-label="Chat with Vortex">
            <div className="vxa-chat-head">
              <span className="vxa-name" style={{ marginBottom: 0 }}>
                Vortex
              </span>
              <span className="vxa-chat-sub">
                {mounts.length === 0
                  ? "your workspace guide"
                  : `focused: ${mounts.map((m) => m.name).join(", ")}`}
              </span>
              <button
                type="button"
                className="vxa-chat-close"
                title="Close chat"
                onClick={() => setChatOpen(false)}
              >
                ×
              </button>
            </div>

            {/* mount bar — cartridge chips for the contexts he's grounded on */}
            <div className="vxa-mounts">
              {mounts.map((m) => (
                <span
                  key={`${m.type}:${m.id}`}
                  className="vxa-mchip"
                  title={
                    m.type === "board" ? "Board (deep)" : "Project (all boards)"
                  }
                >
                  <span aria-hidden className="vxa-mchip-kind">
                    {m.type === "board" ? "▦" : "◫"}
                  </span>
                  <span className="vxa-mchip-name">{m.name}</span>
                  <button
                    type="button"
                    className="vxa-mchip-x"
                    title={`Eject ${m.name}`}
                    onClick={() => unmountVortexContext(m.type, m.id)}
                  >
                    ×
                  </button>
                </span>
              ))}
              {currentBoardId !== null &&
                !isVortexMounted("board", currentBoardId) &&
                mounts.length < VORTEX_MAX_MOUNTS && (
                  <button
                    type="button"
                    className="vxa-mchip vxa-mchip--ghost"
                    title="Mount the board you're looking at"
                    onClick={mountCurrentBoard}
                  >
                    + this board
                  </button>
                )}
              {mounts.length < VORTEX_MAX_MOUNTS && (
                <button
                  type="button"
                  className="vxa-mchip vxa-mchip--ghost"
                  aria-expanded={pickerOpen}
                  onClick={() => setPickerOpen((v) => !v)}
                >
                  {pickerOpen ? "− close" : "+ mount"}
                </button>
              )}
            </div>

            {/* picker — searchable projects & boards, click to mount/eject */}
            {pickerOpen && (
              <div className="vxa-picker">
                <input
                  className="vxa-chat-input"
                  placeholder="Search projects & boards…"
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                />
                <div className="vxa-picker-list">
                  {pickerItems === null && (
                    <div className="vxa-picker-empty">Loading…</div>
                  )}
                  {pickerItems !== null && visiblePickerItems.length === 0 && (
                    <div className="vxa-picker-empty">Nothing matches.</div>
                  )}
                  {visiblePickerItems.map((item) => {
                    const mounted = isVortexMounted(item.type, item.id);
                    return (
                      <button
                        key={`${item.type}:${item.id}`}
                        type="button"
                        className={`vxa-picker-item${mounted ? " vxa-picker-item--on" : ""}`}
                        onClick={() =>
                          mounted
                            ? unmountVortexContext(item.type, item.id)
                            : mountVortexContext(item)
                        }
                      >
                        <span aria-hidden className="vxa-mchip-kind">
                          {item.type === "board" ? "▦" : "◫"}
                        </span>
                        <span className="vxa-mchip-name">{item.name}</span>
                        <span className="vxa-picker-item-state">
                          {mounted ? "eject" : "mount"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="vxa-chat-log" ref={logRef}>
              {chat.messages.length === 0 && !chat.streaming && (
                <div className="vxa-msg vxa-msg--vortex">
                  {mounts.length === 0
                    ? "Ask me about your boards and projects — try “what's overdue?” Mount a board or project above to focus me on it."
                    : `I'm focused on ${mounts.map((m) => m.name).join(" and ")} — ask away!`}
                </div>
              )}
              {chat.messages.map((m, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: append-only transcript
                <div key={i} className="contents">
                  <div
                    className={`vxa-msg ${m.role === "user" ? "vxa-msg--you" : "vxa-msg--vortex"}`}
                  >
                    {m.content}
                  </div>
                  {m.role === "assistant" && m.action && (
                    <div className="vxa-action">
                      <div className="vxa-action-desc">
                        {describeAction(m.action)}
                      </div>
                      {(acted[i] === undefined || acted[i] === "error") && (
                        <div className="vxa-actions" style={{ marginTop: 6 }}>
                          <button
                            type="button"
                            className="vxa-btn"
                            onClick={() =>
                              runAction(i, m.action as VortexAction)
                            }
                          >
                            {acted[i] === "error" ? "Retry" : "Do it"}
                          </button>
                          <button
                            type="button"
                            className="vxa-link"
                            onClick={() =>
                              setActed((s) => ({ ...s, [i]: "dismissed" }))
                            }
                          >
                            Dismiss
                          </button>
                          {acted[i] === "error" && (
                            <span className="vxa-chat-error">
                              That didn't work — try again.
                            </span>
                          )}
                        </div>
                      )}
                      {acted[i] === "working" && (
                        <div className="vxa-action-state">creating…</div>
                      )}
                      {acted[i] === "done" && (
                        <div className="vxa-action-state">✓ created</div>
                      )}
                      {acted[i] === "dismissed" && (
                        <div className="vxa-action-state">dismissed</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {chat.streaming && (
                <div className="vxa-msg vxa-msg--vortex">
                  {chat.streamingText === "" ? (
                    <span className="vxa-thinking">…</span>
                  ) : (
                    // hide the machine-readable ACTION tail while it streams in
                    chat.streamingText.split("ACTION:")[0]
                  )}
                </div>
              )}
              {chat.error && <div className="vxa-chat-error">{chat.error}</div>}
            </div>
            <div className="vxa-chat-inrow">
              <input
                className="vxa-chat-input"
                value={draft}
                placeholder="Ask Vortex…"
                maxLength={4000}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendDraft();
                  if (e.key === "Escape") setChatOpen(false);
                }}
              />
              <button
                type="button"
                className="vxa-btn"
                disabled={chat.streaming || draft.trim() === ""}
                onClick={sendDraft}
              >
                Send
              </button>
            </div>
          </div>
        )}

        {/* wrapper div + sibling buttons: the face and the hide dot are both real
          <button>s, and buttons can't nest. The layer carries his position
          (translate), .vxa-dock the tuck-into-the-border transform and
          .vxa-sprite the bob, so no two of them fight over one transform. */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: hover/focus peek region only — the real controls are the buttons inside */}
        <div
          className={`vxa-dock${docked ? " vxa-dock--in" : ""}`}
          onMouseEnter={holdPeek}
          onMouseLeave={releasePeek}
          onFocus={holdPeek}
          onBlur={releasePeek}
        >
          <div
            ref={spriteRef}
            className={`vxa-sprite vxa-mood-${mood}${flip ? " vxa-flip" : ""}${talking ? " vxa-talking" : ""}${portal ? ` vxa-portal-${portal}` : ""}`}
          >
            <button
              type="button"
              className="vxa-hide"
              title="Hide Vortex"
              onClick={() => setVortexEnabled(false)}
            >
              ×
            </button>
            <button
              type="button"
              className="vxa-face vxa-pop"
              key={popN}
              aria-label={
                spitRef.current
                  ? "Vortex — make him spit the card back"
                  : chatOpen
                    ? "Close the chat"
                    : "Vortex — click for a tip, drag to move him"
              }
              title={
                chatOpen
                  ? "Close the chat"
                  : "Vortex — click for a tip, drag to move him"
              }
              onPointerDown={onGrab}
              onClick={() => {
                if (suppressClick.current) {
                  suppressClick.current = false;
                  return;
                }
                // five quick clicks: he snaps (a tiny possession)
                const now = Date.now();
                clicks.current = [...clicks.current, now].filter(
                  (t) => now - t < 2500,
                );
                if (clicks.current.length >= 5 && !possessedRef.current) {
                  clicks.current = [];
                  actPoked();
                  return;
                }
                if (spitRef.current) spitRef.current();
                else if (chatOpen) setChatOpen(false);
                else speak({ text: randomTip() });
              }}
            >
              <SvgArt svg={svg} className="vxa-body" />
            </button>
          </div>
        </div>
      </div>

      {/* the evil twin: silent, staring, gone when touched */}
      {twin && (
        <button
          type="button"
          className="vxa-twin"
          aria-label="Another Vortex?"
          onClick={() => {
            setTwin(false);
            setTimeout(() => speak({ text: "who were you talking to?" }), 500);
          }}
        >
          <SvgArt svg={twinSvg} className="vxa-body" />
        </button>
      )}

      {/* teammates on this board: their Vortexes drift in as ghosts */}
      {visitors.length > 0 && (
        <div className="vxa-visitors">
          {visitors.slice(0, 5).map((v) => (
            <span
              key={v.id}
              className="vxa-visitor"
              title={`${v.name}'s Vortex`}
            >
              <SvgArt svg={visitorSvg} className="vxa-body" />
              <b>{v.name.split(" ")[0]}</b>
            </span>
          ))}
        </div>
      )}

      {/* the contract with the void (an overdue card fed to him) */}
      {contract && (
        <div className="vxa-contract-wrap">
          <div
            className="vxa-contract"
            role="dialog"
            aria-modal="true"
            aria-label="Contract with the void"
          >
            <h3>Contract with the Void</h3>
            <p>
              I, the undersigned, hereby postpone <b>{contract.key}</b> by one
              (1) day.
            </p>
            <p>
              In exchange the Void receives one (1) soul, payable in confetti.
            </p>
            <p className="fine">
              The due date really moves. Nothing else does. No refunds.
            </p>
            <div className="sig">
              <button
                type="button"
                className="sign"
                onClick={() => {
                  const c = contract;
                  setContract(null);
                  c.restore();
                  emitVortex({
                    type: "vortex.postpone",
                    boardId: c.boardId,
                    cardId: c.cardId,
                    days: 1,
                  });
                  const r = spriteRef.current?.getBoundingClientRect();
                  if (r)
                    tapeConfetti(
                      { x: r.left + r.width / 2, y: r.top + r.height / 2 },
                      30,
                      ["#0c0610", "#1a0033", "#3d0c5c", "#000000"],
                    );
                  vxSound("whisper");
                  speak({
                    text: `pleasure doing business. ${c.key} has one more day. so do you.`,
                  });
                }}
              >
                Sign in ink
              </button>
              <button
                type="button"
                className="run"
                onClick={() => {
                  const c = contract;
                  setContract(null);
                  c.restore();
                  speak({ text: "coward. smart coward." });
                }}
              >
                Run away
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VortexAssistant;
