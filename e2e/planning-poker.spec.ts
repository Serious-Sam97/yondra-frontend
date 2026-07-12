import { expect, type Page, test } from "@playwright/test";

// Planning Poker driven end-to-end on a mocked scrum board: the spec keeps a tiny
// in-memory "server" (join/vote/reveal/reset/apply/ping) that mirrors
// PlanningController's snapshot shape — my_value for the caller, hidden values
// pre-reveal, history of closed rounds. Realtime is irrelevant here: every action
// answers with the fresh snapshot, exactly like the HTTP API.

const SAM = { id: 1, name: "Sam", email: "sam@sam.com" };
const MIA = { id: 2, name: "Mia Reyes" };

function scrumBoardFixture() {
  return {
    id: 1,
    user_id: 1,
    name: "Sprint Board",
    description: "",
    type: "scrum",
    project_id: null,
    owner: SAM,
    shared_with: [],
    tags: [],
    // The board page reads sprints straight off this payload; scrum kanban only
    // renders when one is active.
    sprints: [
      {
        id: 10,
        board_id: 1,
        name: "Sprint 1",
        status: "active",
        is_active: true,
      },
    ],
    sections: [
      { id: 1, board_id: 1, name: "To Do", order: 0 },
      { id: 2, board_id: 1, name: "In Progress", order: 1 },
    ],
    cards: [
      {
        id: 1,
        board_id: 1,
        section_id: 1,
        name: "Estimate me",
        description: "",
        position: 0,
        story_points: null,
        sprint_id: 10, // scrum kanban only shows the active sprint's cards
        tags: [],
        checklist_items: [],
      },
    ],
  };
}

type Vote = {
  user_id: number;
  name: string;
  value: string | null;
  is_spectator?: boolean;
};

const DECKS: Record<string, string[]> = {
  fib: ["1", "2", "3", "5", "8", "13", "21", "?"],
  "fib-x": ["0", "0.5", "1", "2", "3", "5", "8", "13", "21", "40", "100", "?", "☕"],
  tshirt: ["XS", "S", "M", "L", "XL", "?"],
};

// Minimal stand-in for PlanningController: one session, rounds, hidden values.
function planningServer() {
  const state = {
    round: 1,
    revealed: false,
    facilitator: null as number | null,
    deck: "fib",
    timer_ends_at: null as string | null,
    votes: [] as Vote[],
    closed: [] as { round: number; votes: Vote[] }[],
    applied_value: null as number | null,
    applied_at: null as string | null,
    exists: false,
  };

  const snapshot = (forUserId: number) => ({
    card_id: 1,
    board_id: 1,
    round: state.round,
    revealed: state.revealed,
    started_by: state.facilitator,
    facilitator_id: state.facilitator,
    deck: state.deck,
    hand: DECKS[state.deck],
    timer_ends_at: state.timer_ends_at,
    participants: state.votes.map((v) => ({
      user_id: v.user_id,
      name: v.name,
      has_voted: v.value !== null,
      value: state.revealed ? v.value : null,
      is_spectator: v.is_spectator ?? false,
    })),
    applied_value: state.applied_value,
    applied_at: state.applied_at,
    history: state.closed.map((c) => ({
      round: c.round,
      votes: c.votes.filter((v) => v.value !== null),
    })),
    my_value: state.votes.find((v) => v.user_id === forUserId)?.value ?? null,
  });

  return {
    state,
    handle(
      action: string,
      body: {
        value?: string | number;
        deck?: string;
        spectator?: boolean;
        seconds?: number;
      },
      userId = SAM.id,
    ) {
      if (action === "show" || action === "ping")
        return state.exists ? snapshot(userId) : null;
      if (action === "join") {
        if (!state.exists && body.deck) state.deck = body.deck;
        state.exists = true;
        state.facilitator ??= userId;
        const mine = state.votes.find((v) => v.user_id === userId);
        if (!mine)
          state.votes.push({
            user_id: userId,
            name: SAM.name,
            value: null,
            is_spectator: body.spectator ?? false,
          });
        else if (mine.value === null && body.spectator !== undefined)
          mine.is_spectator = body.spectator;
        return snapshot(userId);
      }
      if (action === "timer") {
        state.timer_ends_at = body.seconds
          ? new Date(Date.now() + body.seconds * 1000).toISOString()
          : null;
        return snapshot(userId);
      }
      if (action === "vote") {
        const mine = state.votes.find((v) => v.user_id === userId);
        if (mine) mine.value = String(body.value);
        return snapshot(userId);
      }
      if (action === "reveal") {
        state.revealed = true;
        return snapshot(userId);
      }
      if (action === "reset") {
        state.closed.push({ round: state.round, votes: state.votes });
        state.votes = state.votes.map((v) => ({ ...v, value: null }));
        state.round += 1;
        state.revealed = false;
        state.timer_ends_at = null;
        return snapshot(userId);
      }
      if (action === "apply") {
        state.applied_value = Number(body.value);
        state.applied_at = new Date().toISOString();
        return snapshot(userId);
      }
      if (action === "leave") {
        state.votes = state.votes.filter((v) => v.user_id !== userId);
        if (!state.votes.length) {
          state.exists = false;
          return null;
        }
        return snapshot(userId);
      }
      return null;
    },
  };
}

