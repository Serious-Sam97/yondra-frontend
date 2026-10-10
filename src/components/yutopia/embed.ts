"use client";

import { useSyncExternalStore } from "react";

// Yondra can be embedded inside Yutopia (the isometric world): a board opened
// from a board wall loads /boards/{id}?embed=yutopia in an iframe. In that mode
// the app chrome is hidden and a postMessage bridge talks to the parent.
const KEY = "yd:yutopia-embed";

export const YUTOPIA_ORIGINS = (
  process.env.NEXT_PUBLIC_YUTOPIA_ORIGINS ??
  "http://localhost:3100,http://localhost:3101"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const YUTOPIA_URL =
  process.env.NEXT_PUBLIC_YUTOPIA_URL ??
  YUTOPIA_ORIGINS[0] ??
  "http://localhost:3100";

export function isEmbedded(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(location.search).get("embed") === "yutopia") {
      sessionStorage.setItem(KEY, "1");
      return true;
    }
    return window.parent !== window && sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function useEmbedded(): boolean {
  return useSyncExternalStore(
    () => () => {},
    isEmbedded,
    () => false,
  );
}
