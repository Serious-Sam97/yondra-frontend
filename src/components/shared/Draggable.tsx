import React from 'react';
import { useDraggable } from '@dnd-kit/core';

export function Draggable(props: any) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: props.id,
    });

    return (
        <button
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className="w-full block"
            style={{ opacity: isDragging ? 0 : 1, cursor: isDragging ? 'grabbing' : 'grab' }}
        >
            {props.children}
        </button>
    );
}