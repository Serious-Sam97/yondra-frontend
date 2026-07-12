"use client";

import { useState } from "react";
import RichTextContent from "@/components/ui/RichTextContent";
import RichTextEditor from "@/components/ui/RichTextEditor";
import { type Comment, isHtmlEmpty } from "@/hooks/useCardComments";

interface CommentsSectionProps {
  isDemo: boolean;
  users: { id: number; name: string }[];
  comments: Comment[];
  loadingComments: boolean;
  hasOlderComments: boolean;
  loadingOlderComments: boolean;
  handleLoadOlderComments: () => void;
  newComment: string;
  setNewComment: (v: string) => void;
  handleAddComment: () => void;
  editingCommentId: number | null;
  editingCommentBody: string;
  setEditingCommentBody: (v: string) => void;
  savingComment: boolean;
  startEditComment: (comment: Comment) => void;
  cancelEditComment: () => void;
  handleUpdateComment: (commentId: number) => void;
  handleDeleteComment: (commentId: number) => void;
  uploadImage: (file: File) => Promise<string>;
}

const AVATAR_COLORS = [
  "#4CAF50",
  "#FF9800",
  "#1976D2",
  "#F44336",
  "#7B1FA2",
  "#FFC107",
  "#00BCD4",
  "#E91E63",
];

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// e.g. "JUL 08 · 14:32" — monospace cockpit timestamp
function stamp(iso: string): string {
  const d = new Date(iso);
  const date = d
    .toLocaleDateString("en-US", { month: "short", day: "2-digit" })
    .toUpperCase();
  const time = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${date} · ${time}`;
}

// Presentational comments tab/section of the card editor — state and mutations
// live in useCardComments (called from CardEdit) and arrive via props.
export function CommentsSection({
  isDemo,
  users,
  comments,
  loadingComments,
  hasOlderComments,
  loadingOlderComments,
  handleLoadOlderComments,
  newComment,
  setNewComment,
  handleAddComment,
  editingCommentId,
  editingCommentBody,
  setEditingCommentBody,
  savingComment,
  startEditComment,
  cancelEditComment,
  handleUpdateComment,
  handleDeleteComment,
  uploadImage,
}: CommentsSectionProps) {
  // The composer is one quiet line until the writer commits to it; it also
  // stays open while there's an unposted draft so nothing gets lost.
  const [composerOpen, setComposerOpen] = useState(false);
  const composerExpanded = composerOpen || !isHtmlEmpty(newComment);

  const avatar = (userId: number, name: string) => (
    <span
      className="cf-mono flex-shrink-0 rounded-full flex items-center justify-center font-bold"
      style={{
        width: 24,
        height: 24,
        fontSize: "10px",
        color: "#1c1a16",
        background: AVATAR_COLORS[userId % AVATAR_COLORS.length],
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
      }}
      title={name}
    >
      {initials(name)}
    </span>
  );

  return (
    <div className="flex flex-col gap-2">
      {/* Compose */}
      {!isDemo &&
        (composerExpanded ? (
          <div className="flex flex-col gap-2">
            <div
              className="rounded-lg px-3 py-2"
              style={{
                border: "1px solid var(--cf-edge)",
                background: "rgba(0,0,0,0.14)",
              }}
            >
              <RichTextEditor
                compact
                value={newComment}
                onChange={setNewComment}
                placeholder="Write a comment… (type @ to mention, paste or drop an image)"
                mentionUsers={users}
                onUploadImage={uploadImage}
              />
            </div>
            <div className="flex items-center gap-2 self-end">
              <button
                onClick={() => setComposerOpen(false)}
                style={{ fontSize: "11px" }}
                className="aero-btn px-4 py-1.5 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setComposerOpen(false);
                  handleAddComment();
                }}
                disabled={isHtmlEmpty(newComment)}
                style={{ fontSize: "11px" }}
                className="aero-btn aero-btn--cyan px-4 py-1.5 font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Post
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="w-full text-left rounded-lg px-3 py-2.5 cursor-text"
            style={{
              border: "1px solid var(--cf-edge)",
              background: "rgba(0,0,0,0.2)",
              boxShadow: "inset 0 2px 6px rgba(0,0,0,0.35)",
              fontSize: "13px",
              color: "var(--cf-text-dim)",
            }}
          >
            Write a comment… @ mentions, paste or drop images
          </button>
        ))}
      {isDemo && (
        <p
          style={{ fontSize: "12px", color: "var(--cf-text-muted)" }}
          className="cf-mono text-center py-2"
        >
          Comments are not available in demo mode.
        </p>
      )}

      {/* Thread */}
      {loadingComments && (
        <p
          style={{ fontSize: "12px", color: "var(--cf-text-muted)" }}
          className="cf-mono text-center"
        >
          Loading...
        </p>
      )}
      {comments.map((comment, i) => (
        <div
          key={comment.id}
          className="grid gap-x-2.5 group py-2"
          style={{
            gridTemplateColumns: "26px 1fr",
            borderTop:
              i > 0
                ? "1px solid color-mix(in srgb, var(--cf-edge) 45%, transparent)"
                : "none",
          }}
        >
          {avatar(comment.user?.id ?? 0, comment.user?.name ?? "?")}
          <div className="min-w-0 flex flex-col gap-0.5">
            <div className="flex items-baseline gap-2">
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "bold",
                  color: "var(--cf-text)",
                }}
              >
                {comment.user?.name}
              </span>
              <span
                style={{
                  fontSize: "9px",
                  letterSpacing: "0.08em",
                  color: "var(--cf-text-dim)",
                }}
                className="cf-mono"
              >
                {stamp(comment.created_at)}
              </span>
              {editingCommentId !== comment.id && (
                <div className="ml-auto flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => startEditComment(comment)}
                    style={{ fontSize: "10px", color: "var(--cf-text-muted)" }}
                    className="hover:text-[var(--cf-cyan)] cursor-pointer transition-all"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    style={{ fontSize: "10px", color: "var(--cf-text-muted)" }}
                    className="hover:text-[var(--cf-red)] cursor-pointer transition-all"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
            {editingCommentId === comment.id ? (
              <div className="flex flex-col gap-2">
                <div
                  className="rounded-lg px-3 py-2"
                  style={{
                    border: "1px solid var(--cf-edge)",
                    background: "rgba(0,0,0,0.14)",
                  }}
                >
                  <RichTextEditor
                    compact
                    value={editingCommentBody}
                    onChange={setEditingCommentBody}
                    placeholder="Edit your comment…"
                    mentionUsers={users}
                    onUploadImage={uploadImage}
                  />
                </div>
                <div className="flex items-center gap-2 self-end">
                  <button
                    onClick={cancelEditComment}
                    style={{ fontSize: "11px" }}
                    className="aero-btn px-4 py-1.5 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleUpdateComment(comment.id)}
                    disabled={isHtmlEmpty(editingCommentBody) || savingComment}
                    style={{ fontSize: "11px" }}
                    className="aero-btn aero-btn--cyan px-4 py-1.5 font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <RichTextContent html={comment.body} className="text-[12.5px]" />
            )}
          </div>
        </div>
      ))}
      {/* The thread is newest-first: the next page holds older comments, appended below. */}
      {hasOlderComments && !loadingComments && (
        <button
          type="button"
          onClick={handleLoadOlderComments}
          disabled={loadingOlderComments}
          style={{ fontSize: "11px" }}
          className="aero-btn self-center px-4 py-1.5 font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loadingOlderComments ? "Loading…" : "Load older comments"}
        </button>
      )}
      {!loadingComments && !isDemo && comments.length === 0 && (
        <p
          style={{ fontSize: "12px", color: "var(--cf-text-muted)" }}
          className="cf-mono text-center py-2"
        >
          No comments yet.
        </p>
      )}
    </div>
  );
}
