"use client";

import { useEmbedded } from "./embed";

// App chrome that shouldn't show when Yondra is embedded inside Yutopia.
export function NotInEmbed({ children }: { children: React.ReactNode }) {
  if (useEmbedded()) return null;
  return children;
}
