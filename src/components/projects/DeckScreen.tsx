"use client";

import type { BoardFlow } from "@/interfaces/ProjectInterface";
import LcdDigits from "./cassette/LcdDigits";
import SegmentMeter from "./cassette/SegmentMeter";

const DAY = ["S", "M", "T", "W", "T", "F", "S"];

// The project deck's single recessed LCD (replaces the four StatTiles): tape
// counter (cards), boards, project-wide flow meter, and — when the API sends
// it — a 14-day throughput readout.
export default function DeckScreen({
  cards,
  boards,
  archived,
  recording,
  flow,
  throughput,
}: {
  cards: number;
  boards: number;
  archived: number;
  recording: number;
  flow: BoardFlow;
  throughput?: number[];
}) {
  const total = flow.todo + flow.doing + flow.done;
  const pct = total ? Math.round((flow.done / total) * 100) : 0;
  const series = throughput?.length ? throughput : null;
  const max = series ? Math.max(...series, 1) : 1;
  const thisWeek = series ? series.slice(-7).reduce((s, v) => s + v, 0) : 0;
  const lastWeek = series
    ? series.slice(-14, -7).reduce((s, v) => s + v, 0)
    : 0;
  const trendUp = thisWeek >= lastWeek;
  // Day initials for each bucket; the last bucket is today.
  const today = new Date().getDay();
  const days = series
    ? series.map((_, i) => DAY[(today - (series.length - 1 - i) + 70) % 7])
    : [];

  return (
    <div className="ds-bezel">
      <div className={`ds-screen${series ? "" : " no-tp"}`}>
        <div className="ds-cell">
          <div className="ds-k">Tape counter</div>
          <LcdDigits value={cards} digits={3} label="Cards in project" />
          <div className="ds-k mt-1.5">cards on deck</div>
        </div>

        <div className="ds-cell">
          <div className="ds-k">Boards</div>
          <div className="ds-big">
            {String(boards).padStart(2, "0")}
            {archived > 0 && <small> +{archived} arch</small>}
          </div>
          <div className={`ds-k mt-1.5${recording ? " is-live" : ""}`}>
            {recording ? `${recording} recording` : "all quiet"}
          </div>
        </div>

        <div className="ds-cell">
          <div className="ds-k">
            Project flow <span className="ds-hot">{pct}% done</span>
          </div>
          <SegmentMeter flow={flow} scale />
          <div className="ds-legend">
            <b className="done">{flow.done} done</b>
            <b className="doing">{flow.doing} doing</b>
            <b className="todo">{flow.todo} to do</b>
          </div>
        </div>

        {series && (
          <div className="ds-cell">
            <div className="ds-k">
              Throughput · {series.length}d
              <span
                className={`ds-hot ds-hot--cyan${trendUp ? "" : " is-down"}`}
              >
                {trendUp ? "▲" : "▼"} {thisWeek}/wk
              </span>
            </div>
            <div
              className="ds-spark"
              role="img"
              aria-label={`${thisWeek} cards completed this week, ${lastWeek} the week before`}
            >
              {series.map((v, i) => (
                <i
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed day buckets
                  key={i}
                  className={i >= series.length - 7 ? "now" : ""}
                  style={{ height: `${Math.max(6, (v / max) * 100)}%` }}
                  title={`${v} done`}
                />
              ))}
            </div>
            <div className="ds-days" aria-hidden>
              {days.map((d, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed day buckets
                <span key={i}>{d}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
