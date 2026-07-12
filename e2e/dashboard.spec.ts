import { expect, test } from "@playwright/test";

// Drives /dashboard with a stubbed /api/dashboard payload mirroring real dev
// data (whale CRM deal, active sprint, mixed queue) and asserts the redesigned
// instruments: LCD vitals tiles, flat needs-you chips, proportional funnel,
// chart anchors, activity feed panel, and project live signal.

const today = new Date();
const iso = (offsetDays: number) => {
  const d = new Date(today.getTime() + offsetDays * 86400000);
  return d.toISOString().slice(0, 10);
};

const payload = {
  vitals: {
    overdue: 1,
    overdue_oldest_days: 3,
    due_today: 0,
    due_week: 2,
    next_due: iso(3),
    in_progress: 32,
    in_progress_boards: 8,
    done_7d: 3,
    done_prev_7d: 5,
    pipeline: 34568635,
  },
  queue: {
    overdue: [
      {
        id: 101,
        name: "Stinadla deal",
        board_id: 23,
        board_name: "Sales",
        section: "Proposal Made",
        priority: "medium",
        due_date: iso(-3),
        story_points: null,
        value: 249500,
        ticket_key: "SAL-12",
      },
    ],
    today: [],
    high: [
      {
        id: 102,
        name: "Retroville Ivy Hills deal",
        board_id: 23,
        board_name: "Sales",
        section: "Negotiations Started",
        priority: "high",
        due_date: iso(3),
        story_points: null,
        value: null,
        ticket_key: "SAL-13",
      },
    ],
  },
  throughput: [1, 0, 2, 1, 3, 2, 1, 2, 4, 3, 2, 9, 5, 2],
  sprint: {
    name: "Sprint 3",
    board_name: "Scrum",
    goal: null,
    committed: 13,
    completed: 0,
    remaining: 13,
    days_total: 14,
    days_left: 11,
    days_elapsed: 3,
  },
  crm: {
    currency: "BRL",
    open_total: 34568635,
    won_mtd: 54500,
    open_count: 16,
    top_deal: {
      id: 51,
      board_id: 23,
      name: "Test",
      value: 34135135,
      stage: "Negotiations Started",
    },
    stages: [
      { name: "Lead In", value: 49500, count: 2 },
      { name: "Contact Made", value: 84500, count: 4 },
      { name: "Proposal Made", value: 249500, count: 6 },
      { name: "Negotiations Started", value: 34185135, count: 4 },
    ],
    aging: [
      {
        id: 201,
        board_id: 23,
        name: "Hilldale deal",
        stage: "Proposal Made",
        value: null,
        days_idle: 7,
      },
      {
        id: 202,
        board_id: 23,
        name: "Bass Industries deal",
        stage: "Proposal Made",
        value: 33000,
        days_idle: 6,
      },
    ],
  },
  prs: [],
  activity: [
    {
      id: 1,
      board_id: 51,
      type: "card_created",
      actor: "Sam",
      description: 'created card "whwbwrb"',
      created_at: new Date().toISOString(),
    },
  ],
  projects: {
    owned: [
      {
        id: 1,
        name: "Teste",
        description: "",
        color: "#4a90d9",
        owner_id: 1,
        boards_count: 8,
        boards: Array.from({ length: 8 }, (_, i) => ({
          id: i + 1,
          name: `Board ${i + 1}`,
          cards_count: 4,
          shared_with: [],
        })),
      },
    ],
    member: [],
  },
  projects_meta: [
    {
      id: 1,
      done: 18,
      total: 30,
      // Local-naive "Y-m-d H:i:s" 2h ago, matching the backend's timestamp format.
      last_activity: (() => {
        const d = new Date(Date.now() - 2 * 3600000);
        const p = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
      })(),
    },
  ],
};

test("dashboard renders the redesigned instruments", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("token", "e2e-token");
    localStorage.setItem("isLogged", "true");
  });

  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname.replace(/\/$/, "");
    const json = (body: unknown) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (path.endsWith("/api/user"))
      return json({ id: 1, name: "Sam", email: "sam@test.com" });
    if (path.endsWith("/api/notifications")) return json([]);
    if (path.endsWith("/api/dashboard")) return json(payload);
    return json({});
  });

  await page.setViewportSize({ width: 1440, height: 1400 });
  await page.goto("/dashboard");

  // Vitals: honest tiles with factual sub-lines, no gauges, "updated" not "live"
  await expect(page.getByText("oldest 3d late")).toBeVisible();
  await expect(page.getByText("next:")).toBeVisible();
  await expect(page.getByText("across 8 boards")).toBeVisible();
  await expect(page.getByText("▼ -2 vs prior 7d")).toBeVisible();
  await expect(page.getByText(/updated \d/)).toBeVisible();
  await expect(page.getByText("Due this week")).toBeVisible();

  // Needs you: flat list, concrete chips, idle deals pulled in
  await expect(
    page.locator(".yd-chip.red", { hasText: "3d late" }),
  ).toBeVisible();
  await expect(
    page.locator(".yd-chip.amber", { hasText: /due \w{3} \d/ }),
  ).toBeVisible();
  await expect(
    page.locator(".yd-chip.dim", { hasText: "idle 7d" }),
  ).toBeVisible();
  await expect(page.getByText("4 items")).toBeVisible();

  // Funnel: full labels, value + count, whale warning
  await expect(
    page.locator(".yd-fn-lb", { hasText: "Negotiations Started" }),
  ).toBeVisible();
  await expect(page.getByText(/99% of open value is one deal/)).toBeVisible();
  await expect(page.getByText("open · 16 deals")).toBeVisible();

  // Chart anchors
  await expect(page.getByText(/avg 2\.6\/day · peak 9/)).toBeVisible();
  await expect(page.getByText("Scrum · Sprint 3 · burndown")).toBeVisible();
  await expect(page.getByText("behind pace")).toBeVisible();
  await expect(page.getByText("1.2 pts/day")).toBeVisible();

  // Activity feed panel with separated actor (no "Sam Sam")
  await expect(page.getByText('created card "whwbwrb"')).toBeVisible();
  await expect(
    page.locator(".yd-feedrow .tx", { hasText: /^Sam created card/ }),
  ).toBeVisible();

  // Project card live signal: progress + capped chips + active stamp
  await expect(page.getByText("18/30")).toBeVisible();
  await expect(page.getByText("+4 more")).toBeVisible();
  await expect(page.getByText(/active \d+[mhd] ago/)).toBeVisible();

  // ⌘K hint on search
  await expect(page.getByText("⌘K")).toBeVisible();

  await page.screenshot({
    path: "e2e-results/dashboard-redesign.png",
    fullPage: true,
  });
});
