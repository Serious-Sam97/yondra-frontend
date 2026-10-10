#!/usr/bin/env node
// T-02 · WCAG AA CONTRAST AUDIT of the Vortex interface (not his art).
// Opens the profile (rack + panels + drawer), the answering machine and the
// case with a temporary token, and checks every visible text element against
// the background actually behind it: 4.5:1 for normal text, 3:1 for large
// (≥ 24px, or ≥ 18.66px bold). Decorative/disabled text is skipped.
//
//   node tools/vortex-contrast.mjs <sanctum-token>

import { chromium } from "playwright";

const [token] = process.argv.slice(2);
if (!token) {
  console.error("usage: node tools/vortex-contrast.mjs <token>");
  process.exit(1);
}
const WEB = process.env.YONDRA_WEB ?? "http://localhost:3000";
let browser;
try {
  browser = await chromium.launch({ channel: "msedge" });
} catch {
  browser = await chromium.launch();
}
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(`${WEB}/login`);
await page.evaluate((t) => {
  localStorage.setItem("token", t);
  localStorage.setItem("isLogged", "true");
  localStorage.setItem("yondra_privacy_ack", "1");
}, token);

// runs in the page: every text element under `scope` with its contrast
const audit = (scope) =>
  page.evaluate((sel) => {
    const parse = (c) => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const [r, g, b, a = 1] = m[1]
        .split(/[ ,/]+/)
        .filter(Boolean)
        .map(Number);
      return { r, g, b, a };
    };
    const lum = ({ r, g, b }) => {
      const f = (v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const over = (top, under) => ({
      r: top.r * top.a + under.r * (1 - top.a),
      g: top.g * top.a + under.g * (1 - top.a),
      b: top.b * top.a + under.b * (1 - top.a),
      a: 1,
    });
    // the solid colour behind an element: stack its ancestors' backgrounds
    const behind = (el) => {
      const layers = [];
      for (
        let n = el;
        n && n !== document.documentElement;
        n = n.parentElement
      ) {
        const cs = getComputedStyle(n);
        const bg = parse(cs.backgroundColor);
        if (bg && bg.a > 0) layers.push(bg);
        if (bg && bg.a >= 1) break;
        // a gradient/image background: sample its first colour stop
        if (cs.backgroundImage !== "none") {
          const stop = cs.backgroundImage.match(/rgba?\([^)]+\)/);
          const c = stop && parse(stop[0]);
          if (c) {
            layers.push({ ...c, a: Math.max(c.a, 0.9) });
            if (c.a >= 0.9) break;
          }
        }
      }
      let base = parse(getComputedStyle(document.body).backgroundColor) ?? {
        r: 20,
        g: 18,
        b: 16,
        a: 1,
      };
      if (base.a < 1) base = { r: 20, g: 18, b: 16, a: 1 };
      for (const l of layers.reverse()) base = over(l, base);
      return base;
    };
    const out = [];
    const roots = [...document.querySelectorAll(sel)];
    for (const root of roots)
      for (const el of root.querySelectorAll("*")) {
        const own = [...el.childNodes].some(
          (c) => c.nodeType === 3 && c.textContent.trim().length > 1,
        );
        if (!own) continue;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (
          r.width === 0 ||
          cs.visibility === "hidden" ||
          Number(cs.opacity) < 0.2
        )
          continue;
        if (
          el.closest(
            "[aria-hidden='true'], svg, :disabled, [disabled], .ghost, .vxa-ghosttext",
          )
        )
          continue;
        let alpha = 1;
        for (let n = el; n; n = n.parentElement)
          alpha *= Number(getComputedStyle(n).opacity);
        if (alpha < 0.5) continue; // dimmed on purpose (disabled units)
        // gradient-clipped text: its colours are the gradient's stops
        const clipped =
          (cs.webkitBackgroundClip ?? cs.backgroundClip) === "text";
        const fgs = clipped
          ? (cs.backgroundImage.match(/rgba?\([^)]+\)/g) ?? [])
              .map(parse)
              .filter(Boolean)
          : [parse(cs.color)].filter(Boolean);
        if (fgs.length === 0) continue;
        const bg = behind(clipped ? el.parentElement : el);
        const ratio = Math.min(
          ...fgs.map((fg) => {
            const text = over({ ...fg, a: fg.a * alpha }, bg);
            const [L1, L2] = [lum(text), lum(bg)].sort((a, b) => b - a);
            return (L1 + 0.05) / (L2 + 0.05);
          }),
        );
        const size = Number.parseFloat(cs.fontSize);
        const bold = Number(cs.fontWeight) >= 700;
        const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
        if (ratio < need)
          out.push({
            ratio: Math.round(ratio * 100) / 100,
            need,
            text: el.textContent.trim().slice(0, 50),
            cls: (el.className?.baseVal ?? el.className ?? "")
              .toString()
              .slice(0, 40),
            color: clipped ? "gradient" : cs.color,
          });
      }
    return out;
  }, scope);

const fails = [];
await page.goto(`${WEB}/profile`);
await page.waitForTimeout(5000);
for (const h of ["THE WEIRD STUFF", "SHAPE HIM"])
  await page
    .locator("button.vxu-fold", { hasText: h })
    .evaluate((b) => b.click())
    .catch(() => {});
await page.waitForTimeout(1500);
fails.push(
  ...(await audit(".vxrk, .vxu, .vxd")).map((f) => ({
    where: "profile",
    ...f,
  })),
);
for (const tab of ["the dossier", "letters", "the shelf", "the ghosts"]) {
  await page
    .locator(".vxd-tabs button", { hasText: tab })
    .evaluate((b) => b.click())
    .catch(() => {});
  await page.waitForTimeout(1200);
  fails.push(
    ...(await audit(".vxd")).map((f) => ({ where: `drawer/${tab}`, ...f })),
  );
}
await page.goto(`${WEB}/dashboard`);
await page.waitForTimeout(6000);
fails.push(
  ...(await audit(".vxa-bubble")).map((f) => ({ where: "bubble", ...f })),
);
await page.keyboard.press("v");
await page.waitForTimeout(2500);
fails.push(...(await audit(".vxm")).map((f) => ({ where: "machine", ...f })));
await page.keyboard.press("Escape");
await page.evaluate(() =>
  window.dispatchEvent(new CustomEvent("vortex:case", { detail: {} })),
);
await page.waitForTimeout(2000);
fails.push(
  ...(await audit("[class*='vxi-case'], .vxi")).map((f) => ({
    where: "case",
    ...f,
  })),
);
await browser.close();

const seen = new Set();
const unique = fails.filter((f) => {
  const k = `${f.cls}|${f.color}|${f.where.split("/")[0]}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});
for (const f of unique)
  console.log(
    `✕ ${f.ratio}:1 (needs ${f.need}) ${f.where} .${f.cls} "${f.text}" ${f.color}`,
  );
console.log(
  unique.length ? `${unique.length} contrast problems` : "contrast AA ✓",
);
if (unique.length) process.exit(1);
