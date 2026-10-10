"use client";

import { useEffect } from "react";
import { isEmbedded, YUTOPIA_ORIGINS } from "./embed";

// While Yondra is embedded in Yutopia: mark the page (CSS hooks) and let Esc
// close the panel in the parent. Auth happens once, in /embed/yutopia.
export function YutopiaBridge() {
  useEffect(() => {
    if (!isEmbedded()) return;
    document.documentElement.classList.add("yutopia-embed");
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.querySelector("[role=dialog]")) return;
      for (const origin of YUTOPIA_ORIGINS)
        window.parent.postMessage({ type: "yondra:close" }, origin);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
