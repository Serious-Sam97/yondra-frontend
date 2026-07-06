import React from 'react';
import { useSortable, defaultAnimateLayoutChanges, type AnimateLayoutChanges } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Animate layout shifts even when the change is caused by a card entering from ANOTHER
// column (not just sorting within this list). Without this, siblings below a cross-column
// insertion jump instead of sliding down — the missing "cards move to make room" animation.
const animateLayoutChanges: AnimateLayoutChanges = (args) =>
    defaultAnimateLayoutChanges({ ...args, wasDragging: true });

export function Draggable({ id, children }: { id: string; children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, animateLayoutChanges });

    return (
        <button
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className="w-full block"
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0 : 1,
                cursor: isDragging ? 'grabbing' : 'grab',
                background: 'none',
                border: 'none',
                padding: 0,
                textAlign: 'left',
                userSelect: 'none',
                WebkitUserSelect: 'none',
            }}
        >
            {children}
        </button>
    );
}
