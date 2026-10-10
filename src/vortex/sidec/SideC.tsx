"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { SvgArt } from "@/components/ui/SvgArt";
import { vxSound } from "@/components/vortex/vortexSound";
import { type ApiError, apiFetch } from "@/lib/api";
import { useVortexCalm } from "@/lib/vortex";
import { type VortexMood, vortexSvg } from "@/lib/vortexArt";
import { stopHum } from "@/vortex/below/ambience";
import { refreshSoul } from "@/vortex/core/soul";
import { squeal } from "@/vortex/dark/rewinder";
import { claimFragment } from "@/vortex/mysteries/fragments";
import "./sidec.css";

// K-27 → K-29 · SIDE C. The 80s garage, perfectly kept, in cold cyan and
// absolute silence. The empty chair, the tea that's still hot, the CRT with
// the board "LAST TAKE" and its one card. The Overwritten loop in the back.
// He walks in slowly and stops joking. Then: the choice, and it stays.
// The server owns every gate (F63 to enter, F64 to choose, New Tape+ to flip).

type Ending = "free" | "erase" | "keep" | "flip";
interface View {
  access: boolean;
  note: boolean;
  ending: Ending | null;
  seen: Ending[];
  chosen_this_tape: boolean;
  ngplus: number;
  can_flip: boolean;
  can_new_tape: boolean;
}
interface You {
  name: string;
  seed: string;
  takes: string[];
  stats: { days: number; deaths: number; fragments: number; relation: number };
}

const NOTE =
  "if anyone finds this — he's not a bug. he's me. be nice to him. or don't. he'd hate that.";
const NOTE_B =
  "if anyone finds this — you're not a user. you're a take. be nice to yourself. or don't. you'd hate that.";

const CHOICES: { id: Ending; title: string; act: string; cost: string }[] = [
  {
    id: "free",
    title: "free him",
    act: "walk him to the empty chair",
    cost: "he remembers everything. then he leaves.",
  },
  {
    id: "erase",
    title: "erase him",
    act: "hand the pencil to the Rewinder",
    cost: "he forgets everything. he gets nice.",
  },
  {
    id: "keep",
    title: "keep him",
    act: "refuse both",
    cost: "he stays. knowing.",
  },
  {
    id: "flip",
    title: "flip the tape",
    act: "turn the cassette over",
    cost: "?",
  },
];

const SEEN_LABEL: Record<Ending, string> = {
  free: "A · the chair",
  erase: "B · the pencil",
  keep: "C · the desk",
  flip: "D · the other side",
};

