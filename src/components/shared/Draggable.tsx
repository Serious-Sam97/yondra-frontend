import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function Draggable({ id, children }: { id: string; children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

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
