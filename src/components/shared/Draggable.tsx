import React from 'react';
import { useDraggable } from '@dnd-kit/core';

export function Draggable({ id, children }: { id: string; children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });

    return (
        <button
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className="w-full block"
            style={{
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
