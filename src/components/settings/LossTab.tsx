"use client";

import { faPlus, faXmark } from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";
import Icon from "@/components/ui/Icon";
import type { BoardInterface } from "@/interfaces/BoardInterface";
import { updateBoard } from "@/lib/api";
import { type Feedback, FeedbackBanner, PanelHeading } from "./shared";

interface Props {
  board: BoardInterface;
  onSaved: (patch: Partial<BoardInterface>) => void;
}

// CRM-only tab (YON-66): pick the Lost stage + maintain the editable list of loss
// reasons a deal must carry when it enters that stage.
export default function LossTab({ board, onSaved }: Props) {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [lostSectionId, setLostSectionId] = useState<number | null>(
    board.lost_section_id ?? null,
  );
  const [reasons, setReasons] = useState<string[]>(board.loss_reasons ?? []);
  const [savingReasons, setSavingReasons] = useState(false);

  // A section can be the Won stage or the Lost stage, not both — hide the Won
  // column from the Lost options so they can't collide.
  const lostOptions = board.sections.filter(
    (s) => s.id !== board.done_section_id,
  );

  const setLost = async (raw: string) => {
    const next = raw === "" ? null : Number(raw);
    const prev = lostSectionId;
    setLostSectionId(next);
    onSaved({ lost_section_id: next });
    setFeedback(null);
    try {
      await updateBoard(board.id, { lost_section_id: next });
    } catch {
      setLostSectionId(prev);
      onSaved({ lost_section_id: prev });
      setFeedback({ type: "error", message: "Could not save the Lost stage." });
    }
  };

  const addReason = () => setReasons((r) => [...r, ""]);
  const removeReason = (i: number) =>
    setReasons((r) => r.filter((_, idx) => idx !== i));
  const patchReason = (i: number, value: string) =>
    setReasons((r) => r.map((v, idx) => (idx === i ? value : v)));

  const saveReasons = async () => {
    // Drop blanks + de-dupe (case-insensitive), preserving order.
    const seen = new Set<string>();
    const clean = reasons
      .map((r) => r.trim())
      .filter((r) => {
        const key = r.toLowerCase();
        if (r === "" || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    setSavingReasons(true);
    setFeedback(null);
    try {
      const updated = await updateBoard(board.id, {
        loss_reasons: clean.length ? clean : null,
      });
      const saved = updated.loss_reasons ?? [];
      setReasons(saved);
      onSaved({ loss_reasons: saved });
      setFeedback({ type: "success", message: "Loss reasons saved." });
    } catch {
      setFeedback({ type: "error", message: "Failed to save loss reasons." });
    } finally {
      setSavingReasons(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <FeedbackBanner feedback={feedback} />

      {/* Lost stage selector */}
      <div className="flex flex-col gap-3">
        <PanelHeading>Lost stage</PanelHeading>
        <p className="cf-mono text-xs" style={{ color: "var(--cf-text-muted)" }}>
          Moving a deal into this stage marks it lost and requires a reason.
        </p>
        <select
          value={lostSectionId ?? ""}
          onChange={(e) => setLost(e.target.value)}
          className="cf-mono text-sm rounded-lg px-3 py-2 w-full max-w-xs"
          style={{
            background: "var(--cf-screen, #0d1410)",
            border: "1.5px solid var(--cf-edge)",
            color: "var(--cf-text)",
          }}
        >
          <option value="">None (use a column named “Lost”)</option>
          {lostOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Reasons list editor */}
      <div className="flex flex-col gap-3">
        <PanelHeading>Loss reasons</PanelHeading>
        <p className="cf-mono text-xs" style={{ color: "var(--cf-text-muted)" }}>
          The list a salesperson must pick from when losing a deal. Feeds the loss
          report.
        </p>

        <div className="flex flex-col gap-2">
          {reasons.map((reason, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional and editable
            <div key={i} className="flex items-center gap-2">
              <input
                value={reason}
                onChange={(e) => patchReason(i, e.target.value)}
                placeholder="e.g. Too expensive"
                className="cf-mono text-sm rounded-lg px-3 py-2 flex-1"
                style={{
                  background: "var(--cf-screen, #0d1410)",
                  border: "1.5px solid var(--cf-edge)",
                  color: "var(--cf-text)",
                }}
              />
              <button
                type="button"
                onClick={() => removeReason(i)}
                aria-label="Remove reason"
                className="cf-mono px-2 py-2 rounded-lg cursor-pointer"
                style={{ color: "var(--cf-text-muted)" }}
              >
                <Icon icon={faXmark} />
              </button>
            </div>
          ))}
          {reasons.length === 0 && (
            <p className="cf-mono text-xs" style={{ color: "var(--cf-text-dim)" }}>
              No reasons yet — add at least one so deals can be marked lost.
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={addReason}
            className="aero-btn aero-btn--ghost text-xs uppercase tracking-widest px-3 py-2 cursor-pointer inline-flex items-center gap-1.5"
          >
            <Icon icon={faPlus} /> Add reason
          </button>
          <button
            type="button"
            onClick={saveReasons}
            disabled={savingReasons}
            className="aero-btn aero-btn--cyan text-xs uppercase tracking-widest font-bold px-4 py-2 cursor-pointer disabled:opacity-40"
          >
            {savingReasons ? "Saving…" : "Save reasons"}
          </button>
        </div>
      </div>
    </div>
  );
}
