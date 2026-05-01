import { CardInterface } from "./CardInterface"

export interface SectionInterface {
    id: number,
    name: string,
    color: string,
    parent?: any | null
    cards: CardInterface[]
    handleClick: (card: any) => void
    onDelete?: () => void
    onRename?: (newName: string) => void
}