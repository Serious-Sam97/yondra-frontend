import { CardInterface } from "./CardInterface"

export interface SectionData {
    id: number,
    name: string,
}

export interface SharedUser {
    id: number,
    name: string,
    email: string,
}

export interface BoardInterface {
    id: number,
    name: string,
    description: string,
    sections: SectionData[],
    cards: CardInterface[],
    user_id?: number,
    owner?: SharedUser,
    shared_with?: SharedUser[],
}
