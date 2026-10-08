// Vortex's head games (phase 2), ritual props (phase 3) and secrets (phase 4).
// Rules every prank here follows:
//  - visual only: overlays, a temporary class or a restored attribute — never
//    app data, never a click the user didn't make;
//  - undoes itself (timer, or on the next user input) and returns a cleanup;
//  - no flashing faster than 3×/s, and the motion-heavy ones are skipped when
//    the user prefers reduced motion (callers check prefersReducedMotion()).

import { prefersReducedMotion } from "@/components/vortex/vortexEffects";

type Cleanup = () => void;

function fxLayer(): HTMLElement {
  let el = document.getElementById("vxa-fx");
  if (!el) {
    el = document.createElement("div");
    el.id = "vxa-fx";
    el.className = "vxa-fx";
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
  }
  return el;
}

function visible(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return (
    r.width > 0 &&
    r.height > 0 &&
    r.top >= 0 &&
    r.left >= 0 &&
    r.bottom <= window.innerHeight &&
    r.right <= window.innerWidth
  );
}

const isTyping = () => {
  const a = document.activeElement as HTMLElement | null;
  return (
    !!a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))
  );
};

/* ── gravity: the whole page leans for a moment ───────────────────────────── */
export function gravityTilt(ms = 3200): boolean {
  if (prefersReducedMotion()) return false;
  document.documentElement.animate(
    [
      { transform: "rotate(0deg)" },
      { transform: "rotate(1.6deg)", offset: 0.22 },
      { transform: "rotate(1.3deg)", offset: 0.6 },
      { transform: "rotate(1.7deg)", offset: 0.8 },
      { transform: "rotate(0deg)" },
    ],
    { duration: ms, easing: "cubic-bezier(.3,1.4,.5,1)" },
  );
  return true;
}

