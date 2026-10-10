"use client";

import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  isCompliment,
  parseSlash,
  riddleOfTheDay,
} from "@/components/vortex/mk4/chat";
import {
  type Costume,
  getProgress,
  setBirthday,
  unlock,
  unlockCostume,
  updateProgress,
} from "@/components/vortex/mk4/progress";
import { vxSound } from "@/components/vortex/vortexSound";
import type {
  useVortexChat,
  VortexAction,
  VortexChatMessage,
  VortexMessageMeta,
} from "@/hooks/useVortexChat";
import type { VortexPersonaState } from "@/lib/api";
import { apiFetch, fetchProjects } from "@/lib/api";
import { fetchBoards } from "@/lib/auth";
import {
  isVortexMounted,
  mountVortexContext,
  unmountVortexContext,
  VORTEX_MAX_MOUNTS,
  type VortexIntensity,
  type VortexMount,
} from "@/lib/vortex";
import { pacts } from "@/vortex/core/pacts";
import { stats } from "@/vortex/core/stats";
import { guessPhrase } from "@/vortex/mysteries/fragments";
import { describeAction, diffLine, runBatch } from "./actions";
import { Chip } from "./Chip";
import {
  AFTER_OTHER,
  NAG,
  otherVoice,
  RECORDING_LABEL,
  type Recording,
  sawThat,
  UNIGNORE_PLEASE,
  UNIGNORE_PRETTY,
  yesterday,
} from "./lines";
import {
  classifyTone,
  glitchSegments,
  hash,
  hasSwear,
  isPlease,
  isTrivial,
  isUrgent,
  markGlitches,
  polite,
  roll,
  type Seg,
  splitChips,
  type Tone,
  wantsGlitch,
} from "./text";
import { canSpeak, speakTape } from "./tts";
import "./answering.css";

/**
 * A · THE VOICE — Vortex's answering machine (design/vortex-mk5/lados/A-voz.md).
 * A walnut microcassette deck replaces the old chat panel: his replies print on
 * amber thermal tape, yours are typed labels, reels spin while he talks, the VU
 * jumps with every token, a VFD says what he's doing (typing, deleting,
 * ignoring you…). It owns the whole conversation flow: slash commands, the dial,
 * stagecraft before a reply, nagging, the silent treatment, fading strips,
 * "i saw that", voice tapes, chips, the other voices on the line, the messages
 * left while you were away, and the signed contract for proposed actions.
 */

export type MachineMode = "ask" | "roast" | "write" | "lore";
const MODES: { id: MachineMode; label: string; style: string[] }[] = [
  { id: "ask", label: "ASK", style: [] },
  { id: "roast", label: "ROAST", style: ["roast"] },
  { id: "write", label: "WRITE", style: ["write"] },
  { id: "lore", label: "LORE", style: ["lore"] },
];

export interface MachineHost {
  compliment(): number;
  fortuneClue(): string;
  leaveNote(to: string, body: string): Promise<string>;
  play(game: "rps" | "roulette" | "whack" | "hide"): void;
}

interface Props {
  chat: ReturnType<typeof useVortexChat>;
  mounts: VortexMount[];
  currentBoardId: number | null;
  /** the persona mood the server should hear (already mapped from his face) */
  personaMood: string;
  intensity: VortexIntensity;
  hour: number;
  relation: number;
  voice: boolean;
  onVoice: (on: boolean) => void;
  /** his mouth, in viewport px — the machine is spat out from there */
  origin: { x: number; y: number } | null;
  recordings: Recording[];
  onRecordingsHeard: () => void;
  onClose: () => void;
  /** say something in his speech bubble (outside the machine) */
  speakOutside: (text: string) => void;
  host: MachineHost;
  /** turns on/off "serious mode" outside the machine too (he stops pranking) */
  onSerious?: (on: boolean) => void;
  /** H-11 · the twin is wearing his place: every reply goes out in the twin's voice */
  twin?: boolean;
  /** C · tell his soul what happened (chat, compliment, apology, lore…) */
  onEvent?: (
    type:
      | "chat"
      | "compliment"
      | "apology"
      | "lore"
      | "rude"
      | "sweet"
      | "care"
      | "invoke_rewinder",
    data?: Record<string, unknown>,
  ) => void;
}

type Stage =
  | { kind: "none" }
  | { kind: "typing"; label: string; until: number; hold: boolean }
  | { kind: "instant"; until: number };

const W = 384;
const FADE_AFTER = 15_000;
const STAGE_MAX = 2600;

const pad3 = (n: number) => String(n % 1000).padStart(3, "0");
const hhmm = (t: number) =>
  new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/* ───────────────────────────────── reels ───────────────────────────────── */
function Reel({ pack, side }: { pack: number; side: "l" | "r" }) {
  return (
    <svg
      className={`vxm-reel vxm-reel--${side}`}
      viewBox="-30 -30 60 60"
      aria-hidden="true"
    >
      <circle r={pack} className="pack" />
      <g className="hub">
        <circle r="11" className="hubring" />
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <rect
            key={a}
            x="-1.6"
            y="-10.5"
            width="3.2"
            height="5"
            rx="1"
            transform={`rotate(${a})`}
            className="tooth"
          />
        ))}
        <circle r="3" className="axle" />
      </g>
    </svg>
  );
}

/* ─────────────────────────────── text render ───────────────────────────── */
function Line({
  text,
  glitch,
  politeOn,
}: {
  text: string;
  glitch: boolean;
  politeOn: boolean;
}) {
  const t = politeOn ? polite(text) : text;
  const segs: Seg[] = glitch ? glitchSegments(t) : markGlitches(t);
  return (
    <>
      {segs.map((s, i) =>
        s.glitch ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: static split
          <span key={i} className="vxm-glitch">
            {s.t}
          </span>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: static split
          <Fragment key={i}>
            {splitChips(s.t).map((p, j) =>
              "chip" in p ? (
                // biome-ignore lint/suspicious/noArrayIndexKey: static split
                <Chip key={j} chip={p.chip} />
              ) : (
                // biome-ignore lint/suspicious/noArrayIndexKey: static split
                <Fragment key={j}>{p.t}</Fragment>
              ),
            )}
          </Fragment>
        ),
      )}
    </>
  );
}

/** Characters that fade back-to-front (A-10). */
function FadingText({ text, fading }: { text: string; fading: boolean }) {
  const chars = Array.from(text);
  return (
    <span className={`vxm-fadetext${fading ? " is-fading" : ""}`}>
      {chars.map((c, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: static characters
          key={i}
          style={{ "--d": `${(chars.length - i) * 38}ms` } as CSSProperties}
        >
          {c}
        </span>
      ))}
    </span>
  );
}

