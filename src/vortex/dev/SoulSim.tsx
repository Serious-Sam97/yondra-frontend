"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import "./lab.css";

// S-06 · THE SOUL SIMULATOR (internal). Runs a month of his life in seconds on
// the server (real SoulService + EconomyService, inside a rolled-back
// transaction) for a user profile, and draws what happened. Runs stack up so
// profiles can be compared on the same axes.

interface Day {
  day: number;
  needs: Record<string, number>;
  corruption: number;
  stage: number;
  proximity: number;
  relation: number;
  deaths: number;
  sick: boolean;
  traits: string[];
  balance: Record<string, number>;
}
interface Run {
  profile: string;
  days: Day[];
}

const PROFILES = ["absent", "night", "gamer", "kind", "rude"];
const SERIES: {
  key: string;
  get: (d: Day) => number;
  color: string;
  min?: number;
  max?: number;
}[] = [
  {
    key: "relation",
    get: (d) => d.relation,
    color: "#6fffd2",
    min: -100,
    max: 100,
  },
  { key: "corruption", get: (d) => d.corruption, color: "#ff2e5b" },
  { key: "proximity", get: (d) => d.proximity, color: "#c8962e" },
  { key: "loneliness", get: (d) => d.needs.loneliness ?? 0, color: "#7a5cff" },
  { key: "sanity", get: (d) => d.needs.sanity ?? 0, color: "#2ab7e0" },
  { key: "hunger", get: (d) => d.needs.hunger ?? 0, color: "#ffa400" },
];

function Chart({
  runs,
  metric,
}: {
  runs: Run[];
  metric: (typeof SERIES)[number];
}) {
  const W = 520;
  const H = 140;
  const max = metric.max ?? 100;
  const min = metric.min ?? 0;
  const len = Math.max(1, ...runs.map((r) => r.days.length));
  const y = (v: number) => H - ((v - min) / (max - min)) * H;
  const dash = ["", "6 4", "2 3", "10 3 2 3", "1 4"];
  return (
    <figure className="vxsim-chart">
      <figcaption style={{ color: metric.color }}>{metric.key}</figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${metric.key} per day`}
      >
        {min < 0 && (
          <path d={`M0 ${y(0)} H${W}`} stroke="#444" strokeDasharray="3 3" />
        )}
        {runs.map((r, i) => (
          <polyline
            key={`${r.profile}${i}`}
            fill="none"
            stroke={metric.color}
            strokeWidth="1.8"
            strokeDasharray={dash[i % dash.length]}
            points={r.days
              .map((d, k) => `${((k + 1) / len) * W},${y(metric.get(d))}`)
              .join(" ")}
          />
        ))}
      </svg>
    </figure>
  );
}

export default function SoulSim() {
  const [profile, setProfile] = useState("absent");
  const [days, setDays] = useState(30);
  const [runs, setRuns] = useState<Run[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await apiFetch<Run>("/api/mascot/dev/simulate", {
        method: "POST",
        body: JSON.stringify({ profile, days }),
      });
      setRuns((rs) => [...rs.slice(-4), r]);
    } catch {
      setErr("simulator unavailable (needs local env or VORTEX_DEV).");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="vxlab">
      <header>
        <h1>soul simulator</h1>
        <p>
          dev only · S-06 · a month of his life in seconds, nothing persisted
        </p>
      </header>
      <div className="vxlab-sliders">
        <label>
          profile
          <select value={profile} onChange={(e) => setProfile(e.target.value)}>
            {PROFILES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          days{" "}
          <input
            type="number"
            min={1}
            max={90}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          />
        </label>
        <button type="button" disabled={busy} onClick={() => void run()}>
          {busy ? "living…" : "▶ live it"}
        </button>
        <button type="button" onClick={() => setRuns([])}>
          clear
        </button>
      </div>
      {err && <p>{err}</p>}
      {runs.length > 0 && (
        <>
          <p className="vxsim-legend">
            {runs.map((r, i) => (
              <span key={`${r.profile}${i}`}>
                run {i + 1}: <b>{r.profile}</b> · deaths{" "}
                {r.days.at(-1)?.deaths ?? 0} · final stage{" "}
                {r.days.at(-1)?.stage ?? 0} · balance{" "}
                {Object.entries(r.days.at(-1)?.balance ?? {})
                  .map(([k, n]) => `${k} ${n}`)
                  .join(" · ")}
                {r.days.some((d) => d.sick) ? " · got sick" : ""}
                {r.days.at(-1)?.traits.length
                  ? ` · ${r.days.at(-1)?.traits.join(", ")}`
                  : ""}
              </span>
            ))}
          </p>
          <div className="vxsim-grid">
            {SERIES.map((m) => (
              <Chart key={m.key} runs={runs} metric={m} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
