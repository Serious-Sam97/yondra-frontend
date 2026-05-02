import { CardInterface } from "./CardInterface"
import { TagInterface } from "./TagInterface"

export interface SectionData {
    id: number,
    name: string,
}

export interface SharedUser {
    id: number,
    name: string,
    email: string,
    permission?: 'read' | 'write',
}

export interface BoardInterface {
    id: number,
    name: string,
    description: string,
    sections: SectionData[],
    cards: CardInterface[],
    tags?: TagInterface[],
    user_id?: number,
    owner?: SharedUser,
    shared_with?: SharedUser[],
}
