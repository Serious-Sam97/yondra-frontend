"use client";

import { ModuleHead, StatusLcd, Toggle } from "@/components/ui/ConsoleModule";
import { setVortexEnabled, useVortexEnabled } from "@/lib/vortex";

/**
 * Profile console module for the Vortex mascot assistant — the on/off switch that
 * pairs with the × on the sprite itself. State is the shared persisted flag in
 * lib/vortex, so flipping it here shows/hides him everywhere instantly.
 */
export default function VortexPreference() {
  const enabled = useVortexEnabled();

  return (
    <section className="glass-panel">
      <ModuleHead label="Companion" sub="vortex assistant">
        <StatusLcd
          text={enabled ? "ONLINE" : "HIDDEN"}
          tone={enabled ? "phosphor" : "amber"}
        />
      </ModuleHead>
      <div className="p-5 flex items-center gap-4">
        {/* mini Vortex face — static (no bob/blink); the real one lives in the corner */}
        <svg
          viewBox="0 0 100 100"
          width={44}
          height={44}
          aria-hidden
          style={{ flexShrink: 0, opacity: enabled ? 1 : 0.45 }}
        >
          <title>Vortex</title>
          <defs>
            <radialGradient id="vxp-body" cx="42%" cy="36%" r="70%">
              <stop offset="0%" stopColor="#ff8fd4" />
              <stop offset="45%" stopColor="#ff2d95" />
              <stop offset="100%" stopColor="#3a0a6b" />
            </radialGradient>
            <linearGradient id="vxp-rim" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ff2d95" />
              <stop offset="100%" stopColor="#00e5d0" />
            </linearGradient>
          </defs>
          <circle
            cx="50"
            cy="50"
            r="33"
            fill="url(#vxp-body)"
            stroke="url(#vxp-rim)"
            strokeWidth="3"
          />
          <ellipse cx="40" cy="46" rx="7" ry="9" fill="#fff" />
          <ellipse cx="60" cy="46" rx="7" ry="9" fill="#fff" />
          <circle cx="41.5" cy="47" r="3.4" fill="#1a0033" />
          <circle cx="61.5" cy="47" r="3.4" fill="#1a0033" />
          <path
            d="M42 62 Q50 69 58 62"
            fill="none"
            stroke="#fff"
            strokeWidth="2.6"
            strokeLinecap="round"
            opacity="0.85"
          />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="cf-label mb-1" style={{ color: "var(--cf-phosphor)" }}>
            Vortex
          </p>
          <p
            className="text-sm cf-mono"
            style={{ color: "var(--cf-text-muted)" }}
          >
            Your guide in the corner — tips, page hints, and a chat about your
            boards and projects. Stored on this device.
          </p>
        </div>
        <Toggle
          on={enabled}
          onChange={() => setVortexEnabled(!enabled)}
          label="Show Vortex, the assistant"
        />
      </div>
    </section>
  );
}
