"use client";

import { useState } from "react";
import { BoardTypeFields } from "@/components/ui/BoardTypeFields";
import type {
  BoardInterface,
  BoardPermission,
  BoardType,
} from "@/interfaces/BoardInterface";
import { updateBoard } from "@/lib/api";
import {
  ACCENTS,
  type AccentKey,
  type Feedback,
  FeedbackBanner,
  PanelHeading,
  PermSegments,
} from "./shared";

interface Props {
  board: BoardInterface;
  onSaved: (patch: Partial<BoardInterface>) => void;
}

export default function GeneralTab({ board, onSaved }: Props) {
  const [name, setName] = useState(board.name);
  const [boardType, setBoardType] = useState<BoardType>(board.type ?? "kanban");
  const [currency, setCurrency] = useState(board.currency ?? "BRL");
  const [description, setDescription] = useState(board.description ?? "");
  const [ticketPrefix, setTicketPrefix] = useState(board.ticket_prefix ?? "");
  const [nextTicket, setNextTicket] = useState(
    String(board.next_ticket_number ?? 1),
  );
  const [background, setBackground] = useState<AccentKey>(
    (board.background as AccentKey) ?? "default",
  );
  const [defaultPermission, setDefaultPermission] = useState<BoardPermission>(
    board.default_permission ?? "write",
  );
  const [qaEnabled, setQaEnabled] = useState(board.qa_enabled ?? false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const prefix = ticketPrefix.replace(/\s+/g, "").toUpperCase();
    const nextNum = Math.max(1, parseInt(nextTicket, 10) || 1);
    setFeedback(null);
    setSaving(true);
    try {
      await updateBoard(board.id, {
        name: trimmed,
        type: boardType,
        currency,
        description: description.trim(),
        ticket_prefix: prefix || null,
        next_ticket_number: nextNum,
        background: background === "default" ? null : background,
        default_permission: defaultPermission,
        qa_enabled: qaEnabled,
      });
      onSaved({
        name: trimmed,
        type: boardType,
        currency,
        description: description.trim(),
        ticket_prefix: prefix || null,
        next_ticket_number: nextNum,
        background: background === "default" ? null : background,
        default_permission: defaultPermission,
        qa_enabled: qaEnabled,
      });
      setFeedback({ type: "success", message: "Board settings saved." });
    } catch {
      setFeedback({ type: "error", message: "Failed to save board settings." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-panel p-6 flex flex-col gap-5">
      <PanelHeading>General</PanelHeading>
      <FeedbackBanner feedback={feedback} />

      <div className="flex flex-col gap-4">
        <div>
          <label className="cf-label block mb-2">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Board name…"
            className="glass-input"
          />
        </div>
        <div>
          <label className="cf-label block mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional…"
            rows={2}
            className="glass-input resize-none"
          />
        </div>

        {/* Board type + (CRM) currency */}
        <BoardTypeFields
          type={boardType}
          currency={currency}
          onTypeChange={setBoardType}
          onCurrencyChange={setCurrency}
        />

        {/* Sentinel (QA) module */}
        <button
          type="button"
          onClick={() => setQaEnabled((v) => !v)}
          className="flex items-center justify-between gap-3 rounded-lg px-3.5 py-3 cursor-pointer text-left"
          style={{
            border: `1px solid ${qaEnabled ? "var(--cf-phosphor)" : "var(--cf-edge)"}`,
            background: qaEnabled ? "rgba(154,166,126,0.06)" : "transparent",
          }}
        >
          <span className="flex flex-col gap-0.5">
            <span
              className="cf-mono uppercase font-bold"
              style={{
                fontSize: "12px",
                letterSpacing: "0.08em",
                color: qaEnabled ? "var(--cf-text)" : "var(--cf-text-muted)",
              }}
            >
              Sentinel · QA
            </span>
            <span
              className="cf-mono"
              style={{ fontSize: "10px", color: "var(--cf-text-muted)" }}
            >
              Test cases + execution reports inside each card
            </span>
          </span>
          <span
            className="rounded-full flex-shrink-0 relative transition-colors"
            style={{
              width: 38,
              height: 20,
              background: qaEnabled ? "var(--cf-phosphor)" : "var(--cf-edge)",
            }}
          >
            <span
              className="rounded-full absolute top-0.5 transition-all"
              style={{
                width: 16,
                height: 16,
                background: "#0d1410",
                left: qaEnabled ? 20 : 2,
              }}
            />
          </span>
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="cf-label block mb-2">Ticket prefix</label>
            <input
              value={ticketPrefix}
              onChange={(e) =>
                setTicketPrefix(
                  e.target.value.replace(/\s+/g, "").toUpperCase(),
                )
              }
              maxLength={10}
              placeholder="e.g. YON"
              className="glass-input uppercase"
            />
            <span
              className="cf-mono text-[10px] block mt-1"
              style={{ color: "var(--cf-text-muted)" }}
            >
              Blank shows plain numbers (#42).
            </span>
          </div>
          <div>
            <label className="cf-label block mb-2">Next ticket #</label>
            <input
              type="number"
              min={1}
              value={nextTicket}
              onChange={(e) => setNextTicket(e.target.value)}
              className="glass-input"
            />
            <span
              className="cf-mono text-[10px] block mt-1"
              style={{ color: "var(--cf-text-muted)" }}
            >
              Number handed to the next card created.
            </span>
          </div>
        </div>

        {/* Accent (background) */}
        <div>
          <label className="cf-label block mb-2">Board accent</label>
          <div className="flex flex-wrap gap-2">
            {ACCENTS.map((a) => {
              const active = background === a.key;
              return (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => setBackground(a.key)}
                  className="flex items-center gap-2 rounded-lg px-3 py-1.5 cursor-pointer transition-all duration-150"
                  style={{
                    border: `1px solid ${active ? a.color : "var(--cf-edge)"}`,
                    background: active
                      ? "rgba(255,255,255,0.04)"
                      : "transparent",
                    boxShadow: active ? `0 0 8px ${a.color}` : undefined,
                  }}
                >
                  <span
                    className="rounded-full"
                    style={{
                      width: 10,
                      height: 10,
                      background: a.color,
                      boxShadow: `0 0 6px ${a.color}`,
                    }}
                  />
                  <span
                    className="cf-mono uppercase font-bold"
                    style={{
                      fontSize: "9px",
                      letterSpacing: "0.1em",
                      color: active ? "var(--cf-text)" : "var(--cf-text-muted)",
                    }}
                  >
                    {a.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Default member permission */}
        <div>
          <label className="cf-label block mb-2">
            Default access for new members
          </label>
          <PermSegments
            value={defaultPermission}
            onChange={setDefaultPermission}
          />
          <span
            className="cf-mono text-[10px] block mt-2"
            style={{ color: "var(--cf-text-muted)" }}
          >
            Permission granted by default when inviting someone.
          </span>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !name.trim()}
        className="aero-btn aero-btn--cyan self-end px-5 py-2.5"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
