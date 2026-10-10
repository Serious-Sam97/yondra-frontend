"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getVortexFlag, setVortexFlag } from "@/lib/vortex";
import "./great-rewind.css";

// L-09 · THE GREAT REWIND, as one user sees it. Two weeks of clues; then one
// hour where the whole app slips into the rewound dimension and a counter of
// cards saved by everyone runs against the goal; then the result, once.
// The numbers are the server's (real completions); this only shows them.

interface View {
  phase: "none" | "announced" | "live" | "over";
  id?: string;
  starts_at?: string;
  ends_at?: string;
  goal?: number;
  saved?: number;
  result?: "held" | "rewound" | null;
}

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export default function GreatRewind({
  onSay,
  onPanic,
}: {
  onSay: (text: string) => void;
  onPanic: (on: boolean) => void;
}) {
  const [v, setV] = useState<View | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const said = useRef(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      apiFetch<View>("/api/mascot/great-rewind")
        .then((r) => alive && setV(r))
        .catch(() => {});
    void load();
    const iv = setInterval(load, 30_000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      alive = false;
      clearInterval(iv);
      clearInterval(tick);
    };
  }, []);

  const live = v?.phase === "live";
  useEffect(() => {
    document.documentElement.classList.toggle("vxl-rewound", live);
    onPanic(live);
    return () => document.documentElement.classList.remove("vxl-rewound");
  }, [live, onPanic]);

  // one line per session, by phase
  useEffect(() => {
    if (!v || said.current || !v.id) return;
    const t = setTimeout(() => {
      said.current = true;
      if (v.phase === "announced" && v.starts_at) {
        const d = new Date(v.starts_at);
        const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
        onSay(
          days <= 1
            ? `tomorrow. ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. the great rewind. every one of us. finish things that hour. please. i said please. remember that.`
            : `${days} days. ${d.toLocaleDateString([], { day: "numeric", month: "short" })}. something big is rewinding. every vortex can feel it. don't make plans. make cards.`,
        );
      }
      if (v.phase === "live")
        onSay(
          "IT'S HAPPENING. everyone, everywhere. every card you FINISH is a brick in the wall. GO.",
        );
      const seenKey = `gr-${v.id}`;
      if (v.phase === "over" && v.result && !getVortexFlag(seenKey)) {
        setVortexFlag(seenKey, true);
        onSay(
          v.result === "held"
            ? `we held it. ${v.saved ?? 0} cards. every vortex in every app is still here. you were part of that. don't let it go to your head. (let it go to your head a little.)`
            : "it got us. the whole tape lost a season. i can feel the gap. we'll be fine. we won't. we will.",
        );
      }
    }, 12_000);
    return () => clearTimeout(t);
  }, [v, onSay]);

  if (!live || !v?.ends_at) return null;
  const pct = Math.min(100, ((v.saved ?? 0) / Math.max(1, v.goal ?? 1)) * 100);
  return (
    <output className="vxl-gr" aria-live="polite">
      <b>◀◀ THE GREAT REWIND</b>
      <span>
        cards saved by everyone · {v.saved ?? 0}/{v.goal}
      </span>
      <i style={{ "--p": `${pct}%` } as React.CSSProperties} />
      <em>{fmt(new Date(v.ends_at).getTime() - now)} left</em>
    </output>
  );
}
