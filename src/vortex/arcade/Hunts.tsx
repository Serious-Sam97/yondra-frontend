"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SvgArt } from "@/components/ui/SvgArt";
import { apiFetch } from "@/lib/api";
import { vortexSvg } from "@/lib/vortexArt";
import { loadCase } from "@/vortex/econ/econ";
import "./arcade.css";
import { sfx } from "./engine";

// M-14 · HIDE & SEEK 2 — he hides on some page of the app (the arcade gave
// you a clue); find the tiny him and click. The time it took is your score.
// M-15 · THE GOLDEN TAPE — one is hidden somewhere in the app each week; the
// first of your team to click it wins a golden token.

interface Seek {
  session: string;
  page: string;
  clue: string;
  x: number;
  y: number;
  at: number;
}
interface Golden {
  week: string;
  page: string;
  x: number;
  y: number;
  found_by: string | null;
}

const SEEK_KEY = "yd:vortex.seek";
const tiny = vortexSvg("sideeye", "seek", "none");

export default function Hunts() {
  const path = usePathname();
  const [seek, setSeek] = useState<Seek | null>(null);
  const [golden, setGolden] = useState<Golden | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-read on every navigation
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SEEK_KEY);
      setSeek(raw ? (JSON.parse(raw) as Seek) : null);
    } catch {
      setSeek(null);
    }
  }, [path]);
  useEffect(() => {
    if (!localStorage.getItem("token")) return;
    apiFetch<Golden>("/api/mascot/arcade/golden")
      .then(setGolden)
      .catch(() => {});
  }, []);

  const say = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(null), 6000);
  };

  const found = async () => {
    if (!seek) return;
    const secs = Math.round((Date.now() - seek.at) / 1000);
    sfx("coin");
    try {
      sessionStorage.removeItem(SEEK_KEY);
    } catch {}
    setSeek(null);
    try {
      const r = await apiFetch<{ tokens: number }>(
        "/api/mascot/arcade/finish",
        {
          method: "POST",
          body: JSON.stringify({
            session: seek.session,
            score: Math.max(1, 300 - secs),
          }),
        },
      );
      say(`found me in ${secs}s. +◉${r.tokens}. i let you. obviously.`);
      void loadCase();
    } catch {
      say(`found me in ${secs}s. the arcade didn't count it. nobody saw.`);
    }
  };

  const claim = async () => {
    if (!golden) return;
    try {
      await apiFetch("/api/mascot/arcade/golden", {
        method: "POST",
        body: JSON.stringify({ week: golden.week }),
      });
      sfx("coin");
      say(
        "THE GOLDEN TAPE. it's yours. a golden token for the case. your team will hear about this.",
      );
      setGolden({ ...golden, found_by: "you" });
      void loadCase();
    } catch {
      say(
        "someone on your team got here first. it's warm. they were just here.",
      );
      setGolden({ ...golden, found_by: "someone" });
    }
  };

  return (
    <>
      {seek && path === seek.page && (
        <button
          type="button"
          className="vxq-seek"
          style={{ left: `${seek.x}%`, top: `${seek.y}%` }}
          onClick={() => void found()}
          aria-label="something small and purple"
        >
          <SvgArt svg={tiny} />
        </button>
      )}
      {golden && !golden.found_by && path === golden.page && (
        <button
          type="button"
          className="vxq-golden"
          style={{ left: `${golden.x}%`, top: `${golden.y}%` }}
          onClick={() => void claim()}
          aria-label="a golden glint"
        />
      )}
      {toast && <output className="vxq-hunt-toast">{toast}</output>}
    </>
  );
}
