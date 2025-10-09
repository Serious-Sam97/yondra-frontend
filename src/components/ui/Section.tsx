import { Droppable } from "../shared/Droppable"
import { Card } from "./Card"

interface sectionInterface {
    id: string
    parent: any
}

export function Section(props: sectionInterface) {
    return (
        <div className="flex flex-col px-10 py-3">
            {props.id}
            <Droppable key={props.id} id={props.id}>
                {props.parent === props.id ? <Card/> : 'Drop here'}
            </Droppable>
            {props.parent === null && props.id === 'To Do' ? <Card/> : null}
        </div>
    )
}