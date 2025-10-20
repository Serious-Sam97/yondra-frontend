import { CardInterface } from "./CardInterface"

export interface SectionInterface {
    id: number,
    name: string,
    parent?: any | null
    cards: CardInterface[]
}