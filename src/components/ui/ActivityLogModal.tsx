"use client";

import Modal from "@/components/shared/Modal";
import type { ActivityEntry } from "@/hooks/useBoardActivity";

interface ActivityLogModalProps {
  entries: ActivityEntry[];
  onClose: () => void;
}

// Read-only board activity log modal.
export function ActivityLogModal({ entries, onClose }: ActivityLogModalProps) {
  return (
    <Modal onClose={onClose}>
      <div
        className="aero-menu p-6 w-[95vw] max-w-md flex flex-col gap-4"
        style={{ maxHeight: "80vh" }}
      >
        <div className="flex items-center justify-between flex-shrink-0">
          <p
            className="cf-mono text-xs uppercase tracking-widest"
            style={{ color: "var(--cf-phosphor)" }}
          >
            Activity log
          </p>
          <button
            onClick={onClose}
            className="cursor-pointer transition-colors"
            style={{ color: "var(--cf-text-muted)" }}
          >
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-3 overflow-y-auto">
          {entries.length === 0 && (
            <p
              className="cf-mono text-xs text-center py-6"
              style={{ color: "var(--cf-text-muted)" }}
            >
              No activity yet.
            </p>
          )}
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3">
              <div
                className="cf-led flex-shrink-0 mt-1.5"
                style={{
                  background: "var(--cf-phosphor)",
                  boxShadow: "0 0 6px var(--cf-phosphor)",
                }}
              />
              <div className="flex flex-col gap-0.5">
                <p
                  className="cf-mono text-xs"
                  style={{ color: "var(--cf-text)" }}
                >
                  {entry.description}
                </p>
                <p
                  className="cf-mono text-xs"
                  style={{ color: "var(--cf-text-muted)" }}
                >
                  {new Date(entry.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
