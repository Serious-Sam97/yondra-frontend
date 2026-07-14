"use client";

import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { faCheck, faCopy } from "@fortawesome/free-solid-svg-icons";
import { useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import type { BoardInterface } from "@/interfaces/BoardInterface";
import {
  deleteWhatsappAutomation,
  getWhatsappAutomations,
  getWhatsappReengagement,
  updateBoard,
  upsertWhatsappAutomation,
  upsertWhatsappReengagement,
} from "@/lib/api";
import { type Feedback, FeedbackBanner, PanelHeading } from "./shared";

interface Props {
  board: BoardInterface;
  onSaved: (patch: Partial<BoardInterface>) => void;
}

interface AutomationRow {
  section_id: number;
  section_name: string;
  template_name: string;
  language: string;
  enabled: boolean;
  paused_at: string | null;
  exists: boolean;
}

export default function WhatsAppTab({ board, onSaved }: Props) {
  const connected = board.whatsapp_connected === true;
  const apiBase = process.env.NEXT_PUBLIC_API ?? "";
  const webhookUrl = `${apiBase}/api/webhooks/whatsapp/${board.id}`;

  // --- Connection ---
  const [provider, setProvider] = useState<"meta" | "bsp">(
    board.whatsapp_provider ?? "meta",
  );
  const [phoneId, setPhoneId] = useState(board.whatsapp_phone_number_id ?? "");
  const [wabaId, setWabaId] = useState(board.whatsapp_waba_id ?? "");
  const [verifyToken, setVerifyToken] = useState(
    board.whatsapp_verify_token ?? "",
  );
  const [token, setToken] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const saveConnection = async () => {
    setFeedback(null);
    setSaving(true);
    try {
      const payload: Parameters<typeof updateBoard>[1] = {
        whatsapp_provider: provider,
        whatsapp_phone_number_id: phoneId.trim() || null,
        whatsapp_waba_id: wabaId.trim() || null,
        whatsapp_verify_token: verifyToken.trim() || null,
      };
      if (token.trim()) payload.whatsapp_token = token.trim();
      if (appSecret.trim()) payload.whatsapp_app_secret = appSecret.trim();
      const updated = await updateBoard(board.id, payload);
      onSaved({
        whatsapp_provider: updated.whatsapp_provider ?? null,
        whatsapp_phone_number_id: updated.whatsapp_phone_number_id ?? null,
        whatsapp_waba_id: updated.whatsapp_waba_id ?? null,
        whatsapp_connected: updated.whatsapp_connected,
        whatsapp_verify_token: updated.whatsapp_verify_token ?? null,
      });
      setVerifyToken(updated.whatsapp_verify_token ?? "");
      setToken("");
      setAppSecret("");
      setFeedback({ type: "success", message: "WhatsApp settings saved." });
    } catch {
      setFeedback({
        type: "error",
        message: "Failed to save WhatsApp settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(key);
        setTimeout(() => setCopied(null), 1500);
      })
      .catch(() => {});
  };

  // --- Stage automations ---
  const [rows, setRows] = useState<AutomationRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [rowError, setRowError] = useState<string | null>(null);

  useEffect(() => {
    getWhatsappAutomations(board.id)
      .then((data) => {
        setRows(
          (Array.isArray(data) ? data : []).map((r) => ({
            section_id: r.section_id,
            section_name: r.section_name,
            template_name: r.automation?.template_name ?? "",
            language: r.automation?.language ?? "en",
            enabled: r.automation?.enabled ?? true,
            paused_at: r.automation?.paused_at ?? null,
            exists: !!r.automation,
          })),
        );
      })
      .catch(() => setRowError("Could not load automations."))
      .finally(() => setLoadingRows(false));
  }, [board.id]);

  // --- Re-engagement policy ---
  const [reeng, setReeng] = useState({
    enabled: false,
    idle_days: 30,
    retry_interval_days: 7,
    max_attempts: 4,
    template_name: "",
    language: "pt_BR",
    lost_section_id: null as number | null,
  });
  const [reengSections, setReengSections] = useState<
    { id: number; name: string }[]
  >([]);
  const [reengSaving, setReengSaving] = useState(false);
  const [reengFeedback, setReengFeedback] = useState<Feedback>(null);

  useEffect(() => {
    getWhatsappReengagement(board.id)
      .then((data) => {
        setReengSections(data.sections ?? []);
        if (data.policy) {
          setReeng({
            enabled: data.policy.enabled,
            idle_days: data.policy.idle_days,
            retry_interval_days: data.policy.retry_interval_days,
            max_attempts: data.policy.max_attempts,
            template_name: data.policy.template_name ?? "",
            language: data.policy.language ?? "pt_BR",
            lost_section_id: data.policy.lost_section_id,
          });
        }
      })
      .catch(() => {});
  }, [board.id]);

  const saveReengagement = async () => {
    setReengFeedback(null);
    setReengSaving(true);
    try {
      await upsertWhatsappReengagement(board.id, reeng);
      setReengFeedback({ type: "success", message: "Re-engagement saved." });
    } catch {
      setReengFeedback({
        type: "error",
        message: "Could not save — a template name is required.",
      });
    } finally {
      setReengSaving(false);
    }
  };

  const patchRow = (sectionId: number, patch: Partial<AutomationRow>) =>
    setRows((prev) =>
      prev.map((r) => (r.section_id === sectionId ? { ...r, ...patch } : r)),
    );

  const saveRow = async (row: AutomationRow, resume = false) => {
    if (!row.template_name.trim()) return;
    setRowError(null);
    try {
      const saved = await upsertWhatsappAutomation(board.id, row.section_id, {
        template_name: row.template_name.trim(),
        language: row.language.trim() || "en",
        enabled: row.enabled,
        resume,
      });
      patchRow(row.section_id, {
        exists: true,
        paused_at: saved.paused_at ?? null,
      });
    } catch {
      setRowError("Could not save automation.");
    }
  };

  const removeRow = async (row: AutomationRow) => {
    setRowError(null);
    try {
      await deleteWhatsappAutomation(board.id, row.section_id);
      patchRow(row.section_id, {
        exists: false,
        template_name: "",
        language: "en",
        enabled: true,
        paused_at: null,
      });
    } catch {
      setRowError("Could not remove automation.");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Connection */}
      <div className="glass-panel p-6 flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Icon
            icon={faWhatsapp}
            style={{ fontSize: "15px", color: "var(--cf-text)" }}
          />
          <PanelHeading>WhatsApp</PanelHeading>
          {connected && (
            <span
              className="cf-mono uppercase font-bold rounded-sm inline-flex items-center gap-1"
              style={{
                fontSize: "8px",
                letterSpacing: "0.1em",
                padding: "2px 6px",
                color: "var(--cf-phosphor)",
                border: "1px solid var(--cf-phosphor)",
                background: "rgba(154,166,126,0.14)",
              }}
            >
              <Icon icon={faCheck} style={{ fontSize: "8px" }} /> Connected
            </span>
          )}
        </div>

        <FeedbackBanner feedback={feedback} />

        <p
          className="text-sm cf-mono"
          style={{ color: "var(--cf-text-muted)" }}
        >
          Connect a WhatsApp Cloud API number so customer messages land on cards
          and you can reply from Yondra.
        </p>

        <div className="flex flex-col gap-4">
          <div>
            <label className="cf-label block mb-2">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as "meta" | "bsp")}
              className="glass-input"
            >
              <option value="meta">Meta (direct Cloud API)</option>
              <option value="bsp">BSP (360dialog / Twilio)</option>
            </select>
          </div>
          <div>
            <label className="cf-label block mb-2">Phone number ID</label>
            <input
              value={phoneId}
              onChange={(e) => setPhoneId(e.target.value)}
              placeholder="Cloud API phone_number_id"
              className="glass-input"
            />
          </div>
          <div>
            <label className="cf-label block mb-2">WABA ID</label>
            <input
              value={wabaId}
              onChange={(e) => setWabaId(e.target.value)}
              placeholder="WhatsApp Business Account ID"
              className="glass-input"
            />
          </div>
          <div>
            <label className="cf-label block mb-2">
              Access token{" "}
              {connected && (
                <span style={{ color: "var(--cf-text-dim)" }}>
                  · leave blank to keep current
                </span>
              )}
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={
                connected ? "•••••••• (saved)" : "Meta token / BSP api-key"
              }
              className="glass-input"
              autoComplete="off"
            />
            <span
              className="cf-mono text-[10px] block mt-1"
              style={{ color: "var(--cf-text-muted)" }}
            >
              Stored encrypted; never shown again.
            </span>
          </div>
          <div>
            <label className="cf-label block mb-2">
              App secret{" "}
              {connected && (
                <span style={{ color: "var(--cf-text-dim)" }}>
                  · leave blank to keep current
                </span>
              )}
            </label>
            <input
              type="password"
              value={appSecret}
              onChange={(e) => setAppSecret(e.target.value)}
              placeholder={
                connected
                  ? "•••••••• (saved)"
                  : "Verifies inbound webhook signatures"
              }
              className="glass-input"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Webhook setup */}
        <div
          className="flex flex-col gap-3 pt-2 border-t"
          style={{ borderColor: "var(--cf-edge)" }}
        >
          <label className="cf-label">Webhook (point Meta here)</label>
          <p
            className="cf-mono text-[10px]"
            style={{ color: "var(--cf-text-muted)" }}
          >
            In Meta → WhatsApp → Configuration → Webhooks: set the Callback URL
            and Verify token below, then subscribe to the <b>messages</b> field.
          </p>
          <div>
            <span
              className="cf-mono text-[9px] uppercase"
              style={{ color: "var(--cf-text-dim)" }}
            >
              Callback URL
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <input
                readOnly
                value={webhookUrl}
                className="glass-input flex-1"
                style={{ fontSize: "11px" }}
              />
              <button
                onClick={() => copy(webhookUrl, "url")}
                className="aero-btn aero-btn--ghost px-2.5 py-2 flex-shrink-0"
                title="Copy"
              >
                <Icon
                  icon={copied === "url" ? faCheck : faCopy}
                  style={{ fontSize: "10px" }}
                />
              </button>
            </div>
          </div>
          <div>
            <span
              className="cf-mono text-[9px] uppercase"
              style={{ color: "var(--cf-text-dim)" }}
            >
              Verify token
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <input
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
                placeholder="auto-generated on first connect"
                className="glass-input flex-1"
                style={{ fontSize: "11px" }}
              />
              {verifyToken && (
                <button
                  onClick={() => copy(verifyToken, "verify")}
                  className="aero-btn aero-btn--ghost px-2.5 py-2 flex-shrink-0"
                  title="Copy"
                >
                  <Icon
                    icon={copied === "verify" ? faCheck : faCopy}
                    style={{ fontSize: "10px" }}
                  />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={saveConnection}
            disabled={saving}
            className="aero-btn aero-btn--cyan px-5 py-2.5"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {/* Stage automations */}
      <div className="glass-panel p-6 flex flex-col gap-4">
        <PanelHeading>Stage automations</PanelHeading>
        <p
          className="text-sm cf-mono"
          style={{ color: "var(--cf-text-muted)" }}
        >
          Auto-send an approved template when a card enters a column. Only
          opted-in contacts are messaged, and sends pause automatically if
          quality drops.
        </p>

        {rowError && (
          <FeedbackBanner feedback={{ type: "error", message: rowError }} />
        )}
        {loadingRows && (
          <p
            className="cf-mono text-xs"
            style={{ color: "var(--cf-text-muted)" }}
          >
            Loading…
          </p>
        )}

        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <div
              key={row.section_id}
              className="flex flex-col gap-2 rounded-lg p-3"
              style={{
                border: "1px solid var(--cf-edge)",
                background: "rgba(0,0,0,0.12)",
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="cf-label uppercase tracking-widest font-bold flex-1"
                  style={{ fontSize: "10px" }}
                >
                  {row.section_name}
                </span>
                {row.paused_at && (
                  <span
                    className="cf-mono uppercase font-bold rounded-sm"
                    style={{
                      fontSize: "8px",
                      padding: "2px 6px",
                      color: "var(--cf-red)",
                      border: "1px solid var(--cf-red)",
                    }}
                  >
                    Paused · quality
                  </span>
                )}
                <label
                  className="flex items-center gap-1.5 cf-mono"
                  style={{ fontSize: "10px", color: "var(--cf-text-muted)" }}
                >
                  <input
                    type="checkbox"
                    checked={row.enabled}
                    onChange={(e) =>
                      patchRow(row.section_id, { enabled: e.target.checked })
                    }
                  />
                  enabled
                </label>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={row.template_name}
                  onChange={(e) =>
                    patchRow(row.section_id, { template_name: e.target.value })
                  }
                  placeholder="approved template name"
                  className="glass-input flex-1"
                  style={{ fontSize: "12px" }}
                />
                <input
                  value={row.language}
                  onChange={(e) =>
                    patchRow(row.section_id, { language: e.target.value })
                  }
                  placeholder="pt_BR"
                  className="glass-input"
                  style={{ fontSize: "12px", width: 90 }}
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                {row.paused_at && (
                  <button
                    onClick={() => saveRow(row, true)}
                    className="aero-btn aero-btn--ghost px-3 py-1.5"
                    style={{ fontSize: "10px" }}
                  >
                    Resume
                  </button>
                )}
                {row.exists && (
                  <button
                    onClick={() => removeRow(row)}
                    className="aero-btn aero-btn--magenta px-3 py-1.5"
                    style={{ fontSize: "10px" }}
                  >
                    Remove
                  </button>
                )}
                <button
                  onClick={() => saveRow(row)}
                  disabled={!row.template_name.trim()}
                  className="aero-btn aero-btn--cyan px-4 py-1.5 disabled:opacity-40"
                  style={{ fontSize: "10px" }}
                >
                  Save
                </button>
              </div>
            </div>
          ))}
          {!loadingRows && rows.length === 0 && (
            <p
              className="cf-mono text-xs text-center py-2"
              style={{ color: "var(--cf-text-muted)" }}
            >
              This board has no columns yet.
            </p>
          )}
        </div>
      </div>

      {/* Re-engagement */}
      <div className="glass-panel p-6 flex flex-col gap-4">
        <PanelHeading>Re-engagement</PanelHeading>
        <p
          className="text-sm cf-mono"
          style={{ color: "var(--cf-text-muted)" }}
        >
          After a lead goes quiet, automatically nudge them with a template every
          few days, then drop the unresponsive ones out of the pipeline. Only
          opted-in contacts are messaged, and degraded numbers are skipped.
        </p>

        {reengFeedback && <FeedbackBanner feedback={reengFeedback} />}

        <label
          className="flex items-center gap-1.5 cf-mono self-start"
          style={{ fontSize: "10px", color: "var(--cf-text-muted)" }}
        >
          <input
            type="checkbox"
            checked={reeng.enabled}
            onChange={(e) =>
              setReeng((r) => ({ ...r, enabled: e.target.checked }))
            }
          />
          enabled
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(
            [
              ["idle_days", "Idle days before first nudge"],
              ["retry_interval_days", "Days between attempts"],
              ["max_attempts", "Max attempts before drop"],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex flex-col gap-1 cf-mono"
              style={{ fontSize: "10px", color: "var(--cf-text-muted)" }}
            >
              {label}
              <input
                type="number"
                min={1}
                value={reeng[key]}
                onChange={(e) =>
                  setReeng((r) => ({
                    ...r,
                    [key]: Math.max(1, Number(e.target.value) || 1),
                  }))
                }
                className="glass-input"
                style={{ fontSize: "12px" }}
              />
            </label>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={reeng.template_name}
            onChange={(e) =>
              setReeng((r) => ({ ...r, template_name: e.target.value }))
            }
            placeholder="approved template name"
            className="glass-input flex-1"
            style={{ fontSize: "12px" }}
          />
          <input
            value={reeng.language}
            onChange={(e) =>
              setReeng((r) => ({ ...r, language: e.target.value }))
            }
            placeholder="pt_BR"
            className="glass-input"
            style={{ fontSize: "12px", width: 90 }}
          />
        </div>

        <label
          className="flex flex-col gap-1 cf-mono"
          style={{ fontSize: "10px", color: "var(--cf-text-muted)" }}
        >
          Drop leads to
          <select
            value={reeng.lost_section_id ?? ""}
            onChange={(e) =>
              setReeng((r) => ({
                ...r,
                lost_section_id: e.target.value ? Number(e.target.value) : null,
              }))
            }
            className="glass-input"
            style={{ fontSize: "12px" }}
          >
            <option value="">— none (archive) —</option>
            {reengSections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex justify-end">
          <button
            onClick={saveReengagement}
            disabled={reengSaving || !reeng.template_name.trim()}
            className="aero-btn aero-btn--cyan px-4 py-1.5 disabled:opacity-40"
            style={{ fontSize: "10px" }}
          >
            {reengSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
