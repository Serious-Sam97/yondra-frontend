"use client";

import { useState } from "react";
import { useSoul } from "@/vortex/core/soul";
import "./nest.css";

// C-11 · the nest. A little diorama in his corner built from things he
// collected: words cut out of your cards, tapes from finished work, relics
// (the shed skin, the chewed tape from his first death), gifts you gave him.
// Hover to look closer; each thing has a one-line story.

const ITEMS: Record<string, { glyph: string; note: string }> = {
  "pencil-broken": {
    glyph: "✎",
    note: "a pencil. broken. by me. you're welcome.",
  },
  "shed-skin": {
    glyph: "◌",
    note: "my old skin. one year with you. i look younger now. you don't.",
  },
  "chewed-tape": {
    glyph: "≋",
    note: "the tape they pulled out of me. the first time. don't touch it.",
  },
  "burnt-gadget": {
    glyph: "✸",
    note: "an invention. it exploded. it was ahead of its time.",
  },
  "first-tape": {
    glyph: "▭",
    note: "the first thing i remember. a tape with no label. i won't say more.",
  },
  "golden-tape": {
    glyph: "◈",
    note: "gold. found it behind your sidebar. finders keepers.",
  },
  flower: {
    glyph: "✿",
    note: "a tape flower. someone left it on a grave. i took it. sue me.",
  },
  eye: { glyph: "◉", note: "a glass eye. not mine. probably." },
  word: {
    glyph: "❝",
    note: "a word i cut out of one of your cards. i liked the shape.",
  },
};

export function Nest({ hidden }: { hidden?: boolean }) {
  const soul = useSoul();
  const [open, setOpen] = useState(false);
  if (!soul || hidden) return null;
  const items = soul.nest.slice(-24);
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover region only — the button inside is the real control
    <div
      className={`vxn${open ? " is-open" : ""}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="vxn-pile"
        aria-label={`Vortex's nest — ${items.length} things`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
      >
        {items.slice(-6).map((it, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: a pile, order is the identity
            key={i}
            className="vxn-bit"
            style={{
              transform: `translate(${(i % 3) * 9 - 9}px, ${-Math.floor(i / 3) * 6}px) rotate(${((i * 37) % 40) - 20}deg)`,
            }}
          >
            {(ITEMS[it.id] ?? ITEMS.word).glyph}
          </span>
        ))}
      </button>
      {open && (
        <div className="vxn-panel" role="note">
          <div className="vxn-h">
            the nest · {items.length} things · don't touch
          </div>
          <ul>
            {items.map((it, i) => {
              const def = ITEMS[it.id];
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: append-only list
                <li key={i}>
                  <span className="g">{(def ?? ITEMS.word).glyph}</span>
                  <span className="t">
                    <b>{it.id.replace(/-/g, " ")}</b>
                    {it.note ??
                      def?.note ??
                      "found it. kept it. that's all you need to know."}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
