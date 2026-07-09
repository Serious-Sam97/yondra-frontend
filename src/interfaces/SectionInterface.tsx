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
    // CRM: board type + currency drive the deal-value column total.
    boardType?: "kanban" | "scrum" | "crm"
    currency?: string
    // CRM: per-stage SLA aging threshold (hours) passed down to cards.
    agingHours?: number | null
}