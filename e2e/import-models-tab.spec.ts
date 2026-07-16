import { expect, type Route, test } from "@playwright/test";
import { mockApp, sampleProject } from "./helpers";

// The project-settings "Import Models" tab (YON-122): create a model, paste a
// sample to load the patchbay's source keys, wire a source key to a card field by
// clicking the two jacks, watch the live preview, and save.

test.describe("import models tab", () => {
  test("wires a field on the patchbay and previews the result", async ({
    page,
  }) => {
    await mockApp(page, { currentUserId: 1, project: sampleProject() });

    // The models list (empty) + a create endpoint that echoes the saved model.
    await page.route("**/api/projects/1/import-models", (route: Route) => {
      if (route.request().method() === "POST") {
        const sent = route.request().postDataJSON();
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ id: 42, project_id: 1, ...sent }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      });
    });

    await page.goto("/projects/1/settings?tab=import-models");

    // Start a new model.
    await page.getByRole("button", { name: "+ New model" }).click();
    await page.getByPlaceholder("Model name").fill("Zendesk");
    await page.getByPlaceholder(/data\.tickets/).fill("results");
    await page
      .getByPlaceholder(/results/)
      .fill('{ "results": [ { "subject": "Refund", "priority": 3 } ] }');

    // The sample's keys load onto the left rack as accessible jacks.
    await expect(
      page.getByRole("button", { name: /Source key subject/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Source key priority/ }),
    ).toBeVisible();

    // Wire subject → name by clicking the two jacks.
    await page.getByRole("button", { name: /Source key subject/ }).click();
    await page.getByRole("button", { name: /Card field name/ }).click();

    // The live preview now renders the produced card (exact match avoids the
    // sample textarea, which also contains the word).
    await expect(page.getByText("Refund", { exact: true })).toBeVisible();

    // Save it.
    await page.getByRole("button", { name: "Create model" }).click();
    await expect(page.getByText("Model saved.")).toBeVisible();
  });

  test("a starter template pre-fills a wired, previewable model", async ({
    page,
  }) => {
    await mockApp(page, { currentUserId: 1, project: sampleProject() });
    await page.route("**/api/projects/1/import-models", (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      }),
    );

    await page.goto("/projects/1/settings?tab=import-models");
    await page
      .getByRole("button", { name: "Opportunity Canvas", exact: true })
      .click();

    // Template wired the fields and its filled sample drives the preview.
    await expect(
      page.getByRole("button", { name: /Card field name \(wired\)/ }),
    ).toBeVisible();
    await expect(
      page.getByText("Acme warehouse rollout", { exact: true }),
    ).toBeVisible();
  });

  test("guards against saving an empty model", async ({ page }) => {
    await mockApp(page, { currentUserId: 1, project: sampleProject() });
    await page.route("**/api/projects/1/import-models", (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "[]",
      }),
    );

    await page.goto("/projects/1/settings?tab=import-models");
    await page.getByRole("button", { name: "+ New model" }).click();
    await page.getByPlaceholder("Model name").fill("Empty");
    await page.getByRole("button", { name: "Create model" }).click();

    await expect(page.getByText("Wire at least one field.")).toBeVisible();
  });
});
