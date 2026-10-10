"use client";

import { type RefObject, useEffect, useMemo, useRef } from "react";
import { prefersReducedMotion } from "@/components/vortex/vortexEffects";
import { vxSound } from "@/components/vortex/vortexSound";
import type { VortexMood } from "@/lib/vortexArt";
import { createAnimator } from "./anims";
import { type BodyEngine, startBody } from "./engine";
import { type GestureName, gesture } from "./gestures";
import "./body.css";

// The body, wired into the sprite: the engine (B-03/04/06/07/10/11/14/19/23),
// the animator (B-20), lip-sync visemes (B-05), mood → body (pupils, breath,
// size, the lying tremble) and the hover reactions to dangerous buttons (B-22).

const DANGER =
  /\b(delete|remove|archive|discard|destroy|excluir|apagar|remover|arquivar|descartar)\b/i;

/** Letter → mouth shape. */
export function viseme(ch: string | undefined): string | null {
  if (!ch) return null;
  const c = ch.toLowerCase();
  if ("a".includes(c)) return "a";
  if ("ei".includes(c)) return "e";
  if ("o".includes(c)) return "o";
  if ("uwq".includes(c)) return "u";
  if ("mbp".includes(c)) return "m";
  if ("fv".includes(c)) return "f";
  if ("!?".includes(c)) return "x";
  if (/[a-z]/.test(c)) return "_";
  return "m";
}

const MOOD_BODY: Partial<
  Record<
    VortexMood,
    { dil?: number; breath?: number; size?: number; lying?: boolean }
  >
> = {
  curious: { dil: 1.35 },
  love: { dil: 1.55, size: 1.08 },
  ecstasy: { dil: 1.5, size: 1.12 },
  hungry: { size: 0.9, dil: 1.2 },
  terror: { dil: 0.45, breath: 2.6, size: 0.76 },
  paranoid: { dil: 0.65, breath: 1.6, size: 0.92 },
  shocked: { dil: 0.5, breath: 1.8 },
  fury: { size: 1.14, breath: 2 },
  seething: { breath: 1.7, size: 1.05 },
  possessed: { breath: 0, dil: 1 },
  asleep: { breath: 0.45 },
  dreaming: { breath: 0.5 },
  sleepy: { breath: 0.6 },
  dead: { breath: 0, size: 0.94 },
  lying: { lying: true },
  sulking: { breath: 0.7, size: 0.94 },
  smug: { size: 1.03 },
  focused: { dil: 0.85 },
};

