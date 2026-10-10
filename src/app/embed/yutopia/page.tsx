"use client";

import { useEffect, useState } from "react";
import { YUTOPIA_ORIGINS } from "@/components/yutopia/embed";

// Bootstrap for Yondra-inside-Yutopia. Makes no API calls (so no 401 redirect
// can race it): asks the parent for the token, stores it, then opens the real
// page in embed mode. Only same-app paths are allowed as targets.
export default function YutopiaEmbedBootstrap() {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const to = params.get("to") ?? "/";
    const safeTo = to.startsWith("/") && !to.startsWith("//") ? to : "/";
    try {
      sessionStorage.setItem("yd:yutopia-embed", "1");
    } catch {}
    const go = () =>
      location.replace(
        `${safeTo}${safeTo.includes("?") ? "&" : "?"}embed=yutopia`,
      );
    if (window.parent === window) return go();

    const onMessage = (e: MessageEvent) => {
      if (
        !YUTOPIA_ORIGINS.includes(e.origin) ||
        e.data?.type !== "yutopia:auth"
      )
        return;
      if (typeof e.data.token === "string" && e.data.token) {
        try {
          localStorage.setItem("token", e.data.token);
        } catch {}
      }
      go();
    };
    window.addEventListener("message", onMessage);
    for (const origin of YUTOPIA_ORIGINS)
      window.parent.postMessage({ type: "yondra:ready", path: safeTo }, origin);
    const t = setTimeout(() => setFailed(true), 6000);
    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(t);
    };
  }, []);

  return (
    <main
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "60vh",
        fontFamily: "VT323, monospace",
        color: "#ffb35c",
        fontSize: 24,
      }}
    >
      {failed ? "Couldn't reach Yutopia." : "Patching through from Yutopia…"}
    </main>
  );
}
