"use client";

import {
  faBoxArchive,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import Modal from "@/components/shared/Modal";
import Icon from "@/components/ui/Icon";
import { TOOL_COLORS } from "./BoardToolsDock";

interface DeleteSectionModalProps {
  sectionName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

// Destructive confirm: deleting a section permanently deletes its cards.
export function DeleteSectionModal({
  sectionName,
  onCancel,
  onConfirm,
}: DeleteSectionModalProps) {
  return (
    <Modal>
      <div className="aero-menu p-6 w-[90%] max-w-sm flex flex-col gap-6">
        <div className="flex flex-col items-center text-center gap-3">
          <p className="text-3xl" style={{ color: "var(--cf-amber)" }}>
            <Icon icon={faTriangleExclamation} />
          </p>
          <p
            className="cf-mono font-bold text-lg"
            style={{ color: "var(--cf-text)" }}
          >
            Delete "{sectionName}"?
          </p>
          <p
            className="cf-mono text-sm"
            style={{ color: "var(--cf-text-muted)" }}
          >
            All cards in this section will be permanently deleted.
          </p>
        </div>
        <div className="flex justify-between">
          <button
            onClick={onCancel}
            className="aero-btn aero-btn--ghost text-xs uppercase tracking-widest px-4 py-2 cursor-pointer"
          >
            Go back
          </button>
          <button
            onClick={onConfirm}
            className="aero-btn aero-btn--magenta text-xs uppercase tracking-widest font-bold px-4 py-2 cursor-pointer"
          >
            Yes, delete
          </button>
        </div>
      </div>
    </Modal>
  );
}

interface ArchiveCardModalProps {
  cardName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

// Soft confirm: archiving a card is reversible from the archive browser.
export function ArchiveCardModal({
  cardName,
  onCancel,
  onConfirm,
}: ArchiveCardModalProps) {
  return (
    <Modal>
      <div className="aero-menu p-6 w-[90%] max-w-sm flex flex-col gap-6">
        <div className="flex flex-col items-center text-center gap-3">
          <p className="text-3xl" style={{ color: TOOL_COLORS.archived }}>
            <Icon icon={faBoxArchive} />
          </p>
          <p
            className="cf-mono font-bold text-lg"
            style={{ color: "var(--cf-text)" }}
          >
            Archive this card?
          </p>
          <p
            className="cf-mono text-sm"
            style={{ color: "var(--cf-text-muted)" }}
          >
            "{cardName}" will be moved to the archive. You can restore it later.
          </p>
        </div>
        <div className="flex justify-between">
          <button
            onClick={onCancel}
            className="aero-btn aero-btn--ghost text-xs uppercase tracking-widest px-4 py-2 cursor-pointer"
          >
            Go back
          </button>
          <button
            onClick={onConfirm}
            className="aero-btn aero-btn--cyan text-xs uppercase tracking-widest font-bold px-4 py-2 cursor-pointer"
          >
            Archive it
          </button>
        </div>
      </div>
    </Modal>
  );
}