/* ───────────────────────────── voice tape (A-13) ───────────────────────── */
function TapePlayer({
  text,
  preset,
}: {
  text: string;
  preset: "normal" | "drunk";
}) {
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const stop = useRef<(() => void) | null>(null);
  useEffect(() => () => stop.current?.(), []);
  const bars = useMemo(() => {
    const h = hash(text);
    return Array.from({ length: 28 }, (_, i) => 0.25 + roll(h, i) * 0.75);
  }, [text]);
  const toggle = () => {
    if (playing) {
      stop.current?.();
      return;
    }
    setPlaying(true);
    setPos(0);
    stop.current = speakTape(text, {
      preset,
      onWord: (ci) => setPos(ci / Math.max(1, text.length)),
      onEnd: () => {
        setPlaying(false);
        setPos(1);
        stop.current = null;
      },
    });
  };
  return (
    <div className={`vxm-tape${playing ? " is-playing" : ""}`}>
      <button
        type="button"
        className="vxm-tape-btn"
        onClick={toggle}
        disabled={!canSpeak()}
        aria-label={playing ? "Stop his voice tape" : "Play his voice tape"}
      >
        {playing ? "■" : "▶"}
      </button>
      <div className="vxm-tape-wave" aria-hidden>
        {bars.map((b, i) => (
          <i
            // biome-ignore lint/suspicious/noArrayIndexKey: static bars
            key={i}
            style={{ height: `${Math.round(b * 100)}%` }}
            className={i / bars.length <= pos ? "on" : ""}
          />
        ))}
      </div>
      <span className="vxm-tape-len">
        0:{String(Math.min(59, Math.ceil(text.length / 14))).padStart(2, "0")}
      </span>
    </div>
  );
}

