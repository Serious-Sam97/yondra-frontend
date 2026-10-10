"use client";

import { vxSound } from "@/components/vortex/vortexSound";
import { apiFetch } from "@/lib/api";
import { vortexSvg } from "@/lib/vortexArt";
import "./lab.css";

// LADO D · the gadgets, client side. Every one is optional, reversible with a
// click, never changes data, and has a comic side effect (genius never does
// anything clean). The ones that show information read real data: the DOM of
// the board you're on, or the lab endpoints (time machine, x-ray, compass).
// The sprite hears about it through "vortex:gadget" events.

const reduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const tell = (id: string, on: boolean, extra: Record<string, unknown> = {}) =>
  window.dispatchEvent(
    new CustomEvent("vortex:gadget", { detail: { id, on, ...extra } }),
  );
const boardId = () => {
  const m = window.location.pathname.match(/^\/boards\/(\d+)/);
  return m ? Number(m[1]) : null;
};
const cards = () => [
  ...document.querySelectorAll<HTMLElement>(".mt-jx[data-card-id]"),
];
const racks = () => [
  ...document.querySelectorAll<HTMLElement>(".mt-rack[data-vx-rack]"),
];
const el = (cls: string, html = "") => {
  const d = document.createElement("div");
  d.className = cls;
  d.innerHTML = html;
  document.body.appendChild(d);
  return d;
};

/** D-03 · THE GRAVITY GUN: 30 s of physics on what you can see. He falls too. */
export function gravity(): () => void {
  const pick = [
    ...document.querySelectorAll<HTMLElement>(
      ".mt-jx, main h1, main h2, main h3, main button",
    ),
  ]
    .filter((e) => {
      const r = e.getBoundingClientRect();
      return r.bottom > 0 && r.top < innerHeight && r.width > 0;
    })
    .slice(0, 40);
  for (const [i, e] of pick.entries()) {
    e.classList.add("vxd-grav");
    e.style.setProperty("--gr", `${(i % 2 ? 1 : -1) * (2 + (i % 5))}deg`);
    e.style.setProperty("--gy", `${4 + (i % 7) * 2}px`);
  }
  tell("gravity", true);
  const stop = () => {
    for (const e of pick) {
      e.classList.remove("vxd-grav");
      e.style.removeProperty("--gr");
      e.style.removeProperty("--gy");
    }
    tell("gravity", false);
  };
  const t = setTimeout(stop, 30_000);
  return () => {
    clearTimeout(t);
    stop();
  };
}

/** D-04 · THE TELESCOPE: the whole board in miniature, lateness as heat. Click to fly there. */
export function telescope(): () => void {
  const rs = racks();
  if (!rs.length) {
    const box = el(
      "vxd-scope",
      "<b>the telescope</b><p>point it at a board. it only sees boards.</p>",
    );
    const t = setTimeout(() => box.remove(), 4000);
    return () => {
      clearTimeout(t);
      box.remove();
    };
  }
  const cols = rs.map((r) => {
    const cs = [...r.querySelectorAll<HTMLElement>(".mt-jx[data-card-id]")];
    const late = cs.filter((c) => Number(c.dataset.vxLate ?? 0) > 0).length;
    return {
      r,
      name: r.querySelector(".nm")?.textContent?.trim() ?? "?",
      n: cs.length,
      late,
    };
  });
  const max = Math.max(1, ...cols.map((c) => c.n));
  const box = el("vxd-scope");
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-label", "the telescope");
  const lens = document.createElement("div");
  lens.className = "lens";
  for (const c of cols) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "col";
    b.style.setProperty("--h", `${(c.n / max) * 100}%`);
    b.style.setProperty("--heat", `${c.n ? c.late / c.n : 0}`);
    b.innerHTML = "<i></i><span></span>";
    (b.querySelector("span") as HTMLElement).textContent =
      `${c.name} · ${c.n}${c.late ? ` · ${c.late} late` : ""}`;
    b.onclick = () =>
      c.r.scrollIntoView({
        behavior: reduced() ? "auto" : "smooth",
        inline: "center",
        block: "nearest",
      });
    lens.appendChild(b);
  }
  // side effect: sometimes the lens shows one thing more, at the end of the board
  if (Math.random() < 0.25) {
    const ghost = document.createElement("span");
    ghost.className = "ghost";
    ghost.title = "that's not on your board";
    lens.appendChild(ghost);
  }
  box.appendChild(lens);
  const close = document.createElement("button");
  close.type = "button";
  close.className = "x";
  close.textContent = "close the telescope";
  close.onclick = () => box.remove();
  box.appendChild(close);
  return () => box.remove();
}

