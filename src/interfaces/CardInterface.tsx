import { TagInterface } from "./TagInterface"

export interface ChecklistItem {
    id: number;
    text: string;
    is_done: boolean;
    position: number;
}

export interface CardInterface {
    id: number|string,
    section_id: number,
    assigned_user_id?: number | null,
    assigned_user?: { id: number; name: string } | null,
    created_by_user_id?: number | null,
    created_by?: { id: number; name: string } | null,
    tags?: TagInterface[],
    name: string,
    description: string,
    due_date?: string | null,
    priority?: 'low' | 'medium' | 'high' | null,
    position?: number,
    checklist_items?: ChecklistItem[],
    created_at?: string | null,
    updated_at?: string | null,
    archived_at?: string | null,
    done_at?: string | null,
    parent_card_id?: number | null,
    is_done?: boolean,
}
