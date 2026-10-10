"use client";

import { useEffect } from "react";

// Q-03 · browser notifications while the tab sits in the background: at most
// ONE per day, only after you switched it on and the browser said yes. Q-05 ·
// optionally, at 03:13 local time, a single "you up?". Nothing else, ever.

const KEY = "vx-pager";
interface Pager {
  on: boolean;
  night: boolean;
  last?: string; // date of the last daytime page
  lastNight?: string;
}
const today = () => new Date().toISOString().slice(0, 10);

export function readPager(): Pager {
  try {
    return {
      on: false,
      night: false,
      ...JSON.parse(localStorage.getItem(KEY) ?? "{}"),
    };
  } catch {
    return { on: false, night: false };
  }
}
export function writePager(p: Pager) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* private mode: the pager just forgets */
  }
}

function page(title: string, body: string) {
  if (
    typeof Notification === "undefined" ||
    Notification.permission !== "granted"
  )
    return false;
  try {
    const n = new Notification(title, {
      body,
      icon: "/icon.png",
      tag: "vortex",
      silent: false,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
    return true;
  } catch {
    return false;
  }
}

export default function Pager() {
  useEffect(() => {
    const onSay = (e: Event) => {
      if (!document.hidden) return;
      const p = readPager();
      if (!p.on || p.last === today()) return;
      const text = (e as CustomEvent<{ text?: string }>).detail?.text;
      if (text && page("vortex", text.slice(0, 140)))
        writePager({ ...p, last: today() });
    };
    window.addEventListener("vortex:say", onSay);
    const tick = setInterval(() => {
      const d = new Date();
      if (d.getHours() !== 3 || d.getMinutes() !== 13) return;
      const p = readPager();
      if (!p.night || p.lastNight === today()) return;
      if (page("vortex", "you up?")) writePager({ ...p, lastNight: today() });
    }, 20_000);
    return () => {
      window.removeEventListener("vortex:say", onSay);
      clearInterval(tick);
    };
  }, []);
  return null;
}
