"use client";

import {
  faBolt,
  faFlask,
  faPlug,
  faRobot,
} from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";
import Icon from "@/components/ui/Icon";
import type {
  CardActivity,
  CardActivityChange,
} from "@/interfaces/CardInterface";
import { formatMoney } from "@/lib/currency";
import { avatarColor, initials, timeAgo } from "@/lib/ui";

interface HistorySectionProps {
  entries: CardActivity[];
  loading: boolean;
  // False until the first fetch completes — "No history yet" must wait for it.
  loaded: boolean;
  hasMore: boolean;
  loadingOlder: boolean;
  loadOlder: () => void;
  error: string | null;
  boardType?: "kanban" | "scrum" | "crm";
  currency?: string;
}

type Ctx = { stage: string; currency: string };

const VIA_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  github: "GitHub",
  intake: "Intake form",
  reengagement: "Re-engagement",
};

const FIELD_LABEL: Record<string, string> = {
  name: "Title",
  description: "Description",
  assigned_user_id: "Assignee",
  due_date: "Due date",
  priority: "Priority",
  value: "Deal value",
  story_points: "Story points",
  sprint_id: "Sprint",
  loss_reason: "Loss reason",
  is_done: "Done",
  tags: "Tags",
  "contact.name": "Contact name",
  "contact.email": "Contact email",
  "contact.phone": "Contact phone",
};

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const quoted = (v: unknown) => `“${str(v)}”`;

function present(field: string, v: unknown, ctx: Ctx): string {
  if (v === null || v === undefined || v === "") return "none";
  if (field === "value") return formatMoney(v as number, ctx.currency);
  if (field === "is_done") return v ? "yes" : "no";
  if (field === "due_date") {
    const d = new Date(`${str(v)}T00:00:00`);
    return Number.isNaN(d.getTime())
      ? str(v)
      : d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
  }
  return str(v);
}

// What a history row says: a sentence after the actor, plus optional detail lines.
type Described = {
  text: string;
  lines?: { label: string; from: string; to: string }[];
  quote?: string;
  long?: { from: string; to: string };
};

function describeUpdate(
  changes: Record<string, CardActivityChange>,
  ctx: Ctx,
): Described {
  const keys = Object.keys(changes);
  const section = changes.section_id;

  // A pure move reads as one sentence.
  if (section && keys.every((k) => k === "section_id" || k === "loss_reason")) {
    const reason = changes.loss_reason?.to;
    return {
      text: `moved this card from ${present("", section.from, ctx)} to ${present("", section.to, ctx)}${reason ? ` — reason: ${str(reason)}` : ""}`,
    };
  }

  const lines: Described["lines"] = [];
  let long: Described["long"];
  for (const k of keys) {
    const c = changes[k];
    if (k === "tags") {
      const parts = [
        ...(c.added ?? []).map((t) => `+${t}`),
        ...(c.removed ?? []).map((t) => `−${t}`),
      ];
      lines.push({ label: "Tags", from: "", to: parts.join("  ") });
    } else if (k === "description") {
      long = { from: str(c.from), to: str(c.to) };
      lines.push({ label: "Description", from: "", to: "edited" });
    } else if (k === "section_id") {
      lines.push({
        label: ctx.stage,
        from: present(k, c.from, ctx),
        to: present(k, c.to, ctx),
      });
    } else {
      lines.push({
        label: FIELD_LABEL[k] ?? k,
        from: present(k, c.from, ctx),
        to: present(k, c.to, ctx),
      });
    }
  }

  const only =
    keys.length === 1
      ? (FIELD_LABEL[keys[0]] ?? ctx.stage).toLowerCase()
      : null;
  return {
    text: only ? `changed the ${only}` : `updated ${keys.length} fields`,
    lines,
    long,
  };
}

