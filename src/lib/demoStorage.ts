const DEMO_KEY = 'yondra_demo';

const DEFAULT_DATA = {
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

type DemoSection = { id: number; name: string };
type DemoCard = { id: number; section_id: number; name: string; description: string };
type DemoData = { sections: DemoSection[]; cards: DemoCard[] };

function load(): DemoData {
    if (typeof window === 'undefined') return DEFAULT_DATA;
    const raw = localStorage.getItem(DEMO_KEY);
    if (!raw) {
        localStorage.setItem(DEMO_KEY, JSON.stringify(DEFAULT_DATA));
        return structuredClone(DEFAULT_DATA);
    }
    return JSON.parse(raw);
}

function save(data: DemoData) {
    localStorage.setItem(DEMO_KEY, JSON.stringify(data));
}

export function loadDemoBoard(): DemoData {
    return load();
}

export function demoCreateSection(name: string): DemoSection {
    const data = load();
    const newId = data.sections.length > 0 ? Math.max(...data.sections.map(s => s.id)) + 1 : 1;
    const section: DemoSection = { id: newId, name };
    data.sections.push(section);
    save(data);
    return section;
}

export function demoDeleteSection(sectionId: number): void {
    const data = load();
    data.sections = data.sections.filter(s => s.id !== sectionId);
    data.cards = data.cards.filter(c => c.section_id !== sectionId);
    save(data);
}

export function demoCreateCard(cardData: { section_id: number; name: string; description: string }): DemoCard {
    const data = load();
    const newId = data.cards.length > 0 ? Math.max(...data.cards.map(c => c.id)) + 1 : 1;
    const card: DemoCard = { id: newId, ...cardData };
    data.cards.push(card);
    save(data);
    return card;
}

export function demoUpdateCard(cardId: number, cardData: { section_id?: number; name?: string; description?: string }): DemoCard | null {
    const data = load();
    const idx = data.cards.findIndex(c => c.id === cardId);
    if (idx === -1) return null;
    data.cards[idx] = { ...data.cards[idx], ...cardData };
    save(data);
    return data.cards[idx];
}
