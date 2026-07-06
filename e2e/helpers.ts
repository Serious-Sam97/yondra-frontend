import { Page, Locator } from '@playwright/test';

export type Role = 'owner' | 'member' | 'viewer';

export interface Member { id: number; name: string; email: string; role: Role }
export interface Board { id: number; name: string; cards_count: number; shared_with: { id: number; permission?: string }[] }

export interface ProjectFixture {
    id: number;
    name: string;
    color: string;
    owner_id: number;
    members: Member[];
    boards: Board[];
}

// Which "owned" vs "member" bucket a project falls in for a given viewer, mirroring
// the backend index(): owner_id or role 'owner' => owned; other membership => member.
function isOwnerViewer(project: ProjectFixture, userId: number): boolean {
    if (project.owner_id === userId) return true;
    return project.members.some((m) => m.id === userId && m.role === 'owner');
}

/**
 * Log the given user in and stub every /api/* call the project page makes, so the
 * real Next app renders deterministically with no backend.
 */
export async function mockApp(page: Page, opts: { currentUserId: number; project: ProjectFixture }) {
    const { currentUserId, project } = opts;
    const me = project.members.find((m) => m.id === currentUserId) ?? { id: currentUserId, name: 'Me', email: 'me@test.com', role: 'member' as Role };

    // Seed auth before any app code runs.
    await page.addInitScript(() => {
        localStorage.setItem('token', 'e2e-token');
        localStorage.setItem('isLogged', 'true');
    });

    const json = (route: import('@playwright/test').Route, body: unknown, status = 200) =>
        route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    await page.route('**/api/**', (route) => {
        const url = new URL(route.request().url());
        const path = url.pathname.replace(/\/$/, '');

        if (path.endsWith('/api/user')) return json(route, { id: me.id, name: me.name, email: me.email });
        if (path.endsWith('/api/notifications')) return json(route, []);

        if (path.endsWith('/api/projects')) {
            const owned = isOwnerViewer(project, currentUserId) ? [project] : [];
            const member = isOwnerViewer(project, currentUserId) ? [] : [project];
            return json(route, { owned, member });
        }
        if (/\/api\/projects\/\d+$/.test(path)) return json(route, project);

        if (path.includes('/share/candidates')) return json(route, []);

        return json(route, {});
    });
}

// --- Card ordering fixtures ---

/**
 * A GET /api/boards/1 "show" payload owned by Sam (id 1, so the viewer has write
 * access). Three sections; To Do holds two cards (positions 0,1), In Progress one.
 * Mirrors the demo seed so the same specs can target both surfaces.
 */
export function boardFixture() {
    return {
        id: 1,
        user_id: 1,
        name: 'Order Test',
        description: '',
        project_id: null,
        owner: { id: 1, name: 'Sam', email: 'sam@sam.com' },
        shared_with: [],
        tags: [],
        sections: [
            { id: 1, board_id: 1, name: 'To Do', order: 0 },
            { id: 2, board_id: 1, name: 'In Progress', order: 1 },
            { id: 3, board_id: 1, name: 'Done', order: 2 },
        ],
        cards: [
            { id: 1, board_id: 1, section_id: 1, name: 'Welcome to Yondra!', description: 'first', position: 0, tags: [], checklist_items: [] },
            { id: 2, board_id: 1, section_id: 1, name: 'Try creating a card', description: 'second', position: 1, tags: [], checklist_items: [] },
            { id: 3, board_id: 1, section_id: 2, name: 'Drag me to another column', description: '', position: 0, tags: [], checklist_items: [] },
        ],
    };
}

/**
 * Log Sam in and stub the board page's /api/* calls so /boards/1 renders the fixture
 * with no backend. `reorderStatus` lets a test force the PUT .../cards/reorder call to
 * fail (to exercise the optimistic rollback).
 */
export async function mockBoard(page: Page, opts: { reorderStatus?: number } = {}) {
    const board = boardFixture();

    await page.addInitScript(() => {
        localStorage.setItem('token', 'e2e-token');
        localStorage.setItem('isLogged', 'true');
    });

    const json = (route: import('@playwright/test').Route, body: unknown, status = 200) =>
        route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    await page.route('**/api/**', (route) => {
        const url = new URL(route.request().url());
        const path = url.pathname.replace(/\/$/, '');

        if (path.endsWith('/api/user')) return json(route, board.owner);
        if (path.endsWith('/api/boards/1/cards/reorder')) return json(route, { ok: true }, opts.reorderStatus ?? 200);
        if (/\/api\/boards\/1$/.test(path)) return json(route, board);
        return json(route, {});
    });
}

/**
 * Drive a dnd-kit drag from one card to a target (another card or a column). dnd-kit's
 * MouseSensor needs the pointer to move past its 5px activation threshold and then a
 * settling move so onDragOver resolves, which a plain Playwright dragTo() does not do.
 */
export async function dragCard(page: Page, source: Locator, target: Locator, opts: { dropOffsetY?: number } = {}) {
    const s = await source.boundingBox();
    const t = await target.boundingBox();
    if (!s || !t) throw new Error('dragCard: source or target has no bounding box');

    const sx = s.x + s.width / 2;
    const sy = s.y + s.height / 2;
    const tx = t.x + t.width / 2;
    const ty = t.y + t.height / 2 + (opts.dropOffsetY ?? 0);

    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await page.mouse.move(sx + 6, sy + 6, { steps: 4 }); // exceed the 5px activation distance
    await page.mouse.move(tx, ty, { steps: 12 });
    await page.mouse.move(tx, ty, { steps: 4 });          // settle so the drop target resolves
    await page.mouse.up();
}

/** A project owned by Sam (id 1) with a co-owner, a member, and a viewer. */
export function sampleProject(): ProjectFixture {
    return {
        id: 1,
        name: 'Teste',
        color: '#7cc4ff',
        owner_id: 1,
        members: [
            { id: 1, name: 'Sam', email: 'sam@sam.com', role: 'owner' },
            { id: 3, name: 'Gabriel Freitas', email: 'gabriel@example.com', role: 'owner' },
            { id: 5, name: 'Rafael Godoy', email: 'rafael@example.com', role: 'member' },
            { id: 6, name: 'Rudney Forti', email: 'rudney@example.com', role: 'viewer' },
        ],
        boards: [
            { id: 1, name: 'Board A', cards_count: 3, shared_with: [] },
            { id: 2, name: 'Board B', cards_count: 5, shared_with: [] },
        ],
    };
}
