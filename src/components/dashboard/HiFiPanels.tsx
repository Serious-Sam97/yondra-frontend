"use client";

// Panels of the "home hi-fi" dashboard (design/dashboard-suggestion.png): a
// dark glass receiver (greeting label, FM project band, VFD clock + vitals),
// then the cue sheet + recording log, box sets, spectrum and the CRM mixer.

import Link from "next/link";
import { useEffect, useState } from "react";
import OmniSearch from "@/components/dashboard/OmniSearch";
import { SvgArt } from "@/components/ui/SvgArt";
import type {
  DashActivity,
  DashCard,
  DashCrm,
  DashPr,
  DashProjectMeta,
  DashSprint,
  DashVitals,
} from "@/interfaces/DashboardInterface";
import type {
  ProjectBoard,
  ProjectInterface,
} from "@/interfaces/ProjectInterface";
import { type ArtKind, barcode, coverArt } from "@/lib/boardArt";

const DAY = 86_400_000;
const HEX = /^#[0-9a-f]{6}$/i;
// Channels whose name reads as active work show the "▶ Playing" chip (same
// rule as the board's J-cards).
export const IN_PROGRESS_RE =
  /(doing|progress|wip|active|building|develop|working|playing)/i;
const TICKET_RE = /([A-Z][A-Z0-9]*-\d+)/;

// Board accent names (boards.background) → warm print inks.
const TAPE_INK: Record<string, string> = {
  cyan: "#2ab7e0",
  amber: "#d9822b",
  red: "#b5533c",
  magenta: "#c0679a",
  phosphor: "#6f8a4a",
};

const safeHex = (c: string | null | undefined, fb = "#d9822b") =>
  c && HEX.test(c) ? c : fb;
// Pulls a project colour toward the rust of the warm palette.
const warm = (c: string) => `color-mix(in srgb, ${c} 60%, #b5533c)`;
const pad2 = (n: number) => String(n).padStart(2, "0");

export function money(n: number, currency?: string): string {
  if (!currency) return String(Math.round(n));
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

function pct(meta?: DashProjectMeta): number {
  return meta?.total ? Math.round((meta.done / meta.total) * 100) : 0;
}

function TrimStripes({ className }: { className: string }) {
  return (
    <span className={className} aria-hidden>
      <i style={{ background: "#d9822b" }} />
      <i style={{ background: "color-mix(in srgb,#d9822b 55%,#ff5a4d)" }} />
      <i style={{ background: "color-mix(in srgb,#d9822b 45%,#ffb000)" }} />
    </span>
  );
}

// A spoked tape reel: cream hub, three spokes, a brown pack of tape whose
// radius (0..1) shows how much is wound on.
function Reel({
  cx,
  cy,
  pack,
  spin = false,
  accent,
}: {
  cx: number;
  cy: number;
  pack: number;
  spin?: boolean;
  accent?: string;
}) {
  const r = 8 + 9 * Math.sqrt(Math.max(0, Math.min(1, pack)));
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <circle r={r} fill="#3a2416" />
      <circle
        r={r}
        fill="none"
        stroke={accent ?? "#5a3a22"}
        strokeOpacity=".6"
        strokeWidth=".8"
      />
      <circle r={r - 2.2} fill="none" stroke="#2a190e" strokeWidth=".6" />
      <g className={spin ? "hf-spin" : undefined}>
        <circle r="7" fill="#e9e2cc" />
        <circle r="7" fill="none" stroke="#b8a888" strokeWidth=".8" />
        {[0, 120, 240].map((a) => (
          <rect
            key={a}
            x="-1.3"
            y="-6.6"
            width="2.6"
            height="3.6"
            rx=".6"
            fill="#2b2219"
            transform={`rotate(${a})`}
          />
        ))}
        <circle r="2.4" fill="#120d09" />
      </g>
    </g>
  );
}

