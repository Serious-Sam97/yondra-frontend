import { expect, test } from "@playwright/test";
import { parseSlash } from "../src/components/vortex/mk4/chat";
import { SCENE_PALETTES, SCENE_ROOMS, sceneArt } from "../src/lib/sceneArt";
import {
  decodeGenome,
  encodeGenome,
  type Genome,
  visitorLines,
} from "../src/vortex/creator/genome";
import { customCostumeSvg } from "../src/vortex/econ/costumes";

// T-10 · logic that must hold no matter how the UI changes.

const g: Genome = {
  v: 1,
  mood: "smug",
  traits: ["feral", "nocturnal"],
  color: "teal",
  hated: "beige",
  word: "spoon",
  scars: 3,
  deaths: 2,
  age: 40,
  costume: { hat: "crown", acc: "monocle", c1: "#ff2e88", c2: "#ffd319" },
};

test("a genome round-trips through its code", () => {
  expect(decodeGenome(encodeGenome(g))).toEqual(g);
});

test("a hostile genome is defanged on import", () => {
  const evil = `VX1.${Buffer.from(
    JSON.stringify({
      mood: "<script>",
      traits: ["ok-trait", "<img onerror=x>", "a".repeat(80)],
      color: "red;background:url(x)",
      word: "spoon",
      deaths: 1e9,
      costume: { hat: "crown", acc: "none", c1: "red", c2: "#000000" },
    }),
  )
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")}`;
  const d = decodeGenome(evil);
  expect(d).not.toBeNull();
  expect(d?.mood).toBe("smug");
  expect(d?.traits).toEqual(["ok-trait"]);
  expect(d?.color).toBe("teal");
  expect(d?.deaths).toBe(999);
  expect(d?.costume).toBeNull();
  expect(decodeGenome("not a genome")).toBeNull();
  expect(visitorLines(g).join(" ")).not.toMatch(/[<>]/);
});

test("a designed costume never injects an unchecked colour", () => {
  expect(
    customCostumeSvg({
      hat: "crown",
      acc: "none",
      c1: '#fff" onload="x',
      c2: "#000000",
    }),
  ).toBe("");
  expect(
    customCostumeSvg({
      hat: "nope",
      acc: "nope",
      c1: "#ffffff",
      c2: "#000000",
    }),
  ).toMatch(/^<svg/);
  expect(
    customCostumeSvg({
      hat: "horns",
      acc: "mustache",
      c1: "#111111",
      c2: "#eeeeee",
    }),
  ).toContain("#111111");
});

test("slash commands: the weird modes route to the weird module, the rest don't", () => {
  for (const m of ["demolish", "popcorn", "speedrun", "tour", "fork", "studio"])
    expect(parseSlash(`/${m}`)).toEqual({ kind: "weird", mode: m });
  expect(parseSlash("/interrupt")?.kind).not.toBe("weird"); // rare events are never on demand
  expect(parseSlash("hello")).toBeNull();
});

test("scene art is deterministic per seed and made of numbers only", () => {
  for (const r of SCENE_ROOMS)
    for (const p of SCENE_PALETTES) {
      const a = sceneArt(r, p, 7);
      expect(a).toBe(sceneArt(r, p, 7));
      expect(a).not.toMatch(/NaN|undefined|<script/);
    }
  expect(sceneArt("porao", "below", 1)).not.toBe(sceneArt("porao", "below", 2));
});

test("T-13 · every tr() string in his interface has a PT-BR translation", async () => {
  const { readFileSync, readdirSync, statSync } = await import("node:fs");
  const { join } = await import("node:path");
  const { ptKeys } = await import("../src/vortex/core/i18n");
  const pt = new Map(ptKeys());
  const walk = (d: string): string[] =>
    readdirSync(d).flatMap((f) => {
      const p = join(d, f);
      return statSync(p).isDirectory()
        ? walk(p)
        : p.endsWith(".tsx")
          ? [p]
          : [];
    });
  const missing: string[] = [];
  let used = 0;
  for (const f of walk("src/vortex")) {
    for (const m of readFileSync(f, "utf8").matchAll(
      /\btr\(\s*"((?:[^"\\]|\\.)*)"/g,
    )) {
      used++;
      const k = JSON.parse(`"${m[1]}"`);
      if (!pt.get(k)) missing.push(`${f}: ${k}`);
    }
  }
  expect(used).toBeGreaterThan(100);
  expect(missing).toEqual([]);
  for (const [, v] of pt) expect(v.trim()).not.toBe("");
});

test("T-13 · achievement titles rebuild in PT for every server measure", async () => {
  const { readFileSync } = await import("node:fs");
  const { achTitle } = await import("../src/vortex/core/i18n");
  const php = readFileSync(
    "../yondra/app/Services/Vortex/AchievementService.php",
    "utf8",
  );
  const block = php.slice(
    php.indexOf("public const MEASURES"),
    php.indexOf("];", php.indexOf("public const MEASURES")),
  );
  const measures = [...block.matchAll(/'([a-z]+)' => \['[ABC]'/g)].map(
    (m) => m[1],
  );
  expect(measures.length).toBe(20);
  for (const k of measures) {
    const en = `x · ${k}`;
    expect(achTitle({ id: `${k}-25`, title: en }, "pt")).not.toBe(en);
  }
  expect(
    achTitle({ id: "done-25", title: "veteran · 25 cards finished" }, "pt"),
  ).toBe("veterana · 25 cards concluídos");
  expect(
    achTitle({ id: "done-1", title: "first · a card finished" }, "pt"),
  ).toBe("primeira · um card concluído");
  expect(achTitle({ id: "deaths-5", title: "? ? ?", secret: true }, "pt")).toBe(
    "? ? ?",
  );
  expect(
    achTitle({ id: "done-25", title: "veteran · 25 cards finished" }, "en"),
  ).toBe("veteran · 25 cards finished");
});