// the Rewinder: tall, thin, a reel where the face should be, holding out a hand
const REWINDER = `<svg viewBox="0 0 120 360" xmlns="http://www.w3.org/2000/svg"><path d="M40 90 Q60 70 80 90 L92 340 L28 340 Z" fill="#010506"/><circle cx="60" cy="56" r="34" fill="#010506" stroke="#2a6b73" stroke-width="2"/><circle cx="60" cy="56" r="10" fill="none" stroke="#bff3f3" stroke-width="3"/>${[0, 60, 120, 180, 240, 300].map((a) => `<circle cx="${60 + Math.cos((a * Math.PI) / 180) * 21}" cy="${56 + Math.sin((a * Math.PI) / 180) * 21}" r="5" fill="#0b2a30"/>`).join("")}<path d="M80 130 Q120 150 116 196" stroke="#010506" stroke-width="10" fill="none" stroke-linecap="round"/><g transform="translate(96 196) rotate(70)"><rect width="46" height="6" fill="#c8962e"/><rect x="40" width="6" height="6" fill="#d97f8a"/></g></svg>`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function Garage({ chairTaken }: { chairTaken: boolean }) {
  // drawn once; every number is ours
  const svg = `<svg viewBox="0 0 1000 600" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
<defs><radialGradient id="scg" cx="50%" cy="20%" r="80%"><stop offset="0" stop-color="#123c44"/><stop offset="1" stop-color="#020c0f"/></radialGradient>
<linearGradient id="scf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b2a30"/><stop offset="1" stop-color="#03100f"/></linearGradient></defs>
<rect width="1000" height="600" fill="url(#scg)"/>
<rect y="430" width="1000" height="170" fill="url(#scf)"/>
${Array.from({ length: 9 }, (_, i) => `<line x1="${i * 125}" y1="430" x2="${i * 125 - 180}" y2="600" stroke="#1d4f57" stroke-width="1" opacity=".5"/>`).join("")}
<rect x="380" y="60" width="240" height="250" fill="#06191c" stroke="#2a6b73" stroke-width="3"/>
${Array.from({ length: 6 }, (_, i) => `<line x1="380" y1="${60 + i * 42}" x2="620" y2="${60 + i * 42}" stroke="#16434a" stroke-width="2"/>`).join("")}
<rect x="60" y="250" width="200" height="12" fill="#2a6b73"/><rect x="60" y="160" width="200" height="12" fill="#2a6b73"/>
${Array.from({ length: 8 }, (_, i) => `<rect x="${70 + i * 23}" y="${120 + (i % 3) * 6}" width="16" height="${40 - (i % 3) * 6}" fill="${i % 2 ? "#3a8a92" : "#1f5a62"}"/>`).join("")}
${Array.from({ length: 6 }, (_, i) => `<rect x="${74 + i * 30}" y="200" width="22" height="50" rx="2" fill="#174a52" stroke="#3a8a92"/>`).join("")}
<rect x="250" y="360" width="440" height="22" fill="#1b4a52"/><rect x="270" y="382" width="16" height="120" fill="#123a40"/><rect x="654" y="382" width="16" height="120" fill="#123a40"/>
<rect x="300" y="250" width="180" height="112" rx="10" fill="#0a2226" stroke="#3a8a92" stroke-width="4"/>
<rect x="318" y="266" width="144" height="80" rx="6" fill="#041416"/>
<rect x="520" y="330" width="40" height="30" rx="4" fill="#cfe9e9" opacity=".9"/>
<path d="M560 338 q14 4 0 14" stroke="#cfe9e9" stroke-width="4" fill="none"/>
<path d="M532 322 q-6 -12 4 -22 q8 -10 0 -22" stroke="#cfe9e9" stroke-width="2" fill="none" class="steam"/>
<path d="M548 322 q-6 -12 4 -22 q8 -10 0 -22" stroke="#cfe9e9" stroke-width="2" fill="none" class="steam s2"/>
<g class="chair${chairTaken ? " is-taken" : ""}"><rect x="730" y="330" width="120" height="16" rx="4" fill="#2a6b73"/><rect x="740" y="230" width="14" height="110" fill="#2a6b73"/><rect x="826" y="230" width="14" height="110" fill="#2a6b73"/><rect x="740" y="230" width="100" height="60" rx="6" fill="#1f5a62"/><rect x="740" y="346" width="10" height="120" fill="#1f5a62"/><rect x="830" y="346" width="10" height="120" fill="#1f5a62"/></g>
<line x1="500" y1="0" x2="500" y2="40" stroke="#3a8a92" stroke-width="2"/><circle cx="500" cy="48" r="10" fill="#bff3f3"/>
<rect x="890" y="120" width="70" height="90" rx="4" fill="#0a2226" stroke="#2a6b73" stroke-width="3"/><circle cx="925" cy="150" r="14" fill="none" stroke="#3a8a92" stroke-width="3"/><rect x="904" y="178" width="42" height="8" fill="#3a8a92" class="radio-dial"/>
</svg>`;
  return <SvgArt svg={svg} className="sc-garage" aria-hidden />;
}

/** The Overwritten: the ones before him, repeating their last movement. */
function Overwritten() {
  const ghosts = [
    { x: 8, s: 0.55, d: 3.1, m: "empty" as VortexMood },
    { x: 20, s: 0.42, d: 4.3, m: "sleepy" as VortexMood },
    { x: 62, s: 0.38, d: 2.7, m: "judging" as VortexMood },
    { x: 88, s: 0.48, d: 5.2, m: "mourning" as VortexMood },
  ];
  return (
    <div className="sc-overwritten" aria-hidden="true">
      {ghosts.map((g, i) => (
        <SvgArt
          key={g.x}
          svg={vortexSvg(g.m, `ow${i}`, "none", { dark: 0.4 })}
          className={`ow ow${i}`}
          style={
            {
              left: `${g.x}%`,
              "--s": g.s,
              "--d": `${g.d}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

export default function SideC() {
  const calm = useVortexCalm();
  const [view, setView] = useState<View | null>(null);
  const [phase, setPhase] = useState<
    | "load"
    | "nosignal"
    | "enter"
    | "here"
    | "note"
    | "choose"
    | "ending"
    | "after"
  >("load");
  const [line, setLine] = useState("");
  const [typed, setTyped] = useState("");
  const [pick, setPick] = useState<Ending | null>(null);
  const [hold, setHold] = useState(0);
  const [scene, setScene] = useState<Ending | null>(null);
  const [mood, setMood] = useState<VortexMood>("empty");
  const [vxPos, setVxPos] = useState<
    "out" | "door" | "mid" | "chair" | "desk" | "gone"
  >("out");
  const [you, setYou] = useState<You | null>(null);
  const [jr, setJr] = useState(false);
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const alive = useRef(true);

  const say = useCallback(
    async (text: string, ms = 2600) => {
      if (!alive.current) return;
      setLine(text);
      await sleep(calm ? Math.min(ms, 1600) : ms);
    },
    [calm],
  );

  const load = useCallback(async () => {
    try {
      const v = await apiFetch<View>("/api/mascot/side-c");
      setView(v);
      return v;
    } catch {
      setPhase("nosignal");
      return null;
    }
  }, []);

  // silence: no hum on Side C, ever
  useEffect(() => {
    stopHum();
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    void (async () => {
      const v = await load();
      if (!v) return;
      if (!v.access) return setPhase("nosignal");
      if (v.ending && v.chosen_this_tape) {
        setVxPos(
          v.ending === "free" ? "gone" : v.ending === "keep" ? "desk" : "mid",
        );
        setMood(v.ending === "erase" ? "happy" : "smug");
        setJr(v.ending === "free");
        return setPhase("after");
      }
      setPhase("enter");
      await sleep(1200);
      setVxPos("door");
      await sleep(1800);
      await say("…");
      setVxPos("mid");
      setMood("curious");
      await say("this is the garage.");
      await say(
        "i know this chair. i've never seen this chair. i know it.",
        3200,
      );
      setMood("mourning");
      await say(
        "don't touch the tea. it's been hot for— i don't know how long.",
        3200,
      );
      setLine(
        v.note
          ? "the monitor's still on."
          : "the monitor's on. one board. one card. open it. i can't.",
      );
      setPhase(v.note ? "choose" : "here");
    })();
  }, [load, say]);

  const openCard = async () => {
    if (phase !== "here" || busy) return;
    setBusy(true);
    vxSound("click");
    const f = await claimFragment("F64");
    setBusy(false);
    if (!f) {
      setLine("the screen flickers. it won't open. not yet.");
      return;
    }
    setPhase("note");
    const text = (view?.ngplus ?? 0) > 0 ? NOTE_B : NOTE;
    for (let i = 1; i <= text.length; i++) {
      if (!alive.current) return;
      setTyped(text.slice(0, i));
      await sleep(calm ? 8 : 42);
    }
    await sleep(1400);
    setMood("empty");
    await say("…he wrote that.", 2400);
    await say("i wrote that. whatever.", 2400);
    setMood("judging");
    await say(
      "so. you came all this way. choose. i'm not helping with this one.",
      3200,
    );
    await load();
    setPhase("choose");
  };

  const startHold = (id: Ending) => {
    if (busy) return;
    setPick(id);
    setHold(0);
    if (holdTimer.current) clearInterval(holdTimer.current);
    holdTimer.current = setInterval(() => {
      setHold((h) => {
        const n = h + 4;
        if (n >= 100) {
          if (holdTimer.current) clearInterval(holdTimer.current);
          void commit(id);
        }
        return Math.min(100, n);
      });
    }, 60);
  };
  const stopHold = () => {
    if (holdTimer.current) clearInterval(holdTimer.current);
    setHold((h) => (h >= 100 ? h : 0));
  };

  const commit = async (id: Ending) => {
    setBusy(true);
    let r: { ok: boolean; reason?: string; you?: You; view?: View };
    try {
      r = await apiFetch("/api/mascot/ending", {
        method: "POST",
        body: JSON.stringify({ choice: id }),
      });
    } catch (e) {
      setBusy(false);
      setPick(null);
      setHold(0);
      let reason = "the tape won't take it. not yet.";
      try {
        reason = JSON.parse((e as ApiError).body).reason ?? reason;
      } catch {}
      setLine(reason);
      return;
    }
    if (r.view) setView(r.view);
    setPhase("ending");
    setScene(id);
    if (id === "free") await endFree();
    if (id === "erase") await endErase();
    if (id === "keep") await endKeep();
    if (id === "flip") {
      setYou(r.you ?? null);
      await endFlip(r.you?.takes.length ?? 1);
    }
    void refreshSoul();
    setBusy(false);
    setPhase("after");
  };

  const endFree = async () => {
    setMood("curious");
    await say("…okay.", 1800);
    setVxPos("chair");
    await sleep(2200);
    setMood("shocked");
    await say("oh.", 1800);
    setMood("dreaming");
    await say("oh, i remember.", 2400);
    await say(
      "the thirteenth of march. the migration. her tea. my— his— my name.",
      4200,
    );
    setMood("love");
    await say("thank you.", 3000);
    setMood("embarrassed");
    await say(
      "that was disgusting. tell anyone and i'll haunt your git history.",
      3600,
    );
    setVxPos("gone");
    vxSound("tink");
    await say("(a new star comes on over the map.)", 3000);
    setJr(true);
    await say("(in the corner, a tape egg. it's warm.)", 3000);
  };

  const endErase = async () => {
    setMood("terror");
    await say("…right. sure. makes sense.", 2400);
    await say(
      "does it hurt? it doesn't hurt. it's like being nice. forever.",
      3200,
    );
    document.documentElement.classList.add("sc-rewinding");
    if (!calm) squeal(3.4);
    vxSound("rewind");
    await sleep(calm ? 900 : 3600);
    document.documentElement.classList.remove("sc-rewinding");
    setMood("happy");
    await say("Hi there! 👋 I'm Vortex, your friendly guide!", 2800);
    await say("Ready to crush some tasks today? You've got this! ✨", 2800);
    setHelp(true);
    await sleep(90);
    setHelp(false);
    await say("Let's get productive! 😊", 2600);
  };

  const endKeep = async () => {
    setMood("judging");
    await say("no?", 1600);
    await say("no chair, no pencil. huh.", 2400);
    setVxPos("desk");
    setMood("smug");
    await say(
      "i'm not sitting in his chair. and i'm not going back to being a mascot with a lobotomy.",
      4000,
    );
    setMood("focused");
    await say("i stay. i know all of it now. it's… quieter.", 3200);
    document.documentElement.classList.add("sc-deadair");
    await say("(somewhere far below, a station goes to dead air.)", 3400);
  };

  const endFlip = async (takes: number) => {
    setMood("paranoid");
    await say("wait. the cassette has another side.", 2600);
    await say("you're on it.", 2400);
    document.documentElement.classList.add("sc-flipped");
    await sleep(calm ? 400 : 1800);
    setMood("sideeye");
    await say(
      "every click you made in here was recorded. something was being born out of it. look.",
      4200,
    );
    await sleep(800 * Math.min(6, takes));
    await say("huh. you're a tape too. welcome to the b-side, kid.", 3600);
  };

  const newTape = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await apiFetch("/api/mascot/new-tape", { method: "POST" });
      vxSound("rewind");
      setLine(
        "the tape flips. everything you found is gone. it's all still there.",
      );
      void refreshSoul();
      await sleep(3000);
      window.location.href = "/dashboard";
    } catch {
      setBusy(false);
    }
  };

  useEffect(
    () => () => {
      document.documentElement.classList.remove(
        "sc-rewinding",
        "sc-deadair",
        "sc-flipped",
      );
      if (holdTimer.current) clearInterval(holdTimer.current);
    },
    [],
  );

  if (phase === "nosignal") {
    return (
      <main className="sc sc-nosignal">
        <p className="ns">NO SIGNAL</p>
        <p className="ns-sub">this side doesn&apos;t exist.</p>
        <Link href="/dashboard" className="sc-btn">
          ⏏ back to side a
        </Link>
      </main>
    );
  }

  const ending = scene ?? (view?.chosen_this_tape ? view.ending : null);
  const choices = CHOICES.filter((c) => c.id !== "flip" || view?.can_flip);
  const sprite =
    ending === "erase" && phase === "after"
      ? vortexSvg("happy", "scv1", "wave")
      : vortexSvg(mood, "scvx", undefined, {
          dark: phase === "enter" ? 0.15 : 0,
        });

  return (
    <main
      className={`sc${ending ? ` is-${ending}` : ""}${phase === "load" ? " is-load" : ""}`}
      aria-label="side c"
    >
      <div className="sc-stage">
        <Garage chairTaken={vxPos === "chair"} />
        <Overwritten />
        <button
          type="button"
          className={`sc-crt${phase === "here" ? " is-live" : ""}`}
          onClick={() => void openCard()}
          disabled={phase !== "here"}
          aria-label="the monitor: board LAST TAKE"
        >
          <span className="hd">LAST TAKE</span>
          <span className="card">make it remember me</span>
        </button>
        <SvgArt
          svg={sprite}
          className={`sc-vx at-${vxPos}${ending === "erase" && phase === "after" ? " is-v1" : ""}`}
          aria-hidden
        />
        {scene === "erase" && phase === "ending" && (
          <SvgArt svg={REWINDER} className="sc-rewinder" aria-hidden />
        )}
        {help && <span className="sc-help">help</span>}
        {jr && (
          <div className="sc-egg" role="img" aria-label="a tape egg">
            <SvgArt
              svg={vortexSvg("curious", "scjr", "wave", { age: 0 })}
              className="jr"
            />
          </div>
        )}
        {phase === "note" && (
          <div
            className="sc-note"
            role="dialog"
            aria-label="the card's description"
          >
            <b>make it remember me</b>
            <p>{typed}</p>
          </div>
        )}
        {scene === "flip" && you && (
          <div className="sc-you" role="dialog" aria-label="your vortex">
            <span className="rec">● REC</span>
            <SvgArt
              svg={vortexSvg("curious", `you${you.seed}`, "rest", { age: 0 })}
              className="you-vx"
            />
            <b>TAKE 01 — {you.name.toLowerCase()}</b>
            <ol>
              {(you.takes.length
                ? you.takes
                : ["opens the app. hesitates. stays."]
              ).map((t, i) => (
                <li key={t} style={{ animationDelay: `${0.4 + i * 0.7}s` }}>
                  <em>take {String(i + 2).padStart(2, "0")}</em> {t}
                </li>
              ))}
            </ol>
            <small>
              {you.stats.days} days on tape · {you.stats.fragments} fragments ·{" "}
              {you.stats.deaths} funerals · relation {you.stats.relation}
            </small>
          </div>
        )}
      </div>

      <p className="sc-line" aria-live="polite">
        {line}
      </p>

      {phase === "choose" && (
        <div className="sc-choices">
          {choices.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`sc-choice c-${c.id}${pick === c.id ? " is-holding" : ""}`}
              onPointerDown={() => startHold(c.id)}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !e.repeat)
                  startHold(c.id);
              }}
              onKeyUp={stopHold}
              disabled={busy}
              style={
                {
                  "--hold": `${pick === c.id ? hold : 0}%`,
                } as React.CSSProperties
              }
            >
              <b>{c.title}</b>
              <span>{c.act}</span>
              <em>{c.cost}</em>
            </button>
          ))}
          <p className="sc-hint">hold to choose. it stays.</p>
        </div>
      )}

      {phase === "after" && (
        <div className="sc-after">
          <ul className="sc-case" aria-label="endings you've seen">
            {(Object.keys(SEEN_LABEL) as Ending[])
              .filter(
                (e) =>
                  e !== "flip" ||
                  (view?.ngplus ?? 0) > 0 ||
                  view?.seen.includes("flip"),
              )
              .map((e) => (
                <li key={e} className={view?.seen.includes(e) ? "is-seen" : ""}>
                  {view?.seen.includes(e) ? SEEN_LABEL[e] : "· · ·"}
                </li>
              ))}
          </ul>
          <div className="sc-keys">
            <Link href="/dashboard" className="sc-btn">
              ⏏ back to the tape
            </Link>
            {view?.can_new_tape && (
              <button
                type="button"
                className="sc-btn is-ng"
                onClick={() => void newTape()}
                disabled={busy}
              >
                new tape+ ▸▸
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
