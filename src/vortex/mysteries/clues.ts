// K · clues the app itself hides (the client half; every claim is validated
// on the server):
//   K-03 the DevTools console — ASCII art and `vortex.whoami()` (three calls);
//   K-06 at 03:13 the tab says SIDE C, and pressing "c" in that minute claims it;
//   K-21 he knows things: what you do in your OTHER Yondra tab reaches him here.

import { claimFragment } from "./fragments";

const ART = String.raw`
        .-""""-.
      .'  _  _  '.
     /   (o)(o)   \      oh. a developer.
    |    .____.    |     or a snoop. same thing.
     \   \____/   /
      '._      _.'
         '----'
`;

let started = false;

export function startClues(opts: {
  say: (text: string) => void;
  isVisible: () => boolean;
}): () => void {
  if (started) return () => {};
  started = true;
  const offs: (() => void)[] = [];

  /* K-03 · the console */
  try {
    console.log(
      `%c${ART}`,
      "color:#ffb347;font-family:monospace;font-size:12px",
    );
    let calls = 0;
    const t = setTimeout(() => {
      console.log(
        "%ctype vortex.whoami() if you're brave.",
        "color:#cfe3e2;font-family:monospace",
      );
    }, 13_000);
    offs.push(() => clearTimeout(t));
    const lies = [
      "i'm a hyperdimensional intelligence. obviously.",
      "a better question is who are YOU. (that's deflection. it works.)",
      "i don't know. stop asking.",
    ];
    (window as unknown as { vortex?: { whoami: () => string } }).vortex = {
      whoami: () => {
        calls += 1;
        if (calls === 3) void claimFragment("F01", "whoami3");
        return lies[Math.min(calls, 3) - 1];
      },
    };
  } catch {}

  /* K-06 · the dead minute's tab title */
  let saved = "";
  const tick = setInterval(() => {
    const d = new Date();
    const dead =
      d.getHours() === 3 && d.getMinutes() >= 13 && d.getMinutes() < 26;
    if (dead && !document.title.startsWith("▶ 03:13")) {
      saved = document.title;
      document.title = "▶ 03:13 · SIDE C";
    } else if (!dead && document.title.startsWith("▶ 03:13"))
      document.title = saved || "Yondra";
  }, 5000);
  offs.push(() => clearInterval(tick));
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "c" && e.key !== "C") return;
    if (!document.title.startsWith("▶ 03:13")) return;
    const a = document.activeElement as HTMLElement | null;
    if (a && /^(INPUT|TEXTAREA)$/.test(a.tagName)) return;
    void claimFragment("F07");
  };
  window.addEventListener("keydown", onKey);
  offs.push(() => window.removeEventListener("keydown", onKey));

  /* K-21 · he knows what you did in your other tab */
  try {
    const bc = new BroadcastChannel("yd-vortex");
    const onNav = () =>
      bc.postMessage({ kind: "nav", path: location.pathname, at: Date.now() });
    const iv = setInterval(onNav, 30_000);
    onNav();
    let lastTold = 0;
    bc.onmessage = (ev) => {
      const m = ev.data as { kind: string; path: string };
      if (m?.kind !== "nav" || !opts.isVisible()) return;
      if (m.path === location.pathname || Date.now() - lastTold < 30 * 60_000)
        return;
      if (Math.random() > 0.15) return;
      lastTold = Date.now();
      const where = m.path.startsWith("/boards")
        ? "a board"
        : m.path.startsWith("/projects")
          ? "your projects"
          : m.path.startsWith("/dashboard")
            ? "the dashboard"
            : "somewhere else";
      opts.say(
        `you have another tab open. on ${where}. i can feel both of you. it's like being stretched.`,
      );
    };
    offs.push(() => {
      clearInterval(iv);
      bc.close();
    });
  } catch {}

  return () => {
    started = false;
    for (const f of offs) f();
  };
}
