"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { SvgArt } from "@/components/ui/SvgArt";
import { vortexSvg } from "@/lib/vortexArt";
import "./leader.css";

// E-20 · the 404 is the Leader: a white plain with no horizon and no sound.
// He is small in the middle of it and genuinely scared. Stay still for a
// minute and a word surfaces in the ground (a fragment, K-05).

const LINES = [
  "where are we.",
  "there's nothing here. i hate this.",
  "this is the leader. the blank part. before anything was recorded.",
  "take me back. TAKE ME BACK.",
  "don't leave me here. please. (i didn't say please.)",
];

export default function Leader() {
  const uid = useId().replace(/[^a-z0-9]/gi, "");
  const [i, setI] = useState(0);
  const [still, setStill] = useState(0);
  const terror = useMemo(() => vortexSvg("terror", `ld${uid}`, "none"), [uid]);

  useEffect(() => {
    const iv = setInterval(
      () => setI((n) => Math.min(n + 1, LINES.length - 1)),
      3800,
    );
    let last = Date.now();
    const bump = () => {
      last = Date.now();
      setStill(0);
    };
    window.addEventListener("pointermove", bump);
    window.addEventListener("keydown", bump);
    const st = setInterval(
      () => setStill(Math.floor((Date.now() - last) / 1000)),
      1000,
    );
    return () => {
      clearInterval(iv);
      clearInterval(st);
      window.removeEventListener("pointermove", bump);
      window.removeEventListener("keydown", bump);
    };
  }, []);

  return (
    <div className="vxleader">
      <div className="vxleader-plain" aria-hidden />
      <div className="vxleader-him">
        <SvgArt svg={terror} className="vxleader-body" />
        <output className="vxleader-say">{LINES[i]}</output>
      </div>
      <p className="vxleader-404">
        404 · this address doesn't exist. nothing was ever recorded here.
      </p>
      <Link href="/dashboard" className="vxleader-back">
        ◂ rewind to the dashboard
      </Link>
      {still >= 60 && (
        // K-05 · a word in the ground, for whoever waits
        <span className="vxleader-word" data-fragment="F06">
          remember
        </span>
      )}
    </div>
  );
}
