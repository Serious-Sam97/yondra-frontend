import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

// T-02 · no Vortex animation may flash more than 3 times per second (WCAG
// 2.3.1). Any keyframes that change brightness/opacity/visibility in a way
// that reads as a flash must not loop faster than 333 ms per cycle; a
// one-shot flash may be fast but must stop (finite iterations, ≤ 3).

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith(".css") ? [p] : [];
  });
}

const CSS = [
  ...files("src/vortex"),
  ...files("src/components/vortex").filter((f) => f.endsWith(".css")),
];
const FLASHY =
  /(opacity|brightness|filter|visibility|background(-color)?\s*:\s*#?(f{3,6}|white|#e[a-f0-9]{5}))/i;
const seconds = (v: string) =>
  v.endsWith("ms") ? Number.parseFloat(v) / 1000 : Number.parseFloat(v);

function scan(css: string, file: string, problems: string[]): number {
  let checked = 0;
  const keyframes = new Map<string, string>();
  for (const m of css.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?)\n\}/g))
    keyframes.set(m[1], m[2]);
  for (const m of css.matchAll(/animation\s*:\s*([^;]+);/g)) {
    for (const part of m[1].split(",")) {
      const tokens = part.trim().split(/\s+/);
      const name = tokens.find((t) => keyframes.has(t));
      const dur = tokens.find((t) => /^[\d.]+m?s$/.test(t));
      if (!name || !dur) continue;
      checked++;
      const body = keyframes.get(name) ?? "";
      const stops = (body.match(/\d+%|from|to/g) ?? []).length;
      if (!FLASHY.test(body) || stops < 3) continue;
      const infinite = tokens.includes("infinite");
      const count = Number(
        tokens.find((t) => /^\d+$/.test(t)) ??
          (infinite ? Number.POSITIVE_INFINITY : 1),
      );
      const perCycle = Math.max(1, Math.floor((stops - 1) / 2));
      const rate = perCycle / seconds(dur);
      if (rate > 3 && (infinite || count * perCycle > 3))
        problems.push(`${file}: ${name} ${dur} (${rate.toFixed(1)} flashes/s)`);
    }
  }
  return checked;
}

test("the flash checker catches a strobe (self-test)", () => {
  const bad =
    "@keyframes strobe {\n  0% { opacity: 1; }\n  50% { opacity: 0; }\n  100% { opacity: 1; }\n}\n.x { animation: strobe 0.1s infinite; }";
  const p: string[] = [];
  scan(bad, "synthetic.css", p);
  expect(p).toHaveLength(1);
});

test("no Vortex animation flashes more than 3 times a second", () => {
  const problems: string[] = [];
  let checked = 0;
  for (const f of CSS) checked += scan(readFileSync(f, "utf8"), f, problems);
  expect(checked).toBeGreaterThan(40);
  expect(problems).toEqual([]);
});