/** Cassette tape window: supply reel (left) shrinks as the take-up reel fills. */
export function TapeWindow({
  done,
  accent = "#d9822b",
  spin = false,
  className,
}: {
  done: number;
  accent?: string;
  spin?: boolean;
  className?: string;
}) {
  const f = Math.max(0, Math.min(1, done));
  const rl = 8 + 9 * Math.sqrt(1 - f);
  const rr = 8 + 9 * Math.sqrt(f);
  return (
    <svg
      className={className}
      viewBox="0 0 120 46"
      aria-hidden="true"
      focusable="false"
    >
      <rect x=".5" y=".5" width="119" height="45" rx="22.5" fill="#0c0906" />
      <rect
        x=".5"
        y=".5"
        width="119"
        height="45"
        rx="22.5"
        fill="none"
        stroke="rgba(255,220,170,.14)"
      />
      <path
        d={`M${30 - rl * 0.5} ${23 + rl * 0.87} L44 42 H76 L${90 + rr * 0.5} ${23 + rr * 0.87}`}
        fill="none"
        stroke="#3a2416"
        strokeWidth="1.6"
      />
      <Reel cx={30} cy={23} pack={1 - f} spin={spin} />
      <Reel cx={90} cy={23} pack={f} spin={spin} accent={accent} />
      <rect x="52" y="19" width="16" height="8" rx="1.5" fill="#1d140d" />
      <rect
        x="54"
        y="21.5"
        width="12"
        height="3"
        rx="1"
        fill={accent}
        opacity=".7"
      />
      <rect
        x="4"
        y="3"
        width="112"
        height="14"
        rx="7"
        fill="url(#hfGlare)"
        opacity=".5"
      />
      <defs>
        <linearGradient id="hfGlare" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".22" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── receiver ────────────────────────────────────────────────────────────────

// Owns its own tick so only the clock re-renders; HH:MM changes per minute.
function VfdClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const d = new Date();
      setNow(d);
      t = setTimeout(
        tick,
        60000 - (d.getSeconds() * 1000 + d.getMilliseconds()),
      );
    };
    tick();
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="hf-clock" aria-live="off">
      <b>{now ? now.toTimeString().slice(0, 5) : "--:--"}</b>
      <small>{now ? now.toDateString().slice(0, 10) : " "}</small>
    </div>
  );
}

const FREQS = [88, 92, 96, 100, 104, 108];
const MAX_STATIONS = 5;

function Tuner({
  projects,
  meta,
}: {
  projects: ProjectInterface[];
  meta: Map<number, DashProjectMeta>;
}) {
  const shown = projects.slice(0, MAX_STATIONS);
  const n = shown.length;
  const pos = (i: number) => (n === 1 ? 50 : 12 + i * (76 / (n - 1)));
  // The needle sits on the station with the freshest activity.
  let tuned = 0;
  shown.forEach((p, i) => {
    const a = meta.get(p.id)?.last_activity ?? "";
    const b = meta.get(shown[tuned].id)?.last_activity ?? "";
    if (a > b) tuned = i;
  });
  return (
    <div className="hf-tuner">
      <div className="in">
        <span className="lbl">FM · Project band</span>
        <span className="lbr">Stereo ●</span>
        <div className="band" aria-hidden>
          {FREQS.map((f) => (
            <span key={f}>{f}</span>
          ))}
        </div>
        <div className="ticks" aria-hidden />
        {shown.map((p, i) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="stn"
            style={{ left: `${pos(i)}%` }}
          >
            <i style={{ background: warm(safeHex(p.color)) }} />
            {p.name}
            <em>{pct(meta.get(p.id))}%</em>
          </Link>
        ))}
        {n > 0 && (
          <span
            className="needle"
            aria-hidden
            style={{ left: `calc(${pos(tuned)}% + 3px)` }}
          />
        )}
      </div>
    </div>
  );
}

