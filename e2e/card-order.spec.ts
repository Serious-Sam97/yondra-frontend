import { expect, type Locator, type Page, test } from "@playwright/test";
import { dragCard, legacyBoardFixture, mockBoard } from "./helpers";

// A card is the draggable <button class="w-full block"> wrapping the Card body.
const card = (page: Page, text: string): Locator =>
  page.locator("button.w-full").filter({ hasText: text });

// The kanban column whose header contains `name`.
const column = (page: Page, name: string): Locator =>
  page.locator(".aero-column").filter({ hasText: name });

// The card titles (in DOM order) inside a column — the <p class="font-bold">{name}</p>.
const titles = (page: Page, name: string): Locator =>
  column(page, name).locator("button.w-full p.font-bold");

// The demo board (id 'demo') runs with no backend and no auth: pure localStorage.
// Reordering there exercises the drag handlers, arrayMove, and optimistic setCards.
test.describe("card ordering — demo board (no backend)", () => {
  test("reorders cards within a column", async ({ page }) => {
    await page.goto("/boards/demo");
    await expect(page.getByText("Welcome to Yondra!")).toBeVisible();

    await expect(titles(page, "To Do")).toHaveText([
      "Welcome to Yondra!",
      "Try creating a card",
    ]);

    // Drag the first card onto the second → they swap.
    await dragCard(
      page,
      card(page, "Welcome to Yondra!"),
      card(page, "Try creating a card"),
      { dropOffsetY: 40 },
    );

    await expect(titles(page, "To Do")).toHaveText([
      "Try creating a card",
      "Welcome to Yondra!",
    ]);
  });

  test("moves a card to another column", async ({ page }) => {
    await page.goto("/boards/demo");
    await expect(page.getByText("Drag me to another column")).toBeVisible();

    await expect(titles(page, "In Progress")).toHaveText([
      "Drag me to another column",
    ]);

    await dragCard(
      page,
      card(page, "Drag me to another column"),
      card(page, "Welcome to Yondra!"),
    );

    // It left In Progress and now lives in To Do.
    await expect(titles(page, "In Progress")).toHaveCount(0);
    await expect(titles(page, "To Do")).toContainText([
      "Drag me to another column",
    ]);
  });

  // The cross-column "live gap": while a card is dragged OVER another column, it should
  // move into that column mid-drag so its siblings shift and open a gap. Regression for a
  // report that "the other cards don't move" when moving to another column.
  test("dragging over another column opens a gap mid-drag", async ({
    page,
  }) => {
    await page.goto("/boards/demo");
    await expect(page.getByText("Drag me to another column")).toBeVisible();

    const src = card(page, "Drag me to another column");
    const target = card(page, "Welcome to Yondra!"); // a To Do card
    const s = await src.boundingBox();
    const t = await target.boundingBox();
    if (!s || !t) throw new Error("missing bounding boxes");

    await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
    await page.mouse.down();
    await page.mouse.move(s.x + s.width / 2 + 8, s.y + s.height / 2 + 8, {
      steps: 4,
    });
    await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 10 });
    // Still holding — the dragged card should already be in To Do (3 cards) and gone from In Progress.
    await expect(titles(page, "To Do")).toHaveCount(3);
    await expect(titles(page, "In Progress")).toHaveCount(0);

    await page.mouse.up();
    await expect(titles(page, "To Do")).toContainText([
      "Drag me to another column",
    ]);
  });

  // Regression for React error #185 ("maximum update depth exceeded"): a drag that
  // repeatedly crosses the column boundary used to loop and crash the page.
  test("dragging back and forth across columns does not crash", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/boards/demo");
    await expect(page.getByText("Drag me to another column")).toBeVisible();

    const src = card(page, "Drag me to another column");
    const s = await src.boundingBox();
    const todo = await column(page, "To Do").boundingBox();
    const inprog = await column(page, "In Progress").boundingBox();
    if (!s || !todo || !inprog) throw new Error("missing bounding boxes");

    await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
    await page.mouse.down();
    await page.mouse.move(s.x + s.width / 2 + 6, s.y + s.height / 2 + 6, {
      steps: 4,
    });
    // Sweep across the To Do / In Progress boundary many times within one drag.
    for (let i = 0; i < 8; i++) {
      await page.mouse.move(todo.x + todo.width / 2, todo.y + 120, {
        steps: 6,
      });
      await page.mouse.move(inprog.x + inprog.width / 2, inprog.y + 120, {
        steps: 6,
      });
    }
    await page.mouse.up();

    await expect(page.getByText("Drag me to another column")).toBeVisible();
    expect(errors).toEqual([]);
  });
});