/** D-05 · THE LATENESS GEIGER: clicks faster near late or forgotten cards. Also near him. */
export function geiger(): () => void {
  const hot = cards().filter(
    (c) => Number(c.dataset.vxLate ?? 0) > 0 || c.dataset.vxCursed === "1",
  );
  for (const c of hot) c.classList.add("vxd-hot");
  let last = 0;
  const move = (e: PointerEvent) => {
    const targets = [
      ...hot.map((c) => c.getBoundingClientRect()),
      document.querySelector(".vxa-sprite")?.getBoundingClientRect(),
    ].filter(Boolean) as DOMRect[];
    let d = Infinity;
    for (const r of targets)
      d = Math.min(
        d,
        Math.hypot(
          e.clientX - (r.left + r.width / 2),
          e.clientY - (r.top + r.height / 2),
        ),
      );
    const gap = Math.max(40, Math.min(900, d * 2.2));
    const now = performance.now();
    if (d < 420 && now - last > gap) {
      last = now;
      vxSound("tink");
    }
  };
  window.addEventListener("pointermove", move);
  tell("geiger", true);
  return () => {
    window.removeEventListener("pointermove", move);
    for (const c of hot) c.classList.remove("vxd-hot");
    tell("geiger", false);
  };
}

/** D-06 · THE TIME MACHINE: the board N days ago, from the real history. Read only. */
export async function timeMachine(days: number): Promise<() => void> {
  const id = boardId();
  const box = el("vxd-tm");
  if (!id) {
    box.innerHTML =
      "<b>the time machine</b><p>open a board. it only rewinds boards.</p>";
    const t = setTimeout(() => box.remove(), 4000);
    return () => {
      clearTimeout(t);
      box.remove();
    };
  }
  box.classList.add("is-rewinding");
  box.innerHTML = "<b>◀◀ REWINDING…</b>";
  try {
    const s = await apiFetch<{
      board: string;
      at: string;
      days: number;
      columns: { name: string; cards: { id: number; name: string }[] }[];
      ghost: { name: string; column: string } | null;
    }>(`/api/mascot/lab/snapshot?board=${id}&days=${days}`);
    box.classList.remove("is-rewinding");
    box.innerHTML = "";
    const head = document.createElement("div");
    head.className = "head";
    head.textContent = `REWOUND · READ ONLY · ${s.board} as it was on ${s.at} (${s.days} days ago)`;
    box.appendChild(head);
    const cols = document.createElement("div");
    cols.className = "cols";
    for (const c of s.columns) {
      const col = document.createElement("section");
      const h = document.createElement("h4");
      h.textContent = `${c.name} · ${c.cards.length}`;
      col.appendChild(h);
      const list = [...c.cards.map((x) => x.name)];
      if (s.ghost && s.ghost.column === c.name)
        list.unshift(`✦ ${s.ghost.name}`);
      for (const n of list) {
        const p = document.createElement("p");
        p.textContent = n;
        if (n.startsWith("✦")) p.className = "ghost";
        col.appendChild(p);
      }
      cols.appendChild(col);
    }
    box.appendChild(cols);
  } catch {
    box.classList.remove("is-rewinding");
    box.innerHTML =
      "<b>the tape snapped.</b><p>the time machine couldn't read that far back.</p>";
  }
  const close = document.createElement("button");
  close.type = "button";
  close.className = "x";
  close.textContent = "▶ back to the present";
  close.onclick = () => box.remove();
  box.appendChild(close);
  return () => box.remove();
}

