"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ProjectBoard } from "@/interfaces/ProjectInterface";
import BoardCard from "./BoardCard";
import BoardSpineRow from "./BoardSpineRow";

// Draggable shell around a BoardCard for the project-page grid (YON-125). Uses a
// <div> (not a <button>) so the inner BoardCard button's onClick still fires — the
// MouseSensor's 5px activation distance is what separates a plain click (open the
// board) from a drag (reorder / move to another project). `variant` picks the
// grid cassette or the list-view spine row.
export default function SortableBoardCard({
  board,
  projectColor,
  editMode,
  isOwner,
  disabled,
  variant = "tape",
  onClick,
}: {
  board: ProjectBoard;
  projectColor: string;
  editMode?: boolean;
  isOwner?: boolean;
  disabled?: boolean;
  variant?: "tape" | "row";
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
      {variant === "row" ? (
        <BoardSpineRow
          board={board}
          projectColor={projectColor}
          editMode={editMode}
          isOwner={isOwner}
          onClick={onClick}
        />
      ) : (
        <BoardCard
          board={board}
          projectColor={projectColor}
          editMode={editMode}
          isOwner={isOwner}
          onClick={onClick}
        />
      )}
    </div>
  );
}
