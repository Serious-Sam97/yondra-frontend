// Vortex's nervous system: features emit what just happened, Vortex decides
// whether (and how) to react. Emitting is free when he's disabled — nobody is
// subscribed — so call sites never need to check.

export type VortexEvent =
  | { type: "drag.start"; cardId?: number | string }
  | { type: "drag.end" }
  | {
      type: "card.moved";
      boardId: number;
      cardId: number | string;
      fromSectionId: number | null;
      toSectionId: number;
      done: boolean;
    }
  | {
      type: "card.jammed";
      boardId: number;
      cardId: number | string;
      reason: string;
    }
  | { type: "card.unjammed"; boardId: number; cardId: number | string }
  // A card was dropped onto Vortex ("feed the void"); the board already put it back.
  | {
      type: "card.fed";
      boardId: number;
      cardId: number | string;
      hasBacklog: boolean;
    }
  // Vortex asking the board to act — the board runs its own flow (the archive
  // goes through the normal confirmation modal).
  | { type: "vortex.archive"; boardId: number; cardId: number | string }
  | { type: "vortex.backlog"; boardId: number; cardId: number | string }
  | { type: "vortex.open"; boardId: number; cardId: number | string }
  // the user signed his contract: push this card's due date out by `days`
  | {
      type: "vortex.postpone";
      boardId: number;
      cardId: number | string;
      days: number;
    }
  | {
      type: "card.opened";
      boardId: number;
      cardId: number | string;
      tags?: number;
    }
  // saved in the editor: what changed (only the fields that did)
  | {
      type: "card.edited";
      boardId: number;
      cardId: number | string;
      renamed?: boolean;
      priorityUp?: boolean;
      assigneeChanged?: boolean;
      tagsAdded?: number;
      checklistDone?: boolean;
      longDescription?: boolean;
    }
  // archived: where it sat, so a candle can be lit in its place
  | {
      type: "card.archived";
      boardId: number;
      cardId: number | string;
      rect: { left: number; top: number; width: number; height: number } | null;
    };

const listeners = new Set<(e: VortexEvent) => void>();

export function emitVortex(e: VortexEvent): void {
  for (const fn of listeners) {
    try {
      fn(e);
    } catch {
      // A reaction must never break the feature that emitted the event.
    }
  }
}

export function subscribeVortex(fn: (e: VortexEvent) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* Drop zone: Vortex registers where his body is so a dragged card can be fed
   to him. The board asks on drop; nobody registered → never "over" him. */
let dropZone: (() => DOMRect | null) | null = null;

export function setVortexDropZone(fn: (() => DOMRect | null) | null): void {
  dropZone = fn;
}

export function isOverVortex(x: number, y: number): boolean {
  const r = dropZone?.();
  return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}