/** D-07 · THE SHRINKER: everything at 70% for 20 s. He stays big a little longer. */
export function shrinker(): () => void {
  document.documentElement.classList.add("vxd-shrunk");
  tell("shrinker", true);
  let t2: ReturnType<typeof setTimeout> | null = null;
  const t = setTimeout(() => {
    document.documentElement.classList.remove("vxd-shrunk");
    t2 = setTimeout(() => tell("shrinker", false), 10_000);
  }, 20_000);
  return () => {
    clearTimeout(t);
    if (t2) clearTimeout(t2);
    document.documentElement.classList.remove("vxd-shrunk");
    tell("shrinker", false);
  };
}

/** D-08 · THE OBSESSION MAGNET: the cards you opened most this week. */
const OBS_KEY = "yd:vortex.obsessions";
export function recordOpen(key: string, name: string, href: string) {
  try {
    const week = Math.floor(Date.now() / (7 * 86_400_000));
    const raw = JSON.parse(localStorage.getItem(OBS_KEY) ?? "{}") as {
      week?: number;
      cards?: Record<
        string,
        { n: number; name: string; href: string; day: string; today: number }
      >;
    };
    const data = raw.week === week ? raw : { week, cards: {} };
    const today = new Date().toDateString();
    const c = data.cards?.[key] ?? { n: 0, name, href, day: today, today: 0 };
    c.n++;
    c.today = c.day === today ? c.today + 1 : 1;
    c.day = today;
    c.name = name;
    (data.cards as Record<string, typeof c>)[key] = c;
    localStorage.setItem(OBS_KEY, JSON.stringify(data));
    return c.today;
  } catch {
    return 0;
  }
}
export function magnet(): () => void {
  let list: { n: number; name: string; href: string }[] = [];
  try {
    const raw = JSON.parse(localStorage.getItem(OBS_KEY) ?? "{}");
    list = Object.values(
      (raw.cards ?? {}) as Record<
        string,
        { n: number; name: string; href: string }
      >,
    )
      .sort((a, b) => b.n - a.n)
      .slice(0, 6);
  } catch {}
  const box = el("vxd-magnet");
  const h = document.createElement("b");
  h.textContent = "🧲 your obsessions this week";
  box.appendChild(h);
  if (!list.length) {
    const p = document.createElement("p");
    p.textContent = "nothing yet. you're either balanced or lying.";
    box.appendChild(p);
  }
  for (const c of list) {
    const a = document.createElement("a");
    a.href = c.href;
    a.textContent = `${c.n}× ${c.name}`;
    box.appendChild(a);
  }
  if (list[0] && list[0].n >= 5) {
    const p = document.createElement("p");
    p.className = "jab";
    p.textContent = `you opened "${list[0].name}" ${list[0].n} times. it's not going to fix itself by looking at it.`;
    box.appendChild(p);
  }
  const x = document.createElement("button");
  x.type = "button";
  x.className = "x";
  x.textContent = "×";
  x.onclick = () => box.remove();
  box.appendChild(x);
  return () => box.remove();
}