function describe(e: CardActivity, ctx: Ctx): Described {
  const m = e.meta as Record<string, unknown>;
  switch (e.type) {
    case "card.created":
      return {
        text: `created this card${m.section ? ` in ${str(m.section)}` : ""}`,
      };
    case "card.updated":
      return describeUpdate(e.changes, ctx);
    case "card.archived":
      return { text: "archived this card" };
    case "card.restored":
      return { text: "restored this card" };
    case "subtask.added":
      return { text: `added subtask ${quoted(m.name)}` };
    case "subtask.removed":
      return { text: `removed subtask ${quoted(m.name)}` };
    case "subtask.completed":
      return { text: `completed subtask ${quoted(m.name)}` };
    case "subtask.reopened":
      return { text: `reopened subtask ${quoted(m.name)}` };
    case "checklist.added":
      return { text: `added checklist item ${quoted(m.text)}` };
    case "checklist.completed":
      return { text: `checked off ${quoted(m.text)}` };
    case "checklist.reopened":
      return { text: `unchecked ${quoted(m.text)}` };
    case "checklist.edited":
      return {
        text: "edited a checklist item",
        lines: [{ label: "Item", from: str(m.from), to: str(m.to) }],
      };
    case "checklist.removed":
      return { text: `removed checklist item ${quoted(m.text)}` };
    case "comment.added":
      return {
        text: m.reply ? "replied to a comment" : "commented",
        quote: str(m.excerpt),
      };
    case "comment.edited":
      return { text: "edited a comment", quote: str(m.excerpt) };
    case "comment.deleted":
      return { text: "deleted a comment", quote: str(m.excerpt) };
    case "attachment.added":
      return { text: `attached ${quoted(m.name)}` };
    case "attachment.removed":
      return { text: `removed attachment ${quoted(m.name)}` };
    case "document.added":
      return { text: `added document ${quoted(m.name)}` };
    case "document.removed":
      return { text: `removed document ${quoted(m.name)}` };
    case "link.added":
      return { text: `linked ${quoted(m.title)}` };
    case "link.removed":
      return { text: `unlinked ${quoted(m.title)}` };
    case "link.status":
      return { text: `${quoted(m.title)} is now ${str(m.to)}` };
    case "payment.added":
      return {
        text: `recorded a payment of ${formatMoney(m.amount as number, ctx.currency)}`,
        quote: str(m.note),
      };
    case "payment.removed":
      return {
        text: `removed a payment of ${formatMoney(m.amount as number, ctx.currency)}`,
      };
    case "invoice.issued":
      return {
        text: `issued invoice #${str(m.number)} for ${formatMoney(m.amount as number, str(m.currency) || ctx.currency)}`,
      };
    case "qa.case_added":
      return { text: `added test case ${quoted(m.title)}` };
    case "qa.case_removed":
      return { text: `removed test case ${quoted(m.title)}` };
    case "qa.run":
      return {
        text: `ran ${quoted(m.title)} — ${str(m.status)}${m.environment ? ` on ${str(m.environment)}` : ""}`,
      };
    case "qa.bug_linked":
      return { text: `linked bug ${quoted(m.bug_name)} to ${quoted(m.title)}` };
    case "automation.email":
      return {
        text: `${m.status === "failed" ? "failed to send" : "sent"} stage email ${quoted(m.subject)} to ${str(m.to)}`,
      };
    case "automation.whatsapp":
      return {
        text: `${m.status === "failed" ? "failed to send" : "sent"} WhatsApp template ${quoted(m.template)}${m.section ? ` on entering ${str(m.section)}` : ""}`,
      };
    default:
      return { text: e.type };
  }
}

function actorName(e: CardActivity): string {
  const via = VIA_LABEL[str(e.meta?.via)];
  if (e.user) return e.user.name;
  if (e.source === "ci") return "CI pipeline";
  if (e.source === "webhook") return via ?? "Webhook";
  return via ?? "Automation";
}

function SystemBadge({ source }: { source: CardActivity["source"] }) {
  const icon =
    source === "ci"
      ? faFlask
      : source === "webhook"
        ? faPlug
        : source === "automation"
          ? faBolt
          : faRobot;
  return (
    <span
      className="flex-shrink-0 rounded-full flex items-center justify-center"
      style={{
        width: 26,
        height: 26,
        background: "var(--cf-edge)",
        color: "var(--cf-text)",
        fontSize: 11,
      }}
      aria-hidden
    >
      <Icon icon={icon} />
    </span>
  );
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(d.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
  });
}

