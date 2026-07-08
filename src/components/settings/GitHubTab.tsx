"use client";

import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { faCheck, faCopy } from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";
import Icon from "@/components/ui/Icon";
import type { BoardInterface } from "@/interfaces/BoardInterface";
import { updateBoard } from "@/lib/api";
import { type Feedback, FeedbackBanner, PanelHeading } from "./shared";

interface Props {
  board: BoardInterface;
  onSaved: (patch: Partial<BoardInterface>) => void;
}

export default function GitHubTab({ board, onSaved }: Props) {
  const [repo, setRepo] = useState(board.github_repo ?? "");
  const [token, setToken] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const connected = board.github_connected === true;
  const apiBase = process.env.NEXT_PUBLIC_API ?? "";
  const webhookUrl = `${apiBase}/api/webhooks/github/${board.id}`;

  const handleSave = async () => {
    setFeedback(null);
    setSaving(true);
    try {
      // Only send the token when the user typed one — blank leaves it untouched.
      const payload: { github_repo: string | null; github_token?: string } = {
        github_repo: repo.trim() || null,
      };
      if (token.trim()) payload.github_token = token.trim();
      const updated = await updateBoard(board.id, payload);
      onSaved({
        github_repo: updated.github_repo ?? null,
        github_connected: updated.github_connected,
        github_webhook_secret:
          updated.github_webhook_secret ?? board.github_webhook_secret,
      });
      setToken("");
      setFeedback({ type: "success", message: "GitHub settings saved." });
    } catch {
      setFeedback({
        type: "error",
        message: "Failed to save GitHub settings.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const updated = await updateBoard(board.id, {
        github_repo: null,
        github_token: "",
      });
      onSaved({
        github_repo: null,
        github_connected: updated.github_connected,
      });
      setRepo("");
      setToken("");
      setFeedback({ type: "success", message: "GitHub disconnected." });
    } catch {
      setFeedback({ type: "error", message: "Failed to disconnect." });
    } finally {
      setSaving(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard
      ?.writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  };

  return (
    <div className="glass-panel p-6 flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Icon
          icon={faGithub}
          style={{ fontSize: "14px", color: "var(--cf-text)" }}
        />
        <PanelHeading>GitHub</PanelHeading>
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

      <p className="text-sm cf-mono" style={{ color: "var(--cf-text-muted)" }}>
        Connect a repository so cards can link pull requests and issues with
        live status.
      </p>

      <div className="flex flex-col gap-4">
        <div>
          <label className="cf-label block mb-2">Repository</label>
          <input
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="owner/repo"
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
            placeholder={connected ? "•••••••• (saved)" : "ghp_…"}
            className="glass-input"
            autoComplete="off"
          />
          <span
            className="cf-mono text-[10px] block mt-1"
            style={{ color: "var(--cf-text-muted)" }}
          >
            Stored encrypted; never shown again. A repo-scoped token is enough.
          </span>
        </div>
      </div>

      {/* Webhook setup — only once connected (secret exists) */}
      {connected && board.github_webhook_secret && (
        <div
          className="flex flex-col gap-3 pt-2 border-t"
          style={{ borderColor: "var(--cf-edge)" }}
        >
          <label className="cf-label">Webhook (for live two-way updates)</label>
          <p
            className="cf-mono text-[10px]"
            style={{ color: "var(--cf-text-muted)" }}
          >
            In your GitHub repo → Settings → Webhooks → Add webhook. Content
            type: application/json. Events: Pull requests, Issues, Check suites.
          </p>
          <div>
            <span
              className="cf-mono text-[9px] uppercase"
              style={{ color: "var(--cf-text-dim)" }}
            >
              Payload URL
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <input
                readOnly
                value={webhookUrl}
                className="glass-input flex-1"
                style={{ fontSize: "11px" }}
              />
              <button
                onClick={() => copy(webhookUrl)}
                className="aero-btn aero-btn--ghost px-2.5 py-2 flex-shrink-0"
                title="Copy"
              >
                <Icon
                  icon={copied ? faCheck : faCopy}
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
              Secret
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <input
                readOnly
                value={board.github_webhook_secret}
                className="glass-input flex-1"
                style={{ fontSize: "11px" }}
              />
              <button
                onClick={() => copy(board.github_webhook_secret!)}
                className="aero-btn aero-btn--ghost px-2.5 py-2 flex-shrink-0"
                title="Copy"
              >
                <Icon icon={faCopy} style={{ fontSize: "10px" }} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        {connected ? (
          <button
            onClick={handleDisconnect}
            disabled={saving}
            className="aero-btn aero-btn--magenta px-4 py-2.5"
          >
            Disconnect
          </button>
        ) : (
          <span />
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="aero-btn aero-btn--cyan px-5 py-2.5"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
