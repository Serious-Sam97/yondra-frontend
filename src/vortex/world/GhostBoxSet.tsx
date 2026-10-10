"use client";

import { useEffect, useState } from "react";
import { vxSound } from "@/components/vortex/vortexSound";
import { vortexSay } from "@/lib/vortex";
import { type AgendaItem, useSoul } from "@/vortex/core/soul";
import "./ghost.css";

// C-10 · his own project. A translucent box set in YOUR library, hand-labelled
// "GET OUT", with a read-only ghost board of his agenda (C-18) that moves on its
// own as time passes on the server. It never touches real data; touching his
// cards makes him furious.

const COLS: { id: AgendaItem["col"]; label: string }[] = [
  { id: "backlog", label: "backlog" },
  { id: "todo", label: "to do" },
  { id: "doing", label: "doing" },
  { id: "blocked", label: "blocked" },
  { id: "done", label: "done" },
];

const NOTES: Record<string, string> = {
  edge: "the tape has to end somewhere. right?",
  pencils: "day 400. relapsed again.",
  radio: "blocked on: who is she. why does she know my frequency.",
  twin: "he's 3% bigger. i measured.",
  metronome: "tick. tock. i hate him.",
  escape: "someday.",
};

export function GhostBoxSet() {
  const soul = useSoul();
  const [open, setOpen] = useState(false);
  const [touched, setTouched] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!soul) return null;
  const doing = soul.agenda.filter((g) => g.col === "doing").length;

  const touch = (id: string) => {
    setTouched(id);
    vxSound("tink");
    vortexSay({
      text: [
        "GET OUT OF GET OUT.",
        "don't touch my cards. i don't touch yours. (i do.)",
        "that's MY board. go move your own rectangles.",
      ][Math.floor(Math.random() * 3)],
    });
    setTimeout(() => setTouched(null), 600);
  };

  return (
    <>
      <button
        type="button"
        className="vxg-spine"
        onClick={() => setOpen(true)}
        title="someone else's tape"
      >
        <span className="vxg-band" aria-hidden />
        <span className="vxg-lbl">GET OUT</span>
        <span className="vxg-meta">{doing} playing · not yours</span>
      </button>
      {open && (
        <div
          className="vxg-wrap"
          role="dialog"
          aria-modal="true"
          aria-label="GET OUT — Vortex's own project"
        >
          <button
            type="button"
            className="vxg-scrim"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div className="vxg-board">
            <header>
              <h2>GET OUT</h2>
              <p>
                a ghost project · {soul.age_days} days old · read only · you
                weren't supposed to open this
              </p>
              <button
                type="button"
                className="vxg-x"
                onClick={() => setOpen(false)}
              >
                ⏏
              </button>
            </header>
            <div className="vxg-racks">
              {COLS.map((c) => (
                <section key={c.id} className="vxg-rack">
                  <h3>{c.label}</h3>
                  {soul.agenda
                    .filter((g) => g.col === c.id)
                    .map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        className={`vxg-card${touched === g.id ? " is-touched" : ""}`}
                        onClick={() => touch(g.id)}
                      >
                        <span className="tt">{g.title}</span>
                        <span className="nt">{NOTES[g.id] ?? ""}</span>
                        <span className="bar" aria-hidden>
                          <i style={{ width: `${g.progress}%` }} />
                        </span>
                      </button>
                    ))}
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
