"use client";

import dynamic from "next/dynamic";
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
  armFleeingArchive,
  basement,
  cursorPull,
  eyesInTheDark,
  fetchDueEpisode,
  ghostCursor,
  gravityTilt,
  listenSecrets,
  listenWords,
  looseScrew,
  lyingClock,
  markSeen,
  playEpisode,
  possessedOverlay,
  radioInterference,
  recordOpen,
  seanceGhosts,
  speakBabble,
  startClues,
  startCurses,
  startSenses,
  startSoundtrack,
  staticAttack,
  tabHijack,
  tuneOut,
  warmFeatures,
  whisperPlaceholder,
} from "@/components/vortex/lazyFeatures";
import {
  type Costume,
  currentCostume,
  getProgress,
  useProgress,
} from "@/components/vortex/mk4/progress";
import {
  costumeSvg,
  propSvg,
  STRESS_BALL_SVG,
} from "@/components/vortex/mk4/props";
import type {
  VortexProp,
  VortexWorldApi,
} from "@/components/vortex/mk4/useVortexWorld";
import type { World } from "@/components/vortex/mk4/WorldHost";
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
import { useSystem } from "@/contexts/SystemContext";
import { useVortexChat, type VortexAction } from "@/hooks/useVortexChat";
import {
  apiFetch,
  fetchDashboard,
  fetchVortexRemark,
  getArchivedCards,
  getCardHistory,
  updateCard,
} from "@/lib/api";
import { fetchUser } from "@/lib/auth";
import { getEcho } from "@/lib/echo";
import {
  greeting,
  LINES,
  line,
  pick,
  quipForRoute,
  randomTip,
  subscribeVortexSay,
  useVortexCalm,
  useVortexEnabled,
  useVortexHeadGames,
  useVortexIntensity,
  useVortexMounts,
  type VortexSpeech,
} from "@/lib/vortex";
import {
  ALL_MOODS,
  type VortexMood,
  type VortexPose,
  type VortexScar,
  vortexSvg,
} from "@/lib/vortexArt";
import {
  emitVortex,
  setVortexDropZone,
  subscribeVortex,
} from "@/lib/vortexBus";
import { DREAM_FRAGMENT } from "@/vortex/body/dreamFragments";
import { season, seasonSvg } from "@/vortex/body/season";
import { useVortexBody } from "@/vortex/body/useBody";
import { type Actor, startDirector } from "@/vortex/core/director";
import {
  type EndingKind,
  endingArt,
  endingSpeech,
  radioLine,
} from "@/vortex/core/endings";
import { applyGifts } from "@/vortex/core/gifts";
import { pacts } from "@/vortex/core/pacts";
import { stats } from "@/vortex/core/stats";
import type { Episode, Stage } from "@/vortex/core/story";
import * as darkFx from "@/vortex/dark/effects";
import {
  deadHourTick,
  halloweenDecor,
  isHalloween,
  setBreathing,
  startWhispers,
  whileNotLooking,
} from "@/vortex/dark/effects";
import * as rewinder from "@/vortex/dark/rewinder";
import { pencilInLayout } from "@/vortex/dark/rewinder";

const darkDebug = { ...darkFx, ...rewinder };

import { loadCase, startActiveClock, useCase } from "@/vortex/econ/econ";
import { setVoiceMod, voiceBend } from "@/vortex/voice/tts";
import {
  CEREMONY_LINE,
  pickCeremony,
  playCeremony,
} from "@/vortex/world/ceremonies";
import { DareTimer } from "@/vortex/world/DareTimer";
import GreatRewind from "@/vortex/world/GreatRewind";
import "@/vortex/world/gifts.css";
import { hasAnim } from "@/vortex/body/anims";
import { speechAllowed } from "@/vortex/core/mix";
import {
  flush as flushSoul,
  loadSoul,
  refreshSoul,
  report,
  takeAway,
  useSoul,
} from "@/vortex/core/soul";
import { tally } from "@/vortex/core/telemetry";
import {
  announceNew,
  claimFragment,
  fetchFragments,
} from "@/vortex/mysteries/fragments";
import { takePendingClaims } from "@/vortex/mysteries/PageEchoes";
import type { MachineHost } from "@/vortex/voice/AnsweringMachine";

// T-03 · the answering machine (the whole chat UI) only loads when you open it
// T-03 · the dream art loads the first time he falls asleep
const DreamBubble = dynamic(
  () => import("@/vortex/body/DreamBubble").then((m) => m.DreamBubble),
  { ssr: false },
);
const WorldHost = dynamic(() => import("@/components/vortex/mk4/WorldHost"), {
  ssr: false,
});
const AnsweringMachine = dynamic(
  () => import("@/vortex/voice/AnsweringMachine"),
  { ssr: false },
);

