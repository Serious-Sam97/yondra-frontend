import { CardInterface } from "@/interfaces/CardInterface";
import { Draggable } from "../shared/Draggable";

export function Card(props: CardInterface) {
    return (
        <Draggable id={`draggable-${props.id}`}>
            <div className="bg-white rounded w-52 h-30 cursor-pointer">
                <p className="text-black">{props.name}</p>
                <p className="text-black">{props.description}</p>
            </div>
        </Draggable>
    )
}