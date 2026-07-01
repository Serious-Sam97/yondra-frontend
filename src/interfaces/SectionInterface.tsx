import { CardInterface } from "./CardInterface"

export interface SectionInterface {
    id: number,
    name: string,
    color: string,
    parent?: unknown
    cards: CardInterface[]
    handleClick: (card: CardInterface) => void
    onDelete?: () => void
    onRename?: (newName: string) => void
    wipLimit?: number | null
    onSetWipLimit?: (limit: number | null) => void
}