const DEMO_BOARDS_KEY = 'yondra_demo_boards';
const boardDataKey = (id: string) => `yondra_demo_data_${id}`;
const LEGACY_KEY = 'yondra_demo';

export type DemoTag            = { id: number; name: string; color: string };
export type DemoSection        = { id: number; name: string };
export type DemoChecklistItem  = { id: number; text: string; is_done: boolean; position: number };
export type DemoCard           = {
    id: number;
    section_id: number;
    assigned_user_id?: number | null;
    tag_ids?: number[];
    name: string;
    description: string;
    due_date?: string | null;
    priority?: 'low' | 'medium' | 'high' | null;
    position?: number;
    archived_at?: string | null;
    checklist_items?: DemoChecklistItem[];
};
export type DemoBoardData = { sections: DemoSection[]; cards: DemoCard[]; tags: DemoTag[] };
export type DemoBoard = { id: string; name: string; description: string };

const DEFAULT_DATA: DemoBoardData = {
    sections: [
        { id: 1, name: 'To Do' },
        { id: 2, name: 'In Progress' },
        { id: 3, name: 'Done' },
    ],
    cards: [
        { id: 1, section_id: 1, name: 'Welcome to Yondra!', description: 'This is a demo board. Everything is saved in your browser.', position: 0, checklist_items: [] },
        { id: 2, section_id: 1, name: 'Try creating a card', description: 'Press C to add a new card.', position: 1, checklist_items: [] },
        { id: 3, section_id: 2, name: 'Drag me to another column', description: '', position: 0, checklist_items: [] },
    ],
    tags: [],
};

function resolveCardTags(card: DemoCard, allTags: DemoTag[]): DemoCard & { tags: DemoTag[] } {
    const tags = (card.tag_ids ?? []).map(id => allTags.find(t => t.id === id)).filter(Boolean) as DemoTag[];
    return { ...card, tags };
}

function loadBoardData(boardId: string): DemoBoardData {
    if (typeof window === 'undefined') return structuredClone(DEFAULT_DATA);
    if (boardId === 'demo') {
        const legacyRaw = localStorage.getItem(LEGACY_KEY);
        if (legacyRaw) {
            const parsed = JSON.parse(legacyRaw);
            const migrated = { ...DEFAULT_DATA, ...parsed, tags: parsed.tags ?? [] };
            localStorage.setItem(boardDataKey('demo'), JSON.stringify(migrated));
            localStorage.removeItem(LEGACY_KEY);
            return migrated;
        }
    }
    const raw = localStorage.getItem(boardDataKey(boardId));
    if (!raw) {
        const data = structuredClone(DEFAULT_DATA);
        localStorage.setItem(boardDataKey(boardId), JSON.stringify(data));
        return data;
    }
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_DATA, ...parsed, tags: parsed.tags ?? [] };
}

function saveBoardData(boardId: string, data: DemoBoardData) {
    localStorage.setItem(boardDataKey(boardId), JSON.stringify(data));
}

// --- Board list ---

export function loadDemoBoards(): DemoBoard[] {
    if (typeof window === 'undefined') {
        return [{ id: 'demo', name: 'Demo Board', description: 'Try it out — everything is saved in your browser.' }];
    }
    const raw = localStorage.getItem(DEMO_BOARDS_KEY);
    if (!raw) {
        const boards: DemoBoard[] = [{ id: 'demo', name: 'Demo Board', description: 'Try it out — everything is saved in your browser.' }];
        localStorage.setItem(DEMO_BOARDS_KEY, JSON.stringify(boards));
        return boards;
    }
    return JSON.parse(raw);
}

export function createDemoBoard(name: string, description: string): DemoBoard {
    const boards = loadDemoBoards();
    const id = `demo-${Date.now()}`;
    const board: DemoBoard = { id, name, description };
    boards.push(board);
    localStorage.setItem(DEMO_BOARDS_KEY, JSON.stringify(boards));
    saveBoardData(id, structuredClone(DEFAULT_DATA));
    return board;
}

export function updateDemoBoard(id: string, name: string, description: string): void {
    const boards = loadDemoBoards().map(b => b.id === id ? { ...b, name, description } : b);
    localStorage.setItem(DEMO_BOARDS_KEY, JSON.stringify(boards));
}

export function deleteDemoBoard(id: string): void {
    const boards = loadDemoBoards().filter(b => b.id !== id);
    localStorage.setItem(DEMO_BOARDS_KEY, JSON.stringify(boards));
    localStorage.removeItem(boardDataKey(id));
}

// --- Board data ---

export function loadDemoBoardData(boardId: string): DemoBoardData {
    const data = loadBoardData(boardId);
    return {
        ...data,
        cards: data.cards
            .filter(c => !c.archived_at)
            .map(c => resolveCardTags(c, data.tags)),
    };
}

export function loadDemoArchivedCards(boardId: string): (DemoCard & { tags: DemoTag[] })[] {
    const data = loadBoardData(boardId);
    return data.cards
        .filter(c => !!c.archived_at)
        .map(c => resolveCardTags(c, data.tags));
}

// --- Tags ---

export function demoCreateTag(boardId: string, name: string, color: string): DemoTag {
    const data = loadBoardData(boardId);
    const newId = data.tags.length > 0 ? Math.max(...data.tags.map(t => t.id)) + 1 : 1;
    const tag: DemoTag = { id: newId, name, color };
    data.tags.push(tag);
    saveBoardData(boardId, data);
    return tag;
}

