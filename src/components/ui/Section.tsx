import { CardInterface } from "@/interfaces/CardInterface"
import { Droppable } from "../shared/Droppable"
import { Card } from "./Card"
import { SectionInterface } from "@/interfaces/SectionInterface"

export function Section({id, name, cards}: SectionInterface) {
    const style = {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    }

    return (
        <div className="flex flex-col px-10 py-3">
            <p className="font-bold text-md">{name}</p>
            <Droppable style={style} key={id} id={name}>
                {
                    cards.map((card: CardInterface) => (
                        <div className="pb-1">
                            <Card key={`${id}-${name}-${card.section_id}`} id={card.id} section_id={card.section_id} name={card.name} description={card.description} color="white"/>
                        </div>
                    ))
                }
                {/* {props.parent === props.id ? <Card/> : ''} */}
            </Droppable>
            {/* {props.parent === null && props.id === 'To Do' ? <Card/> : null} */}
        </div>
    )
}