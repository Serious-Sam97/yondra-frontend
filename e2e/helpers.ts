import { Page } from '@playwright/test';

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