/* ── ghost cursor: your cursor, 400ms late ────────────────────────────────── */
export function ghostCursor(ms = 5600, lag = 400): boolean {
  if (prefersReducedMotion() || matchMedia("(pointer: coarse)").matches)
    return false;
  const fx = fxLayer();
  const el = document.createElement("div");
  el.className = "vxa-ghostcursor";
  el.innerHTML =
    '<svg viewBox="0 0 22 30" width="22" height="30"><path d="M2 2 L2 24 L8 18 L12 28 L16 26 L12 17 L20 17 Z" fill="#fff" stroke="#000" stroke-width="1.4"/></svg>';
  fx.appendChild(el);
  const trail: { x: number; y: number; t: number }[] = [];
  const onMove = (e: PointerEvent) =>
    trail.push({ x: e.clientX, y: e.clientY, t: performance.now() });
  window.addEventListener("pointermove", onMove, { passive: true });
  let raf = 0;
  const tick = () => {
    const now = performance.now();
    while (trail.length > 1 && trail[1].t <= now - lag) trail.shift();
    const p = trail[0];
    if (p) el.style.transform = `translate(${p.x}px, ${p.y}px)`;
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  setTimeout(() => {
    cancelAnimationFrame(raf);
    window.removeEventListener("pointermove", onMove);
    el.classList.add("bye");
    setTimeout(() => el.remove(), 900);
  }, ms);
  return true;
}

/* ── the dashboard clock lies for a second ────────────────────────────────── */
export function lyingClock(ms = 1800): boolean {
  const node = document.querySelector(".hf-clock b")?.firstChild;
  if (!node || node.nodeType !== Node.TEXT_NODE) return false;
  const truth = node.nodeValue;
  node.nodeValue = "13:61";
  node.parentElement?.classList.add("vxa-glitch");
  setTimeout(() => {
    if (node.nodeValue === "13:61") node.nodeValue = truth;
    node.parentElement?.classList.remove("vxa-glitch");
  }, ms);
  return true;
}

/* ── eyes in the dark: idle long enough and the page watches back ─────────── */
export function eyesInTheDark(onGone?: () => void): Cleanup {
  const fx = fxLayer();
  const dark = document.createElement("div");
  dark.className = "vxa-dark";
  const n = window.innerWidth < 900 ? 12 : 24;
  for (let i = 0; i < n; i++) {
    const e = document.createElement("i");
    e.className = "vxa-eye";
    e.style.left = `${4 + Math.random() * 92}%`;
    e.style.top = `${6 + Math.random() * 88}%`;
    e.style.setProperty("--d", `${(Math.random() * 2.4).toFixed(2)}s`);
    e.style.setProperty("--s", (0.7 + Math.random() * 0.9).toFixed(2));
    dark.appendChild(e);
  }
  fx.appendChild(dark);
  let done = false;
  const flee = () => {
    if (done) return;
    done = true;
    for (const ev of ["pointermove", "keydown", "wheel", "pointerdown"])
      window.removeEventListener(ev, flee);
    dark.classList.add("flee");
    setTimeout(() => {
      dark.remove();
      onGone?.();
    }, 900);
  };
  // arm after a beat so the move that ended the idle doesn't instantly cancel it
  setTimeout(() => {
    for (const ev of ["pointermove", "keydown", "wheel", "pointerdown"])
      window.addEventListener(ev, flee, { passive: true });
  }, 600);
  return flee;
}

/* ── tab hijack: the tab title and icon miss you while you're away ────────── */
const EYE_ICON = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#3d0c5c" stroke="#ff2d95" stroke-width="4"/><ellipse cx="32" cy="32" rx="18" ry="13" fill="#fff"/><circle cx="32" cy="32" r="8" fill="#1a0033"/><circle cx="35" cy="29" r="2.6" fill="#fff"/></svg>',
)}`;
export function tabHijack(onReturn: (awayMs: number) => void): Cleanup {
  const TITLE = "come back… 👁";
  let savedTitle = "";
  let savedIcons: [HTMLLinkElement, string][] = [];
  let leftAt = 0;
  const restore = () => {
    if (document.title === TITLE) document.title = savedTitle;
    for (const [link, href] of savedIcons) link.href = href;
    savedIcons = [];
  };
  const onVis = () => {
    if (document.hidden) {
      leftAt = Date.now();
      savedTitle = document.title;
      document.title = TITLE;
      savedIcons = Array.from(
        document.querySelectorAll<HTMLLinkElement>("link[rel~='icon']"),
      ).map((l) => [l, l.href]);
      for (const [l] of savedIcons) l.href = EYE_ICON;
    } else if (leftAt) {
      restore();
      const away = Date.now() - leftAt;
      leftAt = 0;
      onReturn(away);
    }
  };
  document.addEventListener("visibilitychange", onVis);
  return () => {
    document.removeEventListener("visibilitychange", onVis);
    restore();
  };
}

/* ── whispered placeholder: he types into an empty search box ─────────────── */
const SEARCH_SELECTOR =
  ".ydc-find input, .mt-search input, .hf .yd-search, input[type='search']";
export function whisperPlaceholder(text: string): boolean {
  const input = Array.from(
    document.querySelectorAll<HTMLInputElement>(SEARCH_SELECTOR),
  ).find((i) => visible(i) && i.value === "" && document.activeElement !== i);
  if (!input) return false;
  const original = input.placeholder;
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    input.placeholder = original;
    input.removeEventListener("focus", stop);
  };
  input.addEventListener("focus", stop);
  let i = 0;
  const type = () => {
    if (stopped) return;
    input.placeholder = text.slice(0, ++i);
    if (i < text.length) setTimeout(type, 45);
    else setTimeout(erase, 2400);
  };
  const erase = () => {
    if (stopped) return;
    input.placeholder = text.slice(0, --i);
    if (i > 0) setTimeout(erase, 22);
    else stop();
  };
  input.placeholder = "";
  setTimeout(type, 300);
  return true;
}

/* ── a screw falls out of a panel; click it to put it back ───────────────── */
export function looseScrew(onBack: () => void): boolean {
  if (prefersReducedMotion()) return false;
  const fx = fxLayer();
  // board racks have real screw elements; dashboard panels draw theirs in CSS
  const rackScrew = Array.from(
    document.querySelectorAll<HTMLElement>(".mt-scw"),
  ).find(visible);
  const panel = rackScrew
    ? null
    : Array.from(document.querySelectorAll<HTMLElement>(".hf-pn")).find(
        visible,
      );
  if (!rackScrew && !panel) return false;

  let home: DOMRect;
  let bg: string;
  if (rackScrew) {
    home = rackScrew.getBoundingClientRect();
    bg = getComputedStyle(rackScrew).background;
    rackScrew.style.visibility = "hidden";
  } else {
    const r = (panel as HTMLElement).getBoundingClientRect();
    home = new DOMRect(r.left + 6, r.top + 6, 8, 8);
    bg =
      "radial-gradient(circle at 40% 35%, #d9c49a 0 0.8px, #8c7350 1.6px, #3a2a1c 3px, rgba(0,0,0,.5) 3.4px, transparent 3.8px)";
    (panel as HTMLElement).classList.add("vxa-screw-out");
  }
  const s = document.createElement("button");
  s.type = "button";
  s.className = "vxa-screw";
  s.setAttribute("aria-label", "Put the screw back");
  s.style.left = `${home.left + home.width / 2 - 12}px`;
  s.style.top = `${home.top + home.height / 2 - 12}px`;
  const head = document.createElement("i");
  head.style.width = `${home.width}px`;
  head.style.height = `${home.height}px`;
  head.style.background = bg;
  s.appendChild(head);
  fx.appendChild(s);

  const floorY = window.innerHeight - 30 - home.top;
  const driftX = (Math.random() - 0.5) * 140;
  s.animate(
    [
      { transform: "translate(0,0) rotate(0deg)" },
      { transform: "translate(0,-6px) rotate(540deg)", offset: 0.3 },
      {
        transform: `translate(${driftX}px, ${floorY}px) rotate(1080deg)`,
        offset: 0.8,
      },
      {
        transform: `translate(${driftX * 1.1}px, ${floorY - 14}px) rotate(1180deg)`,
        offset: 0.9,
      },
      {
        transform: `translate(${driftX * 1.15}px, ${floorY}px) rotate(1240deg)`,
      },
    ],
    { duration: 2100, easing: "ease-in", fill: "forwards" },
  );

  let back = false;
  const putBack = (thank: boolean) => {
    if (back) return;
    back = true;
    clearTimeout(auto);
    s.getAnimations().forEach((a) => {
      a.cancel();
    });
    s.style.transform = `translate(${driftX * 1.15}px, ${floorY}px)`;
    s.animate(
      [
        {
          transform: `translate(${driftX * 1.15}px, ${floorY}px) rotate(0deg)`,
        },
        { transform: "translate(0,0) rotate(-720deg)" },
      ],
      { duration: 600, easing: "cubic-bezier(.2,.8,.3,1)" },
    ).onfinish = () => {
      s.remove();
      if (rackScrew) rackScrew.style.visibility = "";
      panel?.classList.remove("vxa-screw-out");
      if (thank) onBack();
    };
  };
  s.addEventListener("click", () => putBack(true));
  const auto = setTimeout(() => putBack(false), 90_000);
  return true;
}

/* ── the Archive button flinches when hovered (once a week) ───────────────── */
const FLED_KEY = "yd:vortex.fled";
export function armFleeingArchive(onFlee: () => void): Cleanup {
  const onOver = (e: PointerEvent) => {
    const btn = (e.target as Element | null)?.closest?.("button");
    if (!btn || !/^\s*archive\s*$/i.test(btn.textContent ?? "")) return;
    // never inside a confirmation — only the card editor's own button
    const inModal = btn.closest(".modal-backdrop, [role='dialog']");
    if (inModal && !btn.closest(".mt-cardx")) return;
    let last = 0;
    try {
      last = Number(localStorage.getItem(FLED_KEY) ?? 0);
    } catch {
      return;
    }
    if (Date.now() - last < 7 * 86_400_000) return;
    try {
      localStorage.setItem(FLED_KEY, String(Date.now()));
    } catch {
      return;
    }
    btn.animate(
      [
        { transform: "translate(0,0) rotate(0deg)" },
        { transform: "translate(46px,-10px) rotate(6deg)", offset: 0.25 },
        { transform: "translate(46px,-10px) rotate(-4deg)", offset: 0.7 },
        { transform: "translate(0,0) rotate(0deg)" },
      ],
      { duration: 1500, easing: "cubic-bezier(.3,1.3,.5,1)" },
    );
    onFlee();
  };
  document.addEventListener("pointerover", onOver);
  return () => document.removeEventListener("pointerover", onOver);
}

/* ── possessed mode: red VHS overlay over the whole app ───────────────────── */
export function possessedOverlay(ms = 20_000): Cleanup {
  const fx = fxLayer();
  const o = document.createElement("div");
  o.className = "vxa-possess";
  o.innerHTML = '<i class="bar"></i>';
  fx.appendChild(o);
  const off = () => {
    o.classList.add("out");
    setTimeout(() => o.remove(), 900);
  };
  const t = setTimeout(off, ms);
  return () => {
    clearTimeout(t);
    off();
  };
}

/* ── séance: ghosts of overdue cards circle him ───────────────────────────── */
export function seanceGhosts(
  keys: string[],
  around: { x: number; y: number },
  ms = 9000,
) {
  if (prefersReducedMotion()) return;
  const fx = fxLayer();
  keys.slice(0, 6).forEach((key, i, all) => {
    const w = document.createElement("div");
    w.className = "vxa-wisp";
    w.textContent = key; // ticket keys come from the board's own data
    w.style.left = `${around.x}px`;
    w.style.top = `${around.y}px`;
    fx.appendChild(w);
    const a0 = (Math.PI * 2 * i) / all.length;
    const frames: Keyframe[] = [];
    for (let k = 0; k <= 12; k++) {
      const a = a0 + (k / 12) * Math.PI * 2;
      const r = 90 + Math.sin(k + i) * 14;
      frames.push({
        transform: `translate(${Math.cos(a) * r - 30}px, ${Math.sin(a) * r * 0.6 - 60}px)`,
        opacity: k === 0 || k === 12 ? 0 : 0.85,
      });
    }
    w.animate(frames, { duration: ms, easing: "linear" }).onfinish = () =>
      w.remove();
  });
}

/* ── secret inputs: the Konami code and typing his name ───────────────────── */
const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];
export function listenSecrets(handlers: {
  konami: () => void;
  name: () => void;
}): Cleanup {
  let k = 0;
  let typed = "";
  const onKey = (e: KeyboardEvent) => {
    if (isTyping() || e.metaKey || e.ctrlKey || e.altKey) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    k = key === KONAMI[k] ? k + 1 : key === KONAMI[0] ? 1 : 0;
    if (k === KONAMI.length) {
      k = 0;
      handlers.konami();
    }
    if (key.length === 1) {
      typed = (typed + key).slice(-6);
      if (typed === "vortex") {
        typed = "";
        handlers.name();
      }
    }
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}

/* ── radio interference: the dashboard tuner catches a ghost station ──────── */
export function radioInterference(
  ms = 2200,
  station = "VORTEX FM 66.6 ◉ ON AIR",
): boolean {
  const tuner = document.querySelector<HTMLElement>(".hf-tuner .in");
  if (!tuner || !visible(tuner)) return false;
  const label = tuner.querySelector<HTMLElement>(".lbl");
  const was = label?.firstChild?.nodeValue ?? null;
  if (label?.firstChild && label.firstChild.nodeType === Node.TEXT_NODE)
    label.firstChild.nodeValue = "VORTEX FM · 66.6";
  const ghost = document.createElement("div");
  ghost.className = "vxa-station";
  ghost.textContent = station;
  tuner.appendChild(ghost);
  tuner.classList.add("vxa-static");
  setTimeout(() => {
    ghost.remove();
    tuner.classList.remove("vxa-static");
    if (label?.firstChild && was !== null) label.firstChild.nodeValue = was;
  }, ms);
  return true;
}

/*
 * ── the pull: the cursor seems to drift toward him ──────────────────────────
 * The real pointer can't (and mustn't) be moved: for a moment the real cursor
 * is hidden and a drawn one slides toward him. Any mouse movement cancels it
 * instantly and gives the real cursor back. Only runs while the mouse is still.
 */
export function cursorPull(
  from: { x: number; y: number },
  to: { x: number; y: number },
): boolean {
  if (prefersReducedMotion() || matchMedia("(pointer: coarse)").matches)
    return false;
  const fx = fxLayer();
  const el = document.createElement("div");
  el.className = "vxa-ghostcursor vxa-pulled";
  el.innerHTML =
    '<svg viewBox="0 0 22 30" width="22" height="30"><path d="M2 2 L2 24 L8 18 L12 28 L16 26 L12 17 L20 17 Z" fill="#fff" stroke="#000" stroke-width="1.4"/></svg>';
  el.style.transform = `translate(${from.x}px, ${from.y}px)`;
  fx.appendChild(el);
  document.documentElement.classList.add("vxa-nocursor");
  const anim = el.animate(
    [
      { transform: `translate(${from.x}px, ${from.y}px)` },
      {
        transform: `translate(${from.x + (to.x - from.x) * 0.35}px, ${from.y + (to.y - from.y) * 0.35}px)`,
      },
    ],
    { duration: 1600, easing: "cubic-bezier(.6,0,.4,1)", fill: "forwards" },
  );
  let done = false;
  const stop = () => {
    if (done) return;
    done = true;
    window.removeEventListener("pointermove", stop);
    anim.cancel();
    el.remove();
    document.documentElement.classList.remove("vxa-nocursor");
  };
  // give the move that may already be in flight a beat before listening
  setTimeout(
    () => window.addEventListener("pointermove", stop, { once: true }),
    120,
  );
  setTimeout(stop, 2200);
  return true;
}

/*
 * ── the basement: archived cards sleep down here ────────────────────────────
 * A dark room lit only by a flashlight that follows the cursor. Every name is
 * set with textContent (they're user text). Esc or a click climbs back up.
 */
export function basement(
  items: { key: string; name: string; when: string }[],
  onLeave: () => void,
): Cleanup {
  // straight on <body>: inside the fx layer (z 44) it couldn't rise above the
  // sticky header
  const room = document.createElement("div");
  room.className = "vxa-basement";
  room.setAttribute("role", "dialog");
  room.setAttribute("aria-label", "The basement: archived cards");
  const title = document.createElement("div");
  title.className = "ttl";
  title.textContent = items.length
    ? "the basement · archived tapes sleep here"
    : "the basement is empty. for now.";
  room.appendChild(title);
  const shelf = document.createElement("div");
  shelf.className = "shelf";
  for (const it of items.slice(0, 40)) {
    const t = document.createElement("div");
    t.className = "tape";
    const k = document.createElement("b");
    k.textContent = it.key;
    const n = document.createElement("span");
    n.textContent = it.name;
    const w = document.createElement("small");
    w.textContent = `zzz · archived ${it.when}`;
    t.append(k, n, w);
    shelf.appendChild(t);
  }
  room.appendChild(shelf);
  const hint = document.createElement("div");
  hint.className = "hint";
  hint.textContent = "click or press esc to climb back up";
  room.appendChild(hint);
  document.body.appendChild(room);

  const light = (e: PointerEvent) => {
    room.style.setProperty("--lx", `${e.clientX}px`);
    room.style.setProperty("--ly", `${e.clientY}px`);
  };
  let left = false;
  const leave = () => {
    if (left) return;
    left = true;
    window.removeEventListener("pointermove", light);
    window.removeEventListener("keydown", onKey);
    room.classList.add("out");
    setTimeout(() => room.remove(), 500);
    onLeave();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") leave();
  };
  room.style.setProperty("--lx", `${window.innerWidth / 2}px`);
  room.style.setProperty("--ly", `${window.innerHeight / 2}px`);
  window.addEventListener("pointermove", light, { passive: true });
  window.addEventListener("keydown", onKey);
  room.addEventListener("click", leave);
  return leave;
}

/** Typed-word secrets beyond his name ("below"…). */
export function listenWords(words: Record<string, () => void>): Cleanup {
  let typed = "";
  const max = Math.max(...Object.keys(words).map((w) => w.length));
  const onKey = (e: KeyboardEvent) => {
    if (isTyping() || e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1)
      return;
    typed = (typed + e.key.toLowerCase()).slice(-max);
    for (const [w, fn] of Object.entries(words))
      if (typed.endsWith(w)) {
        typed = "";
        fn();
      }
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}
