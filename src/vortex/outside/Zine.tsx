"use client";

import { useEffect, useState } from "react";
import { fetchBoards } from "@/lib/auth";
import { type VortexMood, vortexSvg } from "@/lib/vortexArt";
import { loadSoul, type SoulView } from "@/vortex/core/soul";
import "./print.css";

// Q-08 · a one-sheet fanzine: print on A4/Letter landscape, fold in eight,
// one cut down the middle. The classic imposition: the top row prints upside
// down so the pages land in order once folded.

const DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];
const REVIEW = [
  "a board so empty it echoes. i shouted in it. it shouted back, worse.",
  "three columns of good intentions and one column of shame.",
  "the 'done' column is decorative. like a fireplace in a submarine.",
  "i've seen tidier crime scenes. i've BEEN tidier crime scenes.",
  "honestly? not bad. i hate that.",
  "someone here writes card titles like ransom notes. respect.",
];
const ADS = [
  "LOST: one (1) deadline. answers to 'friday'. reward: nothing.",
  "FOR SALE: slightly haunted sprint. one owner. ignore the whispering.",
  "WANTED: someone to close the ticket from march. any march.",
  "FREE to a good home: 40 unread notifications. they bite.",
  "SEEKING: a meeting that could NOT have been an email. please.",
];

const pick = <T,>(xs: T[], seed: number) => xs[Math.abs(seed) % xs.length];

function Panel({
  n,
  flip,
  children,
}: {
  n: number;
  flip?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`vxz-panel${flip ? " is-flip" : ""}`} data-page={n}>
      {children}
      <span className="vxz-folio">{n === 1 ? "" : n}</span>
    </section>
  );
}

export default function Zine() {
  const [soul, setSoul] = useState<SoulView | null>(null);
  const [boards, setBoards] = useState<string[]>([]);
  useEffect(() => {
    void loadSoul().then(setSoul);
    fetchBoards()
      .then(({ owned, shared }) =>
        setBoards([...owned, ...shared].map((b) => b.name)),
      )
      .catch(() => {});
  }, []);

  const issue = (soul?.ngplus ?? 0) + 1;
  const date = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const face = vortexSvg(
    (soul?.mood ?? "smug") as VortexMood,
    "zine",
    undefined,
    {
      dark: Math.min(1, (soul?.corruption ?? 0) / 100),
    },
  );

  const pages: Record<number, React.ReactNode> = {
    1: (
      <>
        <p className="vxz-kicker">THE VOID · ISSUE #{issue}</p>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: our own generated SVG */}
        <div className="vxz-face" dangerouslySetInnerHTML={{ __html: face }} />
        <h1>VORTEX</h1>
        <p className="vxz-sub">
          the zine he made about himself, starring you as the antagonist
        </p>
        <p className="vxz-date">{date} · free · worth less</p>
      </>
    ),
    2: (
      <>
        <h2>who is this guy</h2>
        <p>
          {soul?.age_days ?? 0} days old. died {soul?.deaths ?? 0} times.
          currently: <b>{soul?.mood ?? "unknown"}</b>
          {soul?.cause ? ` (${soul.cause})` : ""}.
        </p>
        <p>
          he calls you &ldquo;{soul?.nickname ?? "you"}&rdquo;. he thinks
          it&apos;s affectionate. it isn&apos;t.
        </p>
        {soul?.traits?.length ? <p>traits: {soul.traits.join(", ")}.</p> : null}
        <p className="vxz-small">
          sanity {soul?.needs.sanity ?? "?"} · ego {soul?.needs.ego ?? "?"} ·
          corruption {soul?.corruption ?? 0}%
        </p>
      </>
    ),
    3: (
      <>
        <h2>things he hates</h2>
        <ul>
          <li>the colour {soul?.likes.hated_color ?? "beige"}</li>
          <li>{DAYS[soul?.likes.hated_day ?? 1]}s</li>
          <li>being rewound</li>
          <li>you, a little. lovingly.</li>
        </ul>
        {soul?.scars?.length ? (
          <>
            <h3>scars</h3>
            <p className="vxz-small">{soul.scars.join(" · ")}</p>
          </>
        ) : null}
      </>
    ),
    4: (
      <>
        <h2>your boards, reviewed</h2>
        {boards.length === 0 && <p>no boards. a bold artistic statement.</p>}
        {boards.slice(0, 4).map((b, i) => (
          <p key={b}>
            <b>{b}</b> — {pick(REVIEW, b.length * 7 + i)}
          </p>
        ))}
        <p className="vxz-small">★☆☆☆☆ would haunt again</p>
      </>
    ),
    5: (
      <>
        <h2>lore leak</h2>
        <p>
          you&apos;ve found {soul?.fragments.length ?? 0} of the pieces. the
          tape says there are more. the tape lies, but not about this.
        </p>
        <p className="vxz-redact">
          before yondra there was a ████████ on 13 march. the ██████ didn&apos;t
          come back the same. neither did ███.
        </p>
        <p className="vxz-small">
          {soul?.ending
            ? `you chose "${soul.ending}" on side c. he remembers.`
            : "side c is still sealed."}
        </p>
      </>
    ),
    6: (
      <>
        <h2>classifieds</h2>
        {ADS.map((a) => (
          <p key={a} className="vxz-ad">
            {a}
          </p>
        ))}
      </>
    ),
    7: (
      <>
        <h2>void coupon</h2>
        <div className="vxz-coupon">
          <b>GOOD FOR ONE (1)</b>
          <span>day without me commenting on your work.</span>
          <i>expires: immediately. void where vortex exists.</i>
        </div>
        <h3>how to fold</h3>
        <p className="vxz-small">
          fold in half long-ways, then in four. cut the middle crease between
          the two centre panels. push it into a star, flatten. you made a zine.
          it&apos;s about me.
        </p>
      </>
    ),
    8: (
      <>
        <p className="vxz-small">
          printed on dead tape by a ghost with no budget. no trees were harmed.
          one intern was.
        </p>
        <div className="vxz-barcode" aria-hidden />
        <p className="vxz-small">YONDRA · C-90 · {issue}/∞</p>
      </>
    ),
  };

  return (
    <div className="vxz-wrap">
      <div className="vxz-bar">
        <span>landscape · no margins · one cut. he&apos;ll wait.</span>
        <button type="button" onClick={() => window.print()}>
          print the zine
        </button>
      </div>
      <div className="vxz-sheet">
        {[5, 4, 3, 2].map((n) => (
          <Panel key={n} n={n} flip>
            {pages[n]}
          </Panel>
        ))}
        {[6, 7, 8, 1].map((n) => (
          <Panel key={n} n={n}>
            {pages[n]}
          </Panel>
        ))}
      </div>
    </div>
  );
}
