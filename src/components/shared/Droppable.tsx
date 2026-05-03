import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface DroppableInterface {
    id: string;
    children: React.ReactNode;
    style: React.CSSProperties;
}

export function Droppable({ id, children, style }: DroppableInterface) {
    const { isOver, setNodeRef } = useDroppable({ id });

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={isOver ? 'drop-target-active' : ''}
        >
            {children}
        </div>
    );
}