// A mocked real board (id 1, owned by Sam) proves the persistence contract: a drag must
// PUT /api/boards/1/cards/reorder with the section and the full new ordered_ids list.
test.describe("card ordering — persistence contract", () => {
  test("within-column drag persists the new order via cards/reorder", async ({
    page,
  }) => {
    await mockBoard(page);

    const reorder = page.waitForRequest(
      (r) =>
        r.url().includes("/api/boards/1/cards/reorder") && r.method() === "PUT",
    );

    await page.goto("/boards/1");
    await expect(page.getByText("Welcome to Yondra!")).toBeVisible();

    await dragCard(
      page,
      card(page, "Welcome to Yondra!"),
      card(page, "Try creating a card"),
      { dropOffsetY: 40 },
    );

    const body = (await reorder).postDataJSON();
    expect(body.section_id).toBe(1);
    // Welcome (1) dropped after Try creating (2): the section's new order is [2, 1].
    expect(body.ordered_ids).toEqual([2, 1]);
  });

  // Regression: a CROSS-column drag used to send no request at all (handleDragOver had
  // already moved the card, so handleDragEnd saw a same-section no-op and bailed), so the
  // move never persisted and vanished on reload.
  test("cross-column drag persists the move via cards/reorder", async ({
    page,
  }) => {
    await mockBoard(page);

    const reorder = page.waitForRequest(
      (r) =>
        r.url().includes("/api/boards/1/cards/reorder") && r.method() === "PUT",
      { timeout: 8000 },
    );

    await page.goto("/boards/1");
    await expect(page.getByText("Drag me to another column")).toBeVisible();

    // Drag the In Progress card (id 3) into To Do (section 1).
    await dragCard(
      page,
      card(page, "Drag me to another column"),
      card(page, "Welcome to Yondra!"),
    );

    const body = (await reorder).postDataJSON();
    expect(body.section_id).toBe(1); // To Do
    expect(body.ordered_ids).toContain(3); // the moved card is written into To Do
  });

  test("rolls back the order and warns when the server rejects the reorder", async ({
    page,
  }) => {
    await mockBoard(page, { reorderStatus: 500 });

    await page.goto("/boards/1");
    await expect(page.getByText("Welcome to Yondra!")).toBeVisible();

    await dragCard(
      page,
      card(page, "Welcome to Yondra!"),
      card(page, "Try creating a card"),
      { dropOffsetY: 40 },
    );

    // Order reverts to the original and the sync-error toast appears.
    await expect(
      page.getByText("Reorder failed", { exact: false }),
    ).toBeVisible();
    await expect(titles(page, "To Do")).toHaveText([
      "Welcome to Yondra!",
      "Try creating a card",
    ]);
  });
});

// A legacy-shaped board (Backlog + duplicated, globally-assigned positions, like board 3)
// is where the crash and the "cards don't move" report actually surfaced. This drives the
// original trigger — boundary oscillation + rapid cross-column drags — and must stay quiet.
test.describe("card ordering — legacy board (duplicate positions + Backlog)", () => {
  test("boundary sweeps and rapid cross-column drags do not crash", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await mockBoard(page, { board: legacyBoardFixture() });
    await page.goto("/boards/1");
    await expect(page.getByText("Done 00")).toBeVisible();

    const boxes = await Promise.all(
      (await page.locator(".aero-column").all()).map((c) => c.boundingBox()),
    );

    // 1) Sweep across every column boundary within a single drag (the #185 trigger).
    const src0 = card(page, "InProg A");
    const s0 = await src0.boundingBox();
    if (s0) {
      await page.mouse.move(s0.x + s0.width / 2, s0.y + s0.height / 2);
      await page.mouse.down();
      await page.mouse.move(s0.x + s0.width / 2 + 8, s0.y + s0.height / 2 + 8, {
        steps: 4,
      });
      for (let i = 0; i < 8; i++) {
        for (const b of boxes)
          if (b)
            await page.mouse.move(b.x + b.width / 2, b.y + 140, { steps: 3 });
      }
      await page.mouse.up();
    }

    // 2) Many rapid cross-column drags.
    const names = ["ToDo A", "ToDo B", "Done 01", "InProg B"];
    for (let i = 0; i < 16; i++) {
      const src = card(page, names[i % names.length]);
      const s = await src.boundingBox();
      const b = boxes[i % boxes.length];
      if (!s || !b) continue;
      await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
      await page.mouse.down();
      await page.mouse.move(s.x + s.width / 2 + 8, s.y + s.height / 2 + 8, {
        steps: 2,
      });
      await page.mouse.move(b.x + b.width / 2, b.y + 120, { steps: 3 });
      await page.mouse.up();
    }
    await page.waitForTimeout(300);

    expect(errors.filter((e) => /185|Maximum update depth/.test(e))).toEqual(
      [],
    );
    await expect(page.locator(".aero-column").first()).toBeVisible();
  });

  // The "calm drag" crash: with rect-based collision (closestCorners), our own mid-drag
  // card relocation shifts the layout, which could flip the collision target A↔B every
  // frame while the pointer rested at a boundary — no fast movement needed. The pointer-
  // anchored strategy kills this; holding motionless at boundary spots must stay quiet.
  test("holding the pointer motionless at column boundaries does not crash", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await mockBoard(page, { board: legacyBoardFixture() });
    await page.goto("/boards/1");
    await expect(page.getByText("Done 00")).toBeVisible();

    const src = card(page, "InProg A");
    const s = await src.boundingBox();
    if (!s) throw new Error("no box");
    await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
    await page.mouse.down();
    await page.mouse.move(s.x + s.width / 2 + 8, s.y + s.height / 2 + 8, {
      steps: 4,
    });

    // Park at the gutters BETWEEN columns and at a card's top edge, holding still each time.
    const cols = await Promise.all(
      (await page.locator(".aero-column").all()).map((c) => c.boundingBox()),
    );
    const spots: Array<[number, number]> = [];
    for (let i = 0; i < cols.length - 1; i++) {
      const a = cols[i],
        b = cols[i + 1];
      if (a && b) spots.push([(a.x + a.width + b.x) / 2, a.y + 160]);
    }
    const edge = await card(page, "Done 05").boundingBox();
    if (edge) spots.push([edge.x + edge.width / 2, edge.y + 2]);
    for (const [x, y] of spots) {
      await page.mouse.move(x, y, { steps: 6 });
      await page.waitForTimeout(700); // the motionless oscillation window
    }
    await page.mouse.move(10, 10, { steps: 5 }); // drop outside → no persist
    await page.mouse.up();
    await page.waitForTimeout(300);

    expect(errors.filter((e) => /185|Maximum update depth/.test(e))).toEqual(
      [],
    );
    await expect(page.locator(".aero-column").first()).toBeVisible();
  });
});