function stamp(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function HistoryRow({ entry, ctx }: { entry: CardActivity; ctx: Ctx }) {
  const [open, setOpen] = useState(false);
  const d = describe(entry, ctx);
  const long = d.long;
  const sourceTag =
    entry.user && entry.source !== "user"
      ? entry.source === "planning"
        ? "via planning poker"
        : `via ${entry.source}`
      : null;

  return (
    <li className="flex gap-2.5 py-2">
      {entry.user ? (
        <span
          className="cf-mono flex-shrink-0 rounded-full flex items-center justify-center font-bold"
          style={{
            width: 26,
            height: 26,
            fontSize: 10,
            color: "#1c1a16",
            background: avatarColor(entry.user.id),
          }}
          title={entry.user.name}
        >
          {initials(entry.user.name)}
        </span>
      ) : (
        <SystemBadge source={entry.source} />
      )}
      <div className="min-w-0 flex-1 flex flex-col gap-1">
        <p className="text-xs leading-snug" style={{ color: "var(--cf-text)" }}>
          <span className="font-bold">{actorName(entry)}</span> {d.text}
          {sourceTag && (
            <span
              className="cf-mono"
              style={{ fontSize: 10, color: "var(--cf-text-muted)" }}
            >
              {" "}
              · {sourceTag}
            </span>
          )}
          <span
            className="cf-mono"
            style={{ fontSize: 10, color: "var(--cf-text-muted)" }}
            title={stamp(entry.created_at)}
          >
            {" "}
            · {timeAgo(entry.created_at)}
          </span>
        </p>

        {d.quote && (
          <p
            className="text-xs italic truncate pl-2 border-l"
            style={{
              color: "var(--cf-text-muted)",
              borderColor: "var(--cf-edge)",
            }}
          >
            {d.quote}
          </p>
        )}

        {d.lines && d.lines.length > 0 && (
          <ul className="flex flex-col gap-0.5">
            {d.lines.map((l) => (
              <li
                key={l.label}
                className="cf-mono flex flex-wrap gap-x-1.5"
                style={{ fontSize: 11 }}
              >
                <span style={{ color: "var(--cf-text-muted)" }}>
                  {l.label}:
                </span>
                {l.from && (
                  <>
                    <span
                      style={{
                        color: "var(--cf-text-muted)",
                        textDecoration: "line-through",
                      }}
                    >
                      {l.from}
                    </span>
                    <span style={{ color: "var(--cf-text-muted)" }}>→</span>
                  </>
                )}
                <span style={{ color: "var(--cf-text)" }}>{l.to}</span>
              </li>
            ))}
          </ul>
        )}

        {long && (
          <div>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="cf-mono cursor-pointer"
              style={{ fontSize: 10, color: "var(--cf-phosphor)" }}
              aria-expanded={open}
            >
              {open ? "hide description change" : "show description change"}
            </button>
            {open && (
              <div className="grid gap-2 mt-1 sm:grid-cols-2">
                {(["from", "to"] as const).map((side) => (
                  <div key={side} className="flex flex-col gap-0.5 min-w-0">
                    <span
                      className="cf-label uppercase"
                      style={{ fontSize: 9, color: "var(--cf-text-muted)" }}
                    >
                      {side === "from" ? "Before" : "After"}
                    </span>
                    <pre
                      className="text-xs whitespace-pre-wrap break-words rounded p-2 max-h-48 overflow-auto"
                      style={{
                        color: "var(--cf-text)",
                        background: "rgba(0,0,0,0.18)",
                        fontFamily: "inherit",
                      }}
                    >
                      {stripHtml(long[side]) || "(empty)"}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

// Descriptions are rich-text HTML — show the readable text, not markup.
function stripHtml(html: string): string {
  if (typeof window === "undefined") return html;
  const doc = new DOMParser().parseFromString(
    html.replace(/<\/(p|li|h\d)>/g, "$&\n"),
    "text/html",
  );
  return (doc.body.textContent ?? "").trim();
}

export function HistorySection({
  entries,
  loading,
  loaded,
  hasMore,
  loadingOlder,
  loadOlder,
  error,
  boardType,
  currency = "BRL",
}: HistorySectionProps) {
  const ctx: Ctx = {
    stage: boardType === "crm" ? "Stage" : "Column",
    currency,
  };

  if ((loading || !loaded) && entries.length === 0) {
    return (
      <p
        className="cf-mono text-xs py-2"
        style={{ color: "var(--cf-text-muted)" }}
      >
        Loading history…
      </p>
    );
  }
  if (error && entries.length === 0) {
    return (
      <p
        className="cf-mono text-xs py-2"
        style={{ color: "var(--cf-red, #ff5a4d)" }}
      >
        {error}
      </p>
    );
  }
  if (entries.length === 0) {
    return (
      <p
        className="cf-mono text-xs py-2"
        style={{ color: "var(--cf-text-muted)" }}
      >
        No history yet.
      </p>
    );
  }

  // Group consecutive entries by calendar day (entries arrive newest first).
  const groups: { day: string; items: CardActivity[] }[] = [];
  for (const e of entries) {
    const day = dayLabel(e.created_at);
    const last = groups[groups.length - 1];
    if (last?.day === day) last.items.push(e);
    else groups.push({ day, items: [e] });
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((g) => (
        <section key={g.day}>
          <h4
            className="cf-label uppercase tracking-widest font-bold mb-1"
            style={{ fontSize: 9, color: "var(--cf-text-muted)" }}
          >
            {g.day}
          </h4>
          <ul className="flex flex-col">
            {g.items.map((e) => (
              <HistoryRow
                key={e.id ?? `created-${e.card_id}`}
                entry={e}
                ctx={ctx}
              />
            ))}
          </ul>
        </section>
      ))}
      {hasMore && (
        <button
          type="button"
          onClick={loadOlder}
          disabled={loadingOlder}
          className="cf-mono self-start cursor-pointer"
          style={{ fontSize: 10, color: "var(--cf-phosphor)" }}
        >
          {loadingOlder ? "Loading…" : "Load older history"}
        </button>
      )}
    </div>
  );
}
