export interface CardInterface {
    id: number|string,
    section_id: number,
    assigned_user_id?: number | null,
    assigned_user?: { id: number; name: string } | null,
    name: string,
    description: string
}