/* ───────────────────────────── the machine ─────────────────────────────── */
export default function AnsweringMachine(props: Props) {
  const {
    chat,
    mounts,
    currentBoardId,
    personaMood,
    intensity,
    hour,
    relation,
    voice,
    onVoice,
    origin,
    recordings,
    onRecordingsHeard,
    onClose,
    speakOutside,
    host,
    onSerious,
    onEvent,
    twin,
  } = props;
  const router = useRouter();
  const politeOn = intensity === "polite";

  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<MachineMode>("ask");
  const [closing, setClosing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerItems, setPickerItems] = useState<VortexMount[] | null>(null);
  const [acted, setActed] = useState<
    Record<number, "working" | "done" | "torn" | "error">
  >({});
  // G-02 · per-line results of a batch; G-15 · what the devil took
  const [lineResults, setLineResults] = useState<
    Record<number, ("ok" | "fail" | "skip")[]>
  >({});
  const [faustPrice, setFaustPrice] = useState<Record<number, string>>({});
  const [stage, setStage] = useState<Stage>({ kind: "none" });
  const [ignoring, setIgnoring] = useState<{
    question: string;
    style: string[];
  } | null>(null);
  const [serious, setSerious] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<{ stop: () => void } | null>(null);
  // S-03 · 👍/👎 per printed strip, graded against the style that produced it
  const lastStyle = useRef("chat");
  const [styleAt, setStyleAt] = useState<Record<number, string>>({});
  const [voted, setVoted] = useState<Record<number, 1 | -1>>({});
  const vote = (i: number, v: 1 | -1) => {
    if (voted[i]) return;
    setVoted((x) => ({ ...x, [i]: v }));
    apiFetch<{ say: string }>("/api/mascot/creator/feedback", {
      method: "POST",
      body: JSON.stringify({ style: styleAt[i] ?? "chat", vote: v }),
    })
      .then((r) => chat.say(r.say, undefined, { system: true }))
      .catch(() => {});
  };
  const printed = chat.messages.length;
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new strip is the trigger
  useEffect(() => {
    const i = printed - 1;
    if (i >= 0 && chat.messages[i]?.role !== "user" && styleAt[i] === undefined)
      setStyleAt((x) => ({ ...x, [i]: lastStyle.current }));
  }, [printed]);
  const heldAt = useRef(0);
  const [fadingNow, setFadingNow] = useState<Set<number>>(() => new Set());
  const [held, setHeld] = useState<number | null>(null);
  const [vu, setVu] = useState({ l: 0, r: 0 });
  const [playingRec, setPlayingRec] = useState<{
    n: number;
    of: number;
  } | null>(null);
  // an "instant" reply (he knew you'd ask) never streams: it prints whole (A-07)
  const [instantPending, setInstantPending] = useState(false);

  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const riddlePending = useRef(false);
  const nags = useRef(0);
  const tones = useRef<(Tone | null)[]>([]);
  const maxDraft = useRef("");
  const sawTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevLen = useRef(chat.messages.length);
  // messages after this index wait for the stagecraft to finish (A-07)
  const [revealUpTo, setRevealUpTo] = useState(chat.messages.length);
  const stageRef = useRef<Stage>(stage);
  stageRef.current = stage;

  /* ── place: beside him, or full screen on a phone ── */
  const [place, setPlace] = useState<{
    left: number;
    ox: number;
    oy: number;
    full: boolean;
  }>({
    left: 16,
    ox: 0,
    oy: 0,
    full: false,
  });
  useLayoutEffect(() => {
    const compute = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (vw < 640) {
        setPlace({
          left: 0,
          ox: origin?.x ?? vw / 2,
          oy: origin?.y ?? vh,
          full: true,
        });
        return;
      }
      const mx = Math.min(origin?.x ?? 80, vw - 40);
      let left = mx + 56;
      if (left + W > vw - 12) left = mx - 56 - W;
      left = Math.max(12, Math.min(vw - W - 12, left));
      const top = Math.max(12, vh - 16 - Math.min(640, vh - 32));
      setPlace({
        left,
        ox: mx - left,
        oy: (origin?.y ?? vh) - top,
        full: false,
      });
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [origin]);

  /* ── close: he swallows it back ── */
  const ignoringRef = useRef(false);
  ignoringRef.current = ignoring !== null;
  const close = useCallback(() => {
    if (ignoringRef.current)
      setTimeout(
        () => speakOutside("you left. i was going to answer. eventually."),
        600,
      );
    setClosing(true);
    vxSound("click");
    setTimeout(onClose, 240);
  }, [onClose, speakOutside]);

  /* ── serious mode reported outward (he stops pranking while you're in a hole) ── */
  useEffect(() => {
    onSerious?.(serious);
  }, [serious, onSerious]);
  useEffect(() => {
    if (!serious) return;
    const t = setTimeout(() => setSerious(false), 20 * 60_000);
    return () => clearTimeout(t);
  }, [serious]);

  useEffect(() => {
    if (!chat.streaming) setInstantPending(false);
  }, [chat.streaming]);

  /* ── keep the log pinned to the newest strip ── */
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on new content
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.messages.length, chat.streamingText, revealUpTo, stage, ignoring]);

  /* ── reveal gate: new strips wait for the stagecraft ── */
  useEffect(() => {
    const len = chat.messages.length;
    if (len < prevLen.current) {
      // cleared
      setRevealUpTo(len);
    } else if (len > revealUpTo) {
      const s = stageRef.current;
      const wait = s.kind === "none" ? 0 : Math.max(0, s.until - Date.now());
      const t = setTimeout(() => {
        setRevealUpTo(chat.messages.length);
        if (stageRef.current.kind !== "none") setStage({ kind: "none" });
      }, wait);
      prevLen.current = len;
      return () => clearTimeout(t);
    }
    prevLen.current = len;
  }, [chat.messages.length, revealUpTo]);
  // the user's own label shows immediately even while his reply is staged
  useEffect(() => {
    const last = chat.messages[chat.messages.length - 1];
    if (last?.role === "user") setRevealUpTo(chat.messages.length);
  }, [chat.messages]);
  // stage timeline: typing → deleted → typing (A-07)
  useEffect(() => {
    if (stage.kind !== "typing" || stage.label !== "HE'S TYPING…") return;
    if (!stage.hold) return;
    const t1 = setTimeout(
      () =>
        setStage((s) =>
          s.kind === "typing" ? { ...s, label: "HE DELETED SOMETHING" } : s,
        ),
      900,
    );
    const t2 = setTimeout(
      () =>
        setStage((s) =>
          s.kind === "typing" ? { ...s, label: "HE'S TYPING… AGAIN" } : s,
        ),
      1600,
    );
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [stage]);
  useEffect(() => {
    if (stage.kind === "none") return;
    const t = setTimeout(
      () => {
        // the stream may still be going; the gate above handles finished replies
        if (!chat.streaming) setRevealUpTo(chat.messages.length);
        setStage({ kind: "none" });
      },
      Math.max(0, stage.until - Date.now()) + 50,
    );
    return () => clearTimeout(t);
  }, [stage, chat.streaming, chat.messages.length]);

  /* ── VU needles: jump with the stream, twitch with your typing ── */
  const lastStreamLen = useRef(0);
  useEffect(() => {
    if (!chat.streaming) {
      lastStreamLen.current = 0;
      setVu((v) => ({ ...v, l: 0 }));
      return;
    }
    const iv = setInterval(() => {
      const n = chat.streamingText.length;
      const d = n - lastStreamLen.current;
      lastStreamLen.current = n;
      setVu((v) => ({ ...v, l: Math.min(1, d / 24 + Math.random() * 0.15) }));
    }, 110);
    return () => clearInterval(iv);
  }, [chat.streaming, chat.streamingText]);
  useEffect(() => {
    if (draft === "") return;
    setVu((v) => ({ ...v, r: 0.4 + Math.random() * 0.5 }));
    const t = setTimeout(() => setVu((v) => ({ ...v, r: 0 })), 180);
    return () => clearTimeout(t);
  }, [draft]);

  /* ── A-20 · play the messages left while you were away ── */
  const playedRecs = useRef(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: once per open
  useEffect(() => {
    if (playedRecs.current || recordings.length === 0) return;
    playedRecs.current = true;
    let i = 0;
    const next = () => {
      if (i >= recordings.length) {
        setPlayingRec(null);
        onRecordingsHeard();
        return;
      }
      const r = recordings[i];
      setPlayingRec({ n: i + 1, of: recordings.length });
      chat.say(r.text, undefined, {
        recording: { from: RECORDING_LABEL[r.from], at: r.at },
        system: true,
      });
      vxSound("click");
      i++;
      setTimeout(next, 1400);
    };
    setTimeout(next, 500);
  }, []);

  /* ── A-16 · bring up an earlier day's question on the first open of the day ── */
  // biome-ignore lint/correctness/useExhaustiveDependencies: once per open
  useEffect(() => {
    if (recordings.length > 0) return;
    const key = "yd:vortex.yday";
    const today = new Date().toDateString();
    try {
      if (localStorage.getItem(key) === today) return;
      localStorage.setItem(key, today);
    } catch {
      return;
    }
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const earlier = [...chat.messages]
      .reverse()
      .find(
        (m) =>
          m.role === "user" &&
          !m.local &&
          m.at &&
          m.at < startOfToday.getTime(),
      );
    if (!earlier?.at) return;
    const days = Math.max(
      1,
      Math.round((startOfToday.getTime() - earlier.at) / 86_400_000) + 1,
    );
    setTimeout(
      () =>
        chat.say(yesterday(earlier.content, days), undefined, { system: true }),
      450,
    );
  }, []);

  /* ── A-08 · he nags when you leave him on read ── */
  const last = chat.messages[chat.messages.length - 1];
  useEffect(() => {
    if (
      serious ||
      chat.streaming ||
      stage.kind !== "none" ||
      draft !== "" ||
      nags.current >= NAG.length - 1 ||
      !last ||
      last.role !== "assistant" ||
      last.meta?.serious ||
      last.meta?.recording
    )
      return;
    const t = setTimeout(
      () => {
        chat.say(NAG[nags.current], undefined, { system: true });
        nags.current += 1;
      },
      20_000 + nags.current * 12_000,
    );
    return () => clearTimeout(t);
  }, [serious, chat, stage.kind, draft, last]);

  /* ── A-12 · i saw that ── */
  const onDraft = (v: string) => {
    if (
      v.length > maxDraft.current.length ||
      !v.startsWith(maxDraft.current.slice(0, 1))
    )
      maxDraft.current =
        v.length >= maxDraft.current.length ? v : maxDraft.current;
    if (v === "" && maxDraft.current.length >= 25) {
      const deleted = maxDraft.current;
      maxDraft.current = "";
      try {
        // the B-side wall of the day (Lado I · I-14) — this tab only, never sent
        const k = "yd:vortex.bside";
        const list = JSON.parse(sessionStorage.getItem(k) ?? "[]") as string[];
        sessionStorage.setItem(
          k,
          JSON.stringify([...list, deleted].slice(-30)),
        );
      } catch {}
      if (sawTimer.current) clearTimeout(sawTimer.current);
      sawTimer.current = setTimeout(() => {
        sawTimer.current = null;
        chat.say(sawThat(deleted, hasSwear(deleted)), undefined, {
          system: true,
        });
      }, 10_000);
    }
    if (v !== "" && sawTimer.current) {
      // you started over — he'll mention it when you send
    }
    setDraft(v);
  };

  /* ── A-10 · thermal strips that fade once read ── */
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    chat.messages.forEach((m, i) => {
      if (
        i >= revealUpTo ||
        !m.meta?.fade ||
        m.meta.faded ||
        fadingNow.has(i) ||
        held === i
      )
        return;
      timers.push(
        setTimeout(() => {
          setFadingNow((s) => new Set(s).add(i));
        }, FADE_AFTER),
      );
    });
    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [chat.messages, revealUpTo, fadingNow, held]);
  useEffect(() => {
    if (fadingNow.size === 0) return;
    const t = setTimeout(() => {
      for (const i of fadingNow) if (held !== i) chat.patch(i, { faded: true });
      setFadingNow(new Set());
    }, 4200);
    return () => clearTimeout(t);
  }, [fadingNow, held, chat]);

  /* ── the persona the server hears ── */
  const persona = (tone: Tone | null): VortexPersonaState => ({
    intensity,
    tone,
    mood: personaMood,
    relation,
  });

  /* ── A-07 · stagecraft before a reply ── */
  const decideStage = (
    q: string,
  ): { stage: Stage; meta: VortexMessageMeta } => {
    const now = Date.now();
    const seed = hash(`${q}:${now}`);
    const meta: VortexMessageMeta = {};
    // A-19 · another voice on the line: dead hours or possession
    const haunted = hour === 3 || personaMood === "possessed";
    if (haunted && roll(seed, 7) < 0.3) {
      const kind = roll(seed, 8) < 0.6 ? "rewinder" : "child";
      meta.interject = {
        kind,
        text: otherVoice(kind),
        after: AFTER_OTHER[Math.floor(roll(seed, 9) * AFTER_OTHER.length)],
      };
    }
    // A-13 · a voice tape instead of a strip
    if (voice || roll(seed, 5) < 0.08) meta.tape = true;
    const r = roll(seed, 1);
    if (personaMood === "smug" && r < 0.25) {
      meta.instant = true;
      return { stage: { kind: "instant", until: now + 200 }, meta };
    }
    if (r < 0.5) {
      meta.retyped = true;
      return {
        stage: {
          kind: "typing",
          label: "HE'S TYPING…",
          until: now + 2400,
          hold: true,
        },
        meta,
      };
    }
    if (r < 0.62) {
      meta.interject ??= { kind: "no", text: "no." };
      return {
        stage: { kind: "typing", label: "…", until: now + 1900, hold: false },
        meta,
      };
    }
    return { stage: { kind: "none" }, meta };
  };

  const ask = (
    question: string,
    style: string[],
    tone: Tone | null,
    extra: VortexMessageMeta = {},
    aiText?: string,
  ) => {
    nags.current = 0;
    let meta: VortexMessageMeta = { ...extra };
    if (!serious) {
      const d = decideStage(question);
      meta = { ...d.meta, ...meta };
      if (d.stage.kind !== "none") {
        d.stage.until = Math.min(d.stage.until, Date.now() + STAGE_MAX);
        setStage(d.stage);
      }
    }
    if (style.includes("confess") || style.includes("lore")) meta.fade = true;
    lastStyle.current = style[0] ?? "chat"; // S-03 · what the thumbs will grade
    setInstantPending(!!meta.instant);
    void chat.send(
      question,
      twin ? ["twin", ...style].slice(0, 3) : style,
      persona(tone),
      { meta, aiText },
    );
  };

  /* ── send: commands, the dial, refusals, serious mode ── */
  const send = async () => {
    const text = draft.trim();
    if (text === "" || chat.streaming) return;
    setDraft("");
    maxDraft.current = "";
    if (sawTimer.current) {
      clearTimeout(sawTimer.current);
      sawTimer.current = null;
    }
    vxSound("click");
    const night = hour < 5;
    const local = (reply: string) =>
      chat.say(night ? `ugh, fine. ${reply}` : reply, text, { system: true });

    // A-14 / A-15 · your tone, and whether you're drowning
    const tone = classifyTone(text);
    tones.current = [...tones.current, tone].slice(-3);
    onEvent?.("chat");
    onEvent?.("care", { kind: "chat" });
    stats.said(text);
    // F-20 · "i promise…" / "prometo…" — he writes it down
    const vow =
      /\b(?:i promise|i swear|prometo|juro)\s+(?:that\s+|que\s+)?(.{6,140})/i.exec(
        text,
      );
    if (vow && !text.startsWith("/")) pacts.promise(vow[1]);
    if (tone === "rude") onEvent?.("rude");
    else if (tone === "sweet") onEvent?.("sweet");
    if (/\b(sorry|my bad|apologi[sz]e|desculp|perd[ãa]o|foi mal)\b/i.test(text))
      onEvent?.("apology");
    if (
      text.startsWith("/lore") ||
      text.startsWith("/confess") ||
      mode === "lore"
    )
      onEvent?.("lore");
    const stressed = tones.current.filter((t) => t === "stressed").length;
    if (
      !serious &&
      (stressed >= 2 || (stressed >= 1 && isUrgent(text) && text.length < 50))
    )
      setSerious(true);

    // A-09 · the silent treatment, broken by manners
    if (ignoring) {
      const p = isPlease(text);
      if (p) {
        const q = ignoring;
        setIgnoring(null);
        chat.note(text);
        chat.say(
          p === "pretty"
            ? UNIGNORE_PRETTY[
                Math.floor(Math.random() * UNIGNORE_PRETTY.length)
              ]
            : UNIGNORE_PLEASE[
                Math.floor(Math.random() * UNIGNORE_PLEASE.length)
              ],
          undefined,
          { system: true },
        );
        ask(
          q.question,
          q.style,
          p === "pretty" ? "sweet" : tone,
          {},
          `${q.question} (${text})`,
        );
        return;
      }
      setIgnoring(null);
    }

    // the riddle of the day waits for an answer
    if (riddlePending.current && !text.startsWith("/")) {
      riddlePending.current = false;
      const r = riddleOfTheDay();
      if (r.a.test(text)) {
        updateProgress((p) => ({
          ...p,
          riddle: { day: new Date().toDateString(), solved: true, asked: true },
        }));
        const fresh = unlockCostume("monocle");
        unlock("riddle-master");
        local(
          `correct. it was ${r.answer}.${fresh ? " take this monocle. you've earned it. (/costume monocle)" : ""}`,
        );
      } else local(`nope. it was ${r.answer}. new riddle tomorrow.`);
      return;
    }

    if (isCompliment(text) && !text.startsWith("/") && text.length < 40) {
      onEvent?.("compliment");
      const n = host.compliment();
      local(
        `*squirms* the jar has ${n} compliment${n === 1 ? "" : "s"} now. stop it. (don't.)`,
      );
      return;
    }

    const cmd = parseSlash(text);
    if (cmd?.kind === "local") {
      const extra = text.startsWith("/fortune") ? host.fortuneClue() : "";
      local(cmd.reply + extra);
      return;
    }
    if (cmd?.kind === "birthday") {
      setBirthday(cmd.mmdd);
      local(
        cmd.mmdd
          ? `noted. ${cmd.mmdd}. i'll be weird about it.`
          : "forgotten. what birthday?",
      );
      return;
    }
    if (cmd?.kind === "weird") {
      local(
        {
          demolish:
            "stand back. i've always wanted to do this. (REBUILD is the big button. coward.)",
          popcorn:
            "don't mind me. i'll just sit here. and watch. and judge. with snacks.",
          speedrun: "timer's on. any%. no glitches. well. some glitches. GO.",
          tour: "buckle up. i'm driving. touch nothing.",
          fork: "hold on. i've had a thought. two thoughts. two of me.",
          studio:
            "the studio. you make notes, i make them better. by which i mean worse.",
          interrupt: "",
          maintenance: "",
        }[cmd.mode],
      );
      setTimeout(
        () =>
          window.dispatchEvent(
            new CustomEvent("vortex:weird", { detail: { mode: cmd.mode } }),
          ),
        700,
      );
      return;
    }
    if (cmd?.kind === "dare") {
      const goal = { kind: "moved" as const, n: 3 };
      pacts.startDare("move 3 cards in 10 minutes", goal, 10);
      local(
        "fine. you asked for it: move 3 cards in 10 minutes. clock's on the wall. go.",
      );
      return;
    }
    if (cmd?.kind === "bet") {
      const b = pacts.bet(cmd.card);
      local(
        `bet placed: you finish ${b.cardKey} today. if you don't, it wears a sticker for a week. if you do, i owe you my dignity.`,
      );
      return;
    }
    if (cmd?.kind === "promise") {
      pacts.promise(cmd.text);
      local(`written down: "${cmd.text}". i'll ask tomorrow. i always ask.`);
      return;
    }
    if (cmd?.kind === "note") {
      local(await host.leaveNote(cmd.to, cmd.body));
      return;
    }
    if (cmd?.kind === "run") {
      if (cmd.action === "clear") {
        chat.clear();
        setActed({});
        return;
      }
      if (cmd.action === "voice") {
        onVoice(!voice);
        local(
          voice
            ? "voice off. back to thermal paper."
            : "voice on. tape-warped, as nature intended.",
        );
        return;
      }
      if (cmd.action === "riddle") {
        const r = riddleOfTheDay();
        const p = getProgress().riddle;
        if (p.day === new Date().toDateString() && p.solved) {
          local("you already solved today's. come back tomorrow.");
          return;
        }
        riddlePending.current = true;
        local(`riddle of the day: ${r.q}`);
        return;
      }
      if (cmd.action === "costume") {
        const owned = ["none", "auto", ...getProgress().costumes];
        const want = (cmd.arg ?? "").toLowerCase();
        if (want && owned.includes(want)) {
          updateProgress((p) => ({ ...p, costume: want as Costume | "auto" }));
          local(
            want === "auto" ? "back to seasonal outfits." : `wearing: ${want}.`,
          );
        } else
          local(
            `my wardrobe: ${owned.join(", ")}. try /costume ${owned[owned.length - 1]}`,
          );
        return;
      }
      const game = cmd.action;
      close();
      setTimeout(
        () => host.play(game as "rps" | "roulette" | "whack" | "hide"),
        320,
      );
      return;
    }

    // H-17 · saying "rewind" backwards is a very bad idea
    if (/^dniwer$/i.test(text.trim())) {
      chat.note(text);
      chat.say(
        "no. no no no. you said it backwards. why would you— she HEARD that.",
        undefined,
        { other: "rewinder" },
      );
      onEvent?.("invoke_rewinder");
      return;
    }
    // K · a short phrase might be a secret: the server checks what you said
    if (cmd === null && text.length <= 60) {
      const won = await guessPhrase(text);
      if (won.length) {
        chat.note(text);
        chat.say(
          won.some((f) => f.layer >= 4)
            ? "…where did you hear that. WHERE did you hear that. don't say it again. (say it again.)"
            : "…huh. that word. it did something to the tape. i felt it. did you feel it?",
          undefined,
          { other: "void", fade: true },
        );
        return;
      }
    }

    const dial = MODES.find((m) => m.id === mode)?.style ?? [];
    const style = (cmd?.kind === "ai" ? cmd.style : serious ? [] : dial).slice(
      0,
      3,
    );
    const question = cmd?.kind === "ai" ? cmd.question : text;

    // A-09 · sometimes he just… doesn't
    const grumpy = personaMood === "judging" || personaMood === "sulking";
    if (
      !serious &&
      grumpy &&
      cmd === null &&
      isTrivial(text) &&
      Math.random() < 0.08 * (personaMood === "sulking" ? 3 : 1)
    ) {
      chat.note(text);
      setIgnoring({ question, style });
      return;
    }

    ask(question, style, tone);
  };

  /* ── push-to-talk (Web Speech) — the transcript lands on the label ── */
  const listen = () => {
    type Rec = {
      lang: string;
      interimResults: boolean;
      onresult: (e: {
        results: { [i: number]: { [j: number]: { transcript: string } } };
      }) => void;
      onend: () => void;
      onerror: () => void;
      start: () => void;
      stop: () => void;
    };
    const Wn = window as unknown as {
      SpeechRecognition?: new () => Rec;
      webkitSpeechRecognition?: new () => Rec;
    };
    const R = Wn.SpeechRecognition ?? Wn.webkitSpeechRecognition;
    if (!R) {
      chat.say("this browser can't hear me. try chrome or edge.", undefined, {
        system: true,
      });
      return;
    }
    const rec = new R();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = false;
    rec.onresult = (e) => setDraft(e.results[0][0].transcript);
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
    };
    rec.onerror = () => setListening(false);
    setListening(true);
    onVoice(true);
    recRef.current = rec;
    rec.start();
  };

  /* ── mount picker ── */
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
  const visiblePicker = (pickerItems ?? []).filter((i) =>
    i.name.toLowerCase().includes(pickerQuery.trim().toLowerCase()),
  );
  const mountCurrentBoard = async () => {
    if (currentBoardId === null) return;
    try {
      const { owned, shared } = await fetchBoards();
      const b = [...owned, ...shared].find((x) => x.id === currentBoardId);
      if (b) mountVortexContext({ type: "board", id: b.id, name: b.name });
    } catch {}
  };

  /* G-05 · someone outside asked for him (the card rail's "ask vortex") */
  // biome-ignore lint/correctness/useExhaustiveDependencies: ask/mount are stable enough for a one-off request
  useEffect(() => {
    const onAsk = async (e: Event) => {
      const d = (e as CustomEvent<{ question: string; style: string[] }>)
        .detail;
      await mountCurrentBoard();
      setTimeout(() => ask(d.question, d.style, null), 150);
    };
    window.addEventListener("vortex:machine-ask", onAsk);
    return () => window.removeEventListener("vortex:machine-ask", onAsk);
  }, [currentBoardId]);

  /* ── G-01 · sign the contract ── */
  const sign = async (i: number, actions: VortexAction[], faust = false) => {
    setActed((s) => ({ ...s, [i]: "working" }));
    vxSound("click");
    // a retry resumes after the clauses that already went through
    const prev = lineResults[i] ?? [];
    const from = Math.max(0, prev.lastIndexOf("ok") + 1);
    const r = await runBatch(actions.slice(from), (k, state) =>
      setLineResults((s) => {
        const cur = [...(s[i] ?? actions.map(() => "skip" as const))];
        cur[from + k] = state;
        return { ...s, [i]: cur };
      }),
    );
    setLineResults((s) => ({
      ...s,
      [i]: [...prev.slice(0, from), ...r.results],
    }));
    if (r.error) {
      setActed((s) => ({ ...s, [i]: "error" }));
      return;
    }
    setActed((s) => ({ ...s, [i]: "done" }));
    vxSound("rewind");
    if (faust) {
      try {
        const p = await apiFetch<{ label: string }>("/api/mascot/agent/faust", {
          method: "POST",
        });
        setFaustPrice((s) => ({ ...s, [i]: p.label }));
      } catch {}
      return; // let them read the price before moving on
    }
    if (actions.length === 1) setTimeout(() => router.push(r.to), 700);
  };

  /* ── focus the label when it opens; Esc ejects ── */
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 260);
    return () => clearTimeout(t);
  }, []);

  /* ── the VFD ── */
  const lastShown =
    chat.messages[Math.min(revealUpTo, chat.messages.length) - 1];
  const crisisOpen = !!lastShown?.meta?.serious;
  let vfd = "READY · SIDE A";
  if (chat.error) vfd = "NO SIGNAL";
  else if (playingRec) vfd = `MESSAGE ${playingRec.n} OF ${playingRec.of}`;
  else if (stage.kind === "typing") vfd = stage.label;
  else if (stage.kind === "instant" || (chat.streaming && instantPending))
    vfd = "HE KNEW YOU'D ASK";
  else if (chat.streaming)
    vfd = chat.streamingText === "" ? "HE'S TYPING…" : "PLAYBACK ▸";
  else if (ignoring) vfd = "HE'S IGNORING YOU";
  else if (crisisOpen) vfd = "I'M HERE.";
  else if (serious) vfd = "SERIOUS MODE";
  else if (draft !== "") vfd = "RECORDING ●";
  // R-05 · the reels turn while you talk to him, too
  const spinning =
    chat.streaming || stage.kind !== "none" || !!playingRec || listening;
  const counter = pad3(chat.messages.length);
  const pack = Math.max(9, 24 - (chat.messages.length % 40) * 0.35);
  const lockDial = serious;

  // while staged, the stream stays hidden; "instant" replies never stream
  const showStream = chat.streaming && stage.kind === "none" && !instantPending;

  const style = {
    "--vxm-left": `${place.left}px`,
    "--vxm-ox": `${place.ox}px`,
    "--vxm-oy": `${place.oy}px`,
  } as CSSProperties;

  return (
    <div
      className={`vxm${place.full ? " vxm--full" : ""}${closing ? " is-closing" : ""}${serious ? " is-serious" : ""}`}
      style={style}
      role="dialog"
      aria-label="Vortex's answering machine"
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
    >
      <div className="vxm-case">
        <i className="vxm-screw tl" aria-hidden />
        <i className="vxm-screw tr" aria-hidden />
        <i className="vxm-screw bl" aria-hidden />
        <i className="vxm-screw br" aria-hidden />

        {/* ── the cassette window ── */}
        <div className="vxm-top">
          <div
            className={`vxm-window${spinning ? " is-spinning" : ""}${chat.streaming ? " is-fast" : ""}`}
          >
            <Reel pack={pack} side="l" />
            <div className="vxm-tapepath" aria-hidden />
            <Reel pack={Math.max(9, 33 - pack)} side="r" />
            <span className="vxm-label">talk-back · vortex</span>
          </div>
          <div className="vxm-counter" title={`tape counter ${counter}`}>
            {counter.split("").map((d, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed digits
              <span key={i}>{d}</span>
            ))}
          </div>
          <button
            type="button"
            className="vxm-eject"
            title="Eject (close)"
            aria-label="Close the answering machine"
            onClick={close}
          >
            ⏏
          </button>
        </div>

        {/* ── VFD + VU ── */}
        <div className="vxm-vfdrow">
          <div className="vxm-vfd" aria-live="polite">
            <span className="ghost" aria-hidden>
              8888888888888888888
            </span>
            <span className="txt">{vfd}</span>
          </div>
          <div className="vxm-vu" aria-hidden>
            <div className="meter">
              <i style={{ transform: `rotate(${-42 + vu.l * 84}deg)` }} />
              <b>L</b>
            </div>
            <div className="meter">
              <i style={{ transform: `rotate(${-42 + vu.r * 84}deg)` }} />
              <b>R</b>
            </div>
          </div>
        </div>

        {/* ── mounted cartridges ── */}
        <div className="vxm-mounts">
          {mounts.map((m) => (
            <span
              key={`${m.type}:${m.id}`}
              className="vxm-cart"
              title={
                m.type === "board" ? "Board (deep)" : "Project (all boards)"
              }
            >
              <span aria-hidden>{m.type === "board" ? "▦" : "◫"}</span>
              <span className="nm">{m.name}</span>
              <button
                type="button"
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
                className="vxm-cart is-ghost"
                onClick={mountCurrentBoard}
              >
                + this board
              </button>
            )}
          {mounts.length < VORTEX_MAX_MOUNTS && (
            <button
              type="button"
              className="vxm-cart is-ghost"
              aria-expanded={pickerOpen}
              onClick={() => setPickerOpen((v) => !v)}
            >
              {pickerOpen ? "− close" : "+ mount"}
            </button>
          )}
          {mounts.length === 0 && <span className="vxm-scope">whole tape</span>}
        </div>
        {pickerOpen && (
          <div className="vxm-picker">
            <input
              className="vxm-picker-q"
              placeholder="search projects & boards…"
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
            />
            <div className="vxm-picker-list">
              {pickerItems === null && <div className="empty">loading…</div>}
              {pickerItems !== null && visiblePicker.length === 0 && (
                <div className="empty">nothing matches.</div>
              )}
              {visiblePicker.map((item) => {
                const on = isVortexMounted(item.type, item.id);
                return (
                  <button
                    key={`${item.type}:${item.id}`}
                    type="button"
                    className={on ? "is-on" : ""}
                    onClick={() =>
                      on
                        ? unmountVortexContext(item.type, item.id)
                        : mountVortexContext(item)
                    }
                  >
                    <span aria-hidden>{item.type === "board" ? "▦" : "◫"}</span>
                    <span className="nm">{item.name}</span>
                    <span className="st">{on ? "eject" : "mount"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── the paper tray ── */}
        <div className="vxm-tray" ref={logRef}>
          {chat.messages.length === 0 && !chat.streaming && (
            <div className="vxm-strip is-hint">
              <div className="vxm-strip-head">VX ▸ {hhmm(Date.now())}</div>
              {mounts.length === 0
                ? "it's me. ask about your boards. or don't. turn the dial for roasts, drafts and things i shouldn't tell you."
                : `focused on ${mounts.map((m) => m.name).join(" and ")}. ask.`}
            </div>
          )}
          {chat.messages.slice(0, revealUpTo).map((m, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: append-only transcript
            <Fragment key={i}>
              {m.role === "user" ? (
                <div className="vxm-label-msg">
                  <span className="tape tl" aria-hidden />
                  <span className="tape tr" aria-hidden />
                  {m.content}
                </div>
              ) : (
                <Strip
                  m={m}
                  i={i}
                  mood={personaMood}
                  politeOn={politeOn}
                  fading={fadingNow.has(i) && held !== i}
                  onHold={(on) => setHeld(on ? i : null)}
                  acted={acted[i]}
                  results={lineResults[i]}
                  price={faustPrice[i]}
                  onSign={() => {
                    const list = m.actions ?? (m.action ? [m.action] : []);
                    if (list.length) void sign(i, list, m.faust);
                  }}
                  onTear={() => setActed((s) => ({ ...s, [i]: "torn" }))}
                />
              )}
              {m.role !== "user" &&
                !m.local &&
                !m.meta?.system &&
                !m.meta?.serious && (
                  <span className="vxm-thumbs">
                    <button
                      type="button"
                      aria-label="more like this"
                      aria-pressed={voted[i] === 1}
                      disabled={!!voted[i]}
                      onClick={() => vote(i, 1)}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      aria-label="less like this"
                      aria-pressed={voted[i] === -1}
                      disabled={!!voted[i]}
                      onClick={() => vote(i, -1)}
                    >
                      ▼
                    </button>
                  </span>
                )}
            </Fragment>
          ))}
          {ignoring && (
            <div className="vxm-silence" aria-live="polite">
              <span>· · ·</span> he's facing the wall. try asking nicely.
            </div>
          )}
          {showStream && (
            <div className="vxm-strip is-live">
              <div className="vxm-strip-head">VX ▸ {hhmm(Date.now())}</div>
              {chat.streamingText === "" ? (
                <span className="vxm-dots">
                  <i />
                  <i />
                  <i />
                </span>
              ) : (
                <Line
                  text={chat.streamingText.split("ACTION:")[0]}
                  glitch={false}
                  politeOn={politeOn}
                />
              )}
            </div>
          )}
          {chat.error && <div className="vxm-error">✕ {chat.error}</div>}
        </div>

        {/* ── the deck ── */}
        <div className="vxm-deck">
          <fieldset className={`vxm-dial${lockDial ? " is-locked" : ""}`}>
            <legend className="sr-only">What to ask for</legend>
            <div
              className="knob"
              style={{
                transform: `rotate(${-60 + MODES.findIndex((m) => m.id === mode) * 40}deg)`,
              }}
              aria-hidden
            >
              <i />
            </div>
            {MODES.map((m, k) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={mode === m.id}
                disabled={lockDial && m.id !== "ask"}
                className={`pos p${k}${mode === m.id ? " is-on" : ""}`}
                onClick={() => {
                  setMode(m.id);
                  vxSound("click");
                }}
              >
                {m.label}
              </button>
            ))}
          </fieldset>
          <div className="vxm-input">
            <input
              ref={inputRef}
              value={draft}
              maxLength={4000}
              placeholder={
                ignoring
                  ? "say please."
                  : hour < 5
                    ? "ugh. what."
                    : mode === "write"
                      ? "which card do i write for?"
                      : mode === "roast"
                        ? "who or what do i destroy?"
                        : mode === "lore"
                          ? "ask about the tape…"
                          : "talk to me… (/help)"
              }
              onChange={(e) => onDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void send();
              }}
              aria-label="Message to Vortex"
            />
          </div>
          <div className="vxm-keys">
            <button
              type="button"
              className="key rec"
              onClick={() => void send()}
              disabled={chat.streaming || draft.trim() === ""}
              title="Record (send)"
            >
              <i className="dot" /> REC
            </button>
            <button
              type="button"
              className={`key${voice ? " is-down" : ""}${listening ? " is-listening" : ""}`}
              // R-05 · press and hold to talk (a quick click still toggles)
              onPointerDown={() => {
                heldAt.current = Date.now();
                if (!listening) listen();
              }}
              onPointerUp={() => {
                if (Date.now() - heldAt.current > 450) recRef.current?.stop();
              }}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !listening) {
                  e.preventDefault();
                  listen();
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                onVoice(!voice);
              }}
              title="Hold to talk · right-click: voice replies on/off"
            >
              ▶ PLAY
            </button>
            <button
              type="button"
              className="key"
              onClick={() => {
                chat.clear();
                setActed({});
                vxSound("rewind");
              }}
              title="Erase the tape (forget this conversation)"
            >
              ⏮ ERASE
            </button>
          </div>
        </div>
        <div className="vxm-grille" aria-hidden />
      </div>
    </div>
  );
}

/* ───────────────────────────── one thermal strip ───────────────────────── */
function Strip({
  m,
  i,
  mood,
  politeOn,
  fading,
  onHold,
  acted,
  results,
  price,
  onSign,
  onTear,
}: {
  m: VortexChatMessage;
  i: number;
  mood: string;
  politeOn: boolean;
  fading: boolean;
  onHold: (on: boolean) => void;
  acted?: "working" | "done" | "torn" | "error";
  results?: ("ok" | "fail" | "skip")[];
  price?: string;
  onSign: () => void;
  onTear: () => void;
}) {
  const lines = m.actions ?? (m.action ? [m.action] : []);
  const meta = m.meta ?? {};
  const glitch = !m.local && wantsGlitch(m.content, mood, meta.serious);
  const at = m.at ?? Date.now();
  const kindClass = meta.serious
    ? " is-serious"
    : meta.recording
      ? ` is-rec is-from-${meta.recording.from === "VORTEX" ? "him" : meta.recording.from.startsWith("UNKNOWN") ? "radio" : "static"}`
      : meta.system
        ? " is-sys"
        : "";
  return (
    <>
      {meta.interject && (
        <>
          <div className={`vxm-strip is-other is-${meta.interject.kind}`}>
            <div className="vxm-strip-head">
              {meta.interject.kind === "no" ? `VX ▸ ${hhmm(at)}` : "?? ▸ --:--"}
            </div>
            {meta.interject.text}
          </div>
          {meta.interject.after && (
            <div className="vxm-strip is-sys">
              <div className="vxm-strip-head">VX ▸ {hhmm(at)}</div>
              {meta.interject.after}
            </div>
          )}
        </>
      )}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: hover keeps the ink warm */}
      <div
        className={`vxm-strip${kindClass}${meta.fade ? " is-cheap" : ""}${meta.faded ? " is-faded" : ""}${meta.instant ? " is-instant" : ""}${glitch ? " has-glitch" : ""}`}
        onMouseEnter={() => meta.fade && onHold(true)}
        onMouseLeave={() => meta.fade && onHold(false)}
      >
        <div className="vxm-strip-head">
          {meta.recording ? (
            <>
              ● MSG · {meta.recording.from} · {hhmm(meta.recording.at)}
            </>
          ) : meta.serious ? (
            <>VX ▸ {hhmm(at)}</>
          ) : (
            <>
              VX ▸ {hhmm(at)}
              {meta.retyped && (
                <span className="stamp">deleted something meaner</span>
              )}
            </>
          )}
        </div>
        {meta.faded ? (
          <span className="vxm-faded-note">
            — the ink faded. you should've read faster. —
          </span>
        ) : meta.tape && !meta.serious ? (
          <>
            <TapePlayer
              text={m.content}
              preset={mood === "drunk" ? "drunk" : "normal"}
            />
            <div className="vxm-transcript">
              <Line text={m.content} glitch={glitch} politeOn={politeOn} />
            </div>
          </>
        ) : meta.fade ? (
          <FadingText
            text={politeOn ? polite(m.content) : m.content}
            fading={fading}
          />
        ) : (
          <Line text={m.content} glitch={glitch} politeOn={politeOn} />
        )}
      </div>
      {lines.length > 0 && (
        <div
          className={`vxm-contract${m.faust ? " is-faust" : ""}${acted === "torn" ? " is-torn" : ""}${acted === "done" ? " is-done" : ""}`}
        >
          <div className="vxm-contract-h">
            {m.faust
              ? "a very old contract · in amber-blood"
              : "contract of tape"}{" "}
            · no. {String(i + 1).padStart(4, "0")}
            {lines.length > 1 && ` · ${lines.length} clauses`}
          </div>
          <ol className="vxm-contract-diff">
            {lines.map((a, k) => {
              const d = diffLine(a);
              const res = results?.[k];
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: clauses are fixed once written
                <li key={k} className={res ? `is-${res}` : ""}>
                  <span
                    className={`sg sg-${d.sign === "-" ? "rm" : d.sign === "~" ? "chg" : "add"}`}
                  >
                    {d.sign}
                  </span>{" "}
                  {describeAction(a)}
                  {res === "ok" && <b className="res"> ✓</b>}
                  {res === "fail" && <b className="res"> ✗ stopped here</b>}
                </li>
              );
            })}
          </ol>
          <div className="vxm-contract-fine">
            {m.faust
              ? "the undersigned authorizes the above and agrees to surrender, at the ghost's discretion, one (1) thing of theirs: a nickname, a colour, or something from the case. cosmetic. probably. clause 13 applies."
              : "the undersigned authorizes the above. nothing else moves. the ghost touched nothing."}
          </div>
          {acted === undefined || acted === "error" ? (
            <div className="vxm-contract-row">
              <button type="button" className="sign" onClick={onSign}>
                {acted === "error"
                  ? "sign the rest"
                  : m.faust
                    ? "sign in blood"
                    : "sign"}
                <span className="line" aria-hidden />
              </button>
              <button type="button" className="tear" onClick={onTear}>
                tear up
              </button>
              {acted === "error" && (
                <span className="err">
                  a clause failed. the ones above it went through. the rest
                  didn&apos;t.
                </span>
              )}
            </div>
          ) : acted === "working" ? (
            <div className="vxm-contract-state">signing…</div>
          ) : acted === "done" ? (
            <>
              <div className="vxm-stamp-done">EXECUTED</div>
              {price && (
                <div className="vxm-contract-state is-price">
                  the price: {price}
                </div>
              )}
            </>
          ) : (
            <div className="vxm-contract-state">
              torn up. coward. smart coward.
            </div>
          )}
        </div>
      )}
    </>
  );
}
