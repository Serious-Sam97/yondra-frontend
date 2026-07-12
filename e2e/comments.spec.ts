import { expect, type Page, test } from "@playwright/test";

// Comments v2 driven end-to-end on a mocked board: the spec keeps a tiny
// in-memory "server" mirroring CardCommentController's payloads — top-level
// pages with thread summaries, lazy reply pages, toggling reaction aggregates.

const SAM = { id: 1, name: "Sam", email: "sam@sam.com" };
const MIA = { id: 2, name: "Mia Reyes" };

type MockComment = {
  id: number;
  card_id: number;
  parent_id: number | null;
  body: string;
  user: { id: number; name: string };
  created_at: string;
  updated_at: string;
  edited: boolean;
  reactions: {
    emoji: string;
    count: number;
    user_ids: number[];
    names: string[];
  }[];
};

function boardFixture() {
  return {
    id: 1,
    user_id: 1,
    name: "Comment Board",
    description: "",
    type: "kanban",
    project_id: null,
    owner: SAM,
    shared_with: [],
    tags: [],
    sections: [{ id: 1, board_id: 1, name: "To Do", order: 0 }],
    cards: [
      {
        id: 1,
        board_id: 1,
        section_id: 1,
        name: "Discuss me",
        description: "",
        position: 0,
        tags: [],
        checklist_items: [],
      },
    ],
  };
}

function commentServer() {
  const state = {
    nextId: 100,
    comments: [] as MockComment[],
    gifsEnabled: false,
  };

  const seed = (
    user: { id: number; name: string },
    body: string,
    parentId: number | null = null,
  ): MockComment => {
    const c: MockComment = {
      id: state.nextId++,
      card_id: 1,
      parent_id: parentId,
      body,
      user,
      created_at: "2026-07-12T10:00:00.000Z",
      updated_at: "2026-07-12T10:00:00.000Z",
      edited: false,
      reactions: [],
    };
    state.comments.push(c);
    return c;
  };

  const withSummary = (c: MockComment) => {
    const replies = state.comments.filter((r) => r.parent_id === c.id);
    return {
      ...c,
      replies_count: replies.length,
      last_reply_at: replies.length
        ? replies[replies.length - 1].created_at
        : null,
    };
  };

  return {
    state,
    seed,
    handle(method: string, path: string, body: Record<string, unknown>) {
      const replies = path.match(/\/comments\/(\d+)\/replies/);
      if (replies) {
        return {
          data: state.comments
            .filter((c) => c.parent_id === Number(replies[1]))
            .map(withSummary),
          current_page: 1,
          next_page_url: null,
        };
      }
      const react = path.match(/\/comments\/(\d+)\/reactions/);
      if (react) {
        const c = state.comments.find((x) => x.id === Number(react[1]))!;
        const emoji = String(body.emoji);
        const agg = c.reactions.find((r) => r.emoji === emoji);
        if (agg?.user_ids.includes(SAM.id)) {
          agg.count -= 1;
          agg.user_ids = agg.user_ids.filter((u) => u !== SAM.id);
          agg.names = agg.names.filter((n) => n !== SAM.name);
          c.reactions = c.reactions.filter((r) => r.count > 0);
        } else if (agg) {
          agg.count += 1;
          agg.user_ids.push(SAM.id);
          agg.names.push(SAM.name);
        } else {
          c.reactions.push({
            emoji,
            count: 1,
            user_ids: [SAM.id],
            names: [SAM.name],
          });
        }
        return withSummary(c);
      }
      if (method === "POST") {
        const parentId = (body.parent_id as number | undefined) ?? null;
        return withSummary(seed(SAM, String(body.body), parentId));
      }
      // index — top-level only, newest first
      return {
        data: state.comments
          .filter((c) => c.parent_id === null)
          .slice()
          .reverse()
          .map(withSummary),
        current_page: 1,
        next_page_url: null,
      };
    },
  };
}

async function mockBoard(page: Page, server: ReturnType<typeof commentServer>) {
  await page.addInitScript(() => {
    localStorage.setItem("token", "e2e-token");
    localStorage.setItem("isLogged", "true");
  });

  const json = (
    route: import("@playwright/test").Route,
    payload: unknown,
    status = 200,
  ) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });

  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/\/$/, "");
    const method = route.request().method();

    if (path.includes("/comments")) {
      const raw = route.request().postData();
      return json(
        route,
        server.handle(method, path, raw ? JSON.parse(raw) : {}),
        method === "POST" && !path.includes("reactions") ? 201 : 200,
      );
    }
    if (path.endsWith("/api/gifs/availability"))
      return json(route, { enabled: server.state.gifsEnabled });
    if (path.endsWith("/api/gifs/search"))
      return json(route, [
        {
          id: "g1",
          description: "test gif",
          preview_url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          gif_url: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
        },
      ]);
    if (path.endsWith("/api/user")) return json(route, SAM);
    if (path.endsWith("/api/notifications")) return json(route, []);
    if (/\/api\/boards\/1$/.test(path)) return json(route, boardFixture());
    return json(route, {});
  });
}