export function Receiver({
  name,
  vitals,
  crm,
  projects,
  meta,
}: {
  name: string | null;
  vitals: DashVitals | undefined;
  crm: DashCrm | null | undefined;
  projects: ProjectInterface[];
  meta: Map<number, DashProjectMeta>;
}) {
  // Time-based copy is resolved after mount so SSR and client markup match.
  const [greeting, setGreeting] = useState("Hello");
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(
      h < 12
        ? "Good morning · side A"
        : h < 18
          ? "Good afternoon · side B"
          : "Good evening · side B",
    );
  }, []);
  const v = vitals;
  const delta = v ? v.done_7d - v.done_prev_7d : 0;
  const num = (x: number | undefined) => (x == null ? "--" : pad2(x));
  // Unlit "88" segments behind each VFD numeral, like a real display.
  const Vfd = ({ value, className }: { value: string; className?: string }) => (
    <b className={className} data-ghost={value.replace(/[0-9]/g, "8")}>
      {value}
    </b>
  );
  return (
    <section className="hf-glass" id="yd-top">
      <TrimStripes className="hf-trim" />
      <div className="hf-rx">
        <div className="hf-hello">
          <TrimStripes className="st" />
          <div>
            <small>{greeting}</small>
            <b>{name ?? "…"}</b>
            <div className="sub">
              {v
                ? `${v.in_progress} playing · ${v.done_7d} done this week`
                : "warming up…"}
            </div>
          </div>
        </div>
        <Tuner projects={projects} meta={meta} />
        <VfdClock />
      </div>
      <div className="hf-rxb">
        <div className="hf-vfd">
          <div>
            <span>Overdue</span>
            <Vfd className={v?.overdue ? "r" : "dim"} value={num(v?.overdue)} />{" "}
            <em>
              {v
                ? v.overdue > 0 && v.overdue_oldest_days != null
                  ? `oldest ${v.overdue_oldest_days}d`
                  : "all clear"
                : ""}
            </em>
          </div>
          <div>
            <span>Due today</span>
            <Vfd
              className={v?.due_today ? "" : "dim"}
              value={num(v?.due_today)}
            />
          </div>
          <div>
            <span>This week</span>
            <Vfd
              className={v?.due_week ? "" : "dim"}
              value={num(v?.due_week)}
            />{" "}
            {v?.next_due && (
              <em>
                next{" "}
                {new Date(`${v.next_due}T00:00:00`).toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric" },
                )}
              </em>
            )}
          </div>
          <div>
            <span>Playing</span>
            <Vfd
              className={v?.in_progress ? "" : "dim"}
              value={num(v?.in_progress)}
            />{" "}
            {v && v.in_progress > 0 && (
              <em>
                {v.in_progress_boards} board
                {v.in_progress_boards === 1 ? "" : "s"}
              </em>
            )}
          </div>
          <div>
            <span>Done · 7d</span>
            <Vfd className="g" value={num(v?.done_7d)} />{" "}
            {v && (
              <em className={delta > 0 ? "up" : delta < 0 ? "dn" : ""}>
                {delta > 0
                  ? `▲ ${delta} vs prior`
                  : delta < 0
                    ? `▼ ${-delta} vs prior`
                    : "= prior"}
              </em>
            )}
          </div>
          {crm && (
            <div>
              <span>Pipeline</span>
              <Vfd value={money(crm.open_total, crm.currency)} />
            </div>
          )}
        </div>
        <div className="hf-search">
          <OmniSearch placeholder="⌕  Find a card, tape or deal…" />
        </div>
      </div>
    </section>
  );
}

// ── cue sheet + recording log ───────────────────────────────────────────────

function cueChip(c: DashCard, today: string) {
  if (c.blocked_reason?.trim())
    return (
      <span className="chip jam" title={c.blocked_reason}>
        <span>JAM</span>
      </span>
    );
  if (c.due_date && c.due_date < today) {
    const late = Math.round(
      (new Date(`${today}T00:00:00`).getTime() -
        new Date(`${c.due_date}T00:00:00`).getTime()) /
        DAY,
    );
    return <span className="chip late">{late}d late</span>;
  }
  if (c.due_date === today) return <span className="chip soon">Due today</span>;
  if (c.section && IN_PROGRESS_RE.test(c.section))
    return <span className="chip soon">▶ Playing</span>;
  return null;
}

