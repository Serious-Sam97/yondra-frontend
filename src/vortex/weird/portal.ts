import { vxSound } from "@/components/vortex/vortexSound";
import { centre, wait, where } from "./bridge";

// R-11 · the portal: the page twists and drains into his body — it spins
// down toward him while an SVG displacement melts it like tape in a hot car —
// and through the hole you can already see where you're going. Browsers that
// won't filter HTML still get the spiral zoom; reduced motion gets a fade.

function ensureFilter(): SVGFEDisplacementMapElement | null {
  let svg = document.getElementById("vxw-portal-svg") as SVGSVGElement | null;
  if (!svg) {
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.id = "vxw-portal-svg";
    svg.setAttribute("aria-hidden", "true");
    svg.style.cssText = "position:fixed;width:0;height:0;pointer-events:none";
    svg.innerHTML = `<filter id="vxw-swirl" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
      <feTurbulence type="turbulence" baseFrequency="0.006 0.018" numOctaves="2" seed="13" result="melt"/>
      <feDisplacementMap in="SourceGraphic" in2="melt" scale="0" xChannelSelector="R" yChannelSelector="G"/>
    </filter>`;
    document.body.appendChild(svg);
  }
  return svg.querySelector("feDisplacementMap");
}

export type Destination = "below" | "dimension" | "home";

const PREVIEW: Record<Destination, string> = {
  below:
    "radial-gradient(circle at 50% 70%, #ff3b2f33, transparent 60%), repeating-linear-gradient(180deg, #2a0006 0 14px, #160003 14px 28px)",
  dimension:
    "conic-gradient(from 0deg, #ff2e88, #ffd319, #2ba7a0, #6a00ff, #ff2e88)",
  home: "radial-gradient(circle, #0d1f2e, #000)",
};

function host(): HTMLElement[] {
  return [...document.body.children].filter(
    (el): el is HTMLElement =>
      el instanceof HTMLElement &&
      !el.matches(
        "script, .vxa-layer, #vxw-portal-svg, .vxw-hole, .vxw-rubble",
      ) &&
      !el.querySelector(".vxa-layer"),
  );
}

/** twist the page into him (`dir` in) or untwist it out of him (`dir` out) */
export async function portal(
  dir: "in" | "out",
  to: Destination = "dimension",
): Promise<void> {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.add("vxw-fade");
    await wait(260);
    document.documentElement.classList.remove("vxw-fade");
    return;
  }
  const r = where();
  const c = r
    ? centre(r)
    : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const W = window.innerWidth;
  const H = window.innerHeight;
  const disp = ensureFilter();

  const hole = document.createElement("div");
  hole.className = "vxw-hole";
  hole.style.setProperty("--x", `${c.x}px`);
  hole.style.setProperty("--y", `${c.y}px`);
  hole.style.background = PREVIEW[to];
  document.body.appendChild(hole);

  const els = host();
  for (const el of els) {
    el.style.transformOrigin = `${c.x}px ${c.y + window.scrollY}px`;
    el.style.filter = "url(#vxw-swirl)";
    el.style.willChange = "transform, filter";
  }
  vxSound(dir === "in" ? "whisper" : "rewind");
  const ms = 900;
  const t0 = performance.now();
  await new Promise<void>((done) => {
    const frame = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const k = dir === "in" ? p ** 1.3 : (1 - p) ** 1.3; // twist amount 0→1 (in) or 1→0 (out)
      disp?.setAttribute("scale", String(k * 220));
      const s = 1 - k * 0.85;
      for (const el of els)
        el.style.transform = `rotate(${k * 200}deg) scale(${s})`;
      hole.style.setProperty(
        "--r",
        `${Math.max(0, k * 1.15 - 0.15) * Math.hypot(W, H)}px`,
      );
      if (p < 1) requestAnimationFrame(frame);
      else done();
    };
    requestAnimationFrame(frame);
  });
  if (dir === "out") {
    for (const el of els) {
      el.style.transform = "";
      el.style.filter = "";
      el.style.transformOrigin = "";
      el.style.willChange = "";
    }
    hole.remove();
  } else {
    // keep the hole open until the "out" call (or 4 s, whichever first)
    setTimeout(() => {
      if (!hole.isConnected) return;
      for (const el of els) {
        el.style.transform = "";
        el.style.filter = "";
      }
      hole.remove();
    }, 4000);
    pending = () => {
      for (const el of els) {
        el.style.transform = "";
        el.style.filter = "";
        el.style.transformOrigin = "";
        el.style.willChange = "";
      }
      hole.remove();
    };
  }
}

let pending: (() => void) | null = null;
/** the in-portal left the page twisted; clear it before untwisting the new one */
export function settle() {
  pending?.();
  pending = null;
}
