#!/usr/bin/env node
// T-03 · THE PERFORMANCE BUDGET, checked against a production build.
//
//   npx next build && node tools/vortex-budget.mjs
//
// 1. Gzip size of what the root layout loads on every page (the app shell +
//    Vortex's core: rig, director, body engine, chat). Fails above the budget.
// 2. The lazy sides (radio, case, arcade hunts, gadgets, deck, pager, weird
//    senses, creator runtime) must NOT be in that first load: each has a
//    marker string that may only appear in a chunk loaded on demand.
// 3. Vortex's core (VortexAssistant: rig, director, body, bubbles) is itself
//    loaded with next/dynamic after the page; its chunks beyond what the app
//    already loaded must stay under VORTEX_CORE_BUDGET_KB (gzip, default 60).
// Layout budget: VORTEX_LAYOUT_BUDGET_KB (gzip, default 200; the shell is
// ~192 KB today, ~103 KB of it React/Next).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const NEXT = ".next";
const budget = Number(process.env.VORTEX_LAYOUT_BUDGET_KB ?? 200);
const app = JSON.parse(
  readFileSync(join(NEXT, "app-build-manifest.json"), "utf8"),
).pages;
const layout = app["/layout"] ?? [];
const files = layout.filter((f) => f.endsWith(".js"));
let total = 0;
const rows = [];
let shellText = "";
for (const f of files) {
  const buf = readFileSync(join(NEXT, f));
  const gz = gzipSync(buf).length;
  total += gz;
  rows.push([f, gz]);
  shellText += buf.toString("utf8");
}

// strings that only exist inside the lazily loaded modules
const LAZY = {
  "radio/Walkman": "vxo-walkman",
  "econ/TapeCase": "vxi-case",
  "arcade/Hunts": "vxq-hunt",
  "lab/GadgetBelt": "gadget belt",
  "weird/Weird": "vxw-indicator",
  "weird/demolish": "vxw-rubble",
  "creator/Creator": "vxcr-visitor",
  "outside/Pager": "vx-pager",
};
const leaked = Object.entries(LAZY).filter(([, marker]) =>
  shellText.includes(marker),
);

console.log("first-load JS of the root layout (gzip):");
for (const [f, gz] of rows.sort((a, b) => b[1] - a[1]))
  console.log(`  ${(gz / 1024).toFixed(1).padStart(7)} KB  ${f}`);
console.log(
  `  ${(total / 1024).toFixed(1).padStart(7)} KB  total  (budget ${budget} KB)`,
);
console.log(
  leaked.length
    ? `lazy modules leaked into the first load: ${leaked.map(([k]) => k).join(", ")}`
    : "lazy modules: all deferred ✓",
);

// the core, measured from Next's loadable manifest
const coreBudget = Number(process.env.VORTEX_CORE_BUDGET_KB ?? 60);
const loadable = JSON.parse(
  readFileSync(join(NEXT, "react-loadable-manifest.json"), "utf8"),
);
const coreEntry = Object.entries(loadable).find(([k]) =>
  k.endsWith("@/components/vortex/VortexAssistant"),
);
const inLayout = new Set(layout);
let core = 0;
for (const f of coreEntry?.[1].files ?? []) {
  if (!f.endsWith(".js") || inLayout.has(f)) continue;
  core += gzipSync(readFileSync(join(NEXT, f))).length;
}
console.log(
  `  ${(core / 1024).toFixed(1).padStart(7)} KB  Vortex core, loaded after the page (budget ${coreBudget} KB)`,
);

if (!coreEntry) console.log("VortexAssistant is not lazily loaded!");
if (
  total / 1024 > budget ||
  leaked.length ||
  !coreEntry ||
  core / 1024 > coreBudget
)
  process.exit(1);
