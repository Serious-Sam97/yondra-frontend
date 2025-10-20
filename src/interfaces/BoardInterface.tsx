import { CardInterface } from "./CardInterface";
import { SectionInterface } from "./SectionInterface";

export interface BoardInterface {
    id: number,
    name: string,
    description: string,
    sections: SectionInterface[],
    cards: CardInterface[],
}