import { CardInterface } from "@/interfaces/CardInterface"
import { Droppable } from "../shared/Droppable"
import { Card } from "./Card"

interface sectionInterface {
    id: string
    parent: any
    cards: CardInterface[]
}

export function Section(props: sectionInterface) {
    const style = {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
    }

    return (
        <div className="flex flex-col px-10 py-3">
            {props.id}
            <Droppable style={style} key={props.id} id={props.id}>
                {
                    props.cards.map((card: CardInterface) => (
                        <div className="pb-1">
                            <Card id={card.id} section_id={card.section_id} name={card.name} description={card.description}/>
                        </div>
                    ))
                }
                {/* {props.parent === props.id ? <Card/> : ''} */}
            </Droppable>
            {/* {props.parent === null && props.id === 'To Do' ? <Card/> : null} */}
        </div>
    )
}