function localDay(d = new Date()): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function CueSheet({
  deck,
  overdue,
  loaded,
  onOpen,
}: {
  deck: DashCard[];
  overdue: number;
  loaded: boolean;
  onOpen: (c: DashCard) => void;
}) {
  const [today, setToday] = useState("");
  useEffect(() => setToday(localDay()), []);
  return (
    <div className="hf-cue">
      <h4>
        <span>On your deck</span>
        <span>
          {today
            ? new Date(`${today}T00:00:00`).toDateString().slice(4, 10)
            : ""}
        </span>
      </h4>
      <div className="rows">
        {deck.map((c, i) => (
          <button
            key={c.id}
            type="button"
            className="row"
            onClick={() => onOpen(c)}
          >
            <span className="n">{pad2(i + 1)}</span>
            <span className="t">
              <span className="nm">{c.name}</span>
              <span className="k">
                {[c.ticket_key, c.board_name, c.section]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            {today && cueChip(c, today)}
          </button>
        ))}
        {loaded && deck.length === 0 && (
          <div className="empty">Nothing on your deck. Side A is clear.</div>
        )}
      </div>
      {loaded && (
        <div className={`stamp${overdue ? " bad" : ""}`}>
          {overdue ? `${overdue} overdue` : "Nothing overdue"}
        </div>
      )}
    </div>
  );
}

function dotFor(type: string | null): string {
  const t = type ?? "";
  if (/block|jam/.test(t)) return "#b5533c";
  if (/comment/.test(t)) return "#c9a46a";
  if (/move|done|complete/.test(t)) return "#6f8a4a";
  return "#d9822b";
}

function stampTime(iso: string): string {
  const d = new Date(iso);
  return localDay(d) === localDay()
    ? d.toTimeString().slice(0, 5)
    : d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

// Ticket keys inside an activity line print bold, like the mock's log.
function withKeys(text: string) {
  return text
    .split(TICKET_RE)
    .map((part, i) =>
      i % 2 ? <b key={`${i}${part}`}>{part}</b> : part || null,
    );
}

export function RecordingLog({
  activity,
  prs,
  loaded,
}: {
  activity: DashActivity[];
  prs: DashPr[];
  loaded: boolean;
}) {
  // Absolute times depend on the viewer's clock — render them after mount.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return (
    <>
      <div className="hf-logh" id="yd-activity">
        <span>Recording log</span>
        <span>live ●</span>
      </div>
      <div className="hf-log">
        <div className="ents">
          {prs.map((pr, i) => (
            <a
              className="e"
              key={`pr${pr.number ?? i}`}
              href={pr.url ?? undefined}
              target="_blank"
              rel="noreferrer"
            >
              <span className="t">PR</span>
              <span
                className="d"
                style={{
                  background:
                    pr.checks_state === "failure"
                      ? "#b5533c"
                      : pr.checks_state === "success"
                        ? "#6f8a4a"
                        : "#c9a46a",
                }}
              />
              <span>
                <b>#{pr.number}</b> {pr.title ?? "Pull request"}
              </span>
            </a>
          ))}
          {activity.slice(0, 12).map((a) => (
            <div className="e" key={a.id}>
              <span
                className="t"
                title={new Date(a.created_at).toLocaleString()}
              >
                {ready ? stampTime(a.created_at) : ""}
              </span>
              <span className="d" style={{ background: dotFor(a.type) }} />
              <span>
                {a.actor ? `${a.actor} ` : ""}
                {withKeys(a.description)}
              </span>
            </div>
          ))}
          {loaded && activity.length === 0 && prs.length === 0 && (
            <div className="e idle">Tape rolling · nothing recorded yet</div>
          )}
        </div>
        <div className="hf-transport" aria-hidden>
          <TapeWindow done={0.35} spin className="win" />
          <div className="ctr">
            <span>Tape counter</span>
            <b data-ghost="8888">
              {String(activity.length + prs.length).padStart(4, "0")}
            </b>
          </div>
          <div className="rec">
            <i />
            REC
            <small>{activity.length ? "rolling" : "standby"}</small>
          </div>
        </div>
      </div>
    </>
  );
}

// ── box sets ────────────────────────────────────────────────────────────────

const BOX_ART: [ArtKind, string][] = [
  ["sunset", "#ffa400"],
  ["memphis", "#2ab7e0"],
  ["rings", "#7a5cff"],
];
const MAX_TRACKS = 4;

function BoxSet({
  project,
  meta,
  index,
  onOpen,
  onBoard,
}: {
  project: ProjectInterface;
  meta?: DashProjectMeta;
  index: number;
  onOpen: () => void;
  onBoard: (b: ProjectBoard) => void;
}) {
  const color = safeHex(project.color);
  const [kind, inkB] = BOX_ART[index % BOX_ART.length];
  const boards = [...(project.boards ?? [])].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  );
  const tapes = project.boards_count ?? boards.length;
  const p = pct(meta);
  return (
    // biome-ignore lint/a11y/useSemanticElements: contains nested track buttons
    <div
      className="hf-box"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen();
      }}
    >
      <SvgArt
        as="div"
        className="art"
        aria-hidden
        svg={coverArt(kind, color, inkB, index + 1, `bx${project.id}`)}
      />
      <div className="bd">
        <div className="hd">
          <div className="tt">
            <div className="nm">{project.name}</div>
            <div className="mt">
              {tapes} tape{tapes === 1 ? "" : "s"} · {meta?.total ?? 0} cards
            </div>
          </div>
          <TapeWindow done={p / 100} accent={warm(color)} className="win" />
        </div>
        <div className="reel">
          <span className="w">
            <i style={{ width: `${p}%` }} />
          </span>
          <b>{p}%</b>
        </div>
        <div className="trks">
          {boards.slice(0, MAX_TRACKS).map((b, j) => (
            <button
              key={b.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onBoard(b);
              }}
            >
              <span>A{j + 1}</span>
              <i
                style={{
                  background: TAPE_INK[b.background ?? ""] ?? "#8a7356",
                }}
              />
              {b.name}
            </button>
          ))}
          {Array.from(
            { length: Math.max(0, MAX_TRACKS - boards.length) },
            (_, j) => (
              <div className="blank" key={`blank${boards.length + j}`}>
                <span>A{boards.length + j + 1}</span>
                <i />
              </div>
            ),
          )}
        </div>
      </div>
      <div
        className="ft"
        style={{
          background: `color-mix(in srgb, ${warm(color)} 85%, #2b2219)`,
        }}
      >
        BOX SET {pad2(index + 1)}
        {boards.length > MAX_TRACKS && (
          <span className="more">+{boards.length - MAX_TRACKS} more tapes</span>
        )}
        <span className="bc" aria-hidden>
          {barcode(project.id + index + 3, 16).map((w, j) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static decoration
            <i key={j} style={{ width: w }} />
          ))}
        </span>
      </div>
    </div>
  );
}

