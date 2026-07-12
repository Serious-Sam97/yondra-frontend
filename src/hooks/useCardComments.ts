"use client";

import { useEffect, useRef, useState } from "react";
import type {
  CardComment,
  CardInterface,
  CommentReactionAgg,
} from "@/interfaces/CardInterface";
import {
  createComment,
  deleteComment,
  getCommentReplies,
  getComments,
  getGifAvailability,
  reactToComment,
  updateComment,
} from "@/lib/api";
import { getEcho } from "@/lib/echo";

export type Comment = CardComment;

// One expanded (or expandable) thread under a top-level comment.
export interface ThreadState {
  replies: Comment[];
  expanded: boolean;
  loading: boolean;
  hasMore: boolean;
  page: number;
}

// An "empty" rich-text body is <p></p> / whitespace once tags are stripped —
// but an image-only comment is still valid content.
export const isHtmlEmpty = (html: string) =>
  !/<img\b/i.test(html) &&
  html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim() === "";

// Local reaction toggle for optimistic updates; the server response reconciles.
function toggleAgg(
  reactions: CommentReactionAgg[],
  emoji: string,
  userId: number,
  userName: string,
): CommentReactionAgg[] {
  const existing = reactions.find((r) => r.emoji === emoji);
  if (existing?.user_ids.includes(userId)) {
    return reactions
      .map((r) =>
        r.emoji === emoji
          ? {
              ...r,
              count: r.count - 1,
              user_ids: r.user_ids.filter((id) => id !== userId),
              names: r.names.filter((n) => n !== userName),
            }
          : r,
      )
      .filter((r) => r.count > 0);
  }
  if (existing) {
    return reactions.map((r) =>
      r.emoji === emoji
        ? {
            ...r,
            count: r.count + 1,
            user_ids: [...r.user_ids, userId],
            names: [...r.names, userName],
          }
        : r,
    );
  }
  return [
    ...reactions,
    { emoji, count: 1, user_ids: [userId], names: [userName] },
  ];
}

interface UseCardCommentsParams {
  isNew: boolean;
  isDemo: boolean;
  boardId?: number;
  card: CardInterface | null;
  // The card id held in the editor's form state (0 until a saved card loads).
  id: number | string;
  currentUserId?: number;
  currentUserName?: string;
  reportActionError: (message: string) => void;
}

// Comment threads for the card editor: newest-first top-level comments (30/page,
// older pages appended below), single-level reply threads expanded lazily,
// emoji reactions with optimistic toggles, and live updates over the shared
// board channel (comment.* events scoped to this card, deduped by id since the
// actor receives both the HTTP response and the echo).
export function useCardComments({
  isNew,
  isDemo,
  boardId,
  card,
  id,
  currentUserId = 0,
  currentUserName = "You",
  reportActionError,
}: UseCardCommentsParams) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  // Older-page loading: which page we're on + whether the API has another.
  const [commentsPage, setCommentsPage] = useState(1);
  const [hasOlderComments, setHasOlderComments] = useState(false);
  const [loadingOlderComments, setLoadingOlderComments] = useState(false);
  // Inline comment editing: id of the comment being edited + its draft body.
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");
  const [savingComment, setSavingComment] = useState(false);
  // Reply threads, keyed by the top-level comment id.
  const [threads, setThreads] = useState<Record<number, ThreadState>>({});
  // Ids of comments that just arrived live — the UI flashes them briefly.
  const [flashIds, setFlashIds] = useState<Set<number>>(new Set());
  // Whether the backend has a Tenor key (no key → composer hides the GIF button).
  const [gifsEnabled, setGifsEnabled] = useState(false);

  const active = !isNew && !isDemo && !!boardId && !!card?.id;

  useEffect(() => {
    if (!isNew && !isDemo && boardId && card?.id) {
      setLoadingComments(true);
      getComments(boardId, card.id)
        .then((page) => {
          setComments(Array.isArray(page.data) ? page.data : []);
          setCommentsPage(page.current_page);
          setHasOlderComments(page.next_page_url !== null);
        })
        .catch(() => {})
        .finally(() => setLoadingComments(false));

      getGifAvailability()
        .then((a) => setGifsEnabled(!!a?.enabled))
        .catch(() => {});
    }
  }, []);

  // Apply a patch to a comment wherever it lives (top list or a thread).
  const patchComment = (
    commentId: number,
    parentId: number | null,
    patch: Partial<Comment>,
  ) => {
    if (parentId === null) {
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, ...patch } : c)),
      );
    } else {
      setThreads((prev) => {
        const t = prev[parentId];
        if (!t) return prev;
        return {
          ...prev,
          [parentId]: {
            ...t,
            replies: t.replies.map((c) =>
              c.id === commentId ? { ...c, ...patch } : c,
            ),
          },
        };
      });
    }
  };

  const flash = (commentId: number) => {
    setFlashIds((prev) => new Set(prev).add(commentId));
    setTimeout(() => {
      setFlashIds((prev) => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }, 2000);
  };

  // Live comments: same shared private channel the board owns — detach only our
  // handler on cleanup, never leave the channel.
  const stateRef = useRef({ comments, threads });
  stateRef.current = { comments, threads };
  useEffect(() => {
    if (!active || !boardId || !card?.id) return;
    const cardId = card.id;

    type CommentEvent = {
      type: string;
      payload: Partial<Comment> & {
        card_id: number;
        comment_id?: number;
        parent_id?: number | null;
      };
    };

    const channel = getEcho().private(`board.${boardId}`);
    const handler = (e: CommentEvent) => {
      if (!e.type.startsWith("comment.")) return;
      if (e.payload.card_id !== cardId) return;

      if (e.type === "comment.created") {
        const c = e.payload as Comment;
        if (c.parent_id === null) {
          if (stateRef.current.comments.some((x) => x.id === c.id)) return;
          setComments((prev) =>
            prev.some((x) => x.id === c.id) ? prev : [c, ...prev],
          );
          if (c.user?.id !== currentUserId) flash(c.id);
        } else {
          // Bump the thread summary on the parent; append if it's open.
          const parentId = c.parent_id;
          setComments((prev) =>
            prev.map((p) =>
              p.id === parentId
                ? {
                    ...p,
                    replies_count: stateRef.current.threads[parentId]?.replies.some(
                      (x) => x.id === c.id,
                    )
                      ? p.replies_count
                      : p.replies_count + 1,
                    last_reply_at: c.created_at,
                  }
                : p,
            ),
          );
          setThreads((prev) => {
            const t = prev[parentId];
            if (!t || t.replies.some((x) => x.id === c.id)) return prev;
            return { ...prev, [parentId]: { ...t, replies: [...t.replies, c] } };
          });
          if (c.user?.id !== currentUserId) flash(c.id);
        }
      }

      if (e.type === "comment.updated" || e.type === "comment.reacted") {
        const c = e.payload as Comment;
        patchComment(c.id, c.parent_id, {
          body: c.body,
          edited: c.edited,
          reactions: c.reactions,
          updated_at: c.updated_at,
        });
      }

      if (e.type === "comment.deleted") {
        const { comment_id, parent_id } = e.payload;
        if (!comment_id) return;
        if (parent_id == null) {
          setComments((prev) => prev.filter((c) => c.id !== comment_id));
          setThreads((prev) => {
            const { [comment_id]: _gone, ...rest } = prev;
            return rest;
          });
        } else {
          setThreads((prev) => {
            const t = prev[parent_id];
            if (!t) return prev;
            return {
              ...prev,
              [parent_id]: {
                ...t,
                replies: t.replies.filter((c) => c.id !== comment_id),
              },
            };
          });
          setComments((prev) =>
            prev.map((p) =>
              p.id === parent_id
                ? { ...p, replies_count: Math.max(0, p.replies_count - 1) }
                : p,
            ),
          );
        }
      }
    };
    channel.listen(".board.event", handler);

    return () => {
      channel.stopListening(".board.event", handler);
    };
  }, [active, boardId, card?.id, currentUserId]);

  const handleLoadOlderComments = async () => {
    if (!boardId || !card?.id || loadingOlderComments) return;
    setLoadingOlderComments(true);
    try {
      const page = await getComments(boardId, card.id, commentsPage + 1);
      setComments((prev) => {
        // Comments posted since page 1 loaded shift the windows — drop any
        // row we already display rather than rendering it twice.
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...page.data.filter((c) => !seen.has(c.id))];
      });
      setCommentsPage(page.current_page);
      setHasOlderComments(page.next_page_url !== null);
    } catch {
      reportActionError("Could not load older comments — try again");
    } finally {
      setLoadingOlderComments(false);
    }
  };

  const handleAddComment = async () => {
    const body = newComment;
    if (isHtmlEmpty(body) || !boardId || !id) return;
    let comment;
    try {
      comment = await createComment(boardId, id, body);
    } catch {
      // Keep the draft so the user can retry.
      reportActionError("Comment not posted — try again");
      return;
    }
    setComments((prev) =>
      prev.some((c) => c.id === comment.id) ? prev : [comment, ...prev],
    );
    setNewComment("");
  };

  // Expand (fetching on first open) or collapse a comment's reply thread.
  const toggleThread = async (commentId: number) => {
    const t = threads[commentId];
    if (t?.expanded) {
      setThreads((prev) => ({
        ...prev,
        [commentId]: { ...t, expanded: false },
      }));
      return;
    }
    if (t) {
      setThreads((prev) => ({ ...prev, [commentId]: { ...t, expanded: true } }));
      return;
    }
    if (!boardId || !id) return;
    setThreads((prev) => ({
      ...prev,
      [commentId]: {
        replies: [],
        expanded: true,
        loading: true,
        hasMore: false,
        page: 1,
      },
    }));
    try {
      const page = await getCommentReplies(boardId, id, commentId);
      setThreads((prev) => ({
        ...prev,
        [commentId]: {
          replies: page.data,
          expanded: true,
          loading: false,
          hasMore: page.next_page_url !== null,
          page: page.current_page,
        },
      }));
    } catch {
      setThreads((prev) => {
        const { [commentId]: _gone, ...rest } = prev;
        return rest;
      });
      reportActionError("Could not load the thread — try again");
    }
  };

  const loadMoreReplies = async (commentId: number) => {
    const t = threads[commentId];
    if (!t || t.loading || !boardId || !id) return;
    setThreads((prev) => ({ ...prev, [commentId]: { ...t, loading: true } }));
    try {
      const page = await getCommentReplies(boardId, id, commentId, t.page + 1);
      setThreads((prev) => {
        const cur = prev[commentId];
        if (!cur) return prev;
        const seen = new Set(cur.replies.map((c) => c.id));
        return {
          ...prev,
          [commentId]: {
            ...cur,
            replies: [...cur.replies, ...page.data.filter((c) => !seen.has(c.id))],
            loading: false,
            hasMore: page.next_page_url !== null,
            page: page.current_page,
          },
        };
      });
    } catch {
      setThreads((prev) => {
        const cur = prev[commentId];
        return cur
          ? { ...prev, [commentId]: { ...cur, loading: false } }
          : prev;
      });
      reportActionError("Could not load more replies — try again");
    }
  };

  // Post into a thread. Returns true on success so the composer can clear.
  const addReply = async (parentId: number, body: string): Promise<boolean> => {
    if (isHtmlEmpty(body) || !boardId || !id) return false;
    let reply: Comment;
    try {
      reply = await createComment(boardId, id, body, parentId);
    } catch {
      reportActionError("Reply not posted — try again");
      return false;
    }
    setThreads((prev) => {
      const t = prev[parentId];
      if (!t || t.replies.some((c) => c.id === reply.id)) return prev;
      return { ...prev, [parentId]: { ...t, replies: [...t.replies, reply] } };
    });
    setComments((prev) =>
      prev.map((p) =>
        p.id === parentId
          ? {
              ...p,
              replies_count: p.replies_count + 1,
              last_reply_at: reply.created_at,
            }
          : p,
      ),
    );
    return true;
  };

  // Optimistic toggle; the server response (or the old state, on error) reconciles.
  const toggleReaction = async (comment: Comment, emoji: string) => {
    if (!boardId || !id || !currentUserId) return;
    const before = comment.reactions;
    patchComment(comment.id, comment.parent_id, {
      reactions: toggleAgg(before, emoji, currentUserId, currentUserName),
    });
    try {
      const fresh = await reactToComment(boardId, id, comment.id, emoji);
      patchComment(comment.id, comment.parent_id, {
        reactions: fresh.reactions,
      });
    } catch {
      patchComment(comment.id, comment.parent_id, { reactions: before });
      reportActionError("Reaction didn't stick — try again");
    }
  };

  const startEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentBody(comment.body);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentBody("");
  };

  const handleUpdateComment = async (commentId: number) => {
    const body = editingCommentBody;
    if (isHtmlEmpty(body) || !boardId || !id || savingComment) return;
    setSavingComment(true);
    let updated: Comment;
    try {
      updated = await updateComment(boardId, id, commentId, body);
    } catch {
      reportActionError("Comment not updated — try again");
      setSavingComment(false);
      return;
    }
    patchComment(updated.id, updated.parent_id, updated);
    setSavingComment(false);
    cancelEditComment();
  };

  const handleDeleteComment = async (commentId: number, parentId: number | null = null) => {
    if (!boardId || !id) return;
    try {
      await deleteComment(boardId, id, commentId);
    } catch {
      reportActionError("Could not delete comment — try again");
      return;
    }
    if (parentId === null) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } else {
      setThreads((prev) => {
        const t = prev[parentId];
        if (!t) return prev;
        return {
          ...prev,
          [parentId]: {
            ...t,
            replies: t.replies.filter((c) => c.id !== commentId),
          },
        };
      });
      setComments((prev) =>
        prev.map((p) =>
          p.id === parentId
            ? { ...p, replies_count: Math.max(0, p.replies_count - 1) }
            : p,
        ),
      );
    }
  };

  return {
    comments,
    newComment,
    setNewComment,
    loadingComments,
    hasOlderComments,
    loadingOlderComments,
    handleLoadOlderComments,
    editingCommentId,
    editingCommentBody,
    setEditingCommentBody,
    savingComment,
    handleAddComment,
    startEditComment,
    cancelEditComment,
    handleUpdateComment,
    handleDeleteComment,
    threads,
    toggleThread,
    loadMoreReplies,
    addReply,
    toggleReaction,
    flashIds,
    gifsEnabled,
  };
}
