import { expect, test } from "@playwright/test";
import { mockApp, sampleProject } from "./helpers";

// ids from sampleProject(): 1 Sam (primary owner), 3 Gabriel (co-owner),
// 5 Rafael (member), 6 Rudney (viewer).

test.describe("project member management gating", () => {
  test("primary owner sees the Members controls", async ({ page }) => {
    await mockApp(page, { currentUserId: 1, project: sampleProject() });
    await page.goto("/projects/1");
    await expect(page.getByText("Board A")).toBeVisible();

    await expect(page.getByRole("button", { name: "Members" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Manage" })).toBeVisible();
  });

  test("invited co-owner also sees the Members controls", async ({ page }) => {
    await mockApp(page, { currentUserId: 3, project: sampleProject() });
    await page.goto("/projects/1");
    await expect(page.getByText("Board A")).toBeVisible();

    // This is the bug we fixed: co-owners were gated out of both entry points.
    await expect(page.getByRole("button", { name: "Members" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Manage" })).toBeVisible();
  });

  test("plain member does NOT see the Members controls", async ({ page }) => {
    await mockApp(page, { currentUserId: 5, project: sampleProject() });
    await page.goto("/projects/1");
    await expect(page.getByText("Board A")).toBeVisible();

    await expect(page.getByRole("button", { name: "Members" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Manage" })).toHaveCount(0);
  });

  test("viewer does NOT see the Members controls", async ({ page }) => {
    await mockApp(page, { currentUserId: 6, project: sampleProject() });
    await page.goto("/projects/1");
    await expect(page.getByText("Board A")).toBeVisible();

    await expect(page.getByRole("button", { name: "Members" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Manage" })).toHaveCount(0);
  });
});

test.describe("members modal — primary owner is protected", () => {
  test("primary owner is locked and has no remove control (owner view)", async ({
    page,
  }) => {
    await mockApp(page, { currentUserId: 1, project: sampleProject() });
    await page.goto("/projects/1");
    await page.getByRole("button", { name: "Members" }).click();

    await expect(page.getByText("Primary · locked")).toBeVisible();
    // Sam (primary) cannot be removed; a regular member can.
    await expect(page.getByLabel("Remove Sam")).toHaveCount(0);
    await expect(page.getByLabel("Remove Rafael Godoy")).toHaveCount(1);
  });

  test("co-owner can manage but cannot remove the primary owner", async ({
    page,
  }) => {
    await mockApp(page, { currentUserId: 3, project: sampleProject() });
    await page.goto("/projects/1");
    await page.getByRole("button", { name: "Members" }).click();

    // Co-owner sees the invite form (can manage)...
    await expect(page.getByPlaceholder("name@company.com")).toBeVisible();
    // ...but the primary owner stays locked and unremovable.
    await expect(page.getByText("Primary · locked")).toBeVisible();
    await expect(page.getByLabel("Remove Sam")).toHaveCount(0);
  });
});

test.describe("project stats reflect what is on screen", () => {
  test("Boards stat equals the number of boards rendered", async ({ page }) => {
    // Note: helper never sends boards_count, mirroring the show() payload —
    // the stat must derive from the boards array.
    await mockApp(page, { currentUserId: 1, project: sampleProject() });
    await page.goto("/projects/1");
    await expect(page.getByText("Board A")).toBeVisible();
    await expect(page.getByText("Board B")).toBeVisible();

    const boardsRow = page
      .locator("div", { has: page.getByText("Boards", { exact: true }) })
      .last();
    await expect(boardsRow).toContainText("2");
  });
});
