"use client";

import {
  faFaceSmile,
  faPen,
  faPlus,
  faReply,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";
import { EmojiPickerPopover } from "@/components/ui/EmojiPickerPopover";
import Icon from "@/components/ui/Icon";
import RichTextContent from "@/components/ui/RichTextContent";
import RichTextEditor from "@/components/ui/RichTextEditor";
import { type Comment, isHtmlEmpty, type ThreadState } from "@/hooks/useCardComments";

interface CommentsSectionProps {
  isDemo: boolean;
  users: { id: number; name: string }[];
  currentUserId: number;
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
  handleDeleteComment: (commentId: number, parentId?: number | null) => void;
  uploadImage: (file: File) => Promise<string>;
  // Threads / reactions / gifs (useCardComments)
  threads: Record<number, ThreadState>;
  toggleThread: (commentId: number) => void;
  loadMoreReplies: (commentId: number) => void;
  addReply: (parentId: number, body: string) => Promise<boolean>;
  toggleReaction: (comment: Comment, emoji: string) => void;
  flashIds: Set<number>;
  gifsEnabled: boolean;
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

// The fast lane — covers most reactions without opening the full picker.
const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "👀", "🚀"];

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// Absolute cockpit stamp — kept as the tooltip behind the relative time.
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

// "just now" / "12m" / "3h" / "yesterday" / "Jul 08" — scan-friendly recency.
function relTime(iso: string): string {
  const then = new Date(iso).getTime();
  const secs = Math.round((Date.now() - then) / 1000);
  if (secs < 45) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso)
    .toLocaleDateString("en-US", { month: "short", day: "2-digit" })
    .toUpperCase();
}

