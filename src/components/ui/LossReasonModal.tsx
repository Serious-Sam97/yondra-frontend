"use client";

import { faCircleXmark } from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";
import Modal from "@/components/shared/Modal";
import Icon from "@/components/ui/Icon";
import { ApiError } from "@/lib/api";

// Parse a card-move ApiError: returns the board's loss reasons when the backend
// blocked the move into the Lost stage for want of a reason (YON-66), else null.
export function parseLossReasonError(e: unknown): string[] | null {
  if (!(e instanceof ApiError) || e.status !== 422) return null;
  try {
    const body = JSON.parse(e.body) as { error?: string; reasons?: string[] };
    if (body.error === "loss_reason_required") return body.reasons ?? [];
  } catch {
    // Non-JSON body — not our case.
  }
  return null;
}

// Required-reason picker shown when a deal is dragged/moved into the Lost stage.
// Confirm is disabled until a reason is chosen — the move can't complete without one.
export function LossReasonModal({
  reasons,
  onConfirm,
  onCancel,
}: {
  reasons: string[];
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <Modal onClose={onCancel}>
      <div className="aero-menu p-6 w-[90%] max-w-sm flex flex-col gap-5">
        <div className="flex flex-col items-center text-center gap-2">
          <p className="text-2xl" style={{ color: "var(--cf-red)" }}>
            <Icon icon={faCircleXmark} />
          </p>
          <p
            className="cf-mono font-bold text-lg"
            style={{ color: "var(--cf-text)" }}
          >
            Why was this deal lost?
          </p>
          <p className="cf-mono text-xs" style={{ color: "var(--cf-text-muted)" }}>
            A reason is required to move a deal to the Lost stage.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {reasons.map((reason) => {
            const active = reason === selected;
            return (
              <button
                key={reason}
                type="button"
                onClick={() => setSelected(reason)}
                className="cf-mono text-sm text-left px-3 py-2 rounded-md cursor-pointer transition-colors"
                style={{
                  border: `1.5px solid ${active ? "var(--cf-red)" : "var(--cf-edge)"}`,
                  background: active ? "rgba(255,60,80,0.12)" : "transparent",
                  color: active ? "var(--cf-text)" : "var(--cf-text-muted)",
                }}
              >
                {reason}
              </button>
            );
          })}
          {reasons.length === 0 && (
            <p className="cf-mono text-xs" style={{ color: "var(--cf-text-dim)" }}>
              No loss reasons are configured for this board yet — add some in board
              settings.
            </p>
          )}
        </div>

        <div className="flex justify-between">
          <button
            onClick={onCancel}
            className="aero-btn aero-btn--ghost text-xs uppercase tracking-widest px-4 py-2 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => selected && onConfirm(selected)}
            disabled={!selected}
            className="aero-btn aero-btn--magenta text-xs uppercase tracking-widest font-bold px-4 py-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Mark as lost
          </button>
        </div>
      </div>
    </Modal>
  );
}
