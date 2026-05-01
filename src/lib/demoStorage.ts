const DEMO_BOARDS_KEY = 'yondra_demo_boards';
const boardDataKey = (id: string) => `yondra_demo_data_${id}`;
const LEGACY_KEY = 'yondra_demo';

export type DemoSection = { id: number; name: string };
export type DemoCard = { id: number; section_id: number; assigned_user_id?: number | null; name: string; description: string };
export type DemoBoardData = { sections: DemoSection[]; cards: DemoCard[] };
export type DemoBoard = { id: string; name: string; description: string };

const DEFAULT_DATA: DemoBoardData = {
    sections: [
        { id: 1, name: 'To Do' },
        { id: 2, name: 'In Progress' },
        { id: 3, name: 'Done' },
    ],
    cards: [
        { id: 1, section_id: 1, name: 'Welcome to Yondra!', description: 'This is a demo board. Everything is saved in your browser.' },
        { id: 2, section_id: 1, name: 'Try creating a card', description: 'Press C to add a new card.' },
        { id: 3, section_id: 2, name: 'Drag me to another column', description: '' },
    ],
};

function loadBoardData(boardId: string): DemoBoardData {
    if (typeof window === 'undefined') return structuredClone(DEFAULT_DATA);
    // Migrate legacy single-board key
    if (boardId === 'demo') {
        const legacyRaw = localStorage.getItem(LEGACY_KEY);
        if (legacyRaw) {
            localStorage.setItem(boardDataKey('demo'), legacyRaw);
            localStorage.removeItem(LEGACY_KEY);
            return JSON.parse(legacyRaw);
        }
    }
    const raw = localStorage.getItem(boardDataKey(boardId));
    if (!raw) {
        const data = structuredClone(DEFAULT_DATA);
        localStorage.setItem(boardDataKey(boardId), JSON.stringify(data));
        return data;
    }
    return JSON.parse(raw);
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
    return loadBoardData(boardId);
}

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

export function demoCreateCard(boardId: string, cardData: { section_id: number; name: string; description: string }): DemoCard {
    const data = loadBoardData(boardId);
    const newId = data.cards.length > 0 ? Math.max(...data.cards.map(c => c.id)) + 1 : 1;
    const card: DemoCard = { id: newId, ...cardData };
    data.cards.push(card);
    saveBoardData(boardId, data);
    return card;
}

export function demoUpdateCard(boardId: string, cardId: number, cardData: { section_id?: number; name?: string; description?: string }): DemoCard | null {
    const data = loadBoardData(boardId);
    const idx = data.cards.findIndex(c => c.id === cardId);
    if (idx === -1) return null;
    data.cards[idx] = { ...data.cards[idx], ...cardData };
    saveBoardData(boardId, data);
    return data.cards[idx];
}
