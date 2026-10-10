import { expect, test } from "@playwright/test";

// T-10 · the client's brain, unit-tested in Node: the Director (who decides
// what he does next), the soul store's dark-stage cap, local telemetry and
// the lazy-module helper. Browser globals are stubbed per test; time is fake.

type Store = Record<string, string>;
function stubBrowser() {
  const store: Store = {};
  const g = globalThis as unknown as Record<string, unknown>;
  g.localStorage = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = String(v);
    },
    removeItem: (k: string) => {
      delete store[k];
    },
  };
  g.document = {
    hidden: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  g.addEventListener ??= () => {};
  g.removeEventListener ??= () => {};
  g.window = g;
  return store;
}

/** a fake clock + captured intervals, so the Director can be ticked by hand */
function fakeTime() {
  let now = Date.parse("2026-10-09T10:00:00Z");
  const realNow = Date.now;
  const realSetInterval = globalThis.setInterval;
  const ticks: (() => void)[] = [];
  Date.now = () => now;
  (globalThis as unknown as { setInterval: unknown }).setInterval = (
    fn: () => void,
  ) => {
    ticks.push(fn);
    return ticks.length as unknown as ReturnType<typeof setInterval>;
  };
  return {
    advance(ms: number) {
      now += ms;
      for (const t of ticks) t();
    },
    restore() {
      Date.now = realNow;
      globalThis.setInterval = realSetInterval;
    },
  };
}

function actor(over: Partial<Record<string, unknown>> = {}) {
  const queued: string[] = [];
  const a = {
    isBusy: () => false,
    idleFor: () => 60_000,
    enqueue: (kind: string, _c: number, act: () => unknown) => {
      queued.push(kind);
      void act();
    },
    soul: () => ({ needs: { boredom: 40 }, traits: [] }),
    ...over,
  };
  return { a, queued };
}

test.describe.configure({ mode: "serial" });

test("the Director waits its gap, then picks by weight and remembers why", async () => {
  stubBrowser();
  const clock = fakeTime();
  try {
    const { startDirector, directorWhy } = await import(
      "../src/vortex/core/director"
    );
    const runs: string[] = [];
    const { a, queued } = actor();
    const stop = startDirector(a as never, [
      {
        id: "never",
        cooldown: 0,
        weight: () => 0,
        run: async () => void runs.push("never"),
      },
      {
        id: "always",
        cooldown: 0,
        weight: () => 5,
        run: async () => void runs.push("always"),
      },
    ]);
    clock.advance(5_000); // inside the first 70 s gap: nothing
    expect(queued).toEqual([]);
    clock.advance(70_000);
    expect(queued).toEqual(["impulse:always"]);
    expect(runs).toEqual(["always"]);
    const last = directorWhy().at(-1);
    expect(last?.verdict).toContain('chose "always"');
    expect(last?.options).toEqual([["always", 5]]);
    stop();
  } finally {
    clock.restore();
  }
});

test("the Director gives you room: busy or hidden means no impulse", async () => {
  stubBrowser();
  const clock = fakeTime();
  try {
    const { startDirector } = await import("../src/vortex/core/director");
    let busy = true;
    const { a, queued } = actor({ isBusy: () => busy });
    startDirector(a as never, [
      { id: "x", cooldown: 0, weight: () => 1, run: async () => {} },
    ]);
    clock.advance(200_000);
    expect(queued).toEqual([]);
    busy = false;
    (
      globalThis as unknown as { document: { hidden: boolean } }
    ).document.hidden = true;
    clock.advance(200_000);
    expect(queued).toEqual([]);
    (
      globalThis as unknown as { document: { hidden: boolean } }
    ).document.hidden = false;
    clock.advance(5_000);
    expect(queued).toEqual(["impulse:x"]);
  } finally {
    clock.restore();
  }
});

