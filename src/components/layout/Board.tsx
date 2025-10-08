import { DndContext } from "@dnd-kit/core";
import { Droppable } from "../shared/Droppable";
import { useState } from "react";
import { Draggable } from "../shared/Draggable";

export function Board() {
    const cards = ['A', 'B', 'C'];
    const [parent, setParent] = useState(null);
    const draggableMarkup = (
        <Draggable id="draggable">Drag me</Draggable>
    );

    return (
        <div className="min-h-[80dvh] w-[80dvw] bg-gray-400 bg-center rounded-xl flex justify-center space-x-7">
            <DndContext onDragEnd={handleDragEnd}>
            {parent === null ? draggableMarkup : null}

            {cards.map((id) => (
                <Droppable key={id} id={id}>
                {parent === id ? draggableMarkup : 'Drop here'}
                </Droppable>
            ))}
            </DndContext>
        </div>
    )

    function handleDragEnd(event: any) {
        const {over} = event;
        setParent(over ? over.id : null);
    }
}