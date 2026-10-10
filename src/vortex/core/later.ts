// T-03 · "later": a module of his that isn't needed to draw him on screen is
// fetched after he's up (or on first use), never in the core chunk.
//   const pranks = later(() => import("…/vortexPranks"));
//   pranks.now()?.gravityTilt() ?? false   — synchronous use, if already loaded
//   startLater(pranks, (m) => m.listenWords(…))  — an effect with a cleanup

export interface Later<T> {
  get(): Promise<T>;
  now(): T | null;
}

export function later<T>(load: () => Promise<T>): Later<T> {
  let mod: T | null = null;
  let p: Promise<T> | null = null;
  return {
    get: () => {
      p ??= load().then((m) => {
        mod = m;
        return m;
      });
      return p;
    },
    now: () => mod,
  };
}

/** start something from a lazy module; the returned cleanup works before or after it loads */
export function startLater<T>(
  lz: Later<T>,
  start: (m: T) => (() => void) | undefined,
): () => void {
  let dead = false;
  let stop: (() => void) | undefined;
  void lz
    .get()
    .then((m) => {
      if (!dead) stop = start(m) || undefined;
    })
    .catch(() => {});
  return () => {
    dead = true;
    stop?.();
  };
}

/** warm a set of lazy modules once the browser is idle */
export function warm(...lz: Later<unknown>[]) {
  const go = () => {
    for (const l of lz) void l.get().catch(() => {});
  };
  if (typeof window === "undefined") return;
  const ric = (
    window as unknown as {
      requestIdleCallback?: (f: () => void, o?: { timeout: number }) => void;
    }
  ).requestIdleCallback;
  if (ric) ric(go, { timeout: 6000 });
  else setTimeout(go, 3000);
}
