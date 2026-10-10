"use client";

import { apiFetch } from "@/lib/api";
import { YUTOPIA_URL } from "./embed";

// Open Yutopia already signed in as the current Yondra user: the backend issues a
// one-time handoff code (60 s) that Yutopia trades for its own token. The window
// is opened before the request so popup blockers keep it (it's a click handler).
export async function openYutopia(to?: string): Promise<boolean> {
  const win = window.open("about:blank", "yutopia");
  try {
    const { code, url } = await apiFetch<{ code: string; url: string }>(
      "/api/yutopia/handoff",
      { method: "POST" },
    );
    const base = url
      ? url.split("/handoff")[0]
      : YUTOPIA_URL.replace(/\/$/, "");
    const dest = `${base}/handoff?code=${encodeURIComponent(code)}${to ? `&to=${encodeURIComponent(to)}` : ""}`;
    if (win) win.location.href = dest;
    else window.location.href = dest;
    return true;
  } catch {
    win?.close();
    return false;
  }
}
