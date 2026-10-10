"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { fetchBoards } from "@/lib/auth";
import { getVortexIntensity } from "@/lib/vortex";
import { tr, useVxLang } from "@/vortex/core/i18n";
import { body, centre, say, wait } from "./bridge";

// R-20 · he drives. A guided tour where HE navigates: page after page, flying
// to the thing he's talking about. Polite = an actual onboarding; otherwise,
// the roast version for people who've been here too long. The stop button is
// always on screen and Escape works too.

interface Step {
  path: string | (() => Promise<string | null>);
  at: string[]; // selectors to fly to (first visible wins)
  polite: string;
  rude: string;
}

const firstBoard = async () => {
  const { owned, shared } = await fetchBoards();
  const b = owned[0] ?? shared[0];
  return b ? `/boards/${b.id}` : null;
};

const STEPS: Step[] = [
  {
    path: "/dashboard",
    at: [".hf-np", "main h1", "main"],
    polite:
      "this is the dashboard: what's playing now, what's late, what moved this week.",
    rude: "the dashboard. numbers pretending to be feelings. that tape window is where i live. rent-free.",
  },
  {
    path: firstBoard,
    at: [".mt-jx", "main h1", "main"],
    polite:
      "a board. drag cards between columns; open one to edit it. drop a card on me and i'll eat it (gently).",
    rude: "your board. i've seen it. i've SEEN it. drag a card onto me sometime. i'm hungry and you're slow.",
  },
  {
    path: "/arcade",
    at: ["canvas", "main h1", "main"],
    polite: "the arcade: short games between tasks. scores are per team.",
    rude: "the arcade. thirteen games. you've played one. the same one. every time.",
  },
  {
    path: "/gazette",
    at: ["main h1", "main"],
    polite: "the below gazette: a weekly paper written from your real week.",
    rude: "the gazette. it's about you. it's not flattering. it's journalism.",
  },
  {
    path: "/below",
    at: ["main", "svg"],
    polite:
      "the below: a little world under the app. explore it whenever you like.",
    rude: "the below. my basement. mind the stairs. mind the thing ON the stairs.",
  },
  {
    path: "/profile",
    at: [".vxu", "main h1", "main"],
    polite: "your settings. everything i do can be switched off here.",
    rude: "the off switches. all of them. you'll never use them. you like me too much.",
  },
];

export default function Tour({ onDone }: { onDone: () => void }) {
  useVxLang(); // T-13 · re-render on language change
  const router = useRouter();
  const [i, setI] = useState(0);
  const alive = useRef(true);
  const polite = getVortexIntensity() === "polite";

  useEffect(() => {
    alive.current = true;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone();
    };
    window.addEventListener("keydown", onKey);
    (async () => {
      say(
        polite
          ? "a quick tour. you can stop it any time."
          : "buckle up. i'm driving. hands off the wheel. the wheel is the mouse.",
      );
      for (let k = 0; k < STEPS.length && alive.current; k++) {
        setI(k);
        const s = STEPS[k];
        const path =
          typeof s.path === "string"
            ? s.path
            : await s.path().catch(() => null);
        if (!path) continue;
        router.push(path);
        await wait(2200);
        if (!alive.current) return;
        const el = s.at
          .map((q) => document.querySelector<HTMLElement>(q))
          .find((n) => n && n.getBoundingClientRect().width > 0);
        if (el) {
          const r = el.getBoundingClientRect();
          const c = centre(r);
          body({
            cmd: "travel",
            x: Math.min(
              window.innerWidth - 120,
              c.x + Math.min(160, r.width / 2),
            ),
            y: Math.max(150, Math.min(window.innerHeight - 140, c.y)),
          });
          await wait(1200);
        }
        say(polite ? s.polite : s.rude);
        await wait(polite ? 5200 : 6200);
      }
      if (alive.current) {
        say(
          polite
            ? "that's the tour. i'm in the corner if you need me."
            : "tour's over. tips are appreciated. tips are mandatory.",
        );
        onDone();
      }
    })();
    return () => {
      alive.current = false;
      window.removeEventListener("keydown", onKey);
      body({ cmd: "home" });
    };
  }, [onDone, polite, router]);

  return (
    <output className="vxw-tour">
      <span className="rec">{tr("● VORTEX IS DRIVING")}</span>
      <span>
        {i + 1}/{STEPS.length}
      </span>
      <button type="button" onClick={onDone}>
        {tr("stop the tour")}
      </button>
    </output>
  );
}
