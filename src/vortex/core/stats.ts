// F-04 / F-11 / F-23 · what he notices about you, kept on this device only:
// when you work (hour histogram), cards you avoid (opened again and again,
// never edited), phrases you repeat in his chat, cards finished per week (your
// hall of fame). Small, bounded, never sent anywhere.

const KEY = "yd:vortex.stats";

interface Stats {
  hours: number[]; // 24 buckets of activity minutes
  opened: Record<
    string,
    { n: number; edited: boolean; key?: string; title?: string }
  >;
  phrases: Record<string, number>;
  weeks: Record<string, number>; // ISO week → cards done
  days: Record<string, number>; // yyyy-mm-dd → cards done
  lastReport?: string;
}

const empty = (): Stats => ({
  hours: Array(24).fill(0),
  opened: {},
  phrases: {},
  weeks: {},
  days: {},
});

function load(): Stats {
  try {
    return {
      ...empty(),
      ...(JSON.parse(localStorage.getItem(KEY) ?? "null") ?? {}),
    };
  } catch {
    return empty();
  }
}
function save(s: Stats) {
  try {
    // keep it small: last 40 cards, 60 phrases, 26 weeks, 60 days
    const trim = <T>(o: Record<string, T>, n: number) =>
      Object.fromEntries(Object.entries(o).slice(-n));
    localStorage.setItem(
      KEY,
      JSON.stringify({
        ...s,
        opened: trim(s.opened, 40),
        phrases: trim(s.phrases, 60),
        weeks: trim(s.weeks, 26),
        days: trim(s.days, 60),
      }),
    );
  } catch {}
}

export function isoWeek(d = new Date()): string {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${Math.ceil(((+t - +y) / 86_400_000 + 1) / 7)}`;
}
const today = () => new Date().toISOString().slice(0, 10);

export const stats = {
  /** one minute of activity in the current hour */
  tick() {
    const s = load();
    s.hours[new Date().getHours()] += 1;
    save(s);
  },
  opened(cardId: string, key?: string, title?: string) {
    const s = load();
    const o = s.opened[cardId] ?? { n: 0, edited: false };
    s.opened[cardId] = {
      ...o,
      n: o.n + 1,
      key: key ?? o.key,
      title: title ?? o.title,
    };
    save(s);
  },
  edited(cardId: string) {
    const s = load();
    if (s.opened[cardId]) s.opened[cardId].edited = true;
    save(s);
  },
  done() {
    const s = load();
    const w = isoWeek();
    s.weeks[w] = (s.weeks[w] ?? 0) + 1;
    s.days[today()] = (s.days[today()] ?? 0) + 1;
    save(s);
  },
  said(text: string) {
    const t = text.trim().toLowerCase().replace(/\s+/g, " ");
    if (t.length < 4 || t.length > 60 || t.startsWith("/")) return;
    const s = load();
    s.phrases[t] = (s.phrases[t] ?? 0) + 1;
    save(s);
  },
  /** the hour you work most */
  peakHour(): number | null {
    const h = load().hours;
    const max = Math.max(...h);
    return max < 30 ? null : h.indexOf(max);
  },
  /** a card you keep opening and never touch */
  avoided(): { key?: string; title?: string; n: number } | null {
    const list = Object.values(load().opened).filter(
      (o) => !o.edited && o.n >= 3,
    );
    return list.sort((a, b) => b.n - a.n)[0] ?? null;
  },
  /** the phrase you repeat most (≥3 times) */
  catchphrase(): { text: string; n: number } | null {
    const [text, n] =
      Object.entries(load().phrases).sort((a, b) => b[1] - a[1])[0] ?? [];
    return text && (n as number) >= 3 ? { text, n: n as number } : null;
  },
  thisWeek(): number {
    return load().weeks[isoWeek()] ?? 0;
  },
  bestWeek(): { week: string; n: number } | null {
    const [week, n] =
      Object.entries(load().weeks).sort((a, b) => b[1] - a[1])[0] ?? [];
    return week ? { week, n: n as number } : null;
  },
  /** the weekly report is due on mondays, once */
  reportDue(): boolean {
    const s = load();
    const w = isoWeek();
    if (new Date().getDay() !== 1 || s.lastReport === w) return false;
    s.lastReport = w;
    save(s);
    return true;
  },
  lastWeekDone(): number {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return load().weeks[isoWeek(d)] ?? 0;
  },
};