async function mockScrumBoard(page: Page, server: ReturnType<typeof planningServer>) {
  await page.addInitScript(() => {
    localStorage.setItem("token", "e2e-token");
    localStorage.setItem("isLogged", "true");
  });

  const json = (
    route: import("@playwright/test").Route,
    body: unknown,
    status = 200,
  ) =>
    body === null
      ? route.fulfill({ status: 204 })
      : route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(body),
        });

  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/\/$/, "");

    const planning = path.match(/\/api\/boards\/1\/cards\/1\/planning(?:\/(\w+))?$/);
    if (planning) {
      const action = planning[1] ?? "show";
      const raw = route.request().postData();
      const body = raw ? JSON.parse(raw) : {};
      return json(route, server.handle(action, body));
    }

    if (path.endsWith("/api/user")) return json(route, SAM);
    if (path.endsWith("/api/notifications")) return json(route, []);
    if (path.endsWith("/api/boards/1/sprints"))
      return json(route, [
        {
          id: 10,
          board_id: 1,
          name: "Sprint 1",
          status: "active",
          is_active: true,
        },
      ]);
    if (/\/api\/boards\/1$/.test(path)) return json(route, scrumBoardFixture());
    return json(route, {});
  });
}

async function openPlanningTab(page: Page) {
  await page.goto("/boards/1");
  await page
    .locator("button.w-full")
    .filter({ hasText: "Estimate me" })
    .click();
  await page.getByRole("button", { name: /Planning Poker/i }).click();
}

