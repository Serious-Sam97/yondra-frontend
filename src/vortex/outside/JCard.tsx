"use client";

import { useEffect, useState } from "react";
import type { BoardInterface } from "@/interfaces/BoardInterface";
import { fetchBoard } from "@/lib/api";
import "./print.css";

// Q-10 · a printable cassette J-card for a board: side A is what got done,
// side B is what's still out there. Track length = days the card lived.
// Cut on the outline, fold on the dashed lines, slide it into a real case.

const days = (from?: string | null, to?: string | null) => {
  if (!from) return "--:--";
  const d = Math.max(
    0,
    Math.round(
      ((to ? Date.parse(to) : Date.now()) - Date.parse(from)) / 86_400_000,
    ),
  );
  return `${String(Math.floor(d / 60)).padStart(2, "0")}:${String(d % 60).padStart(2, "0")}`;
};

const LINER = [
  "recorded live in a meeting that should've been an email.",
  "mixed by a ghost. mastered by nobody.",
  "contains explicit deadlines.",
  "do not play backwards. he will answer.",
];

export default function JCard({ id }: { id: number }) {
  const [b, setB] = useState<BoardInterface | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    fetchBoard(id, c.signal)
      .then(setB)
      .catch(() => {
        if (!c.signal.aborted) setErr(true);
      });
    return () => c.abort();
  }, [id]);

  if (err)
    return (
      <p className="vxk-msg">
        no tape here. wrong board, or it isn&apos;t yours.
      </p>
    );
  if (!b) return <p className="vxk-msg">rewinding…</p>;

  const cards = b.cards ?? [];
  const sideA = cards.filter((c) => c.done_at).slice(0, 12);
  const sideB = cards.filter((c) => !c.done_at).slice(0, 12);
  const year = new Date().getFullYear();

  return (
    <div className="vxk-wrap">
      <div className="vxz-bar">
        <span>
          cut the outline · fold the dashes · {sideA.length + sideB.length}{" "}
          tracks
        </span>
        <button type="button" onClick={() => window.print()}>
          print the j-card
        </button>
      </div>
      <div className="vxk-card">
        <div className="vxk-flap">
          <p>{LINER[b.id % LINER.length]}</p>
          <p>℗ {year} yondra / void records</p>
        </div>
        <div className="vxk-spine">
          <span>{b.name}</span>
          <i className="vxk-sig">— vx</i>
          <b>C-{Math.max(30, Math.ceil(cards.length / 10) * 30)}</b>
        </div>
        <div className="vxk-front">
          <header>
            <span className="vxk-brand">YONDRA</span>
            <span className="vxk-bias">HIGH BIAS · TYPE II</span>
          </header>
          <h1>{b.name}</h1>
          <div className="vxk-sides">
            <ol>
              <li className="vxk-side">SIDE A · finished</li>
              {sideA.length === 0 && <li>(silence, 45 min)</li>}
              {sideA.map((c) => (
                <li key={c.id}>
                  <span>{c.name}</span>
                  <i>{days(c.created_at, c.done_at)}</i>
                </li>
              ))}
            </ol>
            <ol>
              <li className="vxk-side">SIDE B · still playing</li>
              {sideB.length === 0 && <li>(nothing. suspicious.)</li>}
              {sideB.map((c) => (
                <li key={c.id}>
                  <span>{c.name}</span>
                  <i>{days(c.created_at)}</i>
                </li>
              ))}
            </ol>
          </div>
          <footer>Dolby ▢ NR · hidden track: ask vortex</footer>
        </div>
      </div>
    </div>
  );
}
