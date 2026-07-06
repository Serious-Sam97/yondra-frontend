import { test, expect, Page, Locator } from '@playwright/test';
import { mockBoard, dragCard } from './helpers';

// A card is the draggable <button class="w-full block"> wrapping the Card body.
const card = (page: Page, text: string): Locator =>
    page.locator('button.w-full').filter({ hasText: text });

// The kanban column whose header contains `name`.
const column = (page: Page, name: string): Locator =>
    page.locator('.aero-column').filter({ hasText: name });

// The card titles (in DOM order) inside a column — the <p class="font-bold">{name}</p>.
const titles = (page: Page, name: string): Locator =>
    column(page, name).locator('button.w-full p.font-bold');

// The demo board (id 'demo') runs with no backend and no auth: pure localStorage.
// Reordering there exercises the drag handlers, arrayMove, and optimistic setCards.
test.describe('card ordering — demo board (no backend)', () => {
    test('reorders cards within a column', async ({ page }) => {
        await page.goto('/boards/demo');
        await expect(page.getByText('Welcome to Yondra!')).toBeVisible();

        await expect(titles(page, 'To Do')).toHaveText(['Welcome to Yondra!', 'Try creating a card']);

        // Drag the first card onto the second → they swap.
        await dragCard(page, card(page, 'Welcome to Yondra!'), card(page, 'Try creating a card'), { dropOffsetY: 40 });

        await expect(titles(page, 'To Do')).toHaveText(['Try creating a card', 'Welcome to Yondra!']);
    });

    test('moves a card to another column', async ({ page }) => {
        await page.goto('/boards/demo');
        await expect(page.getByText('Drag me to another column')).toBeVisible();

        await expect(titles(page, 'In Progress')).toHaveText(['Drag me to another column']);

        await dragCard(page, card(page, 'Drag me to another column'), card(page, 'Welcome to Yondra!'));

        // It left In Progress and now lives in To Do.
        await expect(titles(page, 'In Progress')).toHaveCount(0);
        await expect(titles(page, 'To Do')).toContainText(['Drag me to another column']);
    });

    // Regression for React error #185 ("maximum update depth exceeded"): a drag that
    // repeatedly crosses the column boundary used to oscillate onDragOver → setState in a
    // loop and crash the page. State now only changes on drop, so this must stay quiet.
    test('dragging back and forth across columns does not crash', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));

        await page.goto('/boards/demo');
        await expect(page.getByText('Drag me to another column')).toBeVisible();

        const src = card(page, 'Drag me to another column');
        const s = await src.boundingBox();
        const todo = await column(page, 'To Do').boundingBox();
        const inprog = await column(page, 'In Progress').boundingBox();
        if (!s || !todo || !inprog) throw new Error('missing bounding boxes');

        await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
        await page.mouse.down();
        await page.mouse.move(s.x + s.width / 2 + 6, s.y + s.height / 2 + 6, { steps: 4 });
        // Sweep across the To Do / In Progress boundary many times within one drag.
        for (let i = 0; i < 8; i++) {
            await page.mouse.move(todo.x + todo.width / 2, todo.y + 120, { steps: 6 });
            await page.mouse.move(inprog.x + inprog.width / 2, inprog.y + 120, { steps: 6 });
        }
        await page.mouse.up();

        await expect(page.getByText('Drag me to another column')).toBeVisible();
        expect(errors).toEqual([]);
    });
});

// A mocked real board (id 1, owned by Sam) proves the persistence contract: a drag must
// PUT /api/boards/1/cards/reorder with the section and the full new ordered_ids list.
test.describe('card ordering — persistence contract', () => {
    test('within-column drag persists the new order via cards/reorder', async ({ page }) => {
        await mockBoard(page);

        const reorder = page.waitForRequest(
            (r) => r.url().includes('/api/boards/1/cards/reorder') && r.method() === 'PUT',
        );

        await page.goto('/boards/1');
        await expect(page.getByText('Welcome to Yondra!')).toBeVisible();

        await dragCard(page, card(page, 'Welcome to Yondra!'), card(page, 'Try creating a card'), { dropOffsetY: 40 });

        const body = (await reorder).postDataJSON();
        expect(body.section_id).toBe(1);
        // Welcome (1) dropped after Try creating (2): the section's new order is [2, 1].
        expect(body.ordered_ids).toEqual([2, 1]);
    });

    test('rolls back the order and warns when the server rejects the reorder', async ({ page }) => {
        await mockBoard(page, { reorderStatus: 500 });

        await page.goto('/boards/1');
        await expect(page.getByText('Welcome to Yondra!')).toBeVisible();

        await dragCard(page, card(page, 'Welcome to Yondra!'), card(page, 'Try creating a card'), { dropOffsetY: 40 });

        // Order reverts to the original and the sync-error toast appears.
        await expect(page.getByText('Reorder failed', { exact: false })).toBeVisible();
        await expect(titles(page, 'To Do')).toHaveText(['Welcome to Yondra!', 'Try creating a card']);
    });
});
