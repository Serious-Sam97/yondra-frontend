import { expect, type Page, test } from "@playwright/test";

// Covers the profile field masks shipped for YON-116 (name) and YON-114
// (WhatsApp phone). Drives the real /profile page with every /api/* call
// stubbed (same approach as the other specs — no backend needed) and asserts
// what the user can actually type into each field, that the length caps hold,
// and that the international dialling code is folded into the saved number.

interface ProfileUser {
  id: number;
  name: string;
  email: string;
  whatsapp_number?: string | null;
  is_admin?: boolean;
  email_verified_at?: string | null;
  created_at?: string | null;
}

const baseUser: ProfileUser = {
  id: 1,
  name: "Sam",
  email: "sam@sam.com",
  whatsapp_number: null,
  is_admin: false,
  email_verified_at: "2026-01-01T00:00:00Z",
  created_at: "2026-01-01T00:00:00Z",
};

// Log in and stub the profile page's calls. Returns a getter for the body of
// the last PUT /api/user (the save), so a test can assert what got persisted.
async function mockProfile(page: Page): Promise<() => ProfileUser | null> {
  let lastSaved: ProfileUser | null = null;

  await page.addInitScript(() => {
    localStorage.setItem("token", "e2e-token");
    localStorage.setItem("isLogged", "true");
  });

  const json = (
    route: import("@playwright/test").Route,
    body: unknown,
    status = 200,
  ) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });

  await page.route("**/api/**", (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/\/$/, "");

    if (path.endsWith("/api/user")) {
      if (req.method() === "PUT") {
        const sent = JSON.parse(req.postData() ?? "{}") as Partial<ProfileUser>;
        lastSaved = { ...baseUser, ...sent };
        return json(route, lastSaved);
      }
      return json(route, baseUser);
    }
    if (path.endsWith("/api/boards"))
      return json(route, { owned: [], shared: [] });
    if (path.endsWith("/api/notifications/preferences"))
      return json(route, { event_types: [], channels: [], preferences: {} });

    return json(route, {});
  });

  return () => lastSaved;
}

test.describe("profile input masks", () => {
  test.beforeEach(async ({ page }) => {
    await mockProfile(page);
    await page.goto("/profile");
    // Wait until the user has loaded into the form before touching fields.
    await expect(page.locator("#profile-name")).toHaveValue("Sam");
  });

  // YON-116: the name field must reject digits and symbols, keeping only the
  // characters real names use (letters, accents, spaces, - ' .).
  test("name field strips digits and symbols (YON-116)", async ({ page }) => {
    const name = page.locator("#profile-name");
    await name.fill("Ana2 Lúcia9!");
    await expect(name).toHaveValue("Ana Lúcia");

    await name.fill("Gabriel @-123");
    await expect(name).toHaveValue("Gabriel -");
  });

  // YON-116: the second half of the card — a hard character cap so a long name
  // can't spill over and break the layout.
  test("name field is capped at 50 characters (YON-116)", async ({ page }) => {
    const name = page.locator("#profile-name");
    await name.fill("x".repeat(80));
    await expect(name).toHaveValue("x".repeat(50));
  });

  // YON-114: the WhatsApp field accepts digits only — letters and symbols are
  // dropped — and the remaining digits are shown through the country mask.
  test("phone field keeps digits only and masks them (YON-114)", async ({
    page,
  }) => {
    const phone = page.locator("#profile-whatsapp");
    // Letters/symbols dropped; the 11 digits render as a BR mobile number.
    await phone.fill("ab11cd987654321");
    await expect(phone).toHaveValue("(11) 98765-4321");
  });

  // The mask follows the selected dialling code: BR mobile vs landline, US, and
  // a generic space-grouped fallback for codes without a specific pattern.
  test("phone mask adapts to the dialling code (YON-114)", async ({ page }) => {
    const country = page.getByLabel("Country code");
    const phone = page.locator("#profile-whatsapp");

    await phone.fill("1132657890"); // BR landline (10 digits)
    await expect(phone).toHaveValue("(11) 3265-7890");

    await country.selectOption("1"); // 🇺🇸 +1 — reformats the same digits
    await phone.fill("4155551234");
    await expect(phone).toHaveValue("(415) 555-1234");

    await country.selectOption("351"); // 🇵🇹 +351 — generic grouping
    await phone.fill("912345678");
    await expect(phone).toHaveValue("912 345 678");
  });

  // YON-114: national number is capped at 15 digits (excludes the dialling code).
  test("phone field is capped at 15 digits (YON-114)", async ({ page }) => {
    const phone = page.locator("#profile-whatsapp");
    await phone.fill("1234567890123456789");
    // The visible value is masked; the underlying digits are capped at 15.
    const digits = (await phone.inputValue()).replace(/\D/g, "");
    expect(digits).toBe("123456789012345");
  });

  // YON-114: an international dialling-code selector, Brazil first, so the
  // WhatsApp number works for clients outside Brazil.
  test("offers an international dialling code, Brazil default (YON-114)", async ({
    page,
  }) => {
    const country = page.getByLabel("Country code");
    await expect(country).toHaveValue("55");
    await expect(country.locator("option")).toContainText([
      "🇧🇷 +55",
      "🇺🇸 +1",
      "🇵🇹 +351",
    ]);
  });

  // YON-114 end-to-end: the chosen country code is prefixed onto the masked
  // national number and saved as one digit string (E.164 without the "+").
  test("saves country code + national number combined (YON-114)", async ({
    page,
  }) => {
    // Re-stub here so we can read the PUT body after the save.
    const savedBody = await mockProfile(page);
    await page.goto("/profile");
    await expect(page.locator("#profile-name")).toHaveValue("Sam");

    await page.getByLabel("Country code").selectOption("1"); // 🇺🇸 +1
    await page.locator("#profile-whatsapp").fill("555-1234");

    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByText("SAVED ✓")).toBeVisible();
    expect(savedBody()?.whatsapp_number).toBe("15551234");
  });
});
