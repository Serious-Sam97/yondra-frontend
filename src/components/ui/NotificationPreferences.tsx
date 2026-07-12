"use client";

import { useEffect, useState } from "react";
import { ModuleHead, StatusLcd } from "@/components/ui/ConsoleModule";
import {
  getNotificationPreferences,
  type NotificationMatrix,
  type NotificationPreferenceCatalog,
  updateNotificationPreferences,
} from "@/lib/api";

type SaveState = "idle" | "saving" | "saved" | "error";

// Channel-header LED colors: phosphor = live, amber = rolling out, cyan = WhatsApp.
const CHANNEL_LEDS: Record<string, string> = {
  in_app: "var(--cf-phosphor)",
  email: "var(--cf-phosphor)",
  push: "var(--cf-amber)",
  whatsapp: "var(--cf-cyan)",
};

// A single on/off switch styled to the cassette-futurism palette.
function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className="btn-physical cursor-pointer relative flex-shrink-0"
      style={{
        width: 40,
        height: 22,
        borderRadius: 999,
        border: "1.5px solid var(--cf-edge)",
        background: on ? "var(--cf-phosphor)" : "#2a2823",
        boxShadow: on
          ? "0 0 8px rgba(154,166,126,0.5), inset 0 1px 2px rgba(0,0,0,0.3)"
          : "inset 0 1px 3px rgba(0,0,0,0.5)",
        transition: "background 160ms ease, box-shadow 160ms ease",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 2,
          left: on ? 20 : 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: on ? "#14130f" : "#cfcabb",
          transition: "left 160ms var(--ease-expo, ease)",
        }}
      />
    </button>
  );
}

export default function NotificationPreferences() {
  const [catalog, setCatalog] = useState<NotificationPreferenceCatalog | null>(
    null,
  );
  const [matrix, setMatrix] = useState<NotificationMatrix>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");

  useEffect(() => {
    getNotificationPreferences()
      .then((c) => {
        setCatalog(c);
        setMatrix(c.preferences);
      })
      .catch(() => setSaveState("error"));
  }, []);

  const persist = async (next: NotificationMatrix) => {
    setSaveState("saving");
    try {
      const updated = await updateNotificationPreferences(next);
      setMatrix(updated.preferences);
      setSaveState("saved");
      setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 1600);
    } catch {
      setSaveState("error");
    }
  };

  const toggle = (event: string, channel: string) => {
    const next: NotificationMatrix = {
      ...matrix,
      [event]: { ...matrix[event], [channel]: !matrix[event]?.[channel] },
    };
    setMatrix(next); // optimistic
    persist(next);
  };

  const lcd =
    saveState === "saving"
      ? { text: "SAVING…", tone: "amber" as const }
      : saveState === "saved"
        ? { text: "SAVED ✓", tone: "phosphor" as const }
        : saveState === "error"
          ? { text: "ERROR", tone: "red" as const }
          : { text: "AUTO-SAVE", tone: "phosphor" as const };

  return (
    <section className="glass-panel">
      <ModuleHead label="Comms matrix" sub="notifications">
        <StatusLcd text={lcd.text} tone={lcd.tone} />
      </ModuleHead>
      <div className="p-5">
        {!catalog ? (
          <p
            className="text-sm cf-mono"
            style={{ color: "var(--cf-text-muted)" }}
          >
            {saveState === "error" ? "Failed to load preferences." : "Loading…"}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <div style={{ minWidth: 420 }}>
                {/* Header row: channel LEDs */}
                <div
                  className="flex items-end gap-2 pb-3 mb-1"
                  style={{ borderBottom: "1.5px solid var(--cf-edge)" }}
                >
                  <div className="flex-1 cf-label" style={{ fontSize: 10 }}>
                    Event
                  </div>
                  {catalog.channels.map((ch) => (
                    <div
                      key={ch.key}
                      className="flex flex-col items-center gap-1.5"
                      style={{ width: 60 }}
                    >
                      <span
                        className="cf-led"
                        style={{
                          background:
                            CHANNEL_LEDS[ch.key] ?? "var(--cf-phosphor)",
                          boxShadow: `0 0 7px ${CHANNEL_LEDS[ch.key] ?? "var(--cf-phosphor)"}`,
                        }}
                      />
                      <span
                        className="cf-mono text-center"
                        style={{
                          fontSize: 9.5,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "var(--cf-text-muted)",
                        }}
                      >
                        {ch.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* One row per event type */}
                {catalog.event_types.map((evt) => (
                  <div
                    key={evt.key}
                    className="flex items-center gap-2 py-2.5"
                    style={{ borderBottom: "1px solid var(--cf-edge)" }}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <p
                          className="text-sm font-bold truncate"
                          style={{ color: "var(--cf-text)" }}
                        >
                          {evt.label}
                        </p>
                        {!evt.active && (
                          <span
                            className="cf-mono flex-shrink-0"
                            style={{
                              fontSize: 9,
                              padding: "1px 5px",
                              borderRadius: 4,
                              background: "rgba(255,176,0,0.14)",
                              border: "1px solid rgba(255,176,0,0.4)",
                              color: "var(--cf-amber)",
                            }}
                          >
                            SOON
                          </span>
                        )}
                      </div>
                      <p
                        className="text-xs cf-mono truncate"
                        style={{ color: "var(--cf-text-dim)" }}
                      >
                        {evt.description}
                      </p>
                    </div>
                    {catalog.channels.map((ch) => (
                      <div
                        key={ch.key}
                        className="flex justify-center"
                        style={{ width: 60 }}
                      >
                        <Toggle
                          on={!!matrix[evt.key]?.[ch.key]}
                          onChange={() => toggle(evt.key, ch.key)}
                          label={`${evt.label} — ${ch.label}`}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <p
              className="text-xs cf-mono mt-3.5"
              style={{ color: "var(--cf-text-dim)", lineHeight: 1.55 }}
            >
              In-app powers the live bell &amp; toasts, and email is active for
              the events you enable. Push is rolling out — your choices are
              saved and take effect once it ships. WhatsApp needs a linked
              number in IDENT above.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