export function useVortexBody(opts: {
  active: boolean;
  calm: boolean;
  mood: VortexMood;
  spriteRef: RefObject<HTMLDivElement | null>;
  physRef: RefObject<HTMLDivElement | null>;
  fxHostRef: RefObject<HTMLDivElement | null>;
  setMood: (m: VortexMood) => void;
  restMood: () => VortexMood;
  say: (text: string) => void;
  /** is the user busy (drag/typing/modal)? reactions wait */
  isBusy: () => boolean;
}) {
  const { active, calm, mood, spriteRef, physRef, fxHostRef } = opts;
  const bodyRef = useRef<BodyEngine | null>(null);
  const cb = useRef(opts);
  cb.current = opts;

  /* the engine */
  useEffect(() => {
    if (!active) return;
    const sprite = spriteRef.current;
    const phys = physRef.current;
    const vars = fxHostRef.current;
    if (!sprite || !phys || !vars) return;
    const reduced = calm || prefersReducedMotion();
    const body = startBody({
      sprite,
      phys,
      vars,
      reduced,
      onFast: reduced
        ? undefined
        : (x, y, vx, vy) => {
            // B-10 · a spark of static left behind
            const p = document.createElement("i");
            p.className = "vxr-spark";
            p.style.left = `${x - vx * 30 + (Math.random() - 0.5) * 30}px`;
            p.style.top = `${y - vy * 30 + (Math.random() - 0.5) * 30}px`;
            document.body.appendChild(p);
            setTimeout(() => p.remove(), 650);
          },
    });
    bodyRef.current = body;
    return () => {
      body.stop();
      bodyRef.current = null;
    };
  }, [active, calm, spriteRef, physRef, fxHostRef]);

  /* mood → body */
  useEffect(() => {
    const b = bodyRef.current;
    if (!b) return;
    const m = MOOD_BODY[mood] ?? {};
    b.dilate(m.dil ?? 1);
    b.breath(m.breath ?? 1);
    b.size(m.size ?? 1);
    b.lying(!!m.lying);
  }, [mood]);

  /* B-20 · the animator */
  const animator = useMemo(
    () =>
      createAnimator({
        setMood: (m) => cb.current.setMood(m),
        restMood: () => cb.current.restMood(),
        gesture: (g: GestureName) => {
          const host = physRef.current;
          return host
            ? gesture(host, g, { reduced: calm || prefersReducedMotion() })
            : Promise.resolve();
        },
        say: (t) => cb.current.say(t),
        flash: (cls, ms) => {
          const el = fxHostRef.current;
          if (!el) return;
          el.classList.add(cls);
          setTimeout(() => el.classList.remove(cls), ms);
        },
        sound: (n) => vxSound(n),
        body: () => bodyRef.current,
      }),
    [calm, physRef, fxHostRef],
  );

  /* B-23 · dance to whatever is playing (the radio emits vortex:music) */
  useEffect(() => {
    if (!active) return;
    const onMusic = (e: Event) => {
      const bpm =
        (e as CustomEvent<{ bpm: number | null }>).detail?.bpm ?? null;
      bodyRef.current?.dance(bpm);
    };
    window.addEventListener("vortex:music", onMusic);
    return () => window.removeEventListener("vortex:music", onMusic);
  }, [active]);

  /* B-22 · he holds his breath over dangerous buttons, covers his eyes on click */
  useEffect(() => {
    if (!active) return;
    let holding: Element | null = null;
    const isDanger = (el: Element | null): Element | null => {
      const btn = el?.closest?.("button, [role='button'], a");
      if (!btn || btn.closest(".vxa-layer, .vxm")) return null;
      const label = `${btn.getAttribute("aria-label") ?? ""} ${btn.getAttribute("title") ?? ""} ${btn.textContent ?? ""}`;
      return DANGER.test(label) || btn.matches("[data-danger]") ? btn : null;
    };
    const over = (e: PointerEvent) => {
      const btn = isDanger(e.target as Element);
      if (!btn || btn === holding) return;
      holding = btn;
      if (cb.current.isBusy() && !document.querySelector(".modal-backdrop"))
        return;
      void animator.play("hold-breath");
    };
    const out = (e: PointerEvent) => {
      if (!holding) return;
      const to = e.relatedTarget as Element | null;
      if (to && holding.contains(to)) return;
      holding = null;
      if (animator.current() === "hold-breath") {
        animator.stop();
        cb.current.setMood(cb.current.restMood());
      }
    };
    const click = (e: MouseEvent) => {
      if (!isDanger(e.target as Element)) return;
      holding = null;
      animator.stop();
      void animator.play("cover-eyes");
    };
    document.addEventListener("pointerover", over, { passive: true });
    document.addEventListener("pointerout", out, { passive: true });
    document.addEventListener("click", click, true);
    return () => {
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerout", out);
      document.removeEventListener("click", click, true);
    };
  }, [active, animator]);

  /** B-05 · set his mouth shape from the letter being "spoken" */
  const setViseme = (ch: string | null) => {
    const el = fxHostRef.current;
    if (!el) return;
    if (ch === null) delete el.dataset.vis;
    else el.dataset.vis = viseme(ch) ?? "_";
  };

  return { body: bodyRef, animator, setViseme };
}