// Presentational comments tab/section of the card editor — state and mutations
// live in useCardComments (called from CardEdit) and arrive via props.
export function CommentsSection({
  isDemo,
  users,
  currentUserId,
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
  threads,
  toggleThread,
  loadMoreReplies,
  addReply,
  toggleReaction,
  flashIds,
  gifsEnabled,
}: CommentsSectionProps) {
  // The composer is one quiet line until the writer commits to it; it also
  // stays open while there's an unposted draft so nothing gets lost.
  const [composerOpen, setComposerOpen] = useState(false);
  const composerExpanded = composerOpen || !isHtmlEmpty(newComment);
  // Which comment's reaction picker (quick set) / full emoji picker is open.
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const [fullPickerFor, setFullPickerFor] = useState<number | null>(null);
  // Reply drafts + which thread composers are expanded (drafts survive collapse).
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [replyOpen, setReplyOpen] = useState<Record<number, boolean>>({});
  const [postingReply, setPostingReply] = useState<number | null>(null);

  const avatar = (userId: number, name: string, size = 34) => (
    <span
      className="cm-av cf-mono flex-shrink-0 rounded-full flex items-center justify-center font-bold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        color: "#1c1a16",
        background: AVATAR_COLORS[userId % AVATAR_COLORS.length],
      }}
      title={name}
    >
      {initials(name)}
    </span>
  );

  const editorBox = (
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
  ) => (
    <div
      className="rounded-lg px-3 py-2"
      style={{
        border: "1px solid var(--cf-edge)",
        background: "rgba(0,0,0,0.14)",
      }}
    >
      <RichTextEditor
        compact
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        mentionUsers={users}
        onUploadImage={uploadImage}
        enableGifs={gifsEnabled}
      />
    </div>
  );

  const openReply = (commentId: number) => {
    const t = threads[commentId];
    if (!t?.expanded) toggleThread(commentId);
    setReplyOpen((o) => ({ ...o, [commentId]: true }));
  };

  const postReply = async (parentId: number) => {
    const body = replyDrafts[parentId] ?? "";
    if (isHtmlEmpty(body) || postingReply === parentId) return;
    setPostingReply(parentId);
    const ok = await addReply(parentId, body);
    setPostingReply(null);
    if (ok) {
      setReplyDrafts((d) => ({ ...d, [parentId]: "" }));
      setReplyOpen((o) => ({ ...o, [parentId]: false }));
    }
  };

  // Floating hover action bar — react / reply / edit / delete as icon buttons.
  const actionBar = (comment: Comment, isReply: boolean) => {
    const mineComment = comment.user?.id === currentUserId;
    return (
      <div className="cm-actions" role="toolbar" aria-label="Comment actions">
        <button
          type="button"
          className="cm-ab"
          aria-label="React"
          onClick={() =>
            setPickerFor(pickerFor === comment.id ? null : comment.id)
          }
        >
          <Icon icon={faFaceSmile} />
        </button>
        {!isReply && !isDemo && (
          <button
            type="button"
            className="cm-ab"
            aria-label="Reply"
            onClick={() => openReply(comment.id)}
          >
            <Icon icon={faReply} />
          </button>
        )}
        {mineComment && (
          <>
            <button
              type="button"
              className="cm-ab"
              aria-label="Edit"
              onClick={() => startEditComment(comment)}
            >
              <Icon icon={faPen} />
            </button>
            <button
              type="button"
              className="cm-ab cm-ab--warn"
              aria-label="Delete"
              onClick={() => {
                if (
                  !isReply &&
                  comment.replies_count > 0 &&
                  !window.confirm(
                    `Delete this comment and its ${comment.replies_count} ${
                      comment.replies_count === 1 ? "reply" : "replies"
                    }?`,
                  )
                )
                  return;
                handleDeleteComment(comment.id, comment.parent_id);
              }}
            >
              <Icon icon={faTrash} />
            </button>
          </>
        )}
      </div>
    );
  };

  const reactionChips = (comment: Comment) => (
    <div className="cm-reactions">
      {comment.reactions?.map((r) => {
        const mine = r.user_ids.includes(currentUserId);
        return (
          <button
            key={r.emoji}
            type="button"
            onClick={() => toggleReaction(comment, r.emoji)}
            className={`cm-chip ${mine ? "cm-chip--mine" : ""}`}
            title={r.names.join(", ")}
            aria-pressed={mine}
          >
            <span>{r.emoji}</span>
            <span className="cf-mono">{r.count}</span>
          </button>
        );
      })}
      {!isDemo && (
        <button
          type="button"
          className="cm-chip cm-chip--add"
          aria-label="Add reaction"
          onClick={() =>
            setPickerFor(pickerFor === comment.id ? null : comment.id)
          }
        >
          <Icon icon={faFaceSmile} style={{ fontSize: "11px" }} />
          <span style={{ fontSize: "11px" }}>+</span>
        </button>
      )}
    </div>
  );

  const reactionPicker = (comment: Comment) =>
    pickerFor === comment.id && (
      <div className="cm-picker">
        {QUICK_EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            className="cm-picker__emoji"
            onClick={() => {
              toggleReaction(comment, e);
              setPickerFor(null);
            }}
          >
            {e}
          </button>
        ))}
        <button
          type="button"
          className="cm-picker__more"
          title="All emoji"
          aria-label="All emoji"
          onClick={() => {
            setPickerFor(null);
            setFullPickerFor(comment.id);
          }}
        >
          <Icon icon={faPlus} style={{ fontSize: "11px" }} />
        </button>
      </div>
    );

  const commentRow = (comment: Comment, isReply: boolean) => (
    <div
      key={comment.id}
      className={`cm-row group ${isReply ? "cm-row--reply" : ""} ${
        flashIds.has(comment.id) ? "cm-new" : ""
      }`}
    >
      {avatar(comment.user?.id ?? 0, comment.user?.name ?? "?", isReply ? 26 : 34)}
      <div className="min-w-0 flex flex-col gap-0.5 relative">
        {editingCommentId !== comment.id && actionBar(comment, isReply)}

        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="cm-who">{comment.user?.name}</span>
          <span className="cm-when cf-mono" title={stamp(comment.created_at)}>
            {relTime(comment.created_at)}
          </span>
          {comment.edited && (
            <span className="cm-edited cf-mono" title="Edited">
              EDITED
            </span>
          )}
        </div>

        {reactionPicker(comment)}
        {fullPickerFor === comment.id && (
          <EmojiPickerPopover
            onClose={() => setFullPickerFor(null)}
            onPick={(emoji) => {
              toggleReaction(comment, emoji);
              setFullPickerFor(null);
            }}
          />
        )}

        {editingCommentId === comment.id ? (
          <div className="flex flex-col gap-2 mt-1">
            {editorBox(
              editingCommentBody,
              setEditingCommentBody,
              "Edit your comment…",
            )}
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
          <RichTextContent html={comment.body} className="text-[12.5px] mt-0.5" />
        )}

        {reactionChips(comment)}
        {!isReply && thread(comment)}
      </div>
    </div>
  );

  // Thread summary + expanded replies under a top-level comment.
  const thread = (comment: Comment) => {
    const t = threads[comment.id];
    const expanded = !!t?.expanded;
    if (comment.replies_count === 0 && !expanded) return null;

    return (
      <div className="flex flex-col">
        {comment.replies_count > 0 && (
          <button
            type="button"
            onClick={() => toggleThread(comment.id)}
            className="cm-thread-toggle cf-mono"
          >
            <span>
              {expanded ? "▾" : "▸"} {comment.replies_count}{" "}
              {comment.replies_count === 1 ? "REPLY" : "REPLIES"}
            </span>
            {!expanded && (comment.reply_avatars?.length ?? 0) > 0 && (
              <span className="cm-facestack">
                {comment.reply_avatars!.map((a) => (
                  <span
                    key={a.id}
                    className="cm-face cf-mono"
                    style={{
                      background: AVATAR_COLORS[a.id % AVATAR_COLORS.length],
                    }}
                    title={a.name}
                  >
                    {initials(a.name)[0]}
                  </span>
                ))}
              </span>
            )}
            {!expanded && comment.last_reply_at && (
              <span className="cm-thread-toggle__last">
                · {relTime(comment.last_reply_at)}
              </span>
            )}
          </button>
        )}
        {expanded && (
          <div className="cm-thread">
            {t?.loading && t.replies.length === 0 && (
              <p
                style={{ fontSize: "11px", color: "var(--cf-text-muted)" }}
                className="cf-mono"
              >
                Loading thread…
              </p>
            )}
            {t?.replies.map((r) => commentRow(r, true))}
            {t?.hasMore && (
              <button
                type="button"
                onClick={() => loadMoreReplies(comment.id)}
                disabled={t.loading}
                style={{ fontSize: "10px" }}
                className="aero-btn self-start px-3 py-1 font-bold cursor-pointer disabled:opacity-40"
              >
                {t.loading ? "Loading…" : "More replies"}
              </button>
            )}
            {!isDemo &&
              (replyOpen[comment.id] ? (
                <div className="cm-reply-editor flex flex-col gap-2 pt-1">
                  {editorBox(
                    replyDrafts[comment.id] ?? "",
                    (v) => setReplyDrafts((d) => ({ ...d, [comment.id]: v })),
                    "Reply to the thread…",
                  )}
                  <div className="flex items-center gap-2 self-end">
                    <button
                      onClick={() =>
                        setReplyOpen((o) => ({ ...o, [comment.id]: false }))
                      }
                      style={{ fontSize: "11px" }}
                      className="aero-btn px-4 py-1.5 font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => postReply(comment.id)}
                      disabled={
                        isHtmlEmpty(replyDrafts[comment.id] ?? "") ||
                        postingReply === comment.id
                      }
                      style={{ fontSize: "11px" }}
                      className="aero-btn aero-btn--cyan px-4 py-1.5 font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {postingReply === comment.id ? "Posting…" : "Reply"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="cm-reply-pill"
                  onClick={() =>
                    setReplyOpen((o) => ({ ...o, [comment.id]: true }))
                  }
                >
                  <Icon icon={faReply} style={{ fontSize: "10px" }} />
                  Reply to the thread…
                </button>
              ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Compose */}
      {!isDemo &&
        (composerExpanded ? (
          <div className="flex flex-col gap-2">
            {editorBox(
              newComment,
              setNewComment,
              "Write a comment… (type @ to mention, paste or drop an image)",
            )}
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
            className="cm-composer-pill cf-mono"
          >
            <Icon icon={faReply} style={{ fontSize: "11px", transform: "scaleX(-1)" }} />
            <span>Write a comment…</span>
            <span className="cm-composer-pill__keys">
              <span>@ MENTION</span>
              {gifsEnabled && <span>GIF</span>}
            </span>
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

      {/* Comments (newest first), each with its own thread */}
      {loadingComments && (
        <p
          style={{ fontSize: "12px", color: "var(--cf-text-muted)" }}
          className="cf-mono text-center"
        >
          Loading...
        </p>
      )}
      <div className="cm-list">{comments.map((c) => commentRow(c, false))}</div>

      {/* The list is newest-first: the next page holds older comments, appended below. */}
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
