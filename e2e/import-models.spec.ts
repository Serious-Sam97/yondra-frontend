import { expect, type Page, type Route, test } from "@playwright/test";
import { boardFixture, mockBoard } from "./helpers";

// The custom import models (YON-122) surface as a source selector inside the card
// importer when the board belongs to a project that has models. Choosing one sends
// a { model_id, payload } envelope instead of the raw JSON. These specs run on a
// mocked board whose project (id 7) exposes one model.

const MODEL = {
  id: 55,
  project_id: 7,
  name: "Zendesk",
  mode: "many" as const,
  item_path: "results",
  fields: [
    { target: "name", source: "subject" },
    { target: "column", transform: { type: "const", value: "Triage" } },
  ],
  sample: { results: [{ subject: "Refund not received" }] },
};

const importDialog = (page: Page) =>
  page.locator(".ci-panel").filter({ hasText: "Import Cards" });

async function openImporterWithModels(
  page: Page,
): Promise<{ lastBody: () => unknown }> {
  // boardFixture types project_id as the literal null; override it for a board
  // that belongs to a project so the modal loads that project's models.
  const board = {
    ...boardFixture(),
    project_id: 7,
  } as unknown as ReturnType<typeof boardFixture>;
  await mockBoard(page, { board });

  // Registered after mockBoard's catch-all, so these win.
  await page.route("**/api/projects/7/import-models", (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([MODEL]),
    }),
  );

  let body: unknown;
  await page.route("**/api/boards/1/cards/import", (route: Route) => {
    body = route.request().postDataJSON();
    route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        created: [
          { ...boardFixture().cards[0], id: 900, name: "Refund not received" },
        ],
        created_count: 1,
        errors: [],
        error_count: 0,
      }),
    });
  });

  await page.goto("/boards/1");
  await expect(page.getByText("Welcome to Yondra!")).toBeVisible();
  await page.getByRole("button", { name: "Import", exact: true }).click();
  await expect(importDialog(page)).toBeVisible();
  return { lastBody: () => body };
}

test.describe("card importer — project models", () => {
  test("offers the project's models plus Auto", async ({ page }) => {
    await openImporterWithModels(page);
    await expect(
      importDialog(page).getByRole("button", { name: "Auto (flat / canvas)" }),
    ).toBeVisible();
    await expect(
      importDialog(page).getByRole("button", { name: "Zendesk", exact: true }),
    ).toBeVisible();
  });

  test("sends a { model_id, payload } envelope when a model is chosen", async ({
    page,
  }) => {
    const stub = await openImporterWithModels(page);

    await importDialog(page)
      .getByRole("button", { name: "Zendesk", exact: true })
      .click();
    // The model carries a sample; load it into the buffer.
    await importDialog(page)
      .getByRole("button", { name: "Load model sample" })
      .click();
    await importDialog(page)
      .getByRole("button", { name: /^Import/ })
      .click();

    await expect(importDialog(page)).toBeHidden();
    expect(stub.lastBody()).toEqual({
      model_id: 55,
      payload: { results: [{ subject: "Refund not received" }] },
    });
  });

  test("Auto mode still posts the raw JSON (no envelope)", async ({ page }) => {
    const stub = await openImporterWithModels(page);

    // Auto is the default; paste a flat card and import.
    await page.getByPlaceholder(/Paste JSON here/).fill('[{"name":"Plain"}]');
    await importDialog(page)
      .getByRole("button", { name: /^Import/ })
      .click();

    await expect(importDialog(page)).toBeHidden();
    expect(stub.lastBody()).toEqual([{ name: "Plain" }]);
  });
});
