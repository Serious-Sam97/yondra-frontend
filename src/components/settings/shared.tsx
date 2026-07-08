"use client";

import type { BoardPermission } from "@/interfaces/BoardInterface";
import { ApiError } from "@/lib/api";

// Turn an ApiError into something a human can read: prefer Laravel's
// validation messages, never show raw status codes or JSON. (Mirrors profile/page.tsx.)
export function friendlyMessage(e: unknown, fallback: string): string {
  if (e instanceof ApiError) {
    try {
      const data = JSON.parse(e.body);
      const firstError = data.errors
        ? (Object.values(data.errors).flat() as string[])[0]
        : null;
      return firstError ?? data.message ?? fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export type Feedback = { type: "success" | "error"; message: string } | null;

export function FeedbackBanner({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  const ok = feedback.type === "success";
  return (
    <div
      className="text-sm px-4 py-2 rounded-xl cf-mono"
      style={
        ok
          ? {
              background: "rgba(154,166,126,0.14)",
              border: "1px solid var(--cf-phosphor)",
              color: "var(--cf-phosphor)",
            }
          : {
              background: "rgba(255,90,77,0.16)",
              border: "1px solid var(--cf-red)",
              color: "var(--cf-red)",
            }
      }
    >
      {feedback.message}
    </div>
  );
}

export function PanelHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="cf-label" style={{ color: "var(--cf-phosphor)" }}>
      {children}
    </p>
  );
}

// --- Board accent (background) palette — the Cassette-Futurism LED set ---

export type AccentKey =
  | "default"
  | "phosphor"
  | "amber"
  | "cyan"
  | "red"
  | "magenta";

export const ACCENTS: { key: AccentKey; label: string; color: string }[] = [
  { key: "default", label: "Default", color: "var(--cf-edge)" },
  { key: "phosphor", label: "Phosphor", color: "#9aa67e" },
  { key: "amber", label: "Amber", color: "#ffb000" },
  { key: "cyan", label: "Cyan", color: "#6fe0ff" },
  { key: "red", label: "Red", color: "#ff5a4d" },
  { key: "magenta", label: "Magenta", color: "#ff6fd8" },
];

// Board access levels, coloured to match the project roles: owner→amber,
// write→phosphor (edit), read→cyan (view). (Lifted from ShareModal.)
export const PERM_META: Record<
  BoardPermission,
  { color: string; bg: string; glow: string }
> = {
  read: {
    color: "var(--cf-cyan, #6fe0ff)",
    bg: "rgba(111,224,255,0.14)",
    glow: "rgba(111,224,255,0.35)",
  },
  write: {
    color: "var(--cf-phosphor, #9aa67e)",
    bg: "rgba(154,166,126,0.16)",
    glow: "rgba(154,166,126,0.4)",
  },
  owner: {
    color: "var(--cf-amber, #ffb000)",
    bg: "rgba(255,176,0,0.15)",
    glow: "rgba(255,176,0,0.4)",
  },
};

const AVATAR_COLORS = [
  "#4CAF50",
  "#FF9800",
  "#1976D2",
  "#F44336",
  "#7B1FA2",
  "#FFC107",
  "#00BCD4",
  "#E91E63",
];
export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

export function RingAvatar({
  id,
  name,
  ring,
}: {
  id: number;
  name: string;
  ring: string;
}) {
  return (
    <span
      className="rounded-full flex-shrink-0"
      style={{
        boxShadow: `0 0 0 1.5px var(--cf-panel, #26241f), 0 0 0 3px ${ring}`,
      }}
    >
      <span
        className="cf-mono rounded-full flex items-center justify-center text-white font-bold"
        title={name}
        style={{
          width: 30,
          height: 30,
          fontSize: 12,
          backgroundColor: AVATAR_COLORS[id % AVATAR_COLORS.length],
        }}
      >
        {initials(name)}
      </span>
    </span>
  );
}

// Segmented Read · Write · Owner control — same language as the project roles.
export function PermSegments({
  value,
  onChange,
}: {
  value: BoardPermission;
  onChange: (p: BoardPermission) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Access level"
      className="inline-flex gap-0.5 p-0.5 rounded-lg flex-shrink-0"
      style={{
        background: "var(--cf-screen, #0d1410)",
        border: "1px solid #14130f",
        boxShadow: "inset 0 1px 3px rgba(0,0,0,0.6)",
      }}
    >
      {(["read", "write", "owner"] as const).map((p) => {
        const active = value === p;
        return (
          <button
            key={p}
            type="button"
            onClick={() => !active && onChange(p)}
            className="cf-mono uppercase font-bold rounded-md px-2 py-1 cursor-pointer transition-all duration-150"
            style={{
              fontSize: "9px",
              letterSpacing: "0.1em",
              color: active
                ? PERM_META[p].color
                : "var(--cf-text-dim, #6f6a5c)",
              background: active ? PERM_META[p].bg : "transparent",
              boxShadow: active ? `0 0 8px ${PERM_META[p].glow}` : undefined,
            }}
          >
            {p}
          </button>
        );
      })}
    </div>
  );
}
