"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ProjectBoard } from "@/interfaces/ProjectInterface";
import BoardCard from "./BoardCard";

// Draggable shell around a BoardCard for the project-page grid (YON-125). Uses a
// <div> (not a <button>) so the inner BoardCard button's onClick still fires — the
// MouseSensor's 5px activation distance is what separates a plain click (open the
// board) from a drag (reorder / move to another project).
export default function SortableBoardCard({
  board,
  projectColor,
  editMode,
  isOwner,
  disabled,
  onClick,
}: {
  board: ProjectBoard;
  projectColor: string;
  editMode?: boolean;
  isOwner?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `board-${board.id}`, disabled });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        cursor: disabled ? undefined : "grab",
        touchAction: "none",
      }}
    >
      <BoardCard
        board={board}
        projectColor={projectColor}
        editMode={editMode}
        isOwner={isOwner}
        onClick={onClick}
      />
    </div>
  );
}