export function demoDeleteTag(boardId: string, tagId: number): void {
    const data = loadBoardData(boardId);
    data.tags = data.tags.filter(t => t.id !== tagId);
    data.cards = data.cards.map(c => ({ ...c, tag_ids: (c.tag_ids ?? []).filter(id => id !== tagId) }));
    saveBoardData(boardId, data);
}

// --- Sections ---

export function demoCreateSection(boardId: string, name: string): DemoSection {
    const data = loadBoardData(boardId);
    const newId = data.sections.length > 0 ? Math.max(...data.sections.map(s => s.id)) + 1 : 1;
    const section: DemoSection = { id: newId, name };
    data.sections.push(section);
    saveBoardData(boardId, data);
    return section;
}

export function demoUpdateSection(boardId: string, sectionId: number, name: string): DemoSection | null {
    const data = loadBoardData(boardId);
    const idx = data.sections.findIndex(s => s.id === sectionId);
    if (idx === -1) return null;
    data.sections[idx] = { ...data.sections[idx], name };
    saveBoardData(boardId, data);
    return data.sections[idx];
}

export function demoDeleteSection(boardId: string, sectionId: number): void {
    const data = loadBoardData(boardId);
    data.sections = data.sections.filter(s => s.id !== sectionId);
    data.cards = data.cards.filter(c => c.section_id !== sectionId);
    saveBoardData(boardId, data);
}

// --- Cards ---

export function demoCreateCard(boardId: string, cardData: {
    section_id: number;
    name: string;
    description: string;
    tag_ids?: number[];
    assigned_user_id?: number | null;
    due_date?: string | null;
    priority?: 'low' | 'medium' | 'high' | null;
}): DemoCard & { tags: DemoTag[] } {
    const data = loadBoardData(boardId);
    const newId = data.cards.length > 0 ? Math.max(...data.cards.map(c => c.id)) + 1 : 1;
    const position = data.cards.filter(c => c.section_id === cardData.section_id).length;
    const card: DemoCard = {
        id: newId,
        ...cardData,
        tag_ids: cardData.tag_ids ?? [],
        position,
        checklist_items: [],
    };
    data.cards.push(card);
    saveBoardData(boardId, data);
    return resolveCardTags(card, data.tags);
}

export function demoUpdateCard(boardId: string, cardId: number, cardData: {
    section_id?: number;
    name?: string;
    description?: string;
    tag_ids?: number[];
    assigned_user_id?: number | null;
    due_date?: string | null;
    priority?: 'low' | 'medium' | 'high' | null;
}): (DemoCard & { tags: DemoTag[] }) | null {
    const data = loadBoardData(boardId);
    const idx = data.cards.findIndex(c => c.id === cardId);
    if (idx === -1) return null;
    data.cards[idx] = { ...data.cards[idx], ...cardData };
    saveBoardData(boardId, data);
    return resolveCardTags(data.cards[idx], data.tags);
}

export function demoDeleteCard(boardId: string, cardId: number): void {
    const data = loadBoardData(boardId);
    data.cards = data.cards.filter(c => c.id !== cardId);
    saveBoardData(boardId, data);
}

export function demoArchiveCard(boardId: string, cardId: number): void {
    const data = loadBoardData(boardId);
    const idx = data.cards.findIndex(c => c.id === cardId);
    if (idx === -1) return;
    data.cards[idx] = { ...data.cards[idx], archived_at: new Date().toISOString() };
    saveBoardData(boardId, data);
}

export function demoRestoreCard(boardId: string, cardId: number): void {
    const data = loadBoardData(boardId);
    const idx = data.cards.findIndex(c => c.id === cardId);
    if (idx === -1) return;
    data.cards[idx] = { ...data.cards[idx], archived_at: null };
    saveBoardData(boardId, data);
}

// --- Checklist ---

export function demoCreateChecklistItem(boardId: string, cardId: number, text: string): DemoChecklistItem {
    const data = loadBoardData(boardId);
    const card = data.cards.find(c => c.id === cardId);
    if (!card) throw new Error('Card not found');
    if (!card.checklist_items) card.checklist_items = [];
    const newId = card.checklist_items.length > 0 ? Math.max(...card.checklist_items.map(i => i.id)) + 1 : 1;
    const item: DemoChecklistItem = { id: newId, text, is_done: false, position: card.checklist_items.length };
    card.checklist_items.push(item);
    saveBoardData(boardId, data);
    return item;
}

export function demoUpdateChecklistItem(boardId: string, cardId: number, itemId: number, patch: { text?: string; is_done?: boolean }): DemoChecklistItem | null {
    const data = loadBoardData(boardId);
    const card = data.cards.find(c => c.id === cardId);
    if (!card || !card.checklist_items) return null;
    const idx = card.checklist_items.findIndex(i => i.id === itemId);
    if (idx === -1) return null;
    card.checklist_items[idx] = { ...card.checklist_items[idx], ...patch };
    saveBoardData(boardId, data);
    return card.checklist_items[idx];
}

export function demoDeleteChecklistItem(boardId: string, cardId: number, itemId: number): void {
    const data = loadBoardData(boardId);
    const card = data.cards.find(c => c.id === cardId);
    if (!card || !card.checklist_items) return;
    card.checklist_items = card.checklist_items.filter(i => i.id !== itemId);
    saveBoardData(boardId, data);
}
