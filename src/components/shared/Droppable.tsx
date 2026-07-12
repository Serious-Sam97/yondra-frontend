import { useDroppable } from "@dnd-kit/core";
import type React from "react";

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
      className={isOver ? "drop-target-active" : ""}
    >
      {children}
    </div>
  );
}
