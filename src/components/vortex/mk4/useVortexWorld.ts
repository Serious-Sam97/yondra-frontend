"use client";

// Vortex MK-IV: the hundred new things. This hook owns the triggers (board
// events, the user's habits, the clock, teammates over the presence channel)
// and decides which reaction to run; the component hands it a small API to
// move/talk/pose him. Rules carried over from MK-I…III: visual only, never a
// data change he didn't get a confirmation for, nothing while you drag, type
// or sit in a modal (isBusy), everything undoes itself, reduced motion honoured.

import { useCallback, useEffect, useRef } from "react";
import { drawTarot, fortune, toMorse } from "@/components/vortex/mk4/chat";
import {
  candle,
  countdownTag,
  crows,
  echo,
  fakeLoading,
  flickerHeader,
  flipEmoji,
  fogRacks,
  glitter,
  handUnder,
  inkDrip,
  keyboardGhost,
  letterSwap,
  logWhisper,
  onScreen,
  ouija,
  type Pt,
  pageBreath,
  paperPlane,
  popText,
  puddle,
  reflection,
  ribbonCut,
  shyButton,
  sleepyAvatar,
  stickerPeel,
  streamers,
  sweat,
  tinyCrowd,
  tug,
  vuBackwards,
  wobblyScrollbar,
} from "@/components/vortex/mk4/effects";
import {
  goldenSpine,
  hidingSpot,
  roulette,
  tapeOfTheMonth,
  tarotCard,
  whackAGhost,
} from "@/components/vortex/mk4/games";
import {
  ACHIEVEMENTS,
  bumpStreak,
  currentCostume,
  getProgress,
  isBirthday,
  lateNightRun,
  recordSession,
  unlock,
  unlockCostume,
  updateProgress,
} from "@/components/vortex/mk4/progress";
import { tapeConfetti } from "@/components/vortex/vortexEffects";
import { radioInterference } from "@/components/vortex/vortexPranks";
import { vxSound } from "@/components/vortex/vortexSound";
import {
  fetchBoard,
  fetchDashboard,
  fetchVortexImpressions,
  fetchVortexNotes,
  sendVortexNote,
} from "@/lib/api";
import type { VortexIntensity, VortexSpeech } from "@/lib/vortex";
import type { VortexMood, VortexPose } from "@/lib/vortexArt";
import { subscribeVortex } from "@/lib/vortexBus";

export type VortexProp =
  | null
  | "juggle"
  | "alarm"
  | "fan"
  | "tea"
  | "stress"
  | "tomato"
  | "rewind"
  | "morph-cassette"
  | "morph-knob";

type Whisper =
  | { k: "done" }
  | { k: "drag" }
  | { k: "prank"; name: string }
  | { k: "mood"; mood: string }
  | { k: "wave" };

interface PresenceLike {
  whisper: (event: string, data: Record<string, unknown>) => unknown;
  listenForWhisper: (event: string, cb: (d: unknown) => void) => unknown;
  stopListeningForWhisper?: (
    event: string,
    cb?: (d: unknown) => void,
  ) => unknown;
}

