import { vxSound } from "@/components/vortex/vortexSound";
import { body, centre, pick, say, wait, weirdOn, where } from "./bridge";

// R-01 · the screen is a torus: he leaves through one edge and comes back
// through the opposite one. Sometimes he takes his time out there, and you
// hear him knocking on the glass from the outside.
// R-02 · two Yondra tabs side by side: he walks out of one and into the other
// (BroadcastChannel; the windows' screen positions say which side is which).

let busy = false;

function edgeKnock(side: "left" | "right" | "top" | "bottom", y: number) {
  const k = document.createElement("div");
  k.className = `vxw-knock vxw-knock--${side}`;
  k.style.setProperty("--y", `${y}px`);
  k.textContent = "knock";
  document.body.appendChild(k);
  navigator.vibrate?.([18, 70, 18]); // R-08 · a tap on the glass
  vxSound("tink");
  setTimeout(() => k.remove(), 900);
}

export async function wrapAround(force = false): Promise<void> {
  if (busy) return;
  const r = where();
  if (!r) return;
  busy = true;
  try {
    const c = centre(r);
    const W = window.innerWidth;
    const H = window.innerHeight;
    const out = r.width;
    const horizontal = force || Math.random() < 0.75;
    const goRight = c.x > W / 2 ? Math.random() < 0.7 : Math.random() < 0.3;
    const goDown = c.y > H / 2;
    const y = Math.max(120, Math.min(H - 120, c.y));
    const x = Math.max(80, Math.min(W - 80, c.x));
    // leave
    if (horizontal)
      body({ cmd: "place", x: goRight ? W + out : -out, y, ms: 900 });
    else body({ cmd: "place", x, y: goDown ? H + out : -out, ms: 900 });
    vxSound("hiss");
    await wait(950);
    // the long way round: he's outside, knocking
    if (Math.random() < 0.35) {
      const knocks = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < knocks; i++) {
        await wait(900 + Math.random() * 1400);
        edgeKnock(
          horizontal ? (goRight ? "left" : "right") : goDown ? "top" : "bottom",
          y,
        );
      }
      await wait(700);
    }
    // come back through the opposite edge
    if (horizontal)
      body({ cmd: "place", x: goRight ? -out : W + out, y, ms: 0 });
    else body({ cmd: "place", x, y: goDown ? -out : H + out, ms: 0 });
    await wait(60);
    const inX = horizontal ? (goRight ? 110 : W - 110) : x;
    const inY = horizontal ? y : goDown ? 150 : H - 150;
    body({ cmd: "place", x: inX, y: inY, ms: 800 });
    await wait(850);
    say(
      pick([
        "the universe is round. i checked. twice.",
        "asteroids rules. i leave right, i come back left. physics is a suggestion.",
        "it's cold out there. outside the window. don't ask.",
        "you didn't let me in. i had to go all the way around.",
      ]),
    );
    await wait(4000);
    body({ cmd: "home" });
  } finally {
    busy = false;
  }
}

/* ── R-02 ── */
type Peer = {
  id: string;
  x: number;
  w: number;
  seen: number;
  visible: boolean;
};
type Msg =
  | { t: "hi"; id: string; x: number; w: number; visible: boolean }
  | { t: "arrive"; to: string; from: "left" | "right"; y: number };

export function startTabs(): () => void {
  if (typeof BroadcastChannel === "undefined") return () => {};
  const id = Math.random().toString(36).slice(2);
  const ch = new BroadcastChannel("vortex-hop");
  const peers = new Map<string, Peer>();
  const hello = () =>
    ch.postMessage({
      t: "hi",
      id,
      x: window.screenX,
      w: window.outerWidth,
      visible: !document.hidden,
    } satisfies Msg);
  ch.onmessage = async (e: MessageEvent<Msg>) => {
    const m = e.data;
    if (m.t === "hi") {
      peers.set(m.id, {
        id: m.id,
        x: m.x,
        w: m.w,
        visible: m.visible,
        seen: Date.now(),
      });
      return;
    }
    if (m.t === "arrive" && m.to === id && weirdOn("tabs")) {
      const W = window.innerWidth;
      const y = m.y * window.innerHeight;
      body({ cmd: "show" });
      body({ cmd: "place", x: m.from === "left" ? -90 : W + 90, y, ms: 0 });
      await wait(60);
      body({ cmd: "place", x: m.from === "left" ? 120 : W - 120, y, ms: 800 });
      await wait(900);
      say(
        pick([
          "it's draughty in that other tab.",
          "the other you is worse. i checked.",
          "commute's terrible between windows.",
        ]),
      );
      await wait(3500);
      body({ cmd: "home" });
    }
  };
  hello();
  const iv = setInterval(hello, 5000);
  const onVis = () => hello();
  document.addEventListener("visibilitychange", onVis);

  // every few minutes, if a visible tab sits right next to this one, he walks over
  const hop = setInterval(async () => {
    if (!weirdOn("tabs") || document.hidden || busy || Math.random() > 0.35)
      return;
    const me = { x: window.screenX, w: window.outerWidth };
    const now = Date.now();
    const next = [...peers.values()].find(
      (p) =>
        p.visible &&
        now - p.seen < 12_000 &&
        (Math.abs(p.x - (me.x + me.w)) < 60 || Math.abs(p.x + p.w - me.x) < 60),
    );
    const r = where();
    if (!next || !r) return;
    busy = true;
    const right = next.x > me.x;
    const c = centre(r);
    body({
      cmd: "place",
      x: right ? window.innerWidth + 90 : -90,
      y: c.y,
      ms: 900,
    });
    await wait(950);
    body({ cmd: "hide" });
    ch.postMessage({
      t: "arrive",
      to: next.id,
      from: right ? "left" : "right",
      y: c.y / window.innerHeight,
    } satisfies Msg);
    // he comes back eventually (this tab still needs a ghost)
    await wait(45_000);
    body({
      cmd: "place",
      x: right ? window.innerWidth + 90 : -90,
      y: c.y,
      ms: 0,
    });
    body({ cmd: "show" });
    await wait(60);
    body({ cmd: "home" });
    busy = false;
  }, 150_000);

  return () => {
    clearInterval(iv);
    clearInterval(hop);
    document.removeEventListener("visibilitychange", onVis);
    ch.close();
  };
}