test("an impulse's cooldown holds, and debug can still fire it by id", async () => {
  stubBrowser();
  const clock = fakeTime();
  try {
    const { startDirector, runImpulse, impulseIds } = await import(
      "../src/vortex/core/director"
    );
    const runs: string[] = [];
    const { a, queued } = actor();
    startDirector(a as never, [
      {
        id: "slow",
        cooldown: 10 * 60_000,
        weight: () => 1,
        run: async () => void runs.push("slow"),
      },
    ]);
    clock.advance(75_000);
    clock.advance(200_000); // well past the gap, still inside the 10 min cooldown
    expect(queued.filter((q) => q === "impulse:slow")).toHaveLength(1);
    expect(impulseIds()).toContain("slow");
    expect(runImpulse("slow")).toBe(true);
    expect(runImpulse("nope")).toBe(false);
    expect(runs).toHaveLength(2);
  } finally {
    clock.restore();
  }
});

test("the DARK unit caps the stage he may show, everywhere the soul is read", async () => {
  const store = stubBrowser();
  const { setSoulForDev, getSoul, setDarkCap } = await import(
    "../src/vortex/core/soul"
  );
  const soul = {
    stage: 4,
    corruption: 80,
    needs: {},
    traits: [],
    scars: [],
  } as never;
  setSoulForDev(soul);
  expect(getSoul()?.stage).toBe(4);
  setDarkCap(2);
  expect(store["yd:vortex.darkcap"]).toBe("2");
  expect(getSoul()?.stage).toBe(2);
  expect(getSoul()?.corruption).toBe(54);
  setDarkCap(5);
  expect(getSoul()?.stage).toBe(4);
  expect(getSoul()?.corruption).toBe(80);
});

test("telemetry counts locally, caps each counter and keeps a week", async () => {
  const store = stubBrowser();
  const { tally, localTally } = await import("../src/vortex/core/telemetry");
  for (let i = 0; i < 600; i++) tally("bubble:line", "shown");
  tally("bubble:line", "fast");
  tally("BAD NAME!", "shown"); // ignored
  const today = new Date().toISOString().slice(0, 10);
  expect(localTally()[today]["bubble:line"]).toEqual({ shown: 500, fast: 1 });
  expect(Object.keys(localTally()[today])).toEqual(["bubble:line"]);
  const old: Record<string, unknown> = {};
  for (let d = 1; d <= 10; d++)
    old[`2026-09-${String(d).padStart(2, "0")}`] = { x: { shown: 1 } };
  store["yd:vortex.tally"] = JSON.stringify({
    ...old,
    ...JSON.parse(store["yd:vortex.tally"]),
  });
  tally("bubble:line", "clicked");
  expect(Object.keys(localTally())).toHaveLength(7);
});

test("later(): a cleanup called before the module arrives cancels the start", async () => {
  const { later, startLater } = await import("../src/vortex/core/later");
  let release: (m: { start: () => () => void }) => void = () => {};
  const started: string[] = [];
  const lz = later(
    () =>
      new Promise<{ start: () => () => void }>((ok) => {
        release = ok;
      }),
  );
  const stopEarly = startLater(lz, (m) => m.start());
  stopEarly();
  const stopLate = startLater(lz, (m) => m.start());
  release({
    start: () => {
      started.push("on");
      return () => started.push("off");
    },
  });
  await lz.get();
  await new Promise((r) => setTimeout(r, 0));
  expect(started).toEqual(["on"]); // only the second start ran
  stopLate();
  expect(started).toEqual(["on", "off"]);
  expect(lz.now()).not.toBeNull();
});

test("T-15 · ambient lines share a budget; the radio ducks his sounds", async () => {
  const { speechAllowed, duck, setRadioOn } = await import(
    "../src/vortex/core/mix"
  );
  const t0 = 1_000_000;
  expect(speechAllowed(false, t0)).toBe(true);
  expect(speechAllowed(false, t0 + 2000)).toBe(false); // < 6 s apart
  expect(speechAllowed(true, t0 + 2500)).toBe(true); // forced lines always pass
  expect(speechAllowed(false, t0 + 9000)).toBe(true);
  expect(speechAllowed(false, t0 + 16_000)).toBe(true); // 4th in the minute
  expect(speechAllowed(false, t0 + 23_000)).toBe(false); // budget spent
  expect(speechAllowed(false, t0 + 61_000)).toBe(true); // a minute later, room again
  expect(duck()).toBe(1);
  setRadioOn(true);
  expect(duck()).toBeLessThan(0.5);
  setRadioOn(false);
  expect(duck()).toBe(1);
});
