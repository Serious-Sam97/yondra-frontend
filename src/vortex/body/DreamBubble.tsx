"use client";

import { useEffect, useState } from "react";
import { SvgArt } from "@/components/ui/SvgArt";

// C-14 · while he sleeps, a dream bubble shows fragments of the lore in amber
// pixel art: a garage, a microphone behind glass, a pencil spinning in a reel,
// a mug of tea that is still warm, an empty chair. (K-12 makes some of them
// clickable clues.)

const px = (cells: string, color = "#ffb347") => {
  // a tiny 12×9 pixel canvas from a string of rows ("." = empty)
  const rows = cells.trim().split("\n");
  const rects = rows
    .flatMap((r, y) =>
      [...r.trim()].map((c, x) =>
        c === "#"
          ? `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`
          : c === "+"
            ? `<rect x="${x}" y="${y}" width="1" height="1" fill="#7a5a3a"/>`
            : "",
      ),
    )
    .join("");
  return `<svg viewBox="0 0 12 9" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" style="width:100%;height:100%;display:block">${rects}</svg>`;
};

export const DREAMS: { id: string; label: string; svg: string }[] = [
  {
    id: "garage",
    label: "a garage. not mine. mine?",
    svg: px(`
.....##.....
...######...
..########..
.##########.
.#+++++++#..
.#+#+#+#+#..
.#+++++++#..
.#+#+#+#+#..
.#########..`),
  },
  {
    id: "mic",
    label: "a microphone behind glass. someone's on air.",
    svg: px(`
....####....
...#++++#...
...#++++#...
...#++++#...
....####....
.....##.....
.....##.....
...######...
............`),
  },
  {
    id: "pencil",
    label: "the pencil. in the reel. turning.",
    svg: px(
      `
....###.....
...#...#....
..#..#..#...
..#.###.#...
..#..#..#...
...#...#....
....###.....
.....#......
.....#......`,
      "#ff5a3c",
    ),
  },
  {
    id: "tea",
    label: "tea. still warm. for who.",
    svg: px(`
...#..#.....
..#..#......
............
.########...
.#++++++###.
.#++++++#.#.
.#++++++###.
..######....
............`),
  },
  {
    id: "chair",
    label: "an empty chair. waiting.",
    svg: px(`
..##........
..##........
..##........
..##........
..########..
..#......#..
..#......#..
..#......#..
............`),
  },
  {
    // I-25 · the third way in: follow him down through his own dream
    id: "stairs",
    label: "stairs, going down, into amber.",
    svg: px(`
#...........
###.........
..###.......
....###.....
......###...
........###.
..........##
...........#
............`),
  },
];

export { DREAM_FRAGMENT } from "./dreamFragments";

/** H-25 · nightmares only show the pencil and the fire */
const NIGHTMARE = ["pencil", "fire"] as const;
const FIRE = {
  id: "fire",
  label: "the garage is on fire.",
  svg: px(
    `
.....#......
....##...#..
...###..##..
..#####.###.
.#########..
.##+++++###.
.#+#+#+#+#..
.#+++++++#..
.#########..`,
    "#ff5a3c",
  ),
};

export function DreamBubble({
  on,
  onPick,
  nightmare = false,
}: {
  on: boolean;
  onPick?: (sceneId: string) => void;
  nightmare?: boolean;
}) {
  const [i, setI] = useState(() => Math.floor(Math.random() * DREAMS.length));
  useEffect(() => {
    if (!on) return;
    const iv = setInterval(() => setI((n) => (n + 1) % DREAMS.length), 4200);
    return () => clearInterval(iv);
  }, [on]);
  if (!on) return null;
  const d = nightmare
    ? i % 2 === 0
      ? (DREAMS.find((x) => x.id === NIGHTMARE[0]) ?? DREAMS[0])
      : FIRE
    : DREAMS[i];
  return (
    <div
      className={`vxr-dream${nightmare ? " is-nightmare" : ""}`}
      title={d.label}
    >
      <span className="d1" aria-hidden />
      <span className="d2" aria-hidden />
      <button
        type="button"
        className="cloud"
        aria-label={`his dream: ${d.label}`}
        onClick={() => onPick?.(d.id)}
      >
        <SvgArt svg={d.svg} className="scene" />
      </button>
    </div>
  );
}
