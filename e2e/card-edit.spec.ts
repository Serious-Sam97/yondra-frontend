import { expect, type Locator, type Page, test } from "@playwright/test";

// The card modal (CardEdit) driven end-to-end on the demo board: /boards/demo runs
// entirely on localStorage (src/lib/demoStorage.ts) with no backend and no auth, so
// these specs exercise the real form, checklist, and subtask handlers deterministically.
// Safety net for the CardEdit decomposition — any behavior drift should fail here.

// A card on the board is the draggable <button class="w-full block"> wrapping the Card body.
const boardCard = (page: Page, text: string): Locator =>
  page.locator("button.w-full").filter({ hasText: text });

// The kanban column whose header contains `name`.
const column = (page: Page, name: string): Locator =>
  page.locator(".aero-column").filter({ hasText: name });

// The big hero title textarea inside the card modal.
const titleField = (page: Page): Locator =>
  page.getByPlaceholder("What needs to be done?");

// Open the demo board and click a card to open its modal.
async function openDemoCard(page: Page, name: string) {
  await page.goto("/boards/demo");
  await expect(page.getByText(name)).toBeVisible();
  await boardCard(page, name).click();
  await expect(titleField(page)).toHaveValue(name);
}

test.describe("card modal — demo board (no backend)", () => {
  test("opens an existing card with its details in the form", async ({
    page,
  }) => {
    await openDemoCard(page, "Welcome to Yondra!");

    // The saved card shows its ticket ref (not the NEW badge) and its description.
    // Scoped to the modal (.aero-menu) — the board card behind it repeats the text.
    const modal = page.locator(".aero-menu");
    await expect(modal.getByText("#0001")).toBeVisible();
    await expect(
      modal.getByText("This is a demo board", { exact: false }),
    ).toBeVisible();
  });

  test("renames the card, saves, and the board shows the new name", async ({
    page,
  }) => {
    await openDemoCard(page, "Welcome to Yondra!");

    await titleField(page).fill("Renamed by the e2e suite");
    await page.getByRole("button", { name: "Save changes" }).click();

    // Saving closes the modal and the board reflects the rename.
    await expect(titleField(page)).toHaveCount(0);
    await expect(boardCard(page, "Renamed by the e2e suite")).toBeVisible();
    await expect(boardCard(page, "Welcome to Yondra!")).toHaveCount(0);

    // The rename persisted to demo storage — still there after a reload.
    await page.reload();
    await expect(boardCard(page, "Renamed by the e2e suite")).toBeVisible();
  });

  test("adds a checklist item and toggles it done", async ({ page }) => {
    await openDemoCard(page, "Welcome to Yondra!");

    // Ghost add-row placeholder: long-form when the list is empty, short after.
    await page.getByPlaceholder(/Add (an )?item…/).fill("Ship the refactor");
    await page.getByPlaceholder(/Add (an )?item…/).press("Enter");

    const row = page
      .locator("div.group")
      .filter({ hasText: "Ship the refactor" });
    await expect(row).toBeVisible();

    const checkbox = row.getByRole("checkbox");
    await expect(checkbox).not.toBeChecked();
    await checkbox.check();
    await expect(checkbox).toBeChecked();
    // The progress chip reflects 1 of 1 done.
    await expect(page.getByText("1/1").first()).toBeVisible();

    // Checklist mutations persist to demo storage immediately (no save needed):
    // a full reload + reopen still shows the item done.
    await openDemoCard(page, "Welcome to Yondra!");
    await expect(
      page
        .locator("div.group")
        .filter({ hasText: "Ship the refactor" })
        .getByRole("checkbox"),
    ).toBeChecked();
  });

  // Subtasks were removed from the card editor (2026-07-11 layout redesign;
  // to be reintroduced properly later). Guard against the section resurfacing.
  test("has no subtask section", async ({ page }) => {
    await openDemoCard(page, "Try creating a card");

    await expect(page.getByPlaceholder("Add subtask...")).toHaveCount(0);
    await expect(page.getByText("Subtasks", { exact: true })).toHaveCount(0);
  });

  // Guards the editor keying (key={card.id} at the CardWorkspace render site):
  // opening a different card must remount the editor and seed ITS data, never
  // show a leftover form from the previously opened card.
  test("opening another card shows that card's data, not the previous one's", async ({
    page,
  }) => {
    await openDemoCard(page, "Welcome to Yondra!");

    const modal = page.locator(".aero-menu");
    await modal.getByRole("button", { name: "✕" }).click();
    await expect(titleField(page)).toHaveCount(0);

    await boardCard(page, "Try creating a card").click();
    await expect(titleField(page)).toHaveValue("Try creating a card");
    await expect(modal.getByText("#0002")).toBeVisible();
    await expect(
      modal.getByText("Press C to add a new card", { exact: false }),
    ).toBeVisible();
  });

  // Switch WITHOUT closing: Back/Forward across `?card` history entries swaps the
  // open card via popstate while the modal stays mounted. The keyed editor must
  // remount and show the new card's form (mount-only init would otherwise keep
  // card A's fields — and save them over card B).
  test("history navigation between cards swaps the open editor", async ({
    page,
  }) => {
    await openDemoCard(page, "Welcome to Yondra!"); // pushes ?card=1

    // Create an adjacent `?card=2` history entry (what a notification deep-link
    // push produces), then travel Back onto it while card 1's modal is open.
    await page.evaluate(() => {
      window.history.pushState(null, "", "?card=2");
      window.history.pushState(null, "", "?card=1");
    });
    await page.goBack(); // popstate → ?card=2 while the modal shows card 1

    await expect(titleField(page)).toHaveValue("Try creating a card");
    await expect(page.locator(".aero-menu").getByText("#0002")).toBeVisible();
  });

  // Demo columns have no per-column "add card" control; the new-card flow is the
  // board-level FAB ("Add ticket", also the C hotkey), which opens the modal in
  // new-card mode defaulting to the first section (To Do). Covered here instead.
  test("creates a new card via the add-ticket flow", async ({ page }) => {
    await page.goto("/boards/demo");
    await expect(page.getByText("Welcome to Yondra!")).toBeVisible();

    await page.getByTitle("Add ticket").click();

    // New-card mode: NEW badge, empty title, "Pin it" as the save action.
    await expect(page.getByText("NEW", { exact: true })).toBeVisible();
    await expect(titleField(page)).toHaveValue("");

    await titleField(page).fill("Card born in e2e");
    await page.getByRole("button", { name: "Pin it" }).click();

    // The modal closes and the card lands in the default (To Do) column.
    await expect(titleField(page)).toHaveCount(0);
    await expect(
      column(page, "To Do").getByText("Card born in e2e"),
    ).toBeVisible();
  });
});
