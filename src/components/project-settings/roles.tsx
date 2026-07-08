"use client";

export type ProjectRole = "owner" | "member" | "viewer";

// Each role gets a colour from the console palette so it reads at a glance.
export const ROLE_META: Record<
  ProjectRole,
  { color: string; bg: string; border: string; glow: string; rank: number }
> = {
  owner: {
    color: "var(--cf-amber, #ffb000)",
    bg: "rgba(255,176,0,0.15)",
    border: "rgba(255,176,0,0.5)",
    glow: "rgba(255,176,0,0.4)",
    rank: 0,
  },
  member: {
    color: "var(--cf-phosphor, #9aa67e)",
    bg: "rgba(154,166,126,0.16)",
    border: "rgba(154,166,126,0.5)",
    glow: "rgba(154,166,126,0.4)",
    rank: 1,
  },
  viewer: {
    color: "var(--cf-cyan, #6fe0ff)",
    bg: "rgba(111,224,255,0.14)",
    border: "rgba(111,224,255,0.45)",
    glow: "rgba(111,224,255,0.35)",
    rank: 2,
  },
};

// Segmented Viewer · Member · Owner control — same pill language as the board share dialog.
export function RoleSegments({
  value,
  onChange,
  disabled,
}: {
  value: ProjectRole;
  onChange: (r: ProjectRole) => void;
  disabled?: boolean;
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
      {(["viewer", "member", "owner"] as const).map((r) => {
        const active = value === r;
        return (
          <button
            key={r}
            type="button"
            disabled={disabled}
            onClick={() => !active && onChange(r)}
            className="cf-mono uppercase font-bold rounded-md px-2 py-1 cursor-pointer transition-all duration-150 disabled:cursor-default"
            style={{
              fontSize: "9px",
              letterSpacing: "0.1em",
              color: active
                ? ROLE_META[r].color
                : "var(--cf-text-dim, #6f6a5c)",
              background: active ? ROLE_META[r].bg : "transparent",
              boxShadow: active ? `0 0 8px ${ROLE_META[r].glow}` : undefined,
            }}
          >
            {r}
          </button>
        );
      })}
    </div>
  );
}
