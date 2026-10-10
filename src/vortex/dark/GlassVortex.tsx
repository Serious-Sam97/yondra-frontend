"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { SvgArt } from "@/components/ui/SvgArt";
import { vortexSvg } from "@/lib/vortexArt";
import "./dark.css";

// H-28 · on the login page he's behind glass, like an exhibit, wanting out.
// He knocks now and then. At the dead hour the glass is cracked and he bangs on
// it. After the end of the story, for one frame, someone stands behind him.

export default function GlassVortex() {
  const uid = useId().replace(/[^a-z0-9]/gi, "");
  const [knock, setKnock] = useState(false);
  const [dead, setDead] = useState(false);
  const [behind, setBehind] = useState(false);
  const face = useMemo(
    () => vortexSvg(dead ? "terror" : "sideeye", `gl${uid}`, "none"),
    [dead, uid],
  );
  useEffect(() => {
    const check = () => {
      const d = new Date();
      setDead(
        d.getHours() === 3 && d.getMinutes() >= 13 && d.getMinutes() < 26,
      );
    };
    check();
    const t = setInterval(check, 20_000);
    const k = setInterval(() => {
      setKnock(true);
      setTimeout(() => setKnock(false), 700);
      try {
        if (
          localStorage.getItem("yd:vortex.sidec") === "1" &&
          Math.random() < 0.15
        ) {
          setBehind(true);
          setTimeout(() => setBehind(false), 60);
        }
      } catch {}
    }, 9000);
    return () => {
      clearInterval(t);
      clearInterval(k);
    };
  }, []);
  return (
    <div
      className={`vxh-glass${dead ? " is-cracked" : ""}${knock ? " is-knocking" : ""}`}
      aria-hidden
    >
      {behind && <i className="vxh-glass-behind" />}
      <SvgArt svg={face} className="vxh-glass-him" />
      <span className="vxh-glass-tag">
        {dead ? "LET ME OUT" : "exhibit 0 · do not tap the glass"}
      </span>
    </div>
  );
}
