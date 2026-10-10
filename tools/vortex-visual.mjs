#!/usr/bin/env node
// T-09 · VISUAL SNAPSHOTS of the main Vortex scenes, against the running dev
// stack (front :3000, API on NEXT_PUBLIC_API) with a temporary token, in Edge.
//
//   node tools/vortex-visual.mjs <out-dir> <sanctum-token> [only]
//
// Scenes: the rig in every expression (lab grid), the answering machine,
// every room of the Below, every dimension, every corruption stage, the
// dossier drawer and the profile rack. `only` filters by scene prefix.
// Compare two runs with any image diff tool; nothing is committed.

import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const [out, token, only = ""] = process.argv.slice(2);
if (!out || !token) {
  console.error("usage: node tools/vortex-visual.mjs <out-dir> <token> [only]");
  process.exit(1);
}
const BASE = process.env.YONDRA_WEB ?? "http://localhost:3000";
const API = process.env.YONDRA_API ?? "http://localhost";
mkdirSync(out, { recursive: true });

let browser;
try {
  browser = await chromium.launch({ channel: "msedge" });
} catch {
  browser = await chromium.launch();
}
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`${BASE}/login`);
await page.evaluate((t) => {
  localStorage.setItem("token", t);
  localStorage.setItem("isLogged", "true");
  localStorage.setItem("yondra_privacy_ack", "1");
}, token);
const shot = async (name) => {
  if (only && !name.startsWith(only)) return;
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log("✓", name);
};
const want = (prefix) =>
  !only || prefix.startsWith(only) || only.startsWith(prefix);
const api = (path, body) =>
  page.evaluate(
    async ([u, t, b]) =>
      (
        await fetch(u, {
          method: b ? "POST" : "GET",
          headers: {
            Authorization: `Bearer ${t}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: b ? JSON.stringify(b) : undefined,
        })
      ).status,
    [`${API}${path}`, token, body],
  );

// the rig: every face on the lab grid (dev only)
if (want("rig")) {
  await page.goto(`${BASE}/dev/vortex`);
  await page.waitForTimeout(3000);
  await page
    .locator(".vxlab-grid")
    .first()
    .screenshot({ path: `${out}/rig-faces.png` })
    .catch(() => {});
  console.log("✓ rig-faces");
}

// the answering machine
if (want("machine")) {
  await page.goto(`${BASE}/dashboard`);
  await page.waitForTimeout(4000);
  await page.keyboard.press("v");
  await page.waitForTimeout(1200);
  await shot("machine");
  await page.keyboard.press("Escape");
}

// the Below, room by room
if (want("below")) {
  for (const room of [
    "porao",
    "armario",
    "biblioteca",
    "cemiterio",
    "clinica",
    "cabecas",
    "garagem",
    "estudio",
    "fliperama",
    "torre",
    "ladob",
  ]) {
    await page.goto(`${BASE}/below/${room}`);
    await page.waitForTimeout(2500);
    await shot(`below-${room}`);
  }
}

// every dimension, over the dashboard
if (want("dim")) {
  await page.goto(`${BASE}/dashboard`);
  await page.waitForTimeout(3500);
  for (const d of [
    "y1985",
    "corporate",
    "underwater",
    "paper",
    "soviet",
    "pixel",
    "inverted",
    "noir",
    "novortex",
    "future",
    "baroque",
    "vex",
  ]) {
    await page.evaluate(
      (x) => document.documentElement.setAttribute("data-dimension", x),
      d,
    );
    await page.waitForTimeout(700);
    await shot(`dim-${d}`);
  }
  await page.evaluate(() =>
    document.documentElement.removeAttribute("data-dimension"),
  );
}

// corruption stages (dev soul endpoint), restored to 0 at the end
if (want("stage")) {
  for (const [n, c] of [
    [0, 0],
    [1, 16],
    [2, 36],
    [3, 56],
    [4, 76],
    [5, 91],
  ]) {
    await api("/api/mascot/dev/soul", { corruption: c });
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(3500);
    await shot(`stage-${n}`);
  }
  await api("/api/mascot/dev/soul", { corruption: 0 });
}

// the dossier and the rack, on the profile
if (want("profile")) {
  await page.goto(`${BASE}/profile`);
  await page.waitForTimeout(4500);
  await page
    .locator(".vxrk")
    .evaluate((e) => e.scrollIntoView({ block: "start" }))
    .catch(() => {});
  await page.waitForTimeout(300);
  await shot("profile-rack");
  await page
    .locator(".vxd")
    .evaluate((e) => e.scrollIntoView({ block: "start" }))
    .catch(() => {});
  await page.waitForTimeout(300);
  await shot("profile-dossier");
}

console.log(
  errors.length ? `page errors:\n${errors.join("\n")}` : "no page errors",
);
await browser.close();
