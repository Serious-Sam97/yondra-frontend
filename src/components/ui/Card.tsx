import { Draggable } from "../shared/Draggable";

export function Card() {
    return (
        <Draggable id="draggable">
            <div className="bg-white rounded w-52 h-30 cursor-pointer">
                <p className="text-black">Drag Me</p>
            </div>
        </Draggable>
    )
}