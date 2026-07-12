"use client";

import { useEffect, useState } from "react";
import type { CardInterface } from "@/interfaces/CardInterface";
import {
  createComment,
  deleteComment,
  getComments,
  updateComment,
} from "@/lib/api";

export interface Comment {
  id: number;
  body: string;
  user: { id: number; name: string };
  created_at: string;
}

// An "empty" rich-text body is <p></p> / whitespace once tags are stripped —
// but an image-only comment is still valid content.
export const isHtmlEmpty = (html: string) =>
  !/<img\b/i.test(html) &&
  html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim() === "";

interface UseCardCommentsParams {
  isNew: boolean;
  isDemo: boolean;
  boardId?: number;
  card: CardInterface | null;
  // The card id held in the editor's form state (0 until a saved card loads).
  id: number | string;
  reportActionError: (message: string) => void;
}

// Comment thread for the card editor: fetch on open (saved, non-demo cards),
// compose, inline edit, and delete. Comments are unavailable in demo mode.
// The API serves the thread newest-first, 30 per page; the UI renders the list
// top-down in that order, so older pages are simply appended below and exposed
// via a "load older comments" control while another page exists.
export function useCardComments({
  isNew,
  isDemo,
  boardId,
  card,
  id,
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
    }
  }, []);

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
    setComments((prev) => [comment, ...prev]);
    setNewComment("");
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
    let updated;
    try {
      updated = await updateComment(boardId, id, commentId, body);
    } catch {
      reportActionError("Comment not updated — try again");
      setSavingComment(false);
      return;
    }
    setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
    setSavingComment(false);
    cancelEditComment();
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!boardId || !id) return;
    try {
      await deleteComment(boardId, id, commentId);
    } catch {
      reportActionError("Could not delete comment — try again");
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== commentId));
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
  };
}