export interface VortexWorldApi {
  active: boolean;
  mischief: boolean;
  pranksOn: boolean;
  intensity: VortexIntensity;
  hour: number;
  pathname: string;
  user: { id: number; name: string; created_at?: string | null } | null;
  visitors: { id: number; name: string }[];
  sprite: React.RefObject<HTMLDivElement | null>;
  speak: (s: VortexSpeech & { mirror?: boolean }) => void;
  setMood: (m: VortexMood) => void;
  restMood: () => VortexMood;
  setPose: (p: VortexPose | undefined) => void;
  setFlip: (f: boolean) => void;
  setProp: (p: VortexProp) => void;
  travel: (center: Pt) => Promise<void>;
  goHome: () => Promise<void>;
  isBusy: () => boolean;
  enqueue: (
    kind: string,
    cooldown: number,
    act: () => Promise<void> | undefined,
  ) => void;
  lookAt: (pt: Pt, ms?: number) => void;
  lastActivity: React.RefObject<number>;
  openCard: (boardId: number, cardId: string) => void;
  tinySvg: string;
  evilSvg: string;
  spriteSize: number;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function boardIdOf(path: string): number | null {
  const m = /^\/boards\/(\d+)/.exec(path);
  return m ? Number(m[1]) : null;
}

export function useVortexWorld(api: VortexWorldApi) {
  const a = useRef(api);
  a.current = api;
  const seen = useRef(new Set<string>()); // once-per-session flags
  const once = (k: string) => {
    if (seen.current.has(k)) return false;
    seen.current.add(k);
    return true;
  };
  const daily = (k: string) => {
    const key = `yd:vortex.d.${k}`;
    try {
      if (localStorage.getItem(key) === new Date().toDateString()) return false;
      localStorage.setItem(key, new Date().toDateString());
      return true;
    } catch {
      return once(k);
    }
  };
  const center = (): Pt => {
    const r = a.current.sprite.current?.getBoundingClientRect();
    return r
      ? { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      : { x: 80, y: window.innerHeight - 120 };
  };
  const flash = (cls: string, ms = 1500) => {
    const s = a.current.sprite.current;
    if (!s) return;
    s.classList.add(cls);
    setTimeout(() => s.classList.remove(cls), ms);
  };
  const beside = (el: Element): Pt => {
    const r = el.getBoundingClientRect();
    const room = window.innerWidth - r.right > a.current.spriteSize + 20;
    a.current.setFlip(!room);
    return {
      x: room
        ? r.right + a.current.spriteSize / 2 - 14
        : r.left - a.current.spriteSize / 2 + 14,
      y: r.top + Math.min(r.height / 2, 90),
    };
  };
  const celebrate = useCallback((id: string) => {
    const label = unlock(id);
    if (label) {
      vxSound("rewind");
      a.current.speak({
        text: `achievement unlocked: ${label}. ${ACHIEVEMENTS[id].hint}.`,
      });
    }
  }, []);

  /* ───────────────────── 13–26 · reacting to the board ───────────────── */
  const renames = useRef(new Map<string, number>());
  const presence = useRef<PresenceLike | null>(null);
  const myLastDone = useRef(0);
  const theirLastDone = useRef<Record<number, number>>({});
  const myLastDrag = useRef(0);
  const theirLastDrag = useRef(0);
  const firstDragDay = useRef<string | null>(null);
  const pendingCandle = useRef<DOMRect | null>(null);

  const whisper = (w: Whisper) => {
    try {
      presence.current?.whisper("vx", {
        ...(w as Record<string, unknown>),
        from: a.current.user?.id ?? 0,
      });
    } catch {
      // not connected
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: reads the api ref
  useEffect(() => {
    if (!api.active) return;
    return subscribeVortex((e) => {
      const A = a.current;
      const card = (id: string | number) =>
        document.querySelector<HTMLElement>(
          `.mt-jx[data-card-id="${CSS.escape(String(id))}"]`,
        );

      if (e.type === "card.opened") {
        // 1 · sneeze at a tag-heavy card
        if ((e.tags ?? 0) >= 4)
          A.enqueue("sneeze", 3 * 60_000, async () => {
            glitter(center());
            popText(center(), "achoo!");
            flash("vxa-sneeze", 700);
          });
      } else if (e.type === "card.edited") {
        if (e.assigneeChanged)
          A.enqueue("drama", 60_000, async () =>
            A.speak({ text: "ooh, drama. new owner." }),
          );
        if (e.priorityUp)
          A.enqueue("salute", 60_000, async () => {
            flash("vxa-salute", 1600);
            A.speak({ text: "priority raised. *salutes*" });
          });
        if (e.tagsAdded)
          A.enqueue("sniff", 60_000, async () => {
            flash("vxa-sniff", 1400);
            popText(center(), "*sniff sniff*");
          });
        if (e.checklistDone)
          A.enqueue("checklist", 30_000, async () => {
            flash("vxa-check", 1600);
            A.speak({
              text: "every box ticked. I crossed them off too. in the air.",
            });
          });
        if (e.longDescription)
          A.enqueue("novel", 60_000, async () =>
            A.speak({ text: "a novel. bold." }),
          );
        if (e.renamed) {
          const k = String(e.cardId);
          const n = (renames.current.get(k) ?? 0) + 1;
          renames.current.set(k, n);
          if (n >= 3)
            A.enqueue("renamed", 120_000, async () =>
              A.speak({
                text: `renamed ${n} times. naming is hard. try "final_final_v3".`,
              }),
            );
        }
      } else if (e.type === "card.unjammed") {
        // 24 · ribbon cutting
        A.enqueue("ribbon", 20_000, async () => {
          const c = card(e.cardId);
          if (c && onScreen(c)) {
            await A.travel(beside(c));
            ribbonCut(c);
          }
          A.speak({ text: "*snip* — jam cleared. I declare this card open." });
          const n = updateProgress((p) => ({
            ...p,
            jamsCleared: p.jamsCleared + 1,
          })).jamsCleared;
          if (n >= 3) celebrate("jam-breaker");
          await wait(3000);
          await A.goHome();
        });
      } else if (e.type === "card.archived") {
        // 72 · a candle where it sat (after the confirm modal closes)
        if (e.rect && A.mischief) {
          pendingCandle.current = new DOMRect(
            e.rect.left,
            e.rect.top,
            e.rect.width,
            e.rect.height,
          );
          A.enqueue("candle", 0, async () => {
            if (pendingCandle.current) candle(pendingCandle.current);
            pendingCandle.current = null;
            A.setMood("mourning");
            A.speak({ text: "rest well, little tape." });
            await wait(3500);
            A.setMood(A.restMood());
          });
        }
      } else if (e.type === "drag.start") {
        // 22 · first card of the day gets a drumroll
        const today = new Date().toDateString();
        if (firstDragDay.current !== today && daily("drumroll")) {
          firstDragDay.current = today;
          flash("vxa-drumroll", 1800);
          popText(center(), "ba-dum… tss");
          vxSound("click");
        }
        // 99 · race a teammate who is dragging too
        myLastDrag.current = Date.now();
        whisper({ k: "drag" });
        if (Date.now() - theirLastDrag.current < 2500) race();
      } else if (e.type === "card.moved") {
        const from =
          e.fromSectionId != null
            ? document.querySelector<HTMLElement>(
                `[data-vx-rack="${e.fromSectionId}"]`,
              )
            : null;
        // 25 · back from the dead
        if (from?.dataset.vxDone)
          A.enqueue("undead", 60_000, async () => {
            A.setMood("possessed");
            A.speak({ text: "*gasp* — it's back from the dead." });
            await wait(2200);
            A.setMood(A.restMood());
          });
        // 23 · WIP back under the limit
        setTimeout(() => {
          if (
            from?.dataset.vxLimit &&
            Number(from.dataset.vxCount) === Number(from.dataset.vxLimit)
          )
            A.enqueue("bow", 60_000, async () => {
              flash("vxa-bow", 1600);
              A.speak({ text: "back under the limit. *bows*" });
            });
          // 11 · wink when a column just emptied out on a finish
          if (e.done && from && Number(from.dataset.vxCount) === 0)
            A.enqueue("wink", 60_000, async () => {
              flash("vxa-wink", 1200);
              A.speak({ text: "last one out. *wink*" });
            });
        }, 450);
        if (e.done) {
          // 86 · daily streak, 93 · high-five
          const n = bumpStreak();
          if (n >= 7) celebrate("streak7");
          if (n >= 2 && daily("streak"))
            A.enqueue("streak", 0, async () =>
              A.speak({
                text: `${n} days in a row with a finished card. the tape counter likes you.`,
              }),
            );
          myLastDone.current = Date.now();
          whisper({ k: "done" });
          const friend = Object.entries(theirLastDone.current).find(
            ([, t]) => Date.now() - t < 60_000,
          );
          if (friend) highFive(Number(friend[0]));
        }
      }
    });
  }, [api.active, celebrate]);

  /* board scan: echo, alarm, tug, sweat, shiver, fog, notes, impression,
     crows, golden spine, tape of the month — one thing at a time */
  // biome-ignore lint/correctness/useExhaustiveDependencies: reads the api ref
  useEffect(() => {
    const boardId = boardIdOf(api.pathname);
    if (!api.active || boardId == null) return;
    const A = () => a.current;
    let fogOff: (() => void) | null = null;
    let crowsOff: (() => void) | null = null;

    // 96 · notes left for me, 98 · the impression (once per board per session)
    const t0 = setTimeout(async () => {
      try {
        const notes = await fetchVortexNotes(boardId);
        for (const n of notes)
          A().enqueue(`note${n.id}`, 0, async () => {
            A().setMood("curious");
            A().speak({
              text: `a note from ${n.from ?? "someone"}, via me: "${n.body}"`,
              ms: 14_000,
            });
            await wait(9000);
          });
      } catch {
        // no notes service
      }
      if (A().mischief && once(`imp${boardId}`)) {
        try {
          const imps = await fetchVortexImpressions(boardId);
          const imp = imps[Math.floor(Math.random() * imps.length)];
          const who = imp?.name?.split(" ")[0];
          if (imp && who)
            setTimeout(
              () =>
                A().enqueue("impression", 0, async () =>
                  A().speak({
                    text: `*clears throat* "${imp.phrase}." — ${who}, every time.`,
                  }),
                ),
              60_000,
            );
        } catch {
          // fine
        }
      }
    }, 5000);

    const scan = () => {
      const X = A();
      if (X.isBusy()) return;
      if (X.mischief) {
        fogOff?.();
        fogOff = fogRacks(30);
      }
      // 80 · crows on the Done shelf at night
      const night = X.hour >= 21 || X.hour < 5;
      if (night && X.mischief && !crowsOff) crowsOff = crows();
      if (!night && crowsOff) {
        crowsOff();
        crowsOff = null;
      }
      const racks = Array.from(
        document.querySelectorAll<HTMLElement>("[data-vx-rack]"),
      ).filter(onScreen);
      const cards = Array.from(
        document.querySelectorAll<HTMLElement>(".mt-jx[data-vx-touched]"),
      );
      // 3 · shiver on a board nobody touched for a week
      if (
        cards.length &&
        cards.every((c) => Number(c.dataset.vxTouched) >= 7) &&
        once(`shiver${boardId}`)
      ) {
        X.enqueue("shiver", 0, async () => {
          flash("vxa-shiver", 2600);
          X.speak({
            text: "brr. nobody's touched this board in a week. it's cold in here.",
          });
        });
        return;
      }
      // 13 · echo into an empty column
      const empty = racks.find(
        (r) => r.dataset.vxCount === "0" && !r.dataset.vxDone,
      );
      if (empty && X.mischief && once(`echo${empty.dataset.vxRack}`)) {
        X.enqueue("echo", 5 * 60_000, async () => {
          await X.travel(beside(empty));
          X.setPose("wave");
          echo(empty);
          await wait(2200);
          X.setPose(undefined);
          await X.goHome();
        });
        return;
      }
      // 14 · alarm clock for cards due today
      const today = cards.find((c) => c.dataset.vxDueToday && onScreen(c));
      if (today && once(`alarm${today.dataset.cardId}`)) {
        X.enqueue("alarm", 3 * 60_000, async () => {
          await X.travel(beside(today));
          X.setProp("alarm");
          vxSound("tink");
          X.speak({
            text: `${today.dataset.vxKey ?? "this one"} is due today. *rrring*`,
          });
          await wait(3800);
          X.setProp(null);
          await X.goHome();
        });
        return;
      }
      // 15 · tug-of-war with a card stuck in review
      const stuck = cards.find((c) => {
        const rack = c.closest<HTMLElement>("[data-vx-rack]");
        const nm = rack?.querySelector(".mt-rack-t .nm")?.textContent ?? "";
        return (
          /review|qa|approval/i.test(nm) &&
          Number(c.dataset.vxInsection) >= 3 &&
          onScreen(c)
        );
      });
      if (stuck && X.mischief && once(`tug${stuck.dataset.cardId}`)) {
        X.enqueue("tug", 5 * 60_000, async () => {
          await X.travel(beside(stuck));
          X.setPose("grab");
          tug(stuck);
          X.speak({
            text: `${stuck.dataset.vxInsection} days in review. I'm pulling. it won't budge.`,
          });
          await wait(2600);
          X.setPose(undefined);
          await X.goHome();
        });
        return;
      }
      // 18 · an overflowing column makes him sweat
      const big = racks.find(
        (r) => Number(r.dataset.vxCount) > 12 && !r.dataset.vxDone,
      );
      if (big && once(`sweat${big.dataset.vxRack}`)) {
        X.enqueue("sweat", 5 * 60_000, async () => {
          await X.travel(beside(big));
          X.setProp("fan");
          sweat(big);
          X.speak({
            text: `${big.dataset.vxCount} cards in one column. it's getting hot in here.`,
          });
          await wait(3500);
          X.setProp(null);
          await X.goHome();
        });
        return;
      }
      // 88 · a golden spine, now and then
      if (X.mischief && Math.random() < 0.08 && once(`gold${boardId}`)) {
        goldenSpine((at) => {
          tapeConfetti(at, 30, ["#ffd36a", "#ffb000", "#fff3c4"]);
          vxSound("rewind");
          a.current.speak({
            text: "a golden tape! I've only ever seen one before. it was also you.",
          });
        });
      }
      // 89 · tape of the month, on the 1st
      if (
        new Date().getDate() === 1 &&
        X.mischief &&
        daily(`tapeofmonth${boardId}`)
      ) {
        const best = tapeOfTheMonth();
        if (best)
          X.enqueue("tapeofmonth", 0, async () => {
            X.setMood("happy");
            X.speak({
              text: `this month's award for the longest journey goes to ${best.key}: ${best.days} days from idea to done. *applause*`,
            });
            await wait(4000);
            X.setMood(X.restMood());
          });
      }
    };
    const t1 = setTimeout(scan, 9000);
    const iv = setInterval(scan, 40_000);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearInterval(iv);
      fogOff?.();
      crowsOff?.();
    };
  }, [api.active, api.pathname, api.mischief]);

  /* 26 · last hour of a sprint: a countdown in his eyes; 90 · sprint tarot */
  // biome-ignore lint/correctness/useExhaustiveDependencies: reads the api ref
  useEffect(() => {
    if (!api.active) return;
    let iv: ReturnType<typeof setInterval> | null = null;
    const t = setTimeout(async () => {
      try {
        const sp = (await fetchDashboard()).sprint;
        if (!sp) return;
        if (
          sp.days_elapsed === 0 &&
          a.current.mischief &&
          daily(`tarot-${sp.name}`)
        ) {
          a.current.enqueue("tarot", 0, async () => {
            const card = drawTarot();
            a.current.speak({
              text: `a new sprint. I drew a card for "${sp.name}".`,
            });
            await new Promise<void>((res) => tarotCard(card, res));
          });
        }
        if (sp.days_left === 0) {
          const tick = () => {
            const now = new Date();
            if (now.getHours() !== 23 || a.current.isBusy()) return;
            const left = 60 - now.getMinutes();
            const c = center();
            countdownTag(
              { x: c.x, y: c.y - 70 },
              `${String(left).padStart(2, "0")}:00 left in ${sp.name}`,
            );
            flash("vxa-countdown-eyes", 2500);
          };
          tick();
          iv = setInterval(tick, 5 * 60_000);
        }
      } catch {
        // no sprint info
      }
    }, 20_000);
    return () => {
      clearTimeout(t);
      if (iv) clearInterval(iv);
    };
  }, [api.active]);

  /* ───────────────────── 27–40 · the user ─────────────────────────────── */
  // biome-ignore lint/correctness/useExhaustiveDependencies: reads the api ref
  useEffect(() => {
    if (!api.active) return;
    const A = () => a.current;
    // 30 · back-to-back sessions, 31 · late-night streak, 32 · weekend, 37 · birthday
    const { minutesSinceLast } = recordSession();
    const t = setTimeout(() => {
      const X = A();
      if (
        minutesSinceLast != null &&
        minutesSinceLast > 1 &&
        minutesSinceLast < 60 &&
        once("clingy")
      )
        X.enqueue("clingy", 0, async () =>
          X.speak({
            text: `you again. ${minutesSinceLast} minutes later. clingy.`,
          }),
        );
      if (lateNightRun() >= 3) {
        celebrate("night-owl");
        if (daily("tea"))
          X.enqueue("tea", 0, async () => {
            X.setProp("tea");
            X.speak({
              text: "third night in a row. I made you tea. it's imaginary. drink it anyway.",
            });
            await wait(6000);
            X.setProp(null);
          });
      }
      const day = new Date().getDay();
      if ((day === 0 || day === 6) && daily("weekend"))
        X.enqueue("weekend", 0, async () =>
          X.speak({
            text:
              currentCostume(X.user?.created_at) === "sunglasses"
                ? "it's the weekend. I'm wearing sunglasses. I'm not working. you shouldn't either."
                : "it's the weekend. I'm not working. you shouldn't either.",
          }),
        );
      if (isBirthday() && daily("birthday"))
        X.enqueue("birthday", 0, async () => {
          streamers();
          X.setMood("happy");
          X.speak({
            text: "🎂 happy birthday to youuu, happy birthday to— ok I can't sing. happy birthday.",
            ms: 12_000,
          });
          await wait(6000);
          X.setMood(X.restMood());
        });
      if (
        new Date().getMonth() === 9 &&
        new Date().getDate() === 31 &&
        daily("halloween")
      )
        X.speak({
          text: "happy halloween. everything is a little more haunted today. you're welcome.",
        });
      if (
        new Date().getDay() === 5 &&
        new Date().getDate() === 13 &&
        daily("bloodmoon")
      )
        X.speak({
          text: "friday the 13th. the tuner is bleeding. don't look at it.",
        });
    }, 14_000);

    // 27 · typing fast (foot tap), 29 · undo spam, 33 · rage clicks, 34 · copy,
    // 35 · zoom, 36 · narrow window, 38 · staring at him, 39 · focus, 40 · leaving
    let keys: number[] = [];
    let undos: number[] = [];
    let clicks: { x: number; y: number; t: number }[] = [];
    const onKey = (e: KeyboardEvent) => {
      const now = Date.now();
      const tEl = e.target as HTMLElement | null;
      if (
        tEl &&
        (tEl.isContentEditable || /^(INPUT|TEXTAREA)$/.test(tEl.tagName))
      ) {
        keys = [...keys.filter((k) => now - k < 2000), now];
        if (keys.length > 14) flash("vxa-foottap", 1200);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        undos = [...undos.filter((u) => now - u < 2500), now];
        if (undos.length >= 4) {
          undos = [];
          A().enqueue("undo", 2 * 60_000, async () => {
            A().setProp("rewind");
            vxSound("rewind");
            A().speak({ text: "rewinding with you. rewind. rewind. rewind." });
            await wait(2800);
            A().setProp(null);
          });
        }
      }
    };
    const onClick = (e: MouseEvent) => {
      const now = Date.now();
      clicks = [
        ...clicks.filter(
          (c) =>
            now - c.t < 1200 &&
            Math.hypot(c.x - e.clientX, c.y - e.clientY) < 30,
        ),
        { x: e.clientX, y: e.clientY, t: now },
      ];
      if (clicks.length >= 6) {
        clicks = [];
        A().enqueue("stress", 3 * 60_000, async () => {
          A().setProp("stress");
          A().speak({ text: "whoa. here, squeeze this instead." });
          await wait(9000);
          A().setProp(null);
        });
      }
    };
    const onCopy = () => {
      // page text, or the selected part of a focused input/textarea (the
      // card editor) — getSelection() doesn't see inside form fields
      let sel = String(window.getSelection() ?? "");
      const f = document.activeElement as HTMLInputElement | null;
      if (!sel && f && typeof f.selectionStart === "number")
        sel = f.value.slice(
          f.selectionStart,
          f.selectionEnd ?? f.selectionStart,
        );
      if (sel.length > 20 && A().mischief)
        A().enqueue("copy", 3 * 60_000, async () =>
          A().speak({ text: "plagiarism detected. I'm telling." }),
        );
    };
    let dpr = window.devicePixelRatio;
    let narrow = window.innerWidth < 900;
    const onResize = () => {
      if (window.devicePixelRatio !== dpr) {
        const zoomIn = window.devicePixelRatio > dpr;
        dpr = window.devicePixelRatio;
        A().enqueue("zoom", 60_000, async () => {
          flash(zoomIn ? "vxa-zoomin" : "vxa-zoomout", 900);
          A().speak({
            text: zoomIn
              ? "too close. personal space."
              : "where'd everybody go?",
          });
        });
      }
      const nowNarrow = window.innerWidth < 900;
      if (nowNarrow && !narrow)
        A().enqueue("squish", 60_000, async () => {
          flash("vxa-squish", 1400);
          A().speak({ text: "hey. I'm being squished." });
        });
      narrow = nowNarrow;
    };
    const onLeave = (e: MouseEvent) => {
      if (e.relatedTarget == null && e.clientY <= 2 && !A().isBusy())
        A().enqueue("bye", 5 * 60_000, async () => {
          A().setPose("wave");
          A().speak({ text: "leaving? bye. I'll guard the tapes." });
          await wait(2500);
          A().setPose(undefined);
        });
    };
    // 39 · 25 straight minutes of activity → tomato break
    let streakMin = 0;
    const focusIv = setInterval(() => {
      const active = Date.now() - A().lastActivity.current < 60_000;
      streakMin = active ? streakMin + 1 : 0;
      if (streakMin >= 25) {
        streakMin = 0;
        A().enqueue("tomato", 0, async () => {
          A().setProp("tomato");
          A().speak({ text: "25 minutes straight. here's a tomato. break?" });
          await wait(7000);
          A().setProp(null);
        });
      }
    }, 60_000);
    window.addEventListener("keydown", onKey, { passive: true });
    window.addEventListener("click", onClick, { passive: true, capture: true });
    document.addEventListener("copy", onCopy);
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("mouseout", onLeave);
    return () => {
      clearTimeout(t);
      clearInterval(focusIv);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("copy", onCopy);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("mouseout", onLeave);
    };
  }, [api.active, celebrate]);

  /* 8 · head pat, 38 · staring at him */
  // biome-ignore lint/correctness/useExhaustiveDependencies: reads the api ref
  useEffect(() => {
    if (!api.active) return;
    let overSince = 0;
    let patDist = 0;
    let last: Pt | null = null;
    let staredAt = 0;
    const onMove = (e: PointerEvent) => {
      const s = a.current.sprite.current?.getBoundingClientRect();
      if (!s) return;
      const inside =
        e.clientX > s.left + 20 &&
        e.clientX < s.right - 20 &&
        e.clientY > s.top + 15 &&
        e.clientY < s.bottom - 25;
      const now = Date.now();
      if (!inside) {
        overSince = 0;
        patDist = 0;
        last = null;
        return;
      }
      if (!overSince) overSince = now;
      if (last) {
        const d = Math.hypot(e.clientX - last.x, e.clientY - last.y);
        // slow strokes only
        if (d > 0 && d < 9) patDist += d;
      }
      last = { x: e.clientX, y: e.clientY };
      if (patDist > 260) {
        patDist = 0;
        flash("vxa-purr", 2200);
        popText({ x: s.left + s.width / 2, y: s.top }, "prrr…");
      }
    };
    const iv = setInterval(() => {
      if (
        overSince &&
        Date.now() - overSince > 10_000 &&
        Date.now() - staredAt > 120_000
      ) {
        staredAt = Date.now();
        flash("vxa-shy", 3000);
        a.current.speak({ text: "stop staring. I'm shy." });
      }
    }, 1000);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      clearInterval(iv);
    };
  }, [api.active]);

  /* body idles: 9 · juggling, 4 · melting at 3am, 5 · shadow puppet, 77 · morse */
  // biome-ignore lint/correctness/useExhaustiveDependencies: reads the api ref
  useEffect(() => {
    if (!api.active) return;
    const iv = setInterval(() => {
      const X = a.current;
      if (X.isBusy()) return;
      const idle = Date.now() - X.lastActivity.current;
      if (X.hour === 3 && idle > 60_000) {
        X.enqueue("melt", 20 * 60_000, async () => {
          flash("vxa-melt", 12_000);
          for (let i = 0; i < 24; i++) {
            await wait(500);
            if (Date.now() - X.lastActivity.current < 1000) break;
          }
          a.current.sprite.current?.classList.remove("vxa-melt");
        });
        return;
      }
      if (idle > 90_000 && Math.random() < 0.3) {
        X.enqueue("juggle", 10 * 60_000, async () => {
          X.setProp("juggle");
          await wait(6500);
          X.setProp(null);
        });
        return;
      }
      if (X.mischief && Math.random() < 0.15) flash("vxa-shadow-wave", 2600);
      if (X.mischief && Math.random() < 0.1)
        morse(["boo", "run", "hi", "help"][Math.floor(Math.random() * 4)]);
    }, 30_000);
    return () => clearInterval(iv);
  }, [api.active]);

  function morse(word: string) {
    const s = a.current.sprite.current;
    if (!s) return;
    const code = toMorse(word);
    let t = 0;
    for (const letter of code) {
      for (const sym of letter) {
        const len = sym === "." ? 180 : 520;
        setTimeout(() => s.classList.add("vxa-shut"), t);
        setTimeout(() => s.classList.remove("vxa-shut"), t + len);
        t += len + 180;
      }
      t += 400;
    }
    s.setAttribute(
      "data-morse",
      `he blinked: ${code.join(" ")} — ${word.toUpperCase()}`,
    );
    setTimeout(() => s.removeAttribute("data-morse"), t + 60_000);
  }

  /* dark calendar: 76 · blood moon, 82 · halloween */
  useEffect(() => {
    const d = new Date();
    const root = document.documentElement;
    root.classList.toggle(
      "vxa-bloodmoon",
      api.active && api.mischief && d.getDay() === 5 && d.getDate() === 13,
    );
    root.classList.toggle(
      "vxa-halloween",
      api.active && api.mischief && d.getMonth() === 9 && d.getDate() === 31,
    );
    return () => {
      root.classList.remove("vxa-bloodmoon");
      root.classList.remove("vxa-halloween");
    };
  }, [api.active, api.mischief]);

  /* ───────────────────── 41–55, 71–79 · extra head games ─────────────── */
  // biome-ignore lint/correctness/useExhaustiveDependencies: reads the api ref; helpers are stable
  const extraPranks = useCallback((): [string, () => boolean][] => {
    const X = a.current;
    const say = (t: string, ms = 1800) =>
      setTimeout(() => a.current.speak({ text: t }), ms);
    return [
      ["letters", () => letterSwap()],
      [
        "shybutton",
        () => {
          const ok = shyButton();
          if (ok) say("that button is shy. leave it alone.");
          return ok;
        },
      ],
      ["emoji", () => flipEmoji()],
      [
        "peel",
        () => {
          const ok = stickerPeel();
          if (ok) say("cheap glue.", 2400);
          return ok;
        },
      ],
      ["drip", () => inkDrip()],
      [
        "loading",
        () => {
          const ok = fakeLoading();
          say("loaded. it was nothing.", 3300);
          return ok;
        },
      ],
      ["ghostkey", () => keyboardGhost()],
      ["wobble", () => wobblyScrollbar()],
      ["sleepy", () => sleepyAvatar(X.visitors.map((v) => v.name))],
      [
        "crowd",
        () => {
          const ok = tinyCrowd(X.tinySvg);
          if (ok) say("…you didn't see that.", 2600);
          return ok;
        },
      ],
      [
        "flicker",
        () => {
          const r = flickerHeader();
          if (!r) return false;
          X.enqueue("slap", 0, async () => {
            await X.travel({
              x: Math.min(window.innerWidth - 90, r.right - 140),
              y: r.bottom + 50,
            });
            X.setPose("wave");
            popText({ x: r.right - 140, y: r.bottom }, "*slap*");
            X.speak({ text: "fixed it." });
            await wait(1500);
            X.setPose(undefined);
            await X.goHome();
          });
          return true;
        },
      ],
      ["breath", () => pageBreath()],
      ["vu", () => vuBackwards()],
      ["plane", () => paperPlane(fortune())],
      ["log", () => logWhisper()],
      ["hand", () => handUnder()],
      ["reflection", () => reflection(X.evilSvg)],
      [
        "morph",
        () => {
          const host = Array.from(
            document.querySelectorAll<HTMLElement>(
              ".hf-tuner, .mt-vu, .mt-reels, .hf-mix .vu",
            ),
          ).find(onScreen);
          if (!host) return false;
          X.enqueue("morph", 0, async () => {
            const r = host.getBoundingClientRect();
            await X.travel({
              x: r.left + r.width / 2,
              y: r.top + r.height / 2,
            });
            X.setProp(Math.random() < 0.5 ? "morph-cassette" : "morph-knob");
            await wait(3500);
            X.setProp(null);
            X.speak({ text: "you didn't notice. admit it." });
            await X.goHome();
          });
          return true;
        },
      ],
      [
        "whackoffer",
        () => {
          if (document.querySelectorAll(".mt-jx[data-vx-late]").length < 1)
            return false;
          X.speak({
            text: "ghosts are leaking out of your overdue cards. want to whack some?",
            action: { label: "Whack!", run: () => playWhack() },
            ms: 12_000,
          });
          return true;
        },
      ],
      [
        "hide",
        () => {
          void hide();
          return true;
        },
      ],
    ];
  }, []);

  /* ───────────────────── games (83–92) ───────────────────────────────── */
  const seeking = useRef(false);
  async function hide() {
    const X = a.current;
    if (seeking.current) return;
    seeking.current = true;
    X.speak({ text: "hide and seek. count to ten. no peeking." });
    await wait(2500);
    await X.travel(hidingSpot(X.spriteSize));
    flash("vxa-hiding", 60_000);
    setTimeout(() => {
      if (!seeking.current) return;
      seeking.current = false;
      a.current.sprite.current?.classList.remove("vxa-hiding");
      a.current.speak({ text: "fine. I was here the whole time." });
      void a.current.goHome();
    }, 60_000);
  }
  /** Face click while hiding = found him. Returns true when handled. */
  // biome-ignore lint/correctness/useExhaustiveDependencies: reads the api ref; helpers are stable
  const onFaceClick = useCallback((): boolean => {
    if (!seeking.current) return false;
    seeking.current = false;
    a.current.sprite.current?.classList.remove("vxa-hiding");
    flash("vxa-highfive", 1200);
    a.current.speak({ text: "you found me! high five. *slap*" });
    celebrate("seeker");
    setTimeout(() => void a.current.goHome(), 2500);
    return true;
  }, [celebrate]);

  function playWhack() {
    a.current.setMood("possessed");
    whackAGhost((score) => {
      a.current.setMood(a.current.restMood());
      a.current.speak({
        text:
          score === 0
            ? "zero ghosts. they're laughing at you."
            : `${score} ghost${score === 1 ? "" : "s"} whacked. ${score >= 10 ? "a natural." : "they'll be back."}`,
      });
      if (score >= 10) celebrate("ghost-buster");
    });
  }

  function playRps() {
    const opts = ["rock", "paper", "scissors"] as const;
    const beats: Record<string, string> = {
      rock: "scissors",
      paper: "rock",
      scissors: "paper",
    };
    a.current.speak({
      text: "rock, paper, scissors. winner picks the next card.",
      ms: 20_000,
      choices: opts.map((o) => ({
        label:
          o === "rock" ? "✊ rock" : o === "paper" ? "✋ paper" : "✌ scissors",
        run: () => {
          const mine = opts[Math.floor(Math.random() * 3)];
          const res =
            mine === o
              ? "a tie. again?"
              : beats[o] === mine
                ? "you win. pick your card, champion."
                : "I win. I pick… the oldest one. obviously.";
          setTimeout(
            () => a.current.speak({ text: `I threw ${mine}. ${res}` }),
            100,
          );
        },
      })),
    });
  }

  async function playRoulette() {
    const boardId = boardIdOf(a.current.pathname);
    let cards: { id: string; key: string; name: string }[] = [];
    if (boardId != null) {
      cards = Array.from(
        document.querySelectorAll<HTMLElement>(".mt-jx[data-card-id]"),
      )
        .filter((c) => !c.closest("[data-vx-done]"))
        .map((c) => ({
          id: c.dataset.cardId ?? "",
          key: c.dataset.vxKey ?? "",
          name: c.querySelector(".tt")?.textContent ?? "",
        }));
    } else {
      try {
        const d = await fetchDashboard();
        cards = d.deck.map((c) => ({
          id: `${c.board_id}:${c.id}`,
          key: c.ticket_key,
          name: c.name,
        }));
      } catch {
        // nothing to spin
      }
    }
    const ok = roulette(cards, (c) => {
      a.current.speak({
        text: `the wheel has spoken: ${c.key || c.name}.`,
        action: {
          label: "Open it",
          run: () => {
            if (c.id.includes(":")) {
              const [b, id] = c.id.split(":");
              a.current.openCard(Number(b), id);
            } else if (boardId != null) a.current.openCard(boardId, c.id);
          },
        },
      });
    });
    if (!ok) a.current.speak({ text: "no open cards to spin. enjoy that." });
  }

  /* ───────────────────── escape room (92) ─────────────────────────────── */
  /** Step 1 starts from a fortune; ouija says the word; the radio says the code. */
  const fortuneClue = useCallback((): string => {
    const p = getProgress();
    if (p.escape === 0) {
      updateProgress((q) => ({ ...q, escape: 1 }));
      return " psst. the way out starts below.";
    }
    return "";
  }, []);
  const onBasement = useCallback(
    (items: { key: string; when: string }[]) => {
      celebrate("archivist");
      const p = getProgress();
      setTimeout(() => {
        if (p.escape >= 1 && p.escape < 4) {
          ouija("replay");
          if (p.escape === 1) updateProgress((q) => ({ ...q, escape: 2 }));
        } else if (items.length) {
          ouija(items[items.length - 1].key.replace(/[^A-Z0-9-]/gi, ""));
        }
      }, 600);
    },
    [celebrate],
  );
  const onWord = useCallback(
    (w: string) => {
      const p = getProgress();
      if (w === "replay" && p.escape === 2) {
        updateProgress((q) => ({ ...q, escape: 3 }));
        a.current.speak({
          text: "the ghost station is broadcasting… tune in on the dashboard.",
        });
      } else if (w === "0313" && p.escape === 3) {
        updateProgress((q) => ({ ...q, escape: 4 }));
        unlockCostume("crown");
        streamers();
        a.current.speak({
          text: "you escaped the tape machine. take the crown. I'll wear it for you.",
          ms: 12_000,
        });
        celebrate("escapee");
      }
    },
    [celebrate],
  );
  // the dashboard radio carries the code once you're on step 3
  useEffect(() => {
    if (
      !api.active ||
      !api.pathname.startsWith("/dashboard") ||
      getProgress().escape !== 3
    )
      return;
    const t = setTimeout(
      () => radioInterference(6000, "VORTEX FM 66.6 · CODE 0313 · TYPE IT"),
      6000,
    );
    return () => clearTimeout(t);
  }, [api.active, api.pathname]);

  /* ───────────────────── social (93–100) ─────────────────────────────── */
  function race() {
    const v = document.querySelector<HTMLElement>(".vxa-visitor");
    if (!v) return;
    a.current.enqueue("race", 60_000, async () => {
      const r = v.getBoundingClientRect();
      const lane = window.innerHeight - 70;
      a.current.speak({ text: "race you." });
      v.animate(
        [
          { transform: "translate(0,0)" },
          { transform: `translate(${-r.left - 40}px, ${lane - r.top}px)` },
        ],
        { duration: 1800, easing: "ease-in" },
      );
      await a.current.travel({ x: window.innerWidth - 80, y: lane });
      a.current.speak({
        text:
          Math.random() < 0.5
            ? "I won. obviously."
            : "I let them win. obviously.",
      });
      await wait(1200);
      await a.current.goHome();
    });
  }
  function highFive(userId: number) {
    const name =
      a.current.visitors.find((v) => v.id === userId)?.name.split(" ")[0] ??
      "your teammate";
    a.current.enqueue("highfive", 60_000, async () => {
      flash("vxa-highfive", 1200);
      const el = document.querySelector<HTMLElement>(".vxa-visitor");
      el?.animate(
        [
          { transform: "rotate(0)" },
          { transform: "rotate(-20deg) scale(1.2)" },
          { transform: "rotate(0)" },
        ],
        { duration: 600 },
      );
      a.current.speak({
        text: `you and ${name} both shipped something within a minute. *high five*`,
      });
    });
  }
  const moods = useRef<Record<number, string>>({});
  // biome-ignore lint/correctness/useExhaustiveDependencies: reads the api ref; helpers are stable
  const onWhisper = useCallback((raw: unknown, from?: number) => {
    const w = raw as Whisper & { from?: number };
    const who = w.from ?? from ?? 0;
    const X = a.current;
    if (w.k === "done") {
      theirLastDone.current[who] = Date.now();
      if (Date.now() - myLastDone.current < 60_000) highFive(who);
    } else if (w.k === "drag") {
      theirLastDrag.current = Date.now();
      if (Date.now() - myLastDrag.current < 2500) race();
    } else if (w.k === "prank" && X.pranksOn) {
      sharedPrank.current?.(w.name);
    } else if (w.k === "mood") {
      moods.current[who] = w.mood;
      const vals = Object.values(moods.current);
      const top = vals.sort(
        (p, q) =>
          vals.filter((v) => v === q).length -
          vals.filter((v) => v === p).length,
      )[0];
      if (
        vals.length >= 2 &&
        vals.filter((v) => v === top).length >= 2 &&
        once(`team-${top}`)
      )
        X.enqueue("teammood", 0, async () => {
          X.setMood(top as VortexMood);
          X.speak({
            text: `the room feels very ${top} today. I'm catching it.`,
          });
          await wait(3500);
          X.setMood(X.restMood());
        });
    } else if (w.k === "wave") {
      flash("vxa-wave-back", 1200);
    }
  }, []);
  const sharedPrank = useRef<((name: string) => void) | null>(null);

  /** The component hands over the presence channel once joined. */
  const attachPresence = useCallback(
    (ch: PresenceLike | null) => {
      presence.current = ch;
      if (!ch) return;
      ch.listenForWhisper("vx", (d) => onWhisper(d));
    },
    [onWhisper],
  );
  /** 94 · wave at a teammate who just floated in. */
  // biome-ignore lint/correctness/useExhaustiveDependencies: reads the api ref; helpers are stable
  const onVisitorJoined = useCallback(() => {
    a.current.setPose("wave");
    flash("vxa-wave-back", 1400);
    setTimeout(() => a.current.setPose(undefined), 1600);
    whisper({ k: "wave" });
  }, []);
  /** 97 · share my mood; 95 · share a prank. */
  // biome-ignore lint/correctness/useExhaustiveDependencies: reads the api ref; helpers are stable
  const shareMood = useCallback((mood: string) => {
    whisper({ k: "mood", mood });
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reads the api ref; helpers are stable
  const sharePrank = useCallback((name: string) => {
    whisper({ k: "prank", name });
  }, []);

  /* 100 · the council (3+ on a board) */
  // biome-ignore lint/correctness/useExhaustiveDependencies: reads the api ref; helpers are stable
  useEffect(() => {
    if (!api.active || api.visitors.length < 2) return;
    const k = `council${api.pathname}`;
    if (!once(k)) return;
    const t = setTimeout(() => {
      const box = document.querySelector<HTMLElement>(".vxa-visitors");
      box?.setAttribute("data-council", "1");
      a.current.speak({
        text: "the vortex council is in session. we have voted: more coffee.",
      });
      setTimeout(() => box?.removeAttribute("data-council"), 5000);
    }, 4000);
    return () => clearTimeout(t);
  }, [api.active, api.visitors.length, api.pathname]);

  /* /note @name text */
  const leaveNote = useCallback(
    async (to: string, body: string): Promise<string> => {
      const boardId = boardIdOf(a.current.pathname);
      if (boardId == null) return "notes live on boards. open the board first.";
      try {
        const b = await fetchBoard(boardId);
        const people = [
          ...(b.owner ? [b.owner] : []),
          ...(b.shared_with ?? []),
        ];
        const q = to.replace(/^@/, "").toLowerCase();
        const target =
          people.find((u) => u.name.toLowerCase().split(" ")[0] === q) ??
          people.find((u) => u.name.toLowerCase().includes(q));
        if (!target) return `I don't know a "${to}" on this board.`;
        if (target.id === a.current.user?.id)
          return "a note to yourself? write it on your hand.";
        await sendVortexNote(boardId, target.id, body);
        return `got it. I'll haunt ${target.name.split(" ")[0]} with it next time they open this board.`;
      } catch {
        return "the note got lost in the tape. try again.";
      }
    },
    [],
  );

  /* land: 55 · sometimes leave a puddle; eaten card: 2 · hiccups */
  const onLanded = useCallback((at: Pt) => {
    if (a.current.mischief && Math.random() < 0.12)
      puddle({ x: at.x, y: at.y + a.current.spriteSize * 0.36 });
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reads the api ref; helpers are stable
  const hiccup = useCallback((key: string) => {
    let n = 0;
    const iv = setInterval(() => {
      if (++n > 3) return clearInterval(iv);
      flash("vxa-hic", 300);
      popText(center(), n === 3 ? key : "*hic*", "hic");
    }, 1400);
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reads the api ref; helpers are stable
  const compliment = useCallback(() => {
    const n = updateProgress((p) => ({
      ...p,
      compliments: p.compliments + 1,
    })).compliments;
    flash("vxa-blush", 3000);
    if (n >= 10) celebrate("sweet");
    return n;
  }, [celebrate]);

  return {
    extraPranks,
    sharedPrank,
    onFaceClick,
    attachPresence,
    onVisitorJoined,
    shareMood,
    sharePrank,
    onBasement,
    onWord,
    onLanded,
    hiccup,
    compliment,
    leaveNote,
    fortuneClue,
    celebrate,
    play: { whack: playWhack, rps: playRps, roulette: playRoulette, hide },
  };
}
