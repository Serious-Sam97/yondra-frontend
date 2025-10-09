import { DndContext } from "@dnd-kit/core";
import { Droppable } from "../shared/Droppable";
import { useState } from "react";
import { Draggable } from "../shared/Draggable";
import { Card } from "../ui/Card";
import { Section } from "../ui/Section";

export function Board() {
    const sections = ['To Do', 'In Progress', 'Done'];
    const [parent, setParent] = useState(null);

    return (
        <div className="min-h-[80dvh] w-[80dvw] bg-gray-400 bg-center rounded-xl flex justify-center space-x-7">
            <DndContext onDragEnd={handleDragEnd}>
                <div className="flex justify-between w-full">
                    {sections.map((id) => (
                        <Section key={id} id={id} parent={parent}/>
                    ))}
                </div>
            </DndContext>
        </div>
    )

    function handleDragEnd(event: any) {
        const {over} = event;
        setParent(over ? over.id : null);
    }
}