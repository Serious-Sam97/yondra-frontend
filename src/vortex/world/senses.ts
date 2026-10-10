// E-01 · his senses: listeners on the app that turn into reactions.
//   E-06 he sabotages your filters (visually, for 3s), E-08 he lives in the
//   command palette, E-16 he reacts to real API errors (and fears the silence
//   of a dead network), E-18 he gossips about what teammates just did, E-23
//   the favicon is him, E-24 copy & paste. Nothing here changes data.

import type { Actor } from "@/vortex/core/director";

const pick = <T>(l: readonly T[]): T => l[Math.floor(Math.random() * l.length)];

export interface SenseHooks extends Actor {
  openChat(): void;
  isNight(): boolean;
}

export function startSenses(a: SenseHooks): () => void {
  const offs: (() => void)[] = [];
  const on = <K extends keyof WindowEventMap>(
    t: K,
    f: (e: WindowEventMap[K]) => void,
    o?: AddEventListenerOptions,
  ) => {
    window.addEventListener(t, f, o);
    offs.push(() => window.removeEventListener(t, f));
  };
  let lastLine = 0;
  const say = (text: string, gap = 45_000) => {
    if (Date.now() - lastLine < gap || a.isBusy()) return;
    lastLine = Date.now();
    a.speak(text);
  };

  /* E-16 · real API errors */
  on(
    "vortex:api-error" as keyof WindowEventMap,
    ((e: CustomEvent<{ status: number; path: string }>) => {
      const s = e.detail?.status ?? 0;
      if (s === 0) {
        a.setMood("terror");
        say(
          "…silence. the network went quiet. i hate silence. say something. SAY SOMETHING.",
          20_000,
        );
        return;
      }
      if (s >= 500)
        say(
          pick([
            "that error was me. i bit a cable.",
            "the server gremlin strikes again. i've never seen him. i hear him at night.",
            "500. the tape snapped somewhere far away. not my fault. probably.",
          ]),
          30_000,
        );
      else if (s === 401 || s === 419)
        say(
          "security says you're not you anymore. log in again. prove you exist.",
          60_000,
        );
      else if (s === 403)
        say("forbidden. even i can't get in there. and i'm a ghost.", 60_000);
    }) as never,
  );
  on("offline", () => {
    a.setMood("terror");
    say(
      "you're offline. the tape stopped. i can't hear anything. this is the worst thing that can happen to me.",
      0,
    );
  });
  on("online", () =>
    say(
      "…and we're back. i wasn't scared. my reels were just spinning for fun.",
      0,
    ),
  );

  /* E-18 · teammates live */
  let lastGossip = 0;
  on(
    "vortex:remote" as keyof WindowEventMap,
    ((
      e: CustomEvent<{
        type: string;
        payload?: { name?: string; done_at?: string | null };
      }>,
    ) => {
      const d = e.detail;
      if (!d || Date.now() - lastGossip < 4 * 60_000) return;
      const name = d.payload?.name
        ? `"${d.payload.name.slice(0, 50)}"`
        : "a card";
      let text: string | null = null;
      if (d.type === "card.created")
        text = `someone just made ${name}. live. right now. another rectangle is born.`;
      else if (d.type === "card.deleted")
        text =
          "someone deleted a card. i felt it. it went to the b-side screaming.";
      else if (
        d.type === "card.updated" &&
        d.payload?.done_at &&
        new Date().getHours() >= 22
      )
        text = `someone finished ${name} at ${new Date().getHours()}h. are they ok? are YOU ok?`;
      if (text) {
        lastGossip = Date.now();
        say(text, 0);
      }
    }) as never,
  );

  /* E-24 · copy & paste */
  const onCopy = () => {
    if (Math.random() < 0.15)
      say(
        pick([
          "stealing from yourself?",
          "ctrl+c. i saw. i see everything you copy. (i don't. it's private. but i know you did it.)",
        ]),
        120_000,
      );
  };
  document.addEventListener("copy", onCopy);
  offs.push(() => document.removeEventListener("copy", onCopy));
  const onPaste = (e: ClipboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (!t || t.closest(".vxm") || Math.random() > 0.08 || !a.pranksOn())
      return;
    const r = t.getBoundingClientRect();
    const g = document.createElement("i");
    g.className = "vxr-paste-ghost";
    g.style.left = `${r.right - 18}px`;
    g.style.top = `${r.top - 14}px`;
    document.body.appendChild(g);
    setTimeout(() => g.remove(), 1600);
  };
  document.addEventListener("paste", onPaste, true);
  offs.push(() => document.removeEventListener("paste", onPaste, true));

  /* E-08 · the command palette (and its empty searches) */
  const palette = new MutationObserver(() => {
    const input = document.querySelector<HTMLInputElement>(
      'input[placeholder^="Search cards, sections"]',
    );
    if (!input) return;
    const panel = input.closest(".aero-menu");
    if (!panel || panel.querySelector(".vxr-palette-me")) return;
    const list = panel.querySelector(".overflow-y-auto");
    if (!list) return;
    const me = document.createElement("button");
    me.type = "button";
    me.className = "vxr-palette-me";
    me.innerHTML = "<span>›</span> ask a smarter entity <b>(me)</b>";
    me.addEventListener("click", () => {
      (panel.closest(".fixed") as HTMLElement | null)?.click();
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
      setTimeout(() => a.openChat(), 120);
    });
    list.appendChild(me);
    if (panel.textContent?.includes("No results for"))
      say("nothing. like your weekend plans.", 60_000);
  });
  palette.observe(document.body, { childList: true, subtree: true });
  offs.push(() => palette.disconnect());

  /* E-21 · loading: he stares at spinners that take too long */
  let spinSince = 0;
  const loaders = setInterval(() => {
    const spin = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".animate-spin, [aria-busy='true']",
      ),
    ).find((el) => el.offsetParent !== null);
    if (!spin) {
      spinSince = 0;
      return;
    }
    spinSince ||= Date.now();
    if (Date.now() - spinSince > 2500) {
      const r = spin.getBoundingClientRect();
      a.lookAt({ x: r.left + r.width / 2, y: r.top + r.height / 2 }, 2500);
      say(
        pick([
          "loading. like my patience.",
          "it's spinning. i spin too. nobody waits for ME.",
          "*pushes the progress bar* come on. COME ON.",
        ]),
        90_000,
      );
      spinSince = Date.now() + 60_000;
    }
  }, 1000);
  offs.push(() => clearInterval(loaders));

  /* E-06 · filters: when cards vanish from the board, he hides one more */
  let lastCount = -1;
  let lastSabotage = 0;
  const filters = setInterval(() => {
    if (!/^\/boards\/\d+/.test(location.pathname)) return;
    const visible = Array.from(
      document.querySelectorAll<HTMLElement>(".mt-jx[data-card-id]"),
    ).filter((c) => c.offsetParent !== null);
    const n = visible.length;
    const dropped = lastCount > 0 && n > 0 && lastCount - n >= 2;
    lastCount = n;
    if (!dropped || !a.pranksOn() || Date.now() - lastSabotage < 20 * 60_000)
      return;
    const searching = document.activeElement instanceof HTMLInputElement;
    if (searching) return;
    const victim = pick(visible);
    if (!victim) return;
    lastSabotage = Date.now();
    victim.classList.add("vxr-hidden-by-him");
    setTimeout(() => {
      victim.classList.remove("vxr-hidden-by-him");
      say(
        "you didn't even notice. i was holding one behind my back. you never notice.",
        0,
      );
    }, 3000);
  }, 700);
  offs.push(() => clearInterval(filters));

  /* E-23 · the favicon is him: asleep at night, red with late cards, an eye at 03:13 */
  const link =
    document.querySelector<HTMLLinkElement>("link[rel~='icon']") ??
    Object.assign(document.createElement("link"), { rel: "icon" });
  if (!link.parentNode) document.head.appendChild(link);
  const original = link.href;
  const drawFav = () => {
    const now = new Date();
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const g = c.getContext("2d");
    if (!g) return;
    const late = document.querySelectorAll(".mt-jx[data-vx-late]").length > 0;
    const dead =
      now.getHours() === 3 && now.getMinutes() >= 13 && now.getMinutes() < 26;
    if (dead) {
      // an eye
      g.fillStyle = "#f3e4bd";
      g.beginPath();
      g.ellipse(16, 16, 14, 9, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#b5533c";
      g.beginPath();
      g.arc(16, 16, 6, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#000";
      g.beginPath();
      g.arc(16, 16, 2.6, 0, Math.PI * 2);
      g.fill();
    } else {
      const grad = g.createRadialGradient(12, 11, 2, 16, 16, 15);
      grad.addColorStop(0, late ? "#ff6a5a" : "#ff7ac8");
      grad.addColorStop(0.5, late ? "#c0150f" : "#e0157f");
      grad.addColorStop(1, "#1a0033");
      g.fillStyle = grad;
      g.beginPath();
      g.arc(16, 16, 14, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = late ? "#ffb000" : "#00e5d0";
      g.lineWidth = 2;
      g.stroke();
      if (a.isNight()) {
        g.strokeStyle = "#fff";
        g.lineWidth = 1.6;
        for (const x of [11, 21]) {
          g.beginPath();
          g.arc(x, 15, 3, 0.15 * Math.PI, 0.85 * Math.PI);
          g.stroke();
        }
      } else {
        g.fillStyle = "#fff";
        for (const x of [11, 21]) {
          g.beginPath();
          g.ellipse(x, 15, 3.4, 4.2, 0, 0, Math.PI * 2);
          g.fill();
        }
        g.fillStyle = "#1a0033";
        for (const x of [11, 21]) {
          g.beginPath();
          g.arc(x + 0.6, 15.6, 1.8, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
    link.href = c.toDataURL("image/png");
  };
  drawFav();
  const fav = setInterval(drawFav, 60_000);
  offs.push(() => {
    clearInterval(fav);
    if (original) link.href = original;
  });

  return () => {
    for (const f of offs) f();
  };
}