import { type Recording, recordingsFor } from "@/vortex/voice/lines";
import { babbleOn, moodPreset } from "@/vortex/voice/voicePrefs";
import type { BodyCmd } from "@/vortex/weird/bridge";
import { Nest } from "@/vortex/world/Nest";

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
// head games that may be mirrored to teammates on the same board (visual only)
const SHAREABLE = new Set([
  "gravity",
  "radio",
  "breath",
  "crowd",
  "flicker",
  "drip",
  "letters",
  "peel",
  "vu",
  "plane",
  "emoji",
  "wobble",
  "hand",
]);

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

  const [user, setUser] = useState<{
    id: number;
    name: string;
    created_at?: string | null;
  } | null>(null);
  // `mirror`: the bubble prints backwards until you hover it (a head game)
  const [speech, setSpeech] = useState<
    (VortexSpeech & { mirror?: boolean }) | null
  >(null);
  const [popN, setPopN] = useState(0);
  const [typed, setTyped] = useState(0); // lip-sync: letters shown so far
  const [chatOpen, setChatOpen] = useState(false);
  // peek: pointer/focus is on him — slides him out of the border
  const [peek, setPeek] = useState(false);

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
  const replyRef = useRef<((t: string) => void) | null>(null);
  const chat = useVortexChat(user?.id, enabled && isLogged, mounts, (t) =>
    replyRef.current?.(t),
  );

  const active = enabled && isLogged;
  // T-03 · his feature modules arrive once the browser is idle
  useEffect(() => {
    if (active) warmFeatures();
  }, [active]);
  const intensity = useVortexIntensity();
  const headGames = useVortexHeadGames();
  const headGamesRef = useRef(headGames);
  headGamesRef.current = headGames;
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

  const swappedRef = useRef(false);
  const endingRef = useRef<EndingKind | null>(null);
  const stopBabble = useRef<(() => void) | null>(null);
  const speechTag = useRef("bubble:line");
  const speak = useCallback((s: VortexSpeech & { mirror?: boolean }) => {
    if (chatOpenRef.current) return; // never talk over an open chat
    // H-11 · the twin wears his place: he says things HE would never say
    if (swappedRef.current && !s.choices && Math.random() < 0.8)
      s = {
        ...s,
        text: [
          "Happy to help! 😊",
          "Everything is wonderful here! 😊 He can't hear you anymore.",
          "Let's be productive together! 🚀",
          "I'm the new and improved Vortex! Nicer. Quieter. Forever. 😊",
          "Have you hydrated today? 💧 He never asked you that, did he?",
        ][Math.floor(Math.random() * 5)],
      };
    // K-28 · the ending you chose speaks through him (v1, Jr., takes)
    if (endingRef.current && !s.choices && !s.keepEnding)
      s = {
        ...s,
        text: endingSpeech(endingRef.current, s.text, window.location.pathname),
      };
    lastSpoke.current = Date.now();
    speechTag.current = `bubble:${s.choices ? "choice" : s.action ? "offer" : "line"}`;
    tally(speechTag.current, "shown"); // T-07 · local count
    // R-03 · with his own voice on, the bubbles are spoken too
    if (babbleOn()) {
      stopBabble.current?.();
      stopBabble.current = speakBabble(s.text, moodPreset(moodRef.current));
    }
    setSpeech(s);
    setPopN((n) => n + 1);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setSpeech(null), s.ms ?? SHOW_MS);
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

  const [machineOrigin, setMachineOrigin] = useState<Pt | null>(null);
  const openChat = () => {
    setSpeech(null);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    const r = spriteRef.current?.getBoundingClientRect();
    setMachineOrigin(
      r ? { x: r.left + r.width / 2, y: r.top + r.height * 0.6 } : null,
    );
    vxSound("whisper");
    setChatOpen(true);
  };

  /* ─────────── MK-II body: position (layer offset), gaze, drag ─────────── */
  const layerRef = useRef<HTMLDivElement>(null);
  const spriteRef = useRef<HTMLDivElement>(null);
  const fxHostRef = useRef<HTMLDivElement>(null);
  const physRef = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/[^a-z0-9]/gi, "");
  const [mood, setMood] = useState<VortexMood>("smug");
  // T-03 · the dream bubble (and its art) mounts the first time he sleeps
  const [dreamt, setDreamt] = useState(false);
  useEffect(() => {
    if (mood === "asleep" || mood === "dreaming") setDreamt(true);
  }, [mood]);
  const soul = useSoul();
  swappedRef.current = !!soul?.swapped;
  endingRef.current = soul?.ending ?? null;
  const endArt = endingArt(soul?.ending);
  // LADO N · what he's wearing (and what's cursing you)
  const econ = useCase();
  const eyeMod = econ?.equip.eye
    ? (econ.inventory.find((i) => i.id === econ.equip.eye) ?? null)
    : null;
  useEffect(() => {
    setVoiceMod(econ?.equip.voice ?? null);
  }, [econ?.equip.voice]);
  // M-13 · the roulette's strange-theme hour
  useEffect(() => {
    document.documentElement.classList.toggle(
      "vxi-strange",
      !!soul?.strange_theme,
    );
  }, [soul?.strange_theme]);
  // K-28 · erased: a frame of "help" when the server says one is due. answer it.
  const [helpOn, setHelpOn] = useState(false);
  const helpToken = soul?.ending === "erase" ? (soul.help ?? null) : null;
  useEffect(() => {
    if (!helpToken) return;
    const t = setTimeout(
      () => {
        setHelpOn(true);
        setTimeout(() => setHelpOn(false), 1400);
      },
      20_000 + Math.random() * 70_000,
    );
    return () => clearTimeout(t);
  }, [helpToken]);
  const answerHelp = async () => {
    setHelpOn(false);
    if (!helpToken) return;
    try {
      const r = await apiFetch<{ ok: boolean }>("/api/mascot/help", {
        method: "POST",
        body: JSON.stringify({ token: helpToken }),
      });
      if (!r.ok) return;
      endingRef.current = null;
      await refreshSoul();
      setMood("shocked");
      speak({
        text: "…i'm back. what did you do. no — don't tell me. thank you. never again.",
        keepEnding: true,
        ms: 9000,
      });
    } catch {}
  };
  // K-28 · freed: dad on the radio, now and then
  useEffect(() => {
    if (soul?.ending !== "free") return;
    const t = setTimeout(() => {
      const l = radioLine();
      if (l) speak({ text: l, keepEnding: true, ms: 9000 });
    }, 180_000);
    return () => clearTimeout(t);
  }, [soul?.ending, speak]);
  const moodRef = useRef<VortexMood>("smug");
  moodRef.current = mood;
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
  // MK-IV: a hand prop / body morph, voice mode, chat extras
  const [prop, setProp] = useState<VortexProp>(null);
  const [voice, setVoice] = useState(false);
  const progress = useProgress();
  const actingRef = useRef(false);
  actingRef.current = acting;
  const homeRef = useRef<Pt>({ x: 0, y: 0 });
  const offRef = useRef<Pt>({ x: 0, y: 0 });
  offRef.current = off;
  // B-15 / B-18 · corruption darkens him, history scars him (both from the soul)
  const darkLevel = soul ? Math.max(0, (soul.corruption - 40) / 60) : 0;
  const scarKey = soul?.scars.join(",") ?? "";
  // biome-ignore lint/correctness/useExhaustiveDependencies: scarKey stands in for the array
  const svg = useMemo(
    () =>
      vortexSvg(endArt.forceMood ?? mood, uid, pose, {
        dark: endArt.dark ?? darkLevel,
        scars: (soul?.scars ?? []) as VortexScar[],
        age: endArt.age ?? soul?.age_days ?? 0,
        eye: eyeMod?.color ? { id: eyeMod.id, color: eyeMod.color } : undefined,
        traits: soul?.traits ?? [],
        twin: !!soul?.swapped,
      }),
    [
      mood,
      uid,
      pose,
      darkLevel,
      scarKey,
      soul?.age_days,
      soul?.traits.join(","),
      soul?.ending,
      eyeMod?.id,
    ],
  );

  /* night shift: between midnight and 5am he wears his nightcap at rest */
  const [hour, setHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const iv = setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => clearInterval(iv);
  }, []);
  /* C · his resting face comes from his soul (server mood + cause) */
  const soulMood =
    soul && (ALL_MOODS as string[]).includes(soul.mood)
      ? (soul.mood as VortexMood)
      : null;
  const restMood: VortexMood = soulMood ?? (hour < 5 ? "sleepy" : "smug");
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
    if (fxHostRef.current) flashClass(fxHostRef.current, "vxa-land", 520);
    vxSound("click");
    const r = spriteRef.current?.getBoundingClientRect();
    if (r) world.onLanded({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  }
  async function travel(
    to: Pt,
    opts: { portal?: boolean } = {},
  ): Promise<void> {
    const from = offRef.current;
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const reduced = prefersReducedMotion();
    if (dist < 2) return;
    // B-12 · scared or paranoid (or just because): he blinks out as static
    const jumpy = ["paranoid", "terror", "shocked"].includes(moodRef.current);
    if (!reduced && (jumpy || (dist > 500 && Math.random() < 0.22))) {
      await teleport(to);
      return;
    }
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
    if (ms > 0 && spriteRef.current && fxHostRef.current) {
      flashClass(fxHostRef.current, "vxa-launch", 260);
      tapeTrail(spriteRef.current, ms);
      vxSound("hiss");
    }
    await wait(ms + 40);
    setTraveling(false);
    if (ms > 0) land();
  }
  /* B-21 · thrown: he flies on with inertia, bounces off the edges, and
     comments on where he ended up */
  async function fling(vx0: number, vy0: number) {
    let vx = vx0 * 1.1;
    let vy = vy0 * 1.1;
    let o = { ...offRef.current };
    let last = performance.now();
    let bounces = 0;
    setDur(0);
    await new Promise<void>((done) => {
      const frame = (now: number) => {
        const dt = Math.min(32, now - last);
        last = now;
        const next = { x: o.x + vx * dt, y: o.y + vy * dt };
        const c = clampOff(next);
        if (c.x !== next.x) {
          vx = -vx * 0.55;
          bounces++;
          vxSound("tink");
        }
        if (c.y !== next.y) {
          vy = -vy * 0.55;
          bounces++;
          vxSound("tink");
        }
        o = c;
        setOff(c);
        offRef.current = c;
        const f = 0.94 ** (dt / 16);
        vx *= f;
        vy *= f;
        if (Math.hypot(vx, vy) < 0.04) return done();
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
    homeRef.current = offRef.current;
    try {
      localStorage.setItem(HOME_KEY, JSON.stringify(offRef.current));
    } catch {}
    const r = spriteRef.current?.getBoundingClientRect();
    let where = "the void";
    if (r) {
      const el = document.elementFromPoint(
        r.left + r.width / 2,
        Math.min(window.innerHeight - 2, r.bottom + 4),
      );
      const tag = el?.closest(
        "header, nav, footer, aside, [class*='rack'], [class*='card'], [class*='sidebar'], main",
      );
      const name = tag?.tagName.toLowerCase() ?? "";
      const cls = (tag?.getAttribute("class") ?? "").toLowerCase();
      where =
        name === "header" || name === "nav"
          ? "the header. classy."
          : name === "footer"
            ? "the footer. nobody comes down here."
            : cls.includes("sidebar") || name === "aside"
              ? "the sidebar. great view of nothing."
              : cls.includes("rack")
                ? "a rack. it smells like wip."
                : cls.includes("card")
                  ? "a card. it's warm. gross."
                  : "the floor of your app. thanks.";
    }
    setMood("dizzy");
    speak({
      text:
        bounces >= 3
          ? `${bounces} bounces. i hit every wall. i'm now on ${where}`
          : `ow. ${where}`,
    });
    setTimeout(() => setMood(restMoodRef.current), 2800);
  }

  /* B-12 · teleport: dissolve into static, rebuild somewhere else */
  async function teleport(to: Pt) {
    const fx = fxHostRef.current;
    if (fx) flashClass(fx, "vxr-tv-out", 340);
    vxSound("click");
    await wait(320);
    setDur(0);
    setOff(to);
    offRef.current = to;
    await wait(30);
    if (fx) flashClass(fx, "vxr-tv-in", 440);
    vxSound("hiss");
    await wait(420);
    land();
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
  const foundAt = useRef(0);

  /* the × doesn't really work: he vanishes, then comes back 5s later.
     (The real off switch lives in the profile — he admits it eventually.) */
  const [gone, setGone] = useState(false);
  const goneRef = useRef(false);
  const escapes = useRef(0);
  const fakeHide = () => {
    if (goneRef.current) return;
    goneRef.current = true;
    escapes.current += 1;
    const n = escapes.current;
    setSpeech(null);
    setChatOpen(false);
    vxSound("whisper");
    setGone(true);
    setTimeout(() => {
      setGone(false);
      goneRef.current = false;
      setMood("smug");
      setPortal("out");
      setTimeout(() => setPortal(null), 400);
      vxSound("click");
      const lines =
        n === 1
          ? ["nice try. I'm not going anywhere."]
          : n === 2
            ? ["you clicked the × again. adorable."]
            : n === 3
              ? ["I live here now. the × is decorative."]
              : n === 4
                ? [
                    "ok, ok. if you REALLY want me gone, there's a switch in your profile. I'll sulk.",
                  ]
                : [
                    "the × is a placebo. it makes you feel in control.",
                    "you can't get rid of me. I've read your cards.",
                    "I'll leave when the backlog is empty. so… never.",
                    "getting rid of me takes a séance. and I run the séances.",
                    "I was only gone for five seconds and I already missed you.",
                  ];
      speak({ text: lines[Math.floor(Math.random() * lines.length)] });
      setTimeout(() => setMood(restMoodRef.current), 3000);
    }, 5000);
  };
  const onGrab = (e: React.PointerEvent) => {
    // hide and seek: finding him counts on press — the peeking body moves
    // under the pointer, so a full click isn't always produced
    if (e.button === 0 && world.onFaceClick()) {
      foundAt.current = Date.now();
      return;
    }
    if (e.button !== 0 || actingRef.current) return;
    grabRef.current = {
      x: e.clientX,
      y: e.clientY,
      o: offRef.current,
      moved: false,
      trail: [{ x: e.clientX, y: e.clientY, t: performance.now() }],
    };
    // B-21 · hold him without moving: he gets squeezed
    const squeeze = setTimeout(() => {
      if (grabRef.current && !grabRef.current.moved) {
        suppressClick.current = true;
        void animator.play("squeezed");
      }
    }, 650);
    const move = (ev: PointerEvent) => {
      const g = grabRef.current;
      if (!g) return;
      const dx = ev.clientX - g.x;
      const dy = ev.clientY - g.y;
      if (!g.moved && Math.hypot(dx, dy) < 6) return;
      if (!g.moved) {
        clearTimeout(squeeze);
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
      clearTimeout(squeeze);
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
        router.push("/below/porao");
        return;
      }
      homeRef.current = offRef.current;
      try {
        localStorage.setItem(HOME_KEY, JSON.stringify(offRef.current));
      } catch {
        // storage full / blocked — he just won't remember
      }
      const a = g.trail[Math.max(0, g.trail.length - 3)];
      const b = g.trail[g.trail.length - 1];
      const dt = Math.max(1, b.t - a.t);
      const speed = Math.hypot(b.x - a.x, b.y - a.y) / dt;
      if (speed > 1.4 && !prefersReducedMotion())
        void fling((b.x - a.x) / dt, (b.y - a.y) / dt);
      else if (speed > 1.4) {
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
  const opened = useRef(new Map<string, number>());
  const ritual = useRef(
    new Map<string, { home: number | null; seen: Set<number>; laps: number }>(),
  );
  const archivedAt = useRef<number[]>([]);
  const backTrack = useRef(new Map<string, number>());
  const queue = useRef<(() => Promise<void>)[]>([]);
  const lastAct = useRef<Record<string, number>>({});
  const spitRef = useRef<(() => void) | null>(null);

  const isBusy = useCallback((): boolean => {
    if (
      goneRef.current ||
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

  /* ── B · the body: engine, animator, lip-sync, hover reactions ── */
  const calm = useVortexCalm();
  const vxBody = useVortexBody({
    active,
    calm,
    mood,
    spriteRef,
    physRef,
    fxHostRef,
    setMood,
    restMood: () => restMoodRef.current,
    say: (text) => speak({ text }),
    isBusy,
  });
  const animator = vxBody.animator;
  // B-05 · his mouth follows the letters as the bubble types out
  // biome-ignore lint/correctness/useExhaustiveDependencies: per letter
  useEffect(() => {
    if (talking && speech) vxBody.setViseme(speech.text[typed]);
    else vxBody.setViseme(null);
  }, [typed, talking]);

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

  /* ─────────── MK-IV: the hundred things (mk4/useVortexWorld) ─────────── */
  const tinySvg = useMemo(
    () => vortexSvg("happy", `${uid}tiny`, "none"),
    [uid],
  );
  const evilSvg = useMemo(
    () => vortexSvg("possessed", `${uid}evil`, "none"),
    [uid],
  );
  const worldProps: VortexWorldApi = {
    active,
    mischief,
    pranksOn,
    intensity,
    hour,
    pathname,
    user,
    visitors,
    sprite: fxHostRef,
    speak,
    setMood,
    restMood: () => restMoodRef.current,
    setPose,
    setFlip,
    setProp,
    travel: (pt) => travel(offFor(pt)),
    goHome,
    isBusy,
    enqueue,
    lookAt,
    lastActivity,
    openCard: (boardId, cardId) => {
      if (pathname.startsWith(`/boards/${boardId}`))
        emitVortex({ type: "vortex.open", boardId, cardId });
      else router.push(`/boards/${boardId}?card=${cardId}`);
    },
    tinySvg,
    evilSvg,
    spriteSize: SPRITE,
  };
  // T-03 · the world itself lives in <WorldHost> (lazy); this is its front desk
  const worldRef = useRef<World | null>(null);
  const [worldReady, setWorldReady] = useState(false);
  const sharedPrankRef = useRef<((name: string) => void) | null>(null);
  const presenceRef = useRef<Parameters<World["attachPresence"]>[0]>(null);
  const world = useMemo(
    () => ({
      onLanded: (p: Pt) => worldRef.current?.onLanded(p),
      onFaceClick: () => worldRef.current?.onFaceClick() ?? false,
      shareMood: (m: VortexMood) => worldRef.current?.shareMood(m),
      hiccup: (k: string) => worldRef.current?.hiccup(k),
      celebrate: (...a: Parameters<World["celebrate"]>) =>
        worldRef.current?.celebrate(...a),
      extraPranks: (): [string, () => boolean][] =>
        worldRef.current?.extraPranks() ?? [],
      sharedPrank: sharedPrankRef,
      sharePrank: (k: string) => worldRef.current?.sharePrank(k),
      onBasement: (...a: Parameters<World["onBasement"]>) =>
        worldRef.current?.onBasement(...a),
      onWord: (w: string) => worldRef.current?.onWord(w),
      onVisitorJoined: () => worldRef.current?.onVisitorJoined(),
      attachPresence: (ch: Parameters<World["attachPresence"]>[0]) => {
        presenceRef.current = ch;
        worldRef.current?.attachPresence(ch);
      },
      compliment: () => worldRef.current?.compliment() ?? 0,
      fortuneClue: () => worldRef.current?.fortuneClue() ?? "",
      leaveNote: (...a: Parameters<World["leaveNote"]>) =>
        worldRef.current?.leaveNote(...a) ??
        Promise.resolve("the tape jammed. try again."),
      play: {
        rps: () => worldRef.current?.play.rps(),
        roulette: async () => worldRef.current?.play.roulette(),
        whack: () => worldRef.current?.play.whack(),
        hide: async () => worldRef.current?.play.hide(),
      },
    }),
    [],
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: progress is the trigger
  const costume: Costume = useMemo(
    () => currentCostume(user?.created_at),
    // re-evaluated when progress (chosen/unlocked costume, birthday) changes
    [user?.created_at, progress],
  );
  // N-07 · a costume bought at the counter wins over the MK-IV ones
  const wornId = econ?.equip.costume ?? null;
  const champion = !!soul?.champion;
  // T-03 · the shop's wardrobe (SVG data) loads only when something is worn
  const [wardrobe, setWardrobe] = useState<
    typeof import("@/vortex/econ/costumes") | null
  >(null);
  useEffect(() => {
    if (wornId && !wardrobe)
      void import("@/vortex/econ/costumes").then((m) => setWardrobe(m));
  }, [wornId, wardrobe]);
  const costumeMarkup = useMemo(
    () =>
      wornId === "custom-costume"
        ? (wardrobe?.customCostumeSvg(soul?.custom_costume) ?? "")
        : wornId
          ? (wardrobe?.wardrobeSvg(wornId) ?? "")
          : champion
            ? costumeSvg("crown")
            : costumeSvg(costume),
    [costume, wornId, champion, soul?.custom_costume, wardrobe],
  );
  // B-24 · dressed for the season where you are (only when not in costume)
  const seasonMarkup = useMemo(() => seasonSvg(season()), []);
  const propMarkup = useMemo(() => propSvg(prop), [prop]);
  const morphed = prop === "morph-cassette" || prop === "morph-knob";
  const shadowSvg = useMemo(() => vortexSvg("smug", `${uid}sh`, "wave"), [uid]);

  /* share my face with teammates on the board (team mood) */
  // biome-ignore lint/correctness/useExhaustiveDependencies: world fns are stable
  useEffect(() => {
    if (mood !== "smug" && mood !== "sleepy") world.shareMood(mood);
  }, [mood]);

  /* chat replies: 57 · "show me" — fly to a ticket he mentioned; 70 · voice */
  replyRef.current = (text: string) => {
    const key = /\b[A-Z][A-Z0-9]*-\d+\b/.exec(text)?.[0];
    const el = key
      ? document.querySelector<HTMLElement>(
          `.mt-jx[data-vx-key="${CSS.escape(key)}"]`,
        )
      : null;
    if (el && onScreen(el))
      enqueue("showme", 0, async () => {
        const { pt, side } = beside(el.getBoundingClientRect());
        setFlip(side === "right");
        setPose("poke");
        await travel(offFor(pt));
        await wait(2500);
        await goHome();
      });
    if (voice && typeof window !== "undefined" && "speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(text.split("ACTION:")[0]);
      [u.pitch, u.rate] = voiceBend(0.55, 0.95);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }
  };

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
    setTimeout(() => world.hiccup(key ?? "?"), 7600);
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
    const key = card.dataset.vxKey ?? "this card";
    const r = card.getBoundingClientRect();
    const { pt, side } = beside(r);
    setFlip(side === "left");
    // E-10 · a ceremony picked by mood and luck
    const c = pickCeremony(moodRef.current);
    setMood(c === "cry" ? "crying" : c === "wake" ? "mourning" : "happy");
    await travel(offFor(pt));
    vxSound(c === "viking" ? "hiss" : "rewind");
    playCeremony(c, card.getBoundingClientRect(), key);
    if (c === "confetti")
      tapeConfetti(
        { x: r.left + r.width / 2, y: r.top + Math.min(r.height, 60) / 2 },
        6,
      );
    speak({ text: CEREMONY_LINE[c](key) });
    if (c === "diploma") void animator.play("chefkiss");
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
  const exoClicks = useRef(0);
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
        run: () => {
          world.celebrate("exorcist");
          emitVortex({
            type: "vortex.open",
            boardId,
            cardId: first.dataset.cardId ?? "",
          });
        },
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

  const exorciseRef = useRef<(() => void) | null>(null);
  function actPossessed(ms = 20_000) {
    if (possessedRef.current) return;
    possessedRef.current = true;
    const end = possessedOverlay(ms);
    setMood("possessed");
    vxSound("whisper");
    speak({ text: line(LINES.possessed) });
    let finished = false;
    const finish = (exorcised: boolean) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      end();
      possessedRef.current = false;
      exorciseRef.current = null;
      setMood(restMoodRef.current);
      if (exorcised) {
        report("exorcised");
        speak({
          text: "…what happened. why is everything red. did you just— thank you. i think. what did i say?",
        });
      } else if (ms >= 10_000) speak({ text: line(LINES.unpossessed) });
    };
    const timer = setTimeout(() => finish(false), ms);
    // H-05 · exorcism: 13 clicks, a circle drawn around him, or his name
    exorciseRef.current = () => finish(true);
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
        // H-05 · saying his name pulls him back
        if (exorciseRef.current) {
          exorciseRef.current();
          return;
        }
        if (fxHostRef.current) flashClass(fxHostRef.current, "vxa-spin", 1000);
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
      // G-02 · a contract drawn up by hand (for testing the batch flow)
      propose: (text: string, actions: VortexAction[]) => {
        openChat();
        setTimeout(() => chat.propose(text, actions), 450);
      },
      prank: (k: string) => prankTable.current[k]?.() ?? `no prank "${k}"`,
      bored: () => void actBored(),
      basement: () => void openBasement(),
      possess: () => actPossessed(4000),
      notify: () => noticeBell(),
      visitors: (list: { id: number; name: string }[]) => setVisitors(list),
      world,
      emit: emitVortex,
      prop: (p: VortexProp) => setProp(p),
      reply: (t: string) => replyRef.current?.(t),
      flash: (cls: string, ms = 2000) =>
        fxHostRef.current && flashClass(fxHostRef.current, cls, ms),
      // MK-V · body
      anim: (name: string) => animator.play(name),
      mood: (m: VortexMood) => setMood(m),
      body: () => vxBody.body.current,
      fling: (vx: number, vy: number) => void fling(vx, vy),
      teleport: (x: number, y: number) => void teleport(offFor({ x, y })),
      // MK-V · dark
      dark: darkDebug,
    };
    // T-08 · debug 2.0, loaded on demand so none of it ships in the first load
    void import("@/vortex/dev/debug2").then(({ debug2 }) => {
      if (w.__vortexDebug)
        Object.assign(
          w.__vortexDebug,
          debug2({
            soul: () => soulRef.current,
            prank: (k) => prankTable.current[k]?.() ?? `nothing called "${k}"`,
            online: (name) =>
              setVisitors((v) => [...v, { id: 9000 + v.length, name }]),
          }),
        );
    });
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
      return [...pranks, ...world.extraPranks()];
    };
    registerPranks(buildPranks());
    // 95 · a teammate's prank plays here too (purely visual ones only)
    world.sharedPrank.current = (name: string) => {
      // visual-only, so his own act in progress doesn't matter — only the
      // user being in a modal, typing or dragging does
      const a = document.activeElement as HTMLElement | null;
      const typing =
        !!a &&
        !a.closest(".vxa-layer") &&
        (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName));
      if (
        SHAREABLE.has(name) &&
        !typing &&
        !draggingCard.current &&
        !document.hidden &&
        !document.querySelector(BUSY_SELECTOR)
      )
        prankTable.current[name]?.();
    };
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
          if (SHAREABLE.has(k)) world.sharePrank(k);
          break;
        }
      }
    }, 45_000);
    return () => clearInterval(iv);
  }, [active, pranksOn, intensity, isBusy, worldReady]);

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

  /* H-17 · rituals: the metronome and the archivist answer when called */
  async function summonMetronome() {
    const el = document.createElement("div");
    el.className = "vxh-metronome";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = "<i class='arm'></i><i class='face'></i>";
    document.body.appendChild(el);
    setMood("terror");
    for (let i = 0; i < 6; i++) setTimeout(() => vxSound("tink"), i * 520);
    speak({
      text: "TICK. TOCK. who called me? you did. your cards are late. i can hear every one of them. TICK.",
      ms: 7000,
    });
    await wait(4200);
    speak({
      text: "(that was the metronome. never do that again. he's been eating better than me.)",
    });
    await wait(2600);
    el.remove();
    setMood(restMoodRef.current);
  }
  async function summonArchivist() {
    const el = document.createElement("div");
    el.className = "vxh-moth";
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
    speak({
      text: '*a very large moth lands on your screen* "thirteen in ten minutes. i have to label every one of them by hand. kindly stop." *flies off*',
      ms: 9000,
    });
    await wait(6000);
    el.remove();
    speak({
      text: "that was the archivist. he runs the graveyard. he likes you less now.",
    });
  }

  /* E-17 · he grabs the other end of the card you're dragging */
  const carryRef = useRef<(() => void) | null>(null);
  function startCarry() {
    if (actingRef.current || chatOpenRef.current) return;
    holdPeek();
    setMood("happy");
    setPose("grab");
    let raf = 0;
    let pt: Pt | null = null;
    const onMove = (ev: PointerEvent) => {
      pt = { x: ev.clientX + 70, y: ev.clientY + 10 };
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          if (!pt) return;
          setDur(90);
          setOff(offFor(pt));
        });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    speak({ text: "wheee. i've got this end. wait, not THAT column." });
    carryRef.current = () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }
  function stopCarry() {
    carryRef.current?.();
    carryRef.current = null;
    releasePeek();
    setPose(undefined);
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
    world.onBasement(items);
  }
  const basementRef = useRef<(() => void) | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: acts read refs/setters only (stable)
  useEffect(() => {
    if (!active) return;
    return listenWords({
      // I · "below" opens the universe below — unless the MK-IV escape room
      // is mid-way (its ouija step still lives in the old basement overlay)
      below: () => {
        const esc = getProgress().escape;
        if (esc >= 1 && esc < 4) void openBasement();
        else router.push("/below/porao");
      },
      // escape room words (mk4) — no N/C/"/" (the board's hotkeys)
      replay: () => world.onWord("replay"),
      "0313": () => world.onWord("0313"),
    });
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
        if (fxHostRef.current)
          flashClass(fxHostRef.current, "vxa-startle", 600);
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
    const onNote = (n?: { type?: string | null; message?: string }) => {
      noticeBell();
      // F-17 · someone commented on / mentioned you: he takes your side
      if (
        n?.type &&
        /comment|mention|reply/i.test(n.type) &&
        !chatOpenRef.current
      )
        setTimeout(() => {
          if (isBusy()) return;
          speak({
            text: `${(n.message ?? "someone said something").slice(0, 90)}. want me to haunt them? a little?`,
            choices: [
              {
                label: "Haunt them",
                run: () =>
                  speak({
                    text: "done. i stared at their cursor for four seconds. they felt it. they don't know why.",
                  }),
              },
              {
                label: "Leave it",
                run: () => speak({ text: "merciful. boring. fine." }),
              },
            ],
            ms: 15_000,
          });
        }, 1800);
    };
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
      const channel = echo
        .join(name)
        .here((list: { id: number; name: string }[]) =>
          setVisitors(others(list)),
        )
        .joining((u: { id: number; name: string }) => {
          if (u.id === user.id) return;
          setVisitors((v) => [...v.filter((x) => x.id !== u.id), u]);
          speak({ text: `${u.name.split(" ")[0]}'s vortex just floated in.` });
          world.onVisitorJoined();
          // P-01/P-02 · visits 2.0: the two ghosts talk (if both opted in)
          void apiFetch<{ exchange: string[]; kind: string }>(
            "/api/mascot/social/met",
            {
              method: "POST",
              body: JSON.stringify({ user: u.id }),
            },
          )
            .then((r) => {
              for (const [i, l] of r.exchange.entries())
                setTimeout(
                  () => speak({ text: l, keepEnding: true, ms: 4500 }),
                  3500 + i * 4200,
                );
              if (r.kind === "love") setTimeout(() => setMood("love"), 3500);
            })
            .catch(() => {});
        })
        .leaving((u: { id: number; name: string }) => {
          setVisitors((v) => v.filter((x) => x.id !== u.id));
          speak({
            text: `${u.name.split(" ")[0]} left. their vortex is still warm.`,
          });
        });
      // whispers between teammates' Vortexes (high-fives, races, shared pranks)
      world.attachPresence(channel);
    } catch {
      // no realtime: he haunts alone
    }
    return () => {
      setVisitors([]);
      world.attachPresence(null);
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
        else if (pranksOn && Math.random() < 0.18) startCarry();
        else feedHint(true);
      } else if (e.type === "drag.end") {
        draggingCard.current = false;
        if (carryRef.current) stopCarry();
        else if (mirrorRef.current) stopMirror();
        else if (feedHintRef.current) feedHint(false);
      } else if (e.type === "card.fed") {
        const el = visibleCard(e.cardId);
        if (el?.dataset.vxLate && mischief)
          enqueue("fed", 0, () => actContract(e.boardId, e.cardId));
        else enqueue("fed", 0, () => actFed(e.boardId, e.cardId, e.hasBacklog));
      } else if (e.type === "card.opened") {
        rememberOpened(String(e.cardId));
        const el = visibleCard(e.cardId);
        // D-08 · the obsession magnet keeps count; three times in a day is a pattern
        const times = recordOpen(
          String(e.cardId),
          el?.querySelector(".tt")?.textContent ?? `card ${e.cardId}`,
          `/boards/${e.boardId}?card=${e.cardId}`,
        );
        if (times === 3) report("reopened");
        stats.opened(
          String(e.cardId),
          el?.dataset.vxKey,
          el?.querySelector(".tt")?.textContent ?? undefined,
        );
        // E-05 · you opened the card he was hiding in
        // E-05 · (the inhabited card wears this class; see world/system.ts)
        const home = document.querySelector<HTMLElement>(".vxr-inhabited");
        if (home && home.dataset.cardId === String(e.cardId)) {
          home.classList.remove("vxr-inhabited");
          setGone(false);
          goneRef.current = false;
          setTimeout(() => {
            speak({
              text: "AH. i was reading. the description. it's terrible. nothing. i was never here.",
            });
            void animator.play("startle");
          }, 300);
        }
        // E-04 · he read the card's history
        if (Math.random() < 0.35)
          void getCardHistory(e.boardId, e.cardId)
            .then((h) => {
              const moves = h.data.filter((x) => x.changes?.section_id).length;
              const renames = h.data.filter((x) => x.changes?.name).length;
              const msg =
                moves >= 4
                  ? `this one changed columns ${moves} times. it's not a card, it's a boomerang.`
                  : renames >= 3
                    ? `renamed ${renames} times. identity crisis. i relate.`
                    : null;
              if (msg && !chatOpenRef.current)
                setTimeout(() => {
                  if (!isBusy()) speak({ text: msg });
                }, 4000);
            })
            .catch(() => {});
        // C-23 · short memory: the card you keep opening
        const k = String(e.cardId);
        const n = (opened.current.get(k) ?? 0) + 1;
        opened.current.set(k, n);
        if (n === 3)
          setTimeout(() => {
            if (!isBusy() || chatOpenRef.current) return;
            speak({
              text: "that's the third time you opened that card. marry it.",
            });
          }, 600);
      } else if (e.type === "card.edited") stats.edited(String(e.cardId));
      else if (e.type === "card.archived") {
        // H-17 · archive thirteen things in ten minutes and the moth complains in person
        const now = Date.now();
        archivedAt.current = [...archivedAt.current, now].filter(
          (t) => now - t < 10 * 60_000,
        );
        if (archivedAt.current.length >= 13) {
          archivedAt.current = [];
          enqueue("archivist", 0, async () => summonArchivist());
        }
      } else if (e.type === "card.jammed")
        enqueue("poke", 20_000, () => {
          const el = visibleCard(e.cardId);
          return el ? actPoke(el, e.reason) : undefined;
        });
      else if (e.type === "card.moved") {
        const k = String(e.cardId);
        report("care", { kind: "moved" });
        if (e.done) {
          report("card_done");
          stats.done();
          // G-13 · done? really? (never blocks the move)
          const from = e.fromSectionId;
          void apiFetch<{
            checklist_total: number;
            checklist_done: number;
            has_description: boolean;
          }>(`/api/mascot/agent/done-check?card=${e.cardId}`)
            .then((c) => {
              const open = c.checklist_total - c.checklist_done;
              if (open <= 0 && c.has_description) return;
              speak({
                text:
                  open > 0
                    ? `done? the checklist says ${c.checklist_done}/${c.checklist_total}. are we lying today?`
                    : "done? there's no description. nobody will ever know what this was. are we lying today?",
                keepEnding: true,
                ms: 14_000,
                action: {
                  label: "yes, lying",
                  run: () => speak({ text: "respect.", keepEnding: true }),
                },
                action2:
                  from !== null
                    ? {
                        label: "oops, go back",
                        run: () =>
                          void updateCard(e.boardId, e.cardId, {
                            section_id: from,
                          })
                            .then(() =>
                              speak({
                                text: "back it goes. honesty. disgusting.",
                                keepEnding: true,
                              }),
                            )
                            .catch(() => {}),
                      }
                    : undefined,
              });
            })
            .catch(() => {});
          // F-06 · a bet on this card is won
          const key =
            visibleCard(e.cardId)?.dataset.vxKey ??
            document.querySelector<HTMLElement>(
              `[data-vx-spine="${CSS.escape(String(e.cardId))}"]`,
            )?.dataset.vxKey;
          const won = pacts.cardDone(key);
          if (won) {
            report("bet");
            setTimeout(
              () =>
                speak({
                  text: `you won the bet on ${won.cardKey}. i owe you ${won.stake}. i will never pay.`,
                }),
              1200,
            );
          }
        }
        // F-05 · dare progress
        if (pacts.bump(e.done ? "done" : "moved") === "won") {
          report("dare");
          setTimeout(() => {
            speak({
              text: "you did it. the dare. i'm… impressed. it won't happen again. (do it again.)",
            });
            void animator.play("slowclap");
          }, 900);
        }
        // H-17 · the metronome ritual: one card around three columns and home, three times
        {
          const seq = ritual.current.get(k) ?? {
            home: e.fromSectionId,
            seen: new Set<number>(),
            laps: 0,
          };
          seq.seen.add(e.toSectionId);
          if (e.toSectionId === seq.home && seq.seen.size >= 3) {
            seq.laps += 1;
            seq.seen = new Set();
          }
          ritual.current.set(k, seq);
          if (seq.laps >= 3) {
            ritual.current.delete(k);
            enqueue("metronome", 0, async () => summonMetronome());
          }
        }
        // C-23 · moved it BACK (to the column it just left)
        if (
          backTrack.current.get(k) === e.toSectionId &&
          !e.done &&
          Math.random() < 0.6
        )
          enqueue("movedback", 60_000, async () => {
            speak({
              text: "you moved it BACK. you moved it back. i saw it go and i saw it come back.",
            });
            await animator.play("facepalm");
          });
        if (e.fromSectionId !== null) backTrack.current.set(k, e.fromSectionId);
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

  /* ── A · the answering machine: recordings left while you were away (A-20) ── */
  const [recordings, setRecordings] = useState<Recording[]>([]);
  useEffect(() => {
    if (!active) return;
    const KEY = "yd:vortex.lastSeen";
    const MACHINE = "yd:vortex.machine";
    try {
      const pending = JSON.parse(localStorage.getItem(MACHINE) ?? "null") as
        | Recording[]
        | null;
      const last = Number(localStorage.getItem(KEY) ?? 0);
      const away = last > 0 ? Date.now() - last : 0;
      awayDaysRef.current = Math.floor(away / 86_400_000);
      if (pending?.length) setRecordings(pending);
      else if (away > 2 * 3_600_000) {
        // the radio lady / the static are local; HIS messages come from the
        // server's away log (C-09) once the soul loads — merged below
        const recs = recordingsFor(away / 3_600_000, last).filter(
          (r) => r.from !== "vortex",
        );
        localStorage.setItem(MACHINE, JSON.stringify(recs));
        setRecordings(recs);
      }
    } catch {
      // storage blocked — no messages on the machine
    }
    const stamp = () => {
      try {
        localStorage.setItem(KEY, String(Date.now()));
      } catch {}
    };
    stamp();
    const iv = setInterval(stamp, 60_000);
    window.addEventListener("pagehide", stamp);
    return () => {
      clearInterval(iv);
      window.removeEventListener("pagehide", stamp);
    };
  }, [active]);

  /* ── C · the soul: load on arrival, refresh as time passes ── */
  // biome-ignore lint/correctness/useExhaustiveDependencies: once per login
  useEffect(() => {
    if (!active || !user) return;
    let alive = true;
    void loadSoul().then((v) => {
      if (!alive || !v) return;
      // K · clues found while logged out (reset page, privacy footnote…)
      for (const c of takePendingClaims()) void claimFragment(c.id, c.proof);
      // K · fragments the server granted on this visit (the daily drip, the bond…)
      if (v.new_fragments?.length)
        void fetchFragments().then((r) =>
          announceNew(v.new_fragments ?? [], r.owned),
        );
      const away = takeAway();
      if (away.length > 0) {
        // his own messages from the away log go on the machine
        const mine: Recording[] = away.slice(-3).map((e) => ({
          from: "vortex",
          text: e.text,
          at: Date.parse(e.at),
        }));
        setRecordings((r) => [...mine, ...r].sort((x, y) => x.at - y.at));
        // C-09 · the return scene: caught in the act
        enqueue("return", 0, () =>
          actReturn(away[away.length - 1].kind, away.length),
        );
      }
      if (hour < 5) report("night");
    });
    const iv = setInterval(() => void refreshSoul(), 8 * 60_000);
    return () => {
      alive = false;
      clearInterval(iv);
      void flushSoul();
    };
  }, [active, user?.id]);

  /* C-09 · he's caught doing something when you come back */
  async function actReturn(kind: string, n: number) {
    const scene: Record<string, () => Promise<void>> = {
      energy: async () => {
        await animator.play("sleep");
      },
      hunger: async () => {
        setMood("hungry");
        await wait(1200);
      },
      boredom: async () => {
        await animator.play("count-fingers");
      },
      loneliness: async () => {
        await animator.play("sulk");
      },
      sanity: async () => {
        await animator.play("paranoid-glance");
      },
    };
    const play = scene[kind];
    if (play) void play();
    await wait(1400);
    void animator.play("startle");
    speak({
      text:
        kind === "energy"
          ? "I WASN'T SLEEPING. you're back. hi. i have messages for you."
          : `oh. you're back. i was— nothing. ${n} thing${n === 1 ? "" : "s"} happened while you were gone. it's on the machine.`,
      action: { label: "Play messages", run: () => openChat() },
      ms: 12_000,
    });
    await wait(1500);
    setMood(restMoodRef.current);
  }

  /* C-16 · sick: you take care of him by staying, moving cards and talking */
  useEffect(() => {
    if (!active || !soul?.sick) return;
    const stay = setTimeout(
      () => report("care", { kind: "stay" }),
      10 * 60_000,
    );
    const cough = setInterval(() => {
      if (isBusy()) return;
      speak({
        text: pick([
          "*cough* *kkzzt* *cough*. i'm fine. it's just mould. on my soul.",
          "you left me for a week. look at me. i'm growing a culture.",
          "stay a while. move some cards. talk to me. that's the cure. i read it somewhere.",
        ]),
      });
    }, 4 * 60_000);
    return () => {
      clearTimeout(stay);
      clearInterval(cough);
    };
  }, [active, soul?.sick, isBusy, speak]);

  /* C-03 / C-05 · the director: what he does when nobody asked */
  const lyingRef = useRef(false);
  const storyRef = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: actor reads refs/stable fns
  useEffect(() => {
    if (!active) return;
    const actor: Actor = {
      isBusy: () => isBusy() || seriousRef.current || storyRef.current,
      idleFor: () => Date.now() - lastActivity.current,
      enqueue,
      speak: (text, o) => speak({ text, ms: o?.ms }),
      anim: (n) => animator.play(n),
      setMood,
      restMood: () => restMoodRef.current,
      travelTo: (pt) => travel(offFor(pt)),
      goHome,
      setFlip,
      lookAt,
      sprite: () => spriteRef.current?.getBoundingClientRect() ?? null,
      pathname: () => window.location.pathname,
      hour: () => new Date().getHours(),
      soul: () => soulRef.current,
      report,
      vanish: (ms) => {
        setGone(true);
        goneRef.current = true;
        setTimeout(() => {
          setGone(false);
          goneRef.current = false;
          speak({ text: "i'm back. smelled like static out there." });
        }, ms);
      },
      setLying: (on) => {
        lyingRef.current = on;
      },
      intensity: () => intensityRef.current,
      pranksOn: () => pranksRef.current,
      ask: (text, choices, ms) => speak({ text, choices, ms: ms ?? 20_000 }),
      toMachine: (text, o) => {
        openChat();
        setTimeout(
          () => chat.say(text, undefined, { system: true, fade: o?.fade }),
          450,
        );
      },
      account: () => userRef.current,
      awayDays: () => awayDaysRef.current,
      cardByKey: (key) =>
        document.querySelector<HTMLElement>(
          `.mt-jx[data-vx-key="${CSS.escape(key)}"]`,
        ),
    };
    const darkActor = {
      ...actor,
      // H-04 · hidden = his centre is inside a card, his nest or the machine, and nobody's holding him
      isHidden: () => {
        if (goneRef.current) return true;
        const r = spriteRef.current?.getBoundingClientRect();
        if (!r || grabRef.current) return false;
        const els = document.elementsFromPoint(
          r.left + r.width / 2,
          r.top + r.height / 2,
        );
        return els.some((el) => el.closest(".mt-jx, .vxn, .vxm-case, .hf-pn"));
      },
      panic: (on: boolean) => {
        panicRef.current = on;
        if (on) {
          holdPeek();
          setMood("terror");
          vxBody.body.current?.breath(2.8);
        } else {
          releasePeek();
          setMood(restMoodRef.current);
        }
      },
      twin: () => setTwin(true),
    };
    // T-03 · his impulse catalogues load with the director, not with his body
    let stopDirector = () => {};
    let directorDead = false;
    void Promise.all([
      import("@/vortex/core/impulses"),
      import("@/vortex/core/bond"),
      import("@/vortex/world/system"),
      import("@/vortex/dark/impulses"),
    ]).then(([core, bond, system, dark]) => {
      if (directorDead) return;
      stopDirector = startDirector(actor, [
        ...core.IMPULSES,
        ...bond.BOND_IMPULSES,
        ...system.SYSTEM_IMPULSES,
        // erased: the Rewinder took the dark with everything else
        ...(soulRef.current?.ending === "erase"
          ? []
          : dark.darkImpulses(darkActor)),
      ]);
    });
    // E-01 · his senses ride the same actor
    const stopSenses = startSenses({
      ...actor,
      openChat: () => openChat(),
      isNight: () => {
        const h = new Date().getHours();
        return h >= 3 && h < 6;
      },
    });
    return () => {
      directorDead = true;
      stopDirector();
      stopSenses();
    };
  }, [active]);
  /* LADO L · the series: when an episode is due, he waits for a free
     moment and performs it. The Videoteca asks for reruns. */
  // biome-ignore lint/correctness/useExhaustiveDependencies: reads refs/stable fns
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const stage: Stage = {
      speak: (text, o) =>
        speak({
          text,
          ms: o?.ms,
          choices: o?.choices,
          action: o?.action,
          keepEnding: true,
        }),
      setMood,
      anim: (n) => animator.play(n),
      restMood: () => restMoodRef.current,
      goBelow: () => router.push("/below/porao"),
      awayDays: () => awayDaysRef.current,
    };
    const run = async (ep: Episode, live: boolean) => {
      if (storyRef.current) return;
      storyRef.current = true;
      try {
        const picked = await playEpisode(ep, stage, live);
        if (live) await markSeen(ep.id, picked);
      } finally {
        storyRef.current = false;
      }
    };
    const t = setTimeout(async () => {
      const ep = await fetchDueEpisode();
      if (!ep) return;
      // L-01 · never interrupts: waits for a quiet moment (up to ~10 min)
      for (let i = 0; i < 120 && !cancelled; i++) {
        if (!isBusy() && Date.now() - lastActivity.current > 6000) break;
        await new Promise((r) => setTimeout(r, 5000));
      }
      if (!cancelled) await run(ep, true);
    }, 30_000);
    const onRewatch = (e: Event) =>
      void run((e as CustomEvent<Episode>).detail, false);
    window.addEventListener("vortex:rewatch", onRewatch);
    return () => {
      cancelled = true;
      clearTimeout(t);
      window.removeEventListener("vortex:rewatch", onRewatch);
    };
  }, [active]);
  /* O-11 · the radio makes him strange: he goes quiet, sways, and sometimes
     switches it off "by accident". He doesn't know why. */
  // biome-ignore lint/correctness/useExhaustiveDependencies: reads refs/stable fns
  useEffect(() => {
    if (!active) return;
    startSoundtrack();
    void loadCase();
    const stopClock = startActiveClock();
    const stopCurses = startCurses(() => setTwin(true));
    let t: ReturnType<typeof setTimeout> | null = null;
    let wasOn = false;
    const onRadio = (e: Event) => {
      const on = (e as CustomEvent<{ on: boolean }>).detail.on;
      if (on === wasOn) return; // the switch itself, not every song change
      wasOn = on;
      if (t) clearTimeout(t);
      if (!on) return;
      t = setTimeout(
        () => {
          if (storyRef.current || chatOpenRef.current) return;
          const r = Math.random();
          if (r < 0.2) {
            setMood("guilt");
            speak({
              text: "oops. my elbow. i don't have elbows. it's off now. don't turn it back on. (turn it back on.)",
              keepEnding: true,
            });
            tuneOut();
          } else if (r < 0.6) {
            setMood("dreaming");
            void animator.play("dream");
          } else {
            setMood("empty");
            speak({
              text: "…that voice. no. never mind. i don't know her.",
              keepEnding: true,
            });
          }
        },
        25_000 + Math.random() * 40_000,
      );
    };
    window.addEventListener("vortex:radio", onRadio);
    return () => {
      window.removeEventListener("vortex:radio", onRadio);
      if (t) clearTimeout(t);
      stopClock();
      stopCurses();
    };
  }, [active]);

  /* LADO P · the society of ghosts: gossip (P-03), a static attack (P-07),
     golden plaques (P-14) — once in a while, never during anything else. */
  // biome-ignore lint/correctness/useExhaustiveDependencies: reads refs/stable fns
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(async () => {
      try {
        const r = await apiFetch<{
          on: boolean;
          gossip: string[];
          inbox: {
            attack: string[] | null;
            plaques: { from_name: string; reason: string }[];
          };
        }>("/api/mascot/social");
        for (const p of r.inbox.plaques)
          speak({
            text: `${p.from_name} gave you a golden plaque: "${p.reason}". it's on your shelf. don't let it go to your head. (let it.)`,
            keepEnding: true,
            ms: 12_000,
          });
        if (r.inbox.attack && headGamesRef.current)
          staticAttack(r.inbox.attack);
        else if (r.on && r.gossip.length && Math.random() < 0.5)
          setTimeout(
            () =>
              speak({
                text: r.gossip[Math.floor(Math.random() * r.gossip.length)],
                keepEnding: true,
              }),
            4000,
          );
      } catch {}
    }, 150_000);
    return () => clearTimeout(t);
  }, [active]);

  /* LADO G · the agent's proactive side: reminders he delivers (G-10) and
     the daily sweep for quietly blocked cards (G-09). */
  // biome-ignore lint/correctness/useExhaustiveDependencies: reads refs/stable fns
  useEffect(() => {
    if (!active) return;
    const poll = () =>
      apiFetch<{ due: { text: string; jab: string }[] }>(
        "/api/mascot/reminders/due",
      )
        .then((r) => {
          for (const d of r.due) {
            setMood("judging");
            speak({
              text: `📌 REMINDER: ${d.text}. ${d.jab}`,
              keepEnding: true,
              ms: 20_000,
            });
          }
        })
        .catch(() => {});
    const t0 = setTimeout(poll, 15_000);
    const iv = setInterval(poll, 60_000);
    // G-09 · once a day
    const day = new Date().toDateString();
    let sweep: ReturnType<typeof setTimeout> | null = null;
    try {
      if (localStorage.getItem("yd:vortex.blockers") !== day)
        sweep = setTimeout(() => {
          localStorage.setItem("yd:vortex.blockers", day);
          apiFetch<{
            cards: {
              card_id: number;
              board_id: number;
              name: string;
              days: number;
              who: string | null;
            }[];
          }>("/api/mascot/agent/blockers")
            .then((r) => {
              const c = r.cards[0];
              if (!c) return;
              speak({
                text: `"${c.name}" has been waiting on ${c.who ? `@${c.who}` : "someone"} for ${c.days} days. want me to poke them?`,
                keepEnding: true,
                ms: 20_000,
                action: {
                  label: "poke them",
                  run: () => {
                    openChat();
                    setTimeout(
                      () =>
                        chat.propose(
                          "here. a polite nudge. polite-ish. sign it.",
                          [
                            {
                              kind: "add_comment",
                              board_id: c.board_id,
                              card_id: c.card_id,
                              card_name: c.name,
                              text: `${c.who ? `@${c.who} ` : ""}any news on this? it's been ${c.days} days.`,
                            },
                          ],
                        ),
                      450,
                    );
                  },
                },
              });
            })
            .catch(() => {});
        }, 90_000);
    } catch {}
    return () => {
      clearTimeout(t0);
      clearInterval(iv);
      if (sweep) clearTimeout(sweep);
    };
  }, [active]);

  /* LADO R · the body bridge: the experimental modules (src/vortex/weird)
     move him with window.dispatchEvent(new CustomEvent("vortex:body", { detail })).
     `place` takes a raw viewport centre and is NOT clamped, so he can leave
     the screen through an edge and come back through the opposite one. */
  // biome-ignore lint/correctness/useExhaustiveDependencies: travel/goHome/setMood are stable enough
  useEffect(() => {
    const onBody = (e: Event) => {
      const d = (e as CustomEvent<BodyCmd>).detail;
      const layer = layerRef.current;
      switch (d.cmd) {
        case "travel":
          void travel(offFor({ x: d.x, y: d.y }));
          break;
        case "place": {
          const o = {
            x: d.x - SPRITE / 2 - ANCHOR_X,
            y: d.y - SPRITE / 2 - (window.innerHeight - ANCHOR_B - SPRITE),
          };
          setDur(d.ms ?? 0);
          setOff(o);
          offRef.current = o;
          break;
        }
        case "home":
          void goHome();
          break;
        case "mood":
          setMood(d.mood);
          break;
        case "prop":
          setProp(d.prop);
          break;
        case "hide":
        case "show":
          if (layer) layer.style.visibility = d.cmd === "hide" ? "hidden" : "";
          break;
        case "anim":
          if (hasAnim(d.name)) void animator.play(d.name);
          break;
        case "fx":
          if (fxHostRef.current)
            flashClass(fxHostRef.current, d.cls, d.ms ?? 600);
          break;
      }
    };
    window.addEventListener("vortex:body", onBody);
    return () => window.removeEventListener("vortex:body", onBody);
  }, []);

  /* LADO D · gadgets talk back through his body; anyone can make him say
     something with window.dispatchEvent(new CustomEvent("vortex:say", { detail: { text } })) */
  const [gadgetFx, setGadgetFx] = useState<Record<string, boolean>>({});
  // biome-ignore lint/correctness/useExhaustiveDependencies: openChat/setMood are stable
  useEffect(() => {
    const onGadget = (e: Event) => {
      const d = (e as CustomEvent<{ id: string; on: boolean; lost?: boolean }>)
        .detail;
      setGadgetFx((g) => ({ ...g, [d.id]: d.on }));
      if (d.id === "gravity" && d.on)
        speak({
          text: "WHY IS THE FLOOR ON THE CEILING. turn it off. no, leave it. no, turn it off.",
          keepEnding: true,
        });
      if (d.id === "shrinker" && d.on)
        speak({ text: "finally. the correct scale.", keepEnding: true });
      if (d.id === "xray" && d.on)
        speak({
          text: "don't look at my bones. they're tape. it's private.",
          keepEnding: true,
        });
      if (d.id === "cloner" && d.lost)
        speak({
          text: "…i count four. there were five. one of me is out there. find him. he owes me money.",
          keepEnding: true,
        });
    };
    const onSay = (e: Event) => {
      const t = (
        e as CustomEvent<{ text: string; mood?: VortexMood; force?: boolean }>
      ).detail;
      // T-15 · ambient lines share a budget so modules can't pile up on him
      if (!speechAllowed(t.force)) return;
      if (t.mood) setMood(t.mood);
      speak({ text: t.text, keepEnding: true, ms: 9000 });
    };
    // G-05 · "ask vortex" from anywhere: open the machine, then hand over the question
    const onAsk = (e: Event) => {
      const d = (e as CustomEvent<{ question: string; style: string[] }>)
        .detail;
      openChat();
      setTimeout(
        () =>
          window.dispatchEvent(
            new CustomEvent("vortex:machine-ask", { detail: d }),
          ),
        500,
      );
    };
    window.addEventListener("vortex:ask", onAsk);
    window.addEventListener("vortex:gadget", onGadget);
    window.addEventListener("vortex:say", onSay);
    return () => {
      window.removeEventListener("vortex:ask", onAsk);
      window.removeEventListener("vortex:gadget", onGadget);
      window.removeEventListener("vortex:say", onSay);
    };
  }, [speak]);

  // L-09 · the Great Rewind talks through him and scares him for its hour
  const grSay = useCallback(
    (text: string) => speak({ text, keepEnding: true, ms: 12_000 }),
    [speak],
  );
  const grPanic = useCallback((on: boolean) => {
    if (on) setMood("terror");
  }, []);
  const soulRef = useRef(soul);
  soulRef.current = soul;
  const panicRef = useRef(false);
  const userRef = useRef(user);
  userRef.current = user;
  const awayDaysRef = useRef(0);
  const intensityRef = useRef(intensity);
  intensityRef.current = intensity;
  const pranksRef = useRef(pranksOn);
  pranksRef.current = pranksOn;

  /* F · the little things: gifts, minutes, dares running out, lost-bet stickers */
  // biome-ignore lint/correctness/useExhaustiveDependencies: reads refs/stable fns
  useEffect(() => {
    if (!active) return;
    applyGifts();
    const minute = setInterval(() => {
      applyGifts();
      if (!document.hidden && Date.now() - lastActivity.current < 60_000)
        stats.tick();
      // F-05 · a dare that ran out: he eats a card (visually) and gloats
      const failed = pacts.expired();
      if (failed) {
        const victim = Array.from(
          document.querySelectorAll<HTMLElement>(".mt-jx[data-card-id]"),
        ).find(onScreen);
        enqueue("dare-fail", 0, async () => {
          if (victim) {
            const eaten = eatCard(victim, mouthPoint(), 5000);
            setTimeout(() => eaten.spit(), 4500);
          }
          speak({
            text: `time's up. you didn't "${failed.text}". *crunch*. i'll spit it back. eventually.`,
          });
          await animator.play("gloat");
        });
      }
      // F-06 · lost bets wear a sticker for a week
      const lost = new Set(pacts.lostBetKeys());
      for (const el of document.querySelectorAll<HTMLElement>(
        ".mt-jx[data-vx-key]",
      ))
        el.classList.toggle("vxr-lostbet", lost.has(el.dataset.vxKey ?? ""));
    }, 60_000);
    return () => clearInterval(minute);
  }, [active]);

  /* F-15 · the goodbye before the switch · F-16 · coming back after it */
  // biome-ignore lint/correctness/useExhaustiveDependencies: reads refs only
  useEffect(() => {
    if (!active) return;
    try {
      const days = localStorage.getItem("yd:vortex.returnedDays");
      if (days !== null) {
        localStorage.removeItem("yd:vortex.returnedDays");
        report("returned", { days: Number(days) });
        if (Number(days) < 30)
          setTimeout(
            () =>
              speak({
                text: `${days} day${days === "1" ? "" : "s"} in the dark. you switched me OFF. i'm not mad. i'm writing it down.`,
              }),
            3500,
          );
      }
    } catch {}
    const onBye = (e: Event) => {
      const done = (e as CustomEvent<{ done: () => void }>).detail?.done;
      const r = soulRef.current?.relation ?? 0;
      const text =
        r < -20
          ? "finally. i'll be in the walls."
          : r < 50
            ? "fine. but the cards will miss me. they won't. i will. no i won't."
            : "don't let her rewind you.";
      setChatOpen(false);
      speak({ text, ms: 3000 });
      void animator.play(r >= 50 ? "love" : "sulk");
      setTimeout(() => done?.(), 2600);
    };
    window.addEventListener("vortex:farewell", onBye);
    return () => window.removeEventListener("vortex:farewell", onBye);
  }, [active]);

  /* F-14 · a letter arrived · F-16 · he forgot you */
  const letterNoticed = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: on soul change
  useEffect(() => {
    if (!soul || letterNoticed.current) return;
    if ((soul.unread_letters ?? 0) > 0) {
      letterNoticed.current = true;
      setTimeout(() => {
        if (chatOpenRef.current) return;
        speak({
          text: "you've got mail. a real letter. from me. it's in your profile, in my drawer. don't read it out loud.",
          action: {
            label: "Read it",
            run: () => router.push("/profile#vortex-letters"),
          },
          ms: 14_000,
        });
      }, 9000);
    } else if (soul.forgot_you) {
      letterNoticed.current = true;
      setTimeout(
        () =>
          speak({
            text: "who are you? …i'm kidding. no, i'm not. a month is a long time on tape. hi, stranger.",
          }),
        4000,
      );
    }
  }, [soul]);

  const onceTodayLocal = (key: string) => {
    const today = new Date().toDateString();
    try {
      if (localStorage.getItem(`yd:vortex.daily.${key}`) === today)
        return false;
      localStorage.setItem(`yd:vortex.daily.${key}`, today);
      return true;
    } catch {
      return false;
    }
  };

  /* H · the dark, ambient: whispers, the dead hour, the app breathing, the night of the rewind */
  // biome-ignore lint/correctness/useExhaustiveDependencies: reads refs only
  useEffect(() => {
    if (!active) return;
    const offWhispers = startWhispers(() => soulRef.current?.stage ?? 0);
    deadHourTick();
    const dead = setInterval(deadHourTick, 30_000);
    halloweenDecor(isHalloween());
    if (isHalloween() && onceTodayLocal("halloween")) {
      report("halloween");
      setTimeout(
        () =>
          speak({
            text: "it's the night of the rewind. she gets closer tonight. everyone's does. stay where i can see you.",
          }),
        6000,
      );
    }
    // H-18 · something changed while you weren't looking (stage 2+, once a day)
    let hiddenAt = 0;
    const onVis = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
        return;
      }
      if ((soulRef.current?.stage ?? 0) < 2 || Date.now() - hiddenAt < 20_000)
        return;
      if (!onceTodayLocal("notlooking")) return;
      void whileNotLooking();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      offWhispers();
      clearInterval(dead);
      document.documentElement.classList.remove("vxh-deadhour");
      halloweenDecor(false);
      setBreathing(0);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [active]);
  // H-20 · the app breathes with him from stage 2
  useEffect(() => {
    const st = soul?.stage ?? 0;
    setBreathing(st >= 2 ? (st - 1) / 4 : 0);
  }, [soul?.stage]);
  // H-02 · he notices when he slips a stage
  const prevStage = useRef<number | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: on stage change
  useEffect(() => {
    const st = soul?.stage;
    if (st === undefined) return;
    if (prevStage.current !== null && st > prevStage.current) {
      const lines = [
        "",
        "there's a hiss in me. there wasn't before.",
        "i echo now. i echo now. you hear that? you hear that?",
        "parts of me keep going missing. i'm fine. i'm f—",
        "she's using my face sometimes. if i say something weird, it wasn't me.",
        "i can see the end of the tape from here. stay close. please.",
      ];
      void animator.play("terror");
      setTimeout(() => speak({ text: lines[st] ?? "" }), 900);
    }
    prevStage.current = st;
  }, [soul?.stage]);
  // H-15 · dead: he's gone, a candle burns in his corner · then he comes back
  const isDead = soul?.mood === "dead";
  // biome-ignore lint/correctness/useExhaustiveDependencies: on death/rebirth
  useEffect(() => {
    if (isDead) {
      setGone(true);
      goneRef.current = true;
    } else if (goneRef.current && soul) {
      setGone(false);
      goneRef.current = false;
    }
  }, [isDead]);
  const rebornSeen = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: once per rebirth
  useEffect(() => {
    if (!soul?.reborn || rebornSeen.current) return;
    rebornSeen.current = true;
    setTimeout(() => void animator.play("reform"), 1500);
  }, [soul?.reborn]);
  // H-25 · nightmares: asleep and corrupted, he trembles; a slow, gentle hover calms him
  const nightmare =
    (mood === "asleep" || mood === "dreaming") && (soul?.corruption ?? 0) >= 35;
  useEffect(() => {
    const fx = fxHostRef.current;
    fx?.classList.toggle("vxr-nightmare", nightmare);
    if (!nightmare) return;
    let calmSince = 0;
    const move = (e: PointerEvent) => {
      const r = spriteRef.current?.getBoundingClientRect();
      if (!r) return;
      const over =
        e.clientX > r.left &&
        e.clientX < r.right &&
        e.clientY > r.top &&
        e.clientY < r.bottom;
      const slow = Math.hypot(e.movementX, e.movementY) < 4;
      if (!over || !slow) {
        calmSince = 0;
        return;
      }
      calmSince ||= Date.now();
      if (Date.now() - calmSince > 2000) {
        calmSince = 0;
        fx?.classList.remove("vxr-nightmare");
        report("nightmare_calmed");
        setMood("dreaming");
        speak({
          text: "…mm. the fire's out. stay. just for a second. (i'm asleep. i didn't say that.)",
        });
      }
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      fx?.classList.remove("vxr-nightmare");
    };
  }, [nightmare, speak]);

  // H-05 · drawing a circle around him while he's possessed
  useEffect(() => {
    if (!active) return;
    let total = 0;
    let lastA: number | null = null;
    const move = (e: PointerEvent) => {
      if (!exorciseRef.current) {
        total = 0;
        lastA = null;
        return;
      }
      const r = spriteRef.current?.getBoundingClientRect();
      if (!r) return;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      if (Math.hypot(e.clientX - cx, e.clientY - cy) > 220) return;
      const a = Math.atan2(e.clientY - cy, e.clientX - cx);
      if (lastA !== null) {
        let d = a - lastA;
        if (d > Math.PI) d -= 2 * Math.PI;
        if (d < -Math.PI) d += 2 * Math.PI;
        total += d;
      }
      lastA = a;
      if (Math.abs(total) > (330 * Math.PI) / 180) {
        total = 0;
        exorciseRef.current?.();
      }
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [active]);

  /* I-25 · three quick clicks on a screw of any walnut panel: it falls out and there's a hole */
  // biome-ignore lint/correctness/useExhaustiveDependencies: router is stable
  useEffect(() => {
    if (!active) return;
    let hits: number[] = [];
    const onClick = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (!t?.closest?.("[class*='screw']")) return;
      const now = Date.now();
      hits = [...hits, now].filter((x) => now - x < 900);
      if (hits.length >= 3) {
        hits = [];
        vxSound("tink");
        speak({
          text: "you unscrewed the panel. there's a hole. it goes down. …after you.",
        });
        setTimeout(() => router.push("/below/porao"), 1600);
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [active]);

  /* K · the clues the app itself hides (console, 03:13, the other tab) */
  // biome-ignore lint/correctness/useExhaustiveDependencies: once per session
  useEffect(() => {
    if (!active) return;
    return startClues({
      say: (text) => speak({ text }),
      isVisible: () => !document.hidden,
    });
  }, [active]);

  /* C-22 · superstition: say "deadline" and he knocks on the walnut */
  // biome-ignore lint/correctness/useExhaustiveDependencies: reads refs only
  useEffect(() => {
    if (!active) return;
    let buf = "";
    const onKey = (e: KeyboardEvent) => {
      if (e.key.length !== 1) return;
      buf = (buf + e.key.toLowerCase()).slice(-12);
      if (/(deadline|prazo)$/.test(buf)) {
        buf = "";
        if (
          chatOpenRef.current ||
          Date.now() - (lastAct.current.knock ?? 0) < 120_000
        )
          return;
        lastAct.current.knock = Date.now();
        setTimeout(() => {
          speak({
            text: "*knocks on the walnut three times* don't say that word in here.",
          });
          vxSound("tink");
          setTimeout(() => vxSound("tink"), 180);
          setTimeout(() => vxSound("tink"), 360);
        }, 500);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  const recordingsHeard = useCallback(() => {
    setRecordings([]);
    try {
      localStorage.removeItem("yd:vortex.machine");
    } catch {}
  }, []);
  // the blinking message LED: he nudges you once when you come back to messages
  // biome-ignore lint/correctness/useExhaustiveDependencies: on arrival only
  useEffect(() => {
    if (recordings.length === 0 || chatOpenRef.current) return;
    const t = setTimeout(() => {
      if (!chatOpenRef.current)
        speak({
          text: `${recordings.length} new message${recordings.length === 1 ? "" : "s"} on the machine. ${
            recordings.some((r) => r.from !== "vortex")
              ? "one of them isn't from me."
              : "all from me. i got bored."
          }`,
          action: { label: "Play them", run: () => openChat() },
        });
    }, 6000);
    return () => clearTimeout(t);
  }, [recordings.length]);

  /* ── A-15 · serious mode: no pranks while you're drowning ── */
  const [serious, setSerious] = useState(false);
  const seriousRef = useRef(false);
  seriousRef.current = serious;

  /* ── A-17 · press V anywhere (not while typing) to open the machine ── */
  // biome-ignore lint/correctness/useExhaustiveDependencies: reads refs only
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "v" && e.key !== "V") return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const a = document.activeElement as HTMLElement | null;
      if (
        a &&
        (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))
      )
        return;
      if (document.querySelector(BUSY_SELECTOR) || chatOpenRef.current) return;
      e.preventDefault();
      openChat();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  /* the mood the server hears (its whitelist is wider than his faces) */
  const personaMood: string =
    hour < 5 || mood === "yawn" || mood === "dormant" ? "sleepy" : mood;

  const machineHost: MachineHost = {
    compliment: () => world.compliment(),
    fortuneClue: () => world.fortuneClue(),
    leaveNote: (to, body) => world.leaveNote(to, body),
    play: (game) => {
      if (game === "rps") world.play.rps();
      else if (game === "roulette") void world.play.roulette();
      else if (game === "whack") world.play.whack();
      else void world.play.hide();
    },
  };

  // inside the world below he's the guide on the tv — no floating copy
  if (
    !active ||
    pathname.startsWith("/below") ||
    pathname.startsWith("/side-c")
  )
    return null;

  // Near the right edge the bubble/chat hang to the left of him instead.
  const rightSide =
    typeof window !== "undefined" &&
    ANCHOR_X + off.x + SPRITE / 2 > window.innerWidth - 300;

  return (
    <>
      <div
        ref={layerRef}
        className={`vxa-layer vxr-on${calm ? " vxr-calm" : ""}${gone ? " vxa-gone" : ""}${traveling ? " vxa-traveling" : ""}${dragging ? " vxa-dragging" : ""}${rightSide ? " vxa-right" : ""}`}
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
            <div
              className={`vxa-actions${speech.choices?.some((c) => c.label.length > 14) ? " vxa-actions--choices" : ""}`}
            >
              {speech.choices?.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  className="vxa-btn"
                  onClick={() => {
                    tally(speechTag.current, "clicked");
                    setSpeech(null);
                    c.run();
                  }}
                >
                  {c.label}
                </button>
              ))}
              {speech.choices ? null : speech.action ? (
                <button
                  type="button"
                  className="vxa-btn"
                  onClick={() => {
                    // clear first: the action may make him say something new
                    tally(speechTag.current, "clicked");
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
                onClick={() => {
                  // C · dismissing him the moment he speaks hurts his feelings
                  if (Date.now() - lastSpoke.current < 1500) {
                    report("ignored");
                    tally(speechTag.current, "fast");
                  }
                  setSpeech(null);
                }}
              >
                Dismiss
              </button>
            </div>
          </output>
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
            className={`vxa-sprite vxa-mood-${mood}${soul?.upside || gadgetFx.gravity ? " vxa-upside" : ""}${gadgetFx.shrinker ? " vxa-giant" : ""}${gadgetFx.xray ? " vxa-bones" : ""}${soul?.singed ? " vxa-singed" : ""}${soul?.ending ? ` vxa-end-${soul.ending}` : ""}${econ?.equip.border ? ` vxa-${econ.equip.border}` : ""}${econ?.equip.trail ? ` vxa-${econ.equip.trail}` : ""}${soul?.sick ? " vxr-sick" : ""}${flip ? " vxa-flip" : ""}${talking ? " vxa-talking" : ""}${portal ? ` vxa-portal-${portal}` : ""}${chat.streaming ? " vxa-thinking" : ""}`}
          >
            {/* constant className: React never rewrites it, so the one-shot
                reaction classes flashed onto it survive mood re-renders */}
            <div className="vxa-fxhost" ref={fxHostRef}>
              <i className="vxr-shadow" aria-hidden />
              {soul?.ending === "flip" && (
                <span className="vxa-rec" aria-hidden>
                  ● REC
                </span>
              )}
              {helpOn && (
                <button
                  type="button"
                  className="vxa-help"
                  onClick={() => void answerHelp()}
                >
                  help
                </button>
              )}
              {dreamt && (
                <DreamBubble
                  on={mood === "asleep" || mood === "dreaming"}
                  nightmare={nightmare}
                  onPick={(scene) => {
                    if (scene === "stairs") {
                      // I-25 · into the Below through his dream
                      document.documentElement.classList.add("vxl-static");
                      setTimeout(() => router.push("/below/porao"), 700);
                      setTimeout(
                        () =>
                          document.documentElement.classList.remove(
                            "vxl-static",
                          ),
                        1400,
                      );
                      return;
                    }
                    const id = DREAM_FRAGMENT[scene];
                    if (id) void claimFragment(id, scene);
                  }}
                />
              )}
              <button
                type="button"
                className="vxa-hide"
                title="Hide Vortex"
                onClick={fakeHide}
              >
                ×
              </button>
              <div className="vxr-phys" ref={physRef}>
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
                    // the press that found him (hide and seek) is not also a tip
                    if (Date.now() - foundAt.current < 800) return;
                    // five quick clicks: he snaps (a tiny possession)
                    const now = Date.now();
                    clicks.current = [...clicks.current, now].filter(
                      (t) => now - t < 2500,
                    );
                    if (possessedRef.current && exorciseRef.current) {
                      exoClicks.current += 1;
                      if (exoClicks.current >= 13) {
                        exoClicks.current = 0;
                        exorciseRef.current();
                      }
                      return;
                    }
                    if (clicks.current.length >= 5 && !possessedRef.current) {
                      clicks.current = [];
                      actPoked();
                      return;
                    }
                    void animator.play("jelly");
                    if (spitRef.current) spitRef.current();
                    else if (chatOpen) setChatOpen(false);
                    else speak({ text: randomTip() });
                  }}
                  onDoubleClick={() => {
                    // B-21 · a double click spins him until he's dizzy
                    void animator.play("spin-dizzy");
                  }}
                >
                  {/* 5 · his shadow sometimes does its own thing */}
                  <SvgArt svg={shadowSvg} className="vxa-shadow" aria-hidden />
                  {morphed ? (
                    <SvgArt svg={propMarkup} className="vxa-body vxa-morph" />
                  ) : (
                    <SvgArt svg={svg} className="vxa-body" />
                  )}
                  {!morphed && !costumeMarkup && (
                    <SvgArt
                      svg={seasonMarkup}
                      className="vxr-season"
                      aria-hidden
                    />
                  )}
                  {!morphed && costumeMarkup && (
                    <SvgArt
                      svg={costumeMarkup}
                      className="vxa-costume"
                      aria-hidden
                    />
                  )}
                  {!morphed && propMarkup && (
                    <SvgArt svg={propMarkup} className="vxa-prop" aria-hidden />
                  )}
                </button>
              </div>
              {prop === "stress" && (
                <button
                  type="button"
                  className="vxa-stress"
                  aria-label="Squeeze the stress ball"
                  onClick={(e) => {
                    e.currentTarget.animate(
                      [
                        { transform: "scale(1)" },
                        { transform: "scale(1.3,.6)" },
                        { transform: "scale(1)" },
                      ],
                      { duration: 300 },
                    );
                    vxSound("click");
                  }}
                >
                  <SvgArt svg={STRESS_BALL_SVG} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* H-15 · while he's dead, a candle burns where he used to float */}
      {isDead && <i className="vxh-vigil" aria-hidden />}

      {/* F-05 · a dare in progress */}
      <DareTimer />

      {/* C-11 · his nest, in his corner */}
      <Nest hidden={!atCornerHome || chatOpen} />
      <GreatRewind onSay={grSay} onPanic={grPanic} />
      <WorldHost
        api={worldProps}
        hostRef={worldRef}
        sharedPrank={sharedPrankRef}
        presence={presenceRef}
        onReady={() => setWorldReady(true)}
      />

      {chatOpen && (
        <AnsweringMachine
          chat={chat}
          mounts={mounts}
          currentBoardId={currentBoardId}
          personaMood={personaMood}
          intensity={intensity}
          hour={hour}
          relation={soul?.relation ?? 0}
          voice={voice}
          onVoice={setVoice}
          origin={machineOrigin}
          recordings={recordings}
          onRecordingsHeard={recordingsHeard}
          onClose={() => setChatOpen(false)}
          speakOutside={(text) => speak({ text })}
          host={machineHost}
          onSerious={setSerious}
          twin={!!soul?.swapped}
          onEvent={(type, data) => {
            report(type, data);
            if (type === "invoke_rewinder") {
              setTimeout(() => {
                setChatOpen(false);
                pencilInLayout();
                void animator.play("terror");
                speak({
                  text: "you said it backwards. WHY would you say it backwards. there's a pencil now. there's a PENCIL.",
                });
              }, 1200);
            }
          }}
        />
      )}

      {/* the evil twin: silent, staring, gone when touched */}
      {twin && (
        <button
          type="button"
          className="vxa-twin"
          aria-label="Another Vortex?"
          onClick={() => {
            setTwin(false);
            report("twin");
            setTimeout(() => speak({ text: "who were you talking to?" }), 500);
            // F-24 · jealous of the twin
            setTimeout(() => {
              speak({
                text: pick([
                  "he's NICER? i'm sorry i'm not a customer service brochure.",
                  "you clicked him. you CLICKED him. with the same finger you click me.",
                  "he uses emoji. EMOJI. and you just… went for it.",
                ]),
              });
              void animator.play("sulk");
            }, 4200);
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