/** D-09 · THE CORPORATE TRANSLATOR: hover a card a moment, get the honest version. */
export function translator(): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let tip: HTMLElement | null = null;
  const over = (e: PointerEvent) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>(
      ".mt-jx[data-card-id]",
    );
    if (timer) clearTimeout(timer);
    if (!card) return;
    timer = setTimeout(async () => {
      tip?.remove();
      tip = el("vxd-tip", "<i>translating…</i>");
      const r = card.getBoundingClientRect();
      tip.style.left = `${Math.min(innerWidth - 260, r.left)}px`;
      tip.style.top = `${Math.max(8, r.top - 54)}px`;
      try {
        const t = await apiFetch<{ text: string }>(
          "/api/mascot/lab/translate",
          {
            method: "POST",
            body: JSON.stringify({ card: Number(card.dataset.cardId) }),
          },
        );
        if (tip) tip.textContent = `honest version: ${t.text}`;
      } catch {
        if (tip) tip.textContent = "the translator refuses. too corporate.";
      }
    }, 700);
  };
  const out = () => {
    if (timer) clearTimeout(timer);
    tip?.remove();
    tip = null;
  };
  document.addEventListener("pointerover", over);
  document.addEventListener("scroll", out, true);
  return () => {
    document.removeEventListener("pointerover", over);
    document.removeEventListener("scroll", out, true);
    out();
  };
}

/** D-11 · THE X-RAY: inside every card on this board — comments, last touch, who. His bones show too. */
export async function xray(): Promise<() => void> {
  const id = boardId();
  const tags: HTMLElement[] = [];
  document.documentElement.classList.add("vxd-xray");
  tell("xray", true);
  if (id) {
    try {
      const r = await apiFetch<{
        cards: {
          id: number;
          comments: number;
          touched: string | null;
          by: string;
        }[];
      }>(`/api/mascot/lab/xray?board=${id}`);
      const by = new Map(r.cards.map((c) => [c.id, c]));
      for (const c of cards()) {
        const d = by.get(Number(c.dataset.cardId));
        if (!d) continue;
        const t = document.createElement("span");
        t.className = "vxd-xtag";
        const ago = d.touched
          ? Math.max(
              0,
              Math.round(
                (Date.now() - new Date(d.touched).getTime()) / 86_400_000,
              ),
            )
          : null;
        t.textContent = `💬${d.comments} · ${ago === null ? "?" : ago === 0 ? "today" : `${ago}d`}${d.by ? ` · ${d.by}` : ""}`;
        c.appendChild(t);
        tags.push(t);
      }
    } catch {}
  }
  return () => {
    document.documentElement.classList.remove("vxd-xray");
    for (const t of tags) t.remove();
    tell("xray", false);
  };
}

/** D-12 · NIGHT VISION: green-amber, high contrast. You'll see things in the dark. */
export function nightVision(): () => void {
  document.documentElement.classList.add("vxd-night");
  const sights = setInterval(() => {
    if (Math.random() > 0.3) return;
    const s = el(Math.random() < 0.5 ? "vxd-shadow" : "vxd-steps");
    s.style.left = `${10 + Math.random() * 80}%`;
    s.style.top = `${20 + Math.random() * 60}%`;
    setTimeout(() => s.remove(), 2200);
  }, 20_000);
  tell("nightvision", true);
  return () => {
    clearInterval(sights);
    document.documentElement.classList.remove("vxd-night");
    tell("nightvision", false);
  };
}

