"use client";

import { useEffect } from "react";
import type { CardInterface } from "@/interfaces/CardInterface";
import "./edition.css";

// Q-11 · "print · vortex edition": the same report, with his notes scrawled in
// the margin and a stamp on top. Screen view never changes; only the paper.

function notes(cards: CardInterface[], sprint: string): string[] {
  const done = cards.filter((c) => c.done_at).length;
  const open = cards.length - done;
  const late = cards.filter(
    (c) => !c.done_at && c.due_date && Date.parse(c.due_date) < Date.now(),
  ).length;
  const pct = cards.length ? Math.round((done / cards.length) * 100) : 0;
  const out = [
    `"${sprint}". catchy. shame about the contents.`,
    pct >= 90
      ? `${pct}% done. either you're good or you deleted the hard ones. i checked. inconclusive.`
      : pct >= 50
        ? `${pct}% done. the passing grade of people who peaked in school.`
        : `${pct}% done. a sprint in the sense that a sloth sprints.`,
    open
      ? `${open} card${open === 1 ? "" : "s"} carried over. they'll be in the next report too. and the next.`
      : "nothing carried over. i'm checking the bin.",
  ];
  if (late) out.push(`${late} overdue. circled in red. that's not ink.`);
  const longest = [...cards].sort(
    (a, b) => (b.name?.length ?? 0) - (a.name?.length ?? 0),
  )[0];
  if (longest?.name && longest.name.length > 40)
    out.push(
      `whoever titled "${longest.name.slice(0, 40)}…" — a card is not a memoir.`,
    );
  out.push("approved. not because it's good. because i'm tired.");
  return out;
}

export default function VortexEdition({
  cards,
  sprint,
}: {
  cards: CardInterface[];
  sprint: string;
}) {
  useEffect(() => {
    const off = () => document.body.classList.remove("vx-edition");
    window.addEventListener("afterprint", off);
    return () => window.removeEventListener("afterprint", off);
  }, []);
  return (
    <>
      <button
        type="button"
        className="vxe-btn"
        onClick={() => {
          document.body.classList.add("vx-edition");
          window.print();
        }}
      >
        print · vortex edition
      </button>
      <aside className="vxe-notes" aria-hidden>
        <p className="vxe-stamp">REVIEWED BY VORTEX</p>
        {notes(cards, sprint).map((n, i) => (
          <p
            key={n}
            style={{
              transform: `rotate(${(i % 2 ? 1 : -1) * (1 + (i % 3))}deg)`,
            }}
          >
            {n}
          </p>
        ))}
      </aside>
    </>
  );
}