test.describe("planning poker — mocked scrum board", () => {
  test("join → vote → all-in banner → reveal flips values and offers a final pick", async ({
    page,
  }) => {
    const server = planningServer();
    // Mia is already seated and has voted 13 — Sam walks into a live session.
    server.state.exists = true;
    server.state.facilitator = MIA.id;
    server.state.votes.push({ user_id: MIA.id, name: MIA.name, value: "13" });

    await mockScrumBoard(page, server);
    await openPlanningTab(page);

    // Entry screen knows about the running session.
    await expect(page.getByText("1 person is at the table")).toBeVisible();

    await page.getByRole("button", { name: /Join session/i }).click();
    await expect(page.getByText("ESTIMATING · ROUND 1")).toBeVisible();
    await expect(page.getByText("Mia", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("HOST")).toBeVisible();

    // Sam plays a 5 — his hand card locks in and the all-in banner lights up.
    await page.getByRole("button", { name: "5", exact: true }).click();
    await expect(
      page.locator(".pp-hand-card--sel", { hasText: "5" }),
    ).toBeVisible();
    await expect(page.getByText(/ALL VOTES IN/)).toBeVisible();

    // Reveal: both values flip up, 13 is the high outlier, 5 the low.
    await page.getByRole("button", { name: /Reveal/i }).click();
    await expect(page.getByText(/REVEALED · MED/)).toBeVisible();
    await expect(page.locator(".pp-face--back", { hasText: "13" })).toBeVisible();
    await expect(page.getByText("▲ HIGH")).toBeVisible();
    await expect(page.getByText("▼ LOW")).toBeVisible();

    // FINAL picker suggests the deck card nearest the average (9 → 8).
    await expect(page.locator(".pp-final--hint", { hasText: "8" })).toBeVisible();

    // Apply commits the pre-selected suggestion to the card's points and the
    // committed number bursts over the table.
    await page.getByRole("button", { name: /Apply 8/ }).click();
    await expect.poll(() => server.state.applied_value).toBe(8);
    await expect(page.locator(".pp-applied__num")).toHaveText("8");
    // The burst is transient — it lets go on its own.
    await expect(page.locator(".pp-applied")).toHaveCount(0, {
      timeout: 4000,
    });
  });

  test("new round clears the table and shows prior-round history", async ({
    page,
  }) => {
    const server = planningServer();
    server.state.exists = true;
    server.state.facilitator = SAM.id;
    server.state.votes.push({ user_id: MIA.id, name: MIA.name, value: "3" });

    await mockScrumBoard(page, server);
    await openPlanningTab(page);

    await page.getByRole("button", { name: /Join session/i }).click();
    await page.getByRole("button", { name: "5", exact: true }).click();
    await page.getByRole("button", { name: /Reveal/i }).click();
    await expect(page.getByText(/REVEALED/)).toBeVisible();

    await page.getByRole("button", { name: /New round/i }).click();
    await expect(page.getByText("ESTIMATING · ROUND 2")).toBeVisible();
    await expect(page.getByText("PRIOR ROUNDS")).toBeVisible();
    await expect(page.getByText(/R1/)).toBeVisible();

    // Consensus: both vote 5 this round.
    server.state.votes.find((v) => v.user_id === MIA.id)!.value = "5";
    await page.getByRole("button", { name: "5", exact: true }).click();
    await page.getByRole("button", { name: /Reveal/i }).click();
    await expect(page.getByText(/CONSENSUS ON 5/)).toBeVisible();
    await expect(page.locator(".pp-stamp")).toBeVisible();
  });

  test("starting fresh offers deck choice; XL deck deals ½/☕ and a timer counts down", async ({
    page,
  }) => {
    const server = planningServer();

    await mockScrumBoard(page, server);
    await openPlanningTab(page);

    // No session yet — the deck picker shows; choose the extended deck.
    await expect(page.getByText("No planning session")).toBeVisible();
    await page.getByRole("radio", { name: /Fibonacci XL/i }).click();
    await page.getByRole("button", { name: /Start session/i }).click();

    // The dealt hand is server-driven: ½ and ☕ cards exist, 0 through 100.
    await expect(page.getByRole("button", { name: "½", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "☕", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "100", exact: true })).toBeVisible();
    expect(server.state.deck).toBe("fib-x");

    // Facilitator sets a 1-minute deadline — the LCD countdown appears for all.
    await page.getByRole("button", { name: "1m", exact: true }).click();
    await expect(page.locator(".pp-timer")).toBeVisible();
    await expect(page.locator(".pp-timer")).toContainText(/0:5\d/);

    // Voting ½ locks the card in like any other.
    await page.getByRole("button", { name: "½", exact: true }).click();
    await expect(
      page.locator(".pp-hand-card--sel", { hasText: "½" }),
    ).toBeVisible();
  });
});
