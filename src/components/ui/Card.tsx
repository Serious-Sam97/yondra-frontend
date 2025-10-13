import { CardInterface } from "@/interfaces/CardInterface";
import { Draggable } from "../shared/Draggable";

export function Card({id, name, description, color}: CardInterface & {color: string}) {
    return (
        <Draggable id={`draggable-${id}`}>
            <div className={`bg-${color} rounded w-52 h-30 cursor-pointer`}>
                <p className="text-orange-800 pt-4 font-bold">{name}</p>
                <p className="text-black pt-3">{description}</p>
            </div>
        </Draggable>
    )
}