import { CardInterface } from "@/interfaces/CardInterface";
import { Draggable } from "../shared/Draggable";

const colorClasses: Record<string, string> = {
  primary: "bg-red-500",
  secondary: "bg-blue-500",
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  white: "bg-white",
  black: "bg-black",
  sky: "bg-sky-500"
};

export function Card({id, name, description, color}: CardInterface & {color: string}) {
    const bgClass = colorClasses[color] || "bg-gray-200";

    return (
        <Draggable id={`draggable-${id}`}>
            <div className={`${bgClass} rounded w-52 h-30 cursor-pointer`}>
                <p className="text-orange-800 pt-4 font-bold">{name}</p>
                <p className="text-black pt-3">{description}</p>
            </div>
        </Draggable>
    )
}