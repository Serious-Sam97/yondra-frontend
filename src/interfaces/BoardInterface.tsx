import { CardInterface } from "./CardInterface"
import { TagInterface } from "./TagInterface"

export interface SectionData {
    id: number,
    name: string,
}

export type BoardPermission = 'read' | 'write' | 'owner';

export interface SharedUser {
    id: number,
    name: string,
    email: string,
    permission?: BoardPermission,
}

export interface BoardInterface {
    id: number,
    name: string,
    description: string,
    sections: SectionData[],
    cards: CardInterface[],
    tags?: TagInterface[],
    user_id?: number,
    project_id?: number | null,
    ticket_prefix?: string | null,
    owner?: SharedUser,
    shared_with?: SharedUser[],
    // Server-computed capabilities for the current user (project-aware).
    can_write?: boolean,
    can_manage?: boolean,
}
