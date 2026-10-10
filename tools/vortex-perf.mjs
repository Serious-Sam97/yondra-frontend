#!/usr/bin/env node
// T-03 · IDLE FRAME BUDGET. Opens the dashboard with a temporary token, waits
// until his greeting bubble is gone, traces 3 s of the renderer main thread
// and fails if Vortex idles above 2 ms of work per frame (scripts, style,
// layout, paint — everything the main thread does).
//
//   node tools/vortex-perf.mjs <sanctum-token>
// Env: YONDRA_WEB (default http://localhost:3000), VORTEX_FRAME_BUDGET_MS (2).

import { chromium } from "playwright";

const [token] = process.argv.slice(2);
if (!token) {
  console.error("usage: node tools/vortex-perf.mjs <token>");
  process.exit(1);
}
const WEB = process.env.YONDRA_WEB ?? "http://localhost:3000";
const budget = Number(process.env.VORTEX_FRAME_BUDGET_MS ?? 2);
let browser;
try {
  browser = await chromium.launch({ channel: "msedge" });
} catch {
  browser = await chromium.launch();
}

async function idleCost(vortexOn) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 860 },
  });
  await page.goto(`${WEB}/login`);
  await page.evaluate(
    ([t, on]) => {
      localStorage.setItem("token", t);
      localStorage.setItem("isLogged", "true");
      localStorage.setItem("yondra_privacy_ack", "1");
      if (on) localStorage.removeItem("yd:vortex.enabled");
      else localStorage.setItem("yd:vortex.enabled", "0");
    },
    [token, vortexOn],
  );
  await page.goto(`${WEB}/dashboard`);
  await page.waitForTimeout(12000);
  for (let i = 0; i < 30 && (await page.locator(".vxa-bubble").count()); i++)
    await page.waitForTimeout(1000);
  await page.waitForTimeout(2000);
  await browser.startTracing(page, {
    categories: ["devtools.timeline", "disabled-by-default-devtools.timeline"],
  });
  await page.waitForTimeout(3000);
  const ev = JSON.parse((await browser.stopTracing()).toString()).traceEvents;
  const mains = new Set(
    ev
      .filter(
        (e) =>
          e.ph === "M" &&
          e.name === "thread_name" &&
          e.args?.name === "CrRendererMain",
      )
      .map((e) => `${e.pid}:${e.tid}`),
  );
  const work = new Map();
  for (const e of ev) {
    const k = `${e.pid}:${e.tid}`;
    if (e.ph === "X" && e.dur && e.name === "RunTask" && mains.has(k))
      work.set(k, (work.get(k) ?? 0) + e.dur);
  }
  // the page's renderer main thread is the busiest CrRendererMain
  const busiest = Math.max(...work.values());
  await page.close();
  return busiest / 1000 / (3000 / 16.67);
}

const on = await idleCost(true);
const off = await idleCost(false);
await browser.close();
console.log(
  `idle main-thread work: ${on.toFixed(2)} ms/frame with Vortex, ${off.toFixed(2)} without (budget ${budget})`,
);
if (!Number.isFinite(on) || !Number.isFinite(off)) {
  console.error("no trace data — can't judge");
  process.exit(2);
}
if (on > budget) process.exit(1);