// On the desktop layout the comments live inline in the modal (no tab click).
async function openCommentsTab(page: Page) {
  await page.goto("/boards/1");
  await page
    .locator("button.w-full")
    .filter({ hasText: "Discuss me" })
    .click();
  await expect(
    page.getByText("Write a comment…", { exact: false }).first(),
  ).toBeVisible();
}

test.describe("comments v2 — mocked board", () => {
  test("posts a comment, replies in a thread, and sees the summary", async ({
    page,
  }) => {
    const server = commentServer();
    server.seed(MIA, "<p>What about the edge case?</p>");

    await mockBoard(page, server);
    await openCommentsTab(page);

    await expect(page.getByText("What about the edge case?")).toBeVisible();

    // Post a top-level comment through the real TipTap composer (comment editors
    // carry rt-compact; the card description editor does not).
    await page.getByText("Write a comment…", { exact: false }).click();
    await page.locator(".ProseMirror.rt-compact").first().click();
    await page.keyboard.type("Good catch, let's cover it");
    await page.getByRole("button", { name: "Post", exact: true }).click();
    await expect(page.getByText("Good catch, let's cover it")).toBeVisible();

    // Reply to Mia's comment — the thread opens with its own composer.
    const miaRow = page
      .locator(".cm-list > div")
      .filter({ hasText: "What about the edge case?" });
    await miaRow.hover();
    await miaRow.getByRole("button", { name: "Reply", exact: true }).click();
    await expect(page.locator(".cm-thread")).toBeVisible();
    await page.locator(".cm-thread .ProseMirror").click();
    await page.keyboard.type("Covered in the new spec");
    await page
      .locator(".cm-thread")
      .getByRole("button", { name: "Reply", exact: true })
      .click();

    await expect(
      page.locator(".cm-thread").getByText("Covered in the new spec"),
    ).toBeVisible();
    await expect(page.getByText("▾ 1 REPLY")).toBeVisible();
  });

  test("toggles reactions from the quick picker and the chip", async ({
    page,
  }) => {
    const server = commentServer();
    const root = server.seed(MIA, "<p>Ship it?</p>");
    root.reactions.push({
      emoji: "👍",
      count: 1,
      user_ids: [MIA.id],
      names: [MIA.name],
    });

    await mockBoard(page, server);
    await openCommentsTab(page);

    // Join Mia's 👍 via the chip — count ticks to 2 and lights up as mine.
    const chip = page.locator(".cm-chip", { hasText: "👍" });
    await expect(chip).toContainText("1");
    await chip.click();
    await expect(chip).toContainText("2");
    await expect(chip).toHaveClass(/cm-chip--mine/);

    // Add 🎉 from the quick picker via the inline add-reaction chip.
    const row = page.locator(".cm-list > div").filter({ hasText: "Ship it?" });
    await row.getByRole("button", { name: "Add reaction" }).click();
    await page.locator(".cm-picker__emoji", { hasText: "🎉" }).click();
    await expect(page.locator(".cm-chip", { hasText: "🎉" })).toBeVisible();

    // Toggle my 👍 back off.
    await chip.click();
    await expect(chip).toContainText("1");
    await expect(chip).not.toHaveClass(/cm-chip--mine/);
  });

  test("hides the GIF button without a key and searches when enabled", async ({
    page,
  }) => {
    const server = commentServer();

    await mockBoard(page, server);
    await openCommentsTab(page);

    await page.getByText("Write a comment…", { exact: false }).click();
    await expect(page.getByTitle("Insert GIF")).toHaveCount(0);

    // With a key configured, the composer offers GIF search. Reloading reopens
    // the modal (the card id lives in the URL), so just wait for the composer.
    server.state.gifsEnabled = true;
    await page.reload();
    await expect(
      page.getByText("Write a comment…", { exact: false }).first(),
    ).toBeVisible();
    await page.getByText("Write a comment…", { exact: false }).click();
    await page.getByTitle("Insert GIF").click();
    await expect(page.locator(".cm-gif")).toBeVisible();
    await expect(page.locator(".cm-gif__item")).toHaveCount(1);

    // Picking inserts the GIF into the composer as an image node.
    await page.locator(".cm-gif__item").click();
    await expect(page.locator(".ProseMirror img")).toHaveCount(1);
  });
});