/** D-13 · THE CLONER: 3–5 mini hims for a minute. They argue. One doesn't go home. */
const PERSONAS = [
  [
    "the complainer",
    "this is terrible.",
    "who designed this.",
    "i hate it here.",
  ],
  [
    "the flatterer",
    "you're doing amazing.",
    "best board i've ever seen.",
    "wow. just wow.",
  ],
  ["the sleeper", "zzz.", "five more minutes.", "…"],
  [
    "the conspiracist",
    "the cards are listening.",
    "she's in the footer.",
    "trust no column.",
  ],
  [
    "the accountant",
    "that's 3 overdue.",
    "billable?",
    "i'll invoice you for this.",
  ],
];
export const LOST_KEY = "yd:vortex.lost-clone";
export function cloner(): () => void {
  const n = 3 + Math.floor(Math.random() * 3);
  const clones: HTMLElement[] = [];
  for (let i = 0; i < n; i++) {
    const [who, ...lines] = PERSONAS[i % PERSONAS.length];
    const c = el(
      "vxd-clone",
      vortexSvg(
        ["judging", "happy", "asleep", "paranoid", "focused"][i % 5] as never,
        `cl${i}`,
        "none",
      ),
    );
    c.title = who;
    c.style.left = `${10 + Math.random() * 80}%`;
    c.style.top = `${15 + Math.random() * 70}%`;
    c.style.setProperty("--d", `${6 + i}s`);
    const bubble = document.createElement("span");
    bubble.className = "say";
    c.appendChild(bubble);
    const talk = setInterval(() => {
      bubble.textContent = lines[Math.floor(Math.random() * lines.length)];
      c.style.left = `${Math.max(2, Math.min(92, Number.parseFloat(c.style.left) + (Math.random() * 20 - 10)))}%`;
      c.style.top = `${Math.max(10, Math.min(88, Number.parseFloat(c.style.top) + (Math.random() * 14 - 7)))}%`;
    }, 2500);
    c.dataset.timer = String(talk);
    clones.push(c);
  }
  tell("cloner", true);
  const end = () => {
    for (const c of clones) {
      clearInterval(Number(c.dataset.timer));
      c.remove();
    }
    // side effect: one of them doesn't go home
    try {
      localStorage.setItem(LOST_KEY, JSON.stringify({ since: Date.now() }));
    } catch {}
    tell("cloner", false, { lost: true });
  };
  const t = setTimeout(end, 60_000);
  return () => {
    clearTimeout(t);
    end();
  };
}

