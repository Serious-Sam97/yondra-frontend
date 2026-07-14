import { expect, type Page, type Route, test } from "@playwright/test";
import { boardFixture, mockBoard } from "./helpers";

// The custom JSON card importer (YON-121) driven end-to-end on a mocked board.
// mockBoard() stubs GET /api/boards/1 so /boards/1 renders with no real backend;
// each test additionally stubs POST .../cards/import to assert the request the
// modal sends and to feed back a canned result. These specs exercise the real
// CardImportModal logic: client-side JSON validation, the sample, the submit
// payload, and the created/errors readout.

// The "Import" launcher in the board tools dock (icon-only button, accessible via
// its aria-label). Desktop viewport keeps the kanban dock visible.
const importTool = (page: Page) =>
  page.getByRole("button", { name: "Import", exact: true });

const importDialog = (page: Page) =>
  page.locator(".aero-menu").filter({ hasText: "Import cards from JSON" });

const jsonBox = (page: Page) => page.getByPlaceholder("Paste JSON here…");

const importButton = (page: Page) =>
  importDialog(page).getByRole("button", { name: /^Import(ing)?/ });

async function openBoardAndImporter(page: Page) {
  await page.goto("/boards/1");
  await expect(page.getByText("Welcome to Yondra!")).toBeVisible();
  await importTool(page).click();
  await expect(importDialog(page)).toBeVisible();
}

// Capture the parsed payload the modal POSTs, and reply with a caller-chosen result.
async function stubImport(
  page: Page,
  result: unknown,
  status = 201,
): Promise<{ lastBody: () => unknown }> {
  let body: unknown;
  await page.route("**/api/boards/1/cards/import", (route: Route) => {
    body = route.request().postDataJSON();
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(result),
    });
  });
  return { lastBody: () => body };
}

test.describe("card importer — mocked board", () => {
  test("opens from the board tools dock", async ({ page }) => {
    await mockBoard(page);
    await openBoardAndImporter(page);
    await expect(
      importDialog(page).getByText("Import cards from JSON"),
    ).toBeVisible();
    // The board's column names are surfaced as a hint.
    await expect(importDialog(page).getByText(/To Do/)).toBeVisible();
  });

  test("keeps Import disabled and shows an error on malformed JSON", async ({
    page,
  }) => {
    await mockBoard(page);
    await openBoardAndImporter(page);

    await jsonBox(page).fill('{ "name": "no closing brace"');
    await expect(importDialog(page).getByText(/JSON error/)).toBeVisible();
    await expect(importButton(page)).toBeDisabled();
  });

  test('"Insert sample" fills valid JSON and enables Import', async ({
    page,
  }) => {
    await mockBoard(page);
    await openBoardAndImporter(page);

    await importDialog(page)
      .getByRole("button", { name: "Insert sample" })
      .click();
    await expect(jsonBox(page)).toContainText("Design landing page");
    await expect(importDialog(page).getByText(/JSON error/)).toHaveCount(0);
    await expect(importButton(page)).toBeEnabled();
  });

  test("posts the parsed JSON and reports the created count", async ({
    page,
  }) => {
    await mockBoard(page);
    const stub = await stubImport(page, {
      created: [
        { ...boardFixture().cards[0], id: 101, name: "Imported One" },
        { ...boardFixture().cards[0], id: 102, name: "Imported Two" },
      ],
      created_count: 2,
      errors: [],
      error_count: 0,
    });
    await openBoardAndImporter(page);

    await jsonBox(page).fill(
      '[{"name":"Imported One"},{"title":"Imported Two"}]',
    );
    await importButton(page).click();

    // On full success the modal closes and the new cards land on the board.
    await expect(importDialog(page)).toBeHidden();
    await expect(page.getByText("Imported One")).toBeVisible();
    // The modal sent exactly what the user typed (parsed to JSON), untouched.
    expect(stub.lastBody()).toEqual([
      { name: "Imported One" },
      { title: "Imported Two" },
    ]);
  });

  // Regression: tags created on demand during import must be merged into board
  // state so the imported card shows its chips the moment you open it.
  test("an imported card shows its newly-created tag when opened", async ({
    page,
  }) => {
    await mockBoard(page);
    const base = boardFixture().cards[0];
    await stubImport(page, {
      created: [
        {
          ...base,
          id: 501,
          section_id: 1,
          name: "Tagged import",
          tags: [
            { id: 999, board_id: 1, name: "imported-tag", color: "#ff5a4d" },
          ],
        },
      ],
      created_count: 1,
      errors: [],
      error_count: 0,
    });
    await openBoardAndImporter(page);

    await jsonBox(page).fill(
      '[{"name":"Tagged import","tags":["imported-tag"]}]',
    );
    await importButton(page).click();
    await expect(importDialog(page)).toBeHidden();

    // Open the freshly imported card; the tag must render in its properties
    // panel (scoped to the card modal — the board-card chip renders from the
    // card payload regardless, so it wouldn't prove the board-tag merge).
    await page
      .locator("button.w-full")
      .filter({ hasText: "Tagged import" })
      .click();
    await expect(
      page.locator(".aero-menu").getByRole("button", { name: "imported-tag" }),
    ).toBeVisible();
  });

  test("imports the Opportunity Canvas sample as one card", async ({
    page,
  }) => {
    await mockBoard(page);
    const stub = await stubImport(page, {
      created: [
        { ...boardFixture().cards[0], id: 301, name: "Acme warehouse rollout" },
      ],
      created_count: 1,
      errors: [],
      error_count: 0,
    });
    await openBoardAndImporter(page);

    await importDialog(page)
      .getByRole("button", { name: "Canvas sample" })
      .click();
    await expect(importDialog(page).getByText(/JSON error/)).toHaveCount(0);
    await importButton(page).click();

    // Success closes the modal; the posted body is the canvas doc, untouched.
    await expect(importDialog(page)).toBeHidden();
    const body = stub.lastBody() as { opportunity?: { name?: string } };
    expect(body.opportunity?.name).toBe("Acme warehouse rollout");
  });

  test("surfaces per-row errors returned by the server", async ({ page }) => {
    await mockBoard(page);
    await stubImport(page, {
      created: [{ ...boardFixture().cards[0], id: 201, name: "Good" }],
      created_count: 1,
      errors: [
        { index: 1, message: "Card is missing a name/title." },
        { index: 2, message: 'Unknown column "Nowhere".' },
      ],
      error_count: 2,
    });
    await openBoardAndImporter(page);

    await jsonBox(page).fill(
      '[{"name":"Good"},{"description":"no name"},{"name":"x","column":"Nowhere"}]',
    );
    await importButton(page).click();

    await expect(
      importDialog(page).getByText("Created 1 card, 2 skipped"),
    ).toBeVisible();
    // Errors are shown 1-indexed (row = index + 1).
    await expect(
      importDialog(page).getByText("Row 2: Card is missing a name/title."),
    ).toBeVisible();
    await expect(
      importDialog(page).getByText('Row 3: Unknown column "Nowhere".'),
    ).toBeVisible();
  });

  test("shows the server message when the whole payload is rejected", async ({
    page,
  }) => {
    await mockBoard(page);
    await stubImport(
      page,
      { message: "Board has no columns to import cards into." },
      422,
    );
    await openBoardAndImporter(page);

    await jsonBox(page).fill('[{"name":"whatever"}]');
    await importButton(page).click();

    await expect(
      importDialog(page).getByText(
        "Board has no columns to import cards into.",
      ),
    ).toBeVisible();
  });
});
