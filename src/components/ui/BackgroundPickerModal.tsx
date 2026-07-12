"use client";

import Modal from "@/components/shared/Modal";

const BG_OPTIONS = [
  { label: "Default", value: "" },
  { label: "Deep Navy", value: "#07090f" },
  { label: "Forest", value: "#070f09" },
  { label: "Plum", value: "#0d070f" },
  { label: "Warm Dark", value: "#100a07" },
  { label: "Graphite", value: "#0a0a0a" },
  { label: "Ocean", value: "linear-gradient(135deg,#060d1a 0%,#081525 100%)" },
  { label: "Dusk", value: "linear-gradient(135deg,#130d1a 0%,#07090f 100%)" },
  {
    label: "Deep Forest",
    value: "linear-gradient(135deg,#071309 0%,#07090f 100%)",
  },
  { label: "Sunset", value: "linear-gradient(135deg,#1a0707 0%,#100a07 100%)" },
];

interface BackgroundPickerModalProps {
  boardBg: string;
  onSelect: (bg: string) => void;
  onClose: () => void;
}

// Board background picker (per-device preference, persisted by the parent).
export function BackgroundPickerModal({
  boardBg,
  onSelect,
  onClose,
}: BackgroundPickerModalProps) {
  return (
    <Modal onClose={onClose}>
      <div className="aero-menu p-6 w-[95vw] max-w-sm flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <p
            className="cf-mono text-xs uppercase tracking-widest"
            style={{ color: "var(--cf-phosphor)" }}
          >
            Board background
          </p>
          <button
            onClick={onClose}
            className="cursor-pointer transition-colors"
            style={{ color: "var(--cf-text-muted)" }}
          >
            ✕
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {BG_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onSelect(opt.value)}
              style={
                boardBg === opt.value
                  ? {
                      borderColor: "var(--cf-phosphor)",
                      color: "var(--cf-text)",
                      background: "var(--cf-graphite)",
                      boxShadow: "0 0 10px rgba(154,166,126,0.4)",
                    }
                  : {
                      borderColor: "var(--cf-edge)",
                      color: "var(--cf-text-muted)",
                      background: "var(--cf-graphite)",
                    }
              }
              className="cf-mono flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-left transition-colors hover:opacity-100"
            >
              <div
                style={{
                  background: opt.value || "#111827",
                  borderColor: "var(--cf-edge)",
                }}
                className="w-5 h-5 rounded flex-shrink-0 border"
              />
              <span className="text-xs font-bold uppercase tracking-wide truncate">
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
