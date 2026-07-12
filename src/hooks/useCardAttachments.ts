"use client";

import { useEffect, useRef, useState } from "react";
import type { CardDocument, CardInterface } from "@/interfaces/CardInterface";
import {
  ApiError,
  deleteCardDocument,
  downloadCardDocument,
  uploadCardDocument,
  uploadInlineImage,
} from "@/lib/api";

interface UseCardAttachmentsParams {
  isNew: boolean;
  isDemo: boolean;
  boardId?: number;
  card: CardInterface | null;
  // Sync document-attachment changes back to the board's card state so they
  // survive a modal close/reopen without relying on the realtime echo.
  onDocumentsChange?: (documents: CardDocument[]) => void;
  reportActionError: (message: string) => void;
}

// Card attachments for the editor: document files (private disk, auth-gated
// download), inline rich-text image uploads, and the full-size image lightbox.
// Documents are seeded by the editor's mount effect (via setDocuments).
export function useCardAttachments({
  isNew,
  isDemo,
  boardId,
  card,
  onDocumentsChange,
  reportActionError,
}: UseCardAttachmentsParams) {
  // Card document attachments (files on the private disk, downloaded via an auth-gated route).
  const [documents, setDocuments] = useState<CardDocument[]>([]);
  const [docBusy, setDocBusy] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Full-size viewer opened by clicking any inline image (description or comments).
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Close the image lightbox on Escape.
  useEffect(() => {
    if (!lightboxSrc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxSrc(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxSrc]);

  // Same live-sync as links for document attachments arriving on the card prop.
  useEffect(() => {
    if (card?.documents) setDocuments(card.documents);
  }, [JSON.stringify(card?.documents ?? [])]);

  const canUseDocs = !isNew && !isDemo && !!boardId && !!card?.id;

  const handleUploadDoc = async (file: File) => {
    if (!canUseDocs) return;
    setDocBusy(true);
    setDocError(null);
    try {
      const created = await uploadCardDocument(boardId!, card!.id, file);
      setDocuments((prev) => {
        const next = [...prev, created];
        onDocumentsChange?.(next);
        return next;
      });
    } catch (e) {
      setDocError(
        e instanceof ApiError && e.status === 422
          ? "Unsupported file type or file too large (max 20MB)."
          : "Upload failed — try again.",
      );
    } finally {
      setDocBusy(false);
      if (docInputRef.current) docInputRef.current.value = "";
    }
  };

  const handleDeleteDoc = async (documentId: number) => {
    if (!canUseDocs) return;
    const prev = documents;
    const next = documents.filter((d) => d.id !== documentId);
    setDocuments(next); // optimistic
    onDocumentsChange?.(next);
    try {
      await deleteCardDocument(boardId!, card!.id, documentId);
    } catch {
      setDocuments(prev); // restore on failure
      onDocumentsChange?.(prev);
      setDocError("Could not remove that file.");
    }
  };

  const handleDownloadDoc = async (doc: CardDocument) => {
    if (!canUseDocs) return;
    try {
      await downloadCardDocument(
        boardId!,
        card!.id,
        doc.id,
        doc.original_name ?? `document-${doc.id}`,
      );
    } catch {
      setDocError("Download failed — try again.");
    }
  };

  // --- Rich-text image upload (shared by description + comments) ---
  // Uploads to the card's attachments endpoint and returns the public URL the
  // editor embeds inline. Rejects in demo mode (no backend).
  const uploadImage = async (file: File): Promise<string> => {
    // Board-scoped so it works while composing a brand-new card (no card id yet).
    if (isDemo || !boardId) throw new Error("uploads unavailable");
    try {
      const { url } = await uploadInlineImage(boardId, file);
      return url;
    } catch {
      reportActionError("Image upload failed — try again");
      throw new Error("upload failed");
    }
  };

  return {
    documents,
    setDocuments,
    docBusy,
    docError,
    docInputRef,
    canUseDocs,
    handleUploadDoc,
    handleDeleteDoc,
    handleDownloadDoc,
    lightboxSrc,
    setLightboxSrc,
    uploadImage,
  };
}