export function BoxSets({
  projects,
  meta,
  loaded,
  onOpen,
  onBoard,
}: {
  projects: ProjectInterface[];
  meta: Map<number, DashProjectMeta>;
  loaded: boolean;
  onOpen: (p: ProjectInterface) => void;
  onBoard: (b: ProjectBoard) => void;
}) {
  return (
    <div className="hf-shelf">
      {projects.map((p, i) => (
        <BoxSet
          key={p.id}
          project={p}
          meta={meta.get(p.id)}
          index={i}
          onOpen={() => onOpen(p)}
          onBoard={onBoard}
        />
      ))}
      {loaded && projects.length === 0 && (
        <div className="hf-empty">No box sets yet — press + New project.</div>
      )}
    </div>
  );
}

// ── spectrum ────────────────────────────────────────────────────────────────

const SEG = 16;

// Classic LED ladder: green floor, amber mids, rust hot zone on top.
function segTone(k: number): "g" | "a" | "r" {
  return k >= SEG - 3 ? "r" : k >= SEG - 7 ? "a" : "g";
}

export function Spectrum({
  data,
  sprint,
}: {
  data: number[];
  sprint: DashSprint | null | undefined;
}) {
  const [dow, setDow] = useState<number | null>(null);
  useEffect(() => setDow(new Date().getDay()), []);
  const max = Math.max(...data, 1);
  const thisWk = data.slice(-7).reduce((a, b) => a + b, 0);
  const lastWk = data.slice(-14, -7).reduce((a, b) => a + b, 0);
  const peak = data.length ? Math.max(...data) : 0;
  const avg = data.length ? thisWk / Math.min(7, data.length) : 0;
  const trend = thisWk - lastWk;
  return (
    <div className="hf-spec">
      <div className="read">
        <span>
          this week <b>{thisWk}</b>
          {trend !== 0 && (
            <em className={trend > 0 ? "up" : "dn"}>
              {trend > 0 ? "▲" : "▼"} {Math.abs(trend)}
            </em>
          )}
        </span>
        <span>
          last <b>{lastWk}</b>
        </span>
        <span>
          avg <b>{avg.toFixed(1)}</b>
        </span>
        <span>
          peak <b>{peak}</b>
        </span>
      </div>
      <div className="meter">
        <div className="scale" aria-hidden>
          <span>{max}</span>
          <span>{Math.round(max / 2)}</span>
          <span>0</span>
        </div>
        <div
          className="bars"
          role="img"
          aria-label={`Cards done per day, last ${data.length} days: ${data.join(", ")}`}
        >
          {data.map((v, i) => {
            const lit = v > 0 ? Math.max(1, Math.round((v / max) * SEG)) : 0;
            const today = i === data.length - 1;
            return (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed 14-day buckets
                key={i}
                className={`col${today ? " now" : ""}`}
                title={`${v} done`}
              >
                {Array.from({ length: SEG }, (_, k) => (
                  <i
                    // biome-ignore lint/suspicious/noArrayIndexKey: fixed segments
                    key={k}
                    className={`${segTone(k)}${k < lit ? " on" : ""}${k === lit - 1 ? " pk" : ""}`}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <div className="days" aria-hidden>
        <span className="sp" />
        {data.map((_, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed 14-day buckets
            key={i}
            className={i === data.length - 1 ? "now" : undefined}
          >
            {dow == null
              ? ""
              : "SMTWTFS"[(dow - (data.length - 1 - i) + 70) % 7]}
          </span>
        ))}
      </div>
      {sprint && (
        <div className="sprint">
          {sprint.board_name ? `${sprint.board_name} · ` : ""}
          {sprint.name} · {sprint.completed}/{sprint.committed} pts
          {sprint.days_left != null ? ` · ${sprint.days_left}d left` : ""}
        </div>
      )}
    </div>
  );
}

// ── mixer ───────────────────────────────────────────────────────────────────

function kilo(v: number): string {
  if (!v) return "0";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(Math.round(v));
}

// Analog VU for the master section: needle = share of this month's value that
// already closed (won MTD vs won + still open).
function VuMeter({ share }: { share: number }) {
  const a = -48 + 96 * Math.max(0, Math.min(1, share));
  const ticks = Array.from({ length: 11 }, (_, i) => -48 + i * 9.6);
  return (
    <svg
      className="vu"
      viewBox="0 0 120 64"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="120" height="64" rx="5" fill="#efe3c4" />
      <rect width="120" height="64" rx="5" fill="url(#hfVuGlow)" />
      <path
        d="M14 52 A54 54 0 0 1 106 52"
        fill="none"
        stroke="#2b2219"
        strokeWidth=".8"
      />
      <path
        d="M84.4 18.2 A54 54 0 0 1 106 52"
        fill="none"
        stroke="#b5533c"
        strokeWidth="3"
      />
      {ticks.map((t, i) => (
        <line
          key={t}
          x1="60"
          y1={i % 5 === 0 ? 8 : 11}
          x2="60"
          y2="15"
          stroke={i > 7 ? "#b5533c" : "#2b2219"}
          strokeWidth={i % 5 === 0 ? 1.2 : 0.7}
          transform={`rotate(${t} 60 60)`}
        />
      ))}
      <text
        x="60"
        y="38"
        textAnchor="middle"
        fontSize="7"
        fill="#6b5a44"
        letterSpacing="1.5"
      >
        VU
      </text>
      <g transform={`rotate(${a} 60 60)`}>
        <line
          x1="60"
          y1="60"
          x2="60"
          y2="9"
          stroke="#1a130d"
          strokeWidth="1.1"
        />
      </g>
      <circle cx="60" cy="60" r="6" fill="#2b2219" />
      <defs>
        <radialGradient id="hfVuGlow" cx=".5" cy="1" r=".9">
          <stop offset="0" stopColor="#ffb347" stopOpacity=".35" />
          <stop offset="1" stopColor="#ffb347" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export function Mixer({ crm }: { crm: DashCrm }) {
  const stages = crm.stages.slice(0, 5);
  const smax = Math.max(...stages.map((s) => s.value), 1);
  const cmax = Math.max(...stages.map((s) => s.count), 1);
  const total = crm.stages.reduce((s, x) => s + x.value, 0) || 1;
  const top = crm.stages.reduce<DashCrm["stages"][number] | null>(
    (a, b) => (!a || b.value > a.value ? b : a),
    null,
  );
  const dealShare = crm.top_deal ? crm.top_deal.value / total : 0;
  const stageShare = top ? top.value / total : 0;
  const warn =
    dealShare >= 0.7 && crm.top_deal
      ? `⚠ ${Math.round(dealShare * 100)}% rides on “${crm.top_deal.name}”`
      : stageShare >= 0.7 && top
        ? `⚠ ${Math.round(stageShare * 100)}% sits in ${top.name}`
        : null;
  const wonShare =
    crm.won_mtd + crm.open_total > 0
      ? crm.won_mtd / (crm.won_mtd + crm.open_total)
      : 0;
  return (
    <div
      className="hf-mix"
      style={{
        gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr)) minmax(0, 1.9fr)`,
      }}
    >
      {stages.map((s, i) => {
        const level = s.value / smax;
        // Channel LED ladder lights by deal count.
        const leds = Math.round((s.count / cmax) * 8);
        return (
          <div
            className={`ch${s.count ? " live" : ""}`}
            key={s.name}
            title={`${s.name}: ${money(s.value, crm.currency)} · ${s.count} deal${s.count === 1 ? "" : "s"}`}
          >
            <span className="no">CH{i + 1}</span>
            <span
              className="knob"
              style={
                {
                  "--k": `${-135 + 270 * (s.count / cmax)}deg`,
                } as React.CSSProperties
              }
            />
            <span className="lab">{s.name}</span>
            <span className="strip">
              <span className="ladder" aria-hidden>
                {Array.from({ length: 8 }, (_, k) => (
                  <i
                    // biome-ignore lint/suspicious/noArrayIndexKey: fixed LEDs
                    key={k}
                    className={k < leds ? (k > 5 ? "on r" : "on") : ""}
                  />
                ))}
              </span>
              <span className="slot">
                <span
                  className="cap"
                  style={{ bottom: `${6 + level * 80}%` }}
                />
              </span>
            </span>
            <span className="v">{kilo(s.value)}</span>
            <span className="ct">
              {s.count} deal{s.count === 1 ? "" : "s"}
            </span>
          </div>
        );
      })}
      <div className="master">
        <span>Master open</span>
        <b>{money(crm.open_total, crm.currency)}</b>
        <VuMeter share={wonShare} />
        <div className="won">
          <span>Won MTD</span>
          <b className="g">{money(crm.won_mtd, crm.currency)}</b>
        </div>
        {warn && <div className="warn">{warn}</div>}
      </div>
    </div>
  );
}
