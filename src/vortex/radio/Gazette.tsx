"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import "./gazette.css";

// O-14 · THE BELOW GAZETTE: a weekly paper from the world under the app. The
// headlines come from what really happened (his deaths, your visits below,
// the series, your ending); the classifieds are clues for fragments you
// haven't found (where + the first hint, never the answer); the advice column
// is his.

interface Paper {
  issue: number;
  date: string;
  headlines: string[];
  classifieds: string[];
  advice: { q: string; a: string };
  weather: string;
}

export default function Gazette() {
  const [p, setP] = useState<Paper | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    apiFetch<Paper>("/api/mascot/gazette")
      .then(setP)
      .catch(() => setErr(true));
  }, []);

  if (err)
    return (
      <main className="vxg">
        <p className="vxg-empty">
          the paper didn&apos;t come this week. the moth is investigating.
        </p>
      </main>
    );
  if (!p)
    return (
      <main className="vxg">
        <p className="vxg-empty">the presses are warming up…</p>
      </main>
    );

  const [lead, ...rest] = p.headlines;
  return (
    <main className="vxg">
      <article className="vxg-paper">
        <header className="vxg-mast">
          <span className="ear">
            ISSUE {p.issue} · {p.date}
          </span>
          <h1>The Below Gazette</h1>
          <span className="ear r">
            PRICE: ONE TOKEN · ALL TAPE IS TEMPORARY
          </span>
        </header>
        <h2 className="lead">{lead}</h2>
        <p className="lede">
          Reporting from under the floorboards of Yondra. Our correspondent, a
          moth, asks that readers stop breathing on the archive.
        </p>
        <div className="cols">
          <section>
            <h3>Also this week</h3>
            <ul className="heads">
              {rest.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
            <h3>Weather</h3>
            <p>{p.weather}</p>
          </section>
          <section className="advice">
            <h3>Ask the Ghost</h3>
            <p className="q">“{p.advice.q}”</p>
            <p className="a">{p.advice.a}</p>
            <p className="sig">— V., agony column, dead air</p>
          </section>
          <section className="classified">
            <h3>Classifieds</h3>
            {p.classifieds.map((c) => (
              <p key={c}>{c}</p>
            ))}
            <p className="small">Lost: one name. Answers to "m—". No reward.</p>
          </section>
        </div>
        <footer>
          <Link href="/below/porao">▾ go below</Link>
          <Link href="/dashboard#radio">tune in to 03.13 ▸</Link>
        </footer>
      </article>
    </main>
  );
}
