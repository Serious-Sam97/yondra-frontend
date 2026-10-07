// Vortex remembers. Small local habits (when you usually show up, which column
// you drop cards into most, which overdue card you keep scrolling past without
// opening) — kept on this device only, never sent anywhere — so weeks later he
// can bring them up. Creepy on purpose; harmless by construction.

const KEY = "yd:vortex.memory";
const DAY = 86_400_000;

interface Memory {
  since: number; // first visit he remembers
  hours: number[]; // 24 buckets of visits by local hour
  columns: Record<string, number>; // column name → drops
  seenLate: Record<string, { key: string; n: number }>; // card id → times seen late
  opened: Record<string, true>; // card ids the user opened
  lastRecall: number;
}

function load(): Memory {
  const empty: Memory = {
    since: Date.now(),
    hours: Array(24).fill(0),
    columns: {},
    seenLate: {},
    opened: {},
    lastRecall: 0,
  };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return raw && Array.isArray(raw.hours) ? { ...empty, ...raw } : empty;
  } catch {
    return empty;
  }
}
function save(m: Memory) {
  try {
    // keep it small: only the 40 most-seen late cards
    const late = Object.entries(m.seenLate)
      .sort((a, b) => b[1].n - a[1].n)
      .slice(0, 40);
    m.seenLate = Object.fromEntries(late);
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    // storage blocked: he forgets, which is almost worse
  }
}

export function rememberVisit(): void {
  const m = load();
  m.hours[new Date().getHours()]++;
  save(m);
}
export function rememberColumn(name: string): void {
  if (!name) return;
  const m = load();
  m.columns[name] = (m.columns[name] ?? 0) + 1;
  save(m);
}
export function rememberSeenLate(id: string, key: string): void {
  const m = load();
  const cur = m.seenLate[id];
  m.seenLate[id] = { key, n: (cur?.n ?? 0) + 1 };
  save(m);
}
export function rememberOpened(id: string): void {
  const m = load();
  m.opened[id] = true;
  save(m);
}

/**
 * A recollection worth saying out loud, or null. Only once he has known you for
 * a week, and at most every three days.
 */
export function recall(): string | null {
  const m = load();
  const now = Date.now();
  if (now - m.since < 7 * DAY || now - m.lastRecall < 3 * DAY) return null;
  const options: string[] = [];

  const visits = m.hours.reduce((a, b) => a + b, 0);
  if (visits >= 10) {
    const h = m.hours.indexOf(Math.max(...m.hours));
    options.push(
      `you always show up around ${String(h).padStart(2, "0")}:00. I wait for you.`,
    );
  }
  const fav = Object.entries(m.columns).sort((a, b) => b[1] - a[1])[0];
  if (fav && fav[1] >= 8)
    options.push(
      `you've dropped ${fav[1]} cards into "${fav[0]}". it doesn't love you back.`,
    );
  const avoided = Object.entries(m.seenLate)
    .filter(([id, v]) => v.n >= 6 && !m.opened[id])
    .sort((a, b) => b[1].n - a[1].n)[0];
  if (avoided)
    options.push(
      `you still haven't opened ${avoided[1].key}. you've walked past it ${avoided[1].n} times. it noticed.`,
    );

  if (options.length === 0) return null;
  m.lastRecall = now;
  save(m);
  return options[Math.floor(Math.random() * options.length)];
}