/** D-14 · THE MOMENT RECORDER: a still of this moment as a tape label, to share. */
export async function recorder(): Promise<void> {
  const W = 960;
  const H = 540;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d") as CanvasRenderingContext2D;
  g.fillStyle = "#1b140f";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#efe6cc";
  g.fillRect(60, 80, W - 120, 300);
  g.fillStyle = "#b5533c";
  g.fillRect(60, 80, 14, 300);
  g.fillStyle = "#2a1f17";
  g.font = "bold 40px Georgia, serif";
  const title = (
    document.querySelector(".mt-jx.is-playing .nm, main h1, main h2")
      ?.textContent ?? document.title
  )
    .trim()
    .slice(0, 40);
  g.fillText(title || "a moment", 100, 170);
  g.font = "22px monospace";
  g.fillText(`recorded ${new Date().toLocaleString()}`, 100, 220);
  g.fillText(window.location.pathname, 100, 256);
  g.fillStyle = "#ffb547";
  g.font = "26px monospace";
  g.fillText("● REC · YONDRA · SIDE A", 60, 450);
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(vortexSvg("happy", "rec", "wave"))}`;
  await new Promise((r) => {
    img.onload = r;
    img.onerror = r;
  });
  try {
    g.drawImage(img, W - 260, 300, 200, 200);
  } catch {}
  const a = document.createElement("a");
  a.href = c.toDataURL("image/png");
  a.download = `yondra-moment-${Date.now()}.png`;
  a.click();
}

/** D-15 · THE FOCUS COMPASS: always points at what matters now. At midnight it spins. */
export async function compass(): Promise<() => void> {
  const box = el(
    "vxd-compass",
    '<i class="needle"></i><span class="what">finding north…</span>',
  );
  type Target = { id: number; board_id: number; name: string; why: string };
  let target: Target | null = null;
  try {
    target = (
      await apiFetch<{ card: Target | null }>("/api/mascot/lab/compass")
    ).card;
  } catch {}
  const what = box.querySelector(".what") as HTMLElement;
  const needle = box.querySelector(".needle") as HTMLElement;
  if (!target) what.textContent = "nothing pressing. suspicious.";
  else {
    what.innerHTML = "";
    const a = document.createElement("a");
    a.href = `/boards/${target.board_id}?card=${target.id}`;
    a.textContent = target.name;
    what.appendChild(a);
    const w = document.createElement("small");
    w.textContent = target.why;
    what.appendChild(w);
  }
  const aim = () => {
    if (new Date().getHours() === 0) {
      box.classList.add("is-spinning");
      return;
    }
    box.classList.remove("is-spinning");
    const on =
      target &&
      document.querySelector<HTMLElement>(
        `.mt-jx[data-card-id="${target.id}"]`,
      );
    const b = box.getBoundingClientRect();
    if (on) {
      const r = on.getBoundingClientRect();
      const ang = Math.atan2(
        r.top + r.height / 2 - (b.top + 30),
        r.left + r.width / 2 - (b.left + 30),
      );
      needle.style.rotate = `${(ang * 180) / Math.PI + 90}deg`;
    } else needle.style.rotate = "0deg";
  };
  aim();
  const iv = setInterval(aim, 500);
  const x = document.createElement("button");
  x.type = "button";
  x.className = "x";
  x.textContent = "×";
  x.onclick = () => {
    clearInterval(iv);
    box.remove();
  };
  box.appendChild(x);
  return () => {
    clearInterval(iv);
    box.remove();
  };
}

/** D-16 · THE EGO AMPLIFIER: click a card. LEGEND. confetti. fanfare. */
export function ego(): () => void {
  document.documentElement.classList.add("vxd-aiming");
  const click = (e: MouseEvent) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>(
      ".mt-jx[data-card-id]",
    );
    if (!card) return;
    e.preventDefault();
    e.stopPropagation();
    document.documentElement.classList.remove("vxd-aiming");
    document.removeEventListener("click", click, true);
    const name = card.querySelector(".nm")?.textContent?.trim() ?? "this card";
    const banner = el("vxd-legend", '<b>LEGEND</b><span class="who"></span>');
    (banner.querySelector(".who") as HTMLElement).textContent = name;
    for (let i = 0; i < (reduced() ? 0 : 60); i++) {
      const p = el("vxd-confetti");
      p.style.left = `${Math.random() * 100}%`;
      p.style.background = [
        "#ffb547",
        "#b5533c",
        "#6f8a4a",
        "#8fe3e3",
        "#ff8fd4",
      ][i % 5];
      p.style.animationDelay = `${Math.random() * 0.6}s`;
      setTimeout(() => p.remove(), 3200);
    }
    for (let k = 0; k < 4; k++) setTimeout(() => vxSound("tink"), k * 140);
    setTimeout(() => banner.remove(), 4000);
  };
  document.addEventListener("click", click, true);
  return () => {
    document.removeEventListener("click", click, true);
    document.documentElement.classList.remove("vxd-aiming");
  };
}

/** D-17 · THE TAB TELEPORTER: to the last page you were NOT on. 1 in 20: somewhere below. */
const TRAIL_KEY = "yd:vortex.trail";
export function notePage(path: string) {
  try {
    const t = JSON.parse(sessionStorage.getItem(TRAIL_KEY) ?? "[]") as string[];
    if (t[t.length - 1] !== path) t.push(path);
    sessionStorage.setItem(TRAIL_KEY, JSON.stringify(t.slice(-12)));
  } catch {}
}
export function teleport(go: (href: string) => void) {
  let t: string[] = [];
  try {
    t = JSON.parse(sessionStorage.getItem(TRAIL_KEY) ?? "[]");
  } catch {}
  const here = window.location.pathname;
  const prev = t[t.length - 2];
  const dest =
    Math.random() < 0.05
      ? `/below/${["porao", "biblioteca", "garagem", "cemiterio", "estudio"][Math.floor(Math.random() * 5)]}`
      : ([...t].reverse().find((p) => p !== here && p !== prev) ??
        "/dashboard");
  document.documentElement.classList.add("vxd-swirl");
  setTimeout(
    () => {
      document.documentElement.classList.remove("vxd-swirl");
      go(dest);
    },
    reduced() ? 50 : 650,
  );
}
