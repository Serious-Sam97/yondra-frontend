import { CardInterface } from "./CardInterface";

export interface SectionData {
    id: number,
    name: string,
}

export interface BoardInterface {
    id: number,
    name: string,
    description: string,
    sections: SectionData[],
    cards: CardInterface[],
}