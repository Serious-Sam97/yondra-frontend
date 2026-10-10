import { defineConfig } from "@playwright/test";

// T-10 / T-02 · Vortex logic + accessibility checks that need no browser and
// no server: pure modules and the stylesheets, run on Playwright's runner.
//   npx playwright test -c playwright.vortex.config.ts
export default defineConfig({
  testDir: "./e2e",
  testMatch: /vortex-(logic|a11y|core)\.spec\.ts/,
  reporter: [["list"]],
});
