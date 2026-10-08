// Costumes and hand props for Vortex, drawn in the same viewBox as his body
// (lib/vortexArt: viewBox -10 -6 160 150, body circle at 70,70 r36). Numbers
// and constants only — safe to inject.

import type { Costume } from "@/components/vortex/mk4/progress";
import type { VortexProp } from "@/components/vortex/mk4/useVortexWorld";

const VB =
  'viewBox="-10 -6 160 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="overflow:visible;display:block;width:100%;height:100%"';

export function costumeSvg(c: Costume): string {
  let g = "";
  if (c === "witch")
    g = `<path d="M38 40 Q70 30 102 40 L98 45 Q70 37 42 45 Z" fill="#1a0a24"/><path d="M50 40 L74 -2 Q78 6 88 10 L90 38 Z" fill="#2a0f3a"/><path d="M52 36 H90 V40 H52 Z" fill="#ff8a1c"/><circle cx="84" cy="9" r="2" fill="#00e5d0"/>`;
  else if (c === "scarf")
    g = `<path d="M40 92 Q70 108 100 92 L100 101 Q70 116 40 101 Z" fill="#c0207a"/><path d="M44 95 h8 M58 99 h8 M74 99 h8 M88 95 h8" stroke="#fff" stroke-width="3"/><path d="M88 100 L94 124 L84 124 L80 104 Z" fill="#c0207a"/><path d="M84 118 h10" stroke="#fff" stroke-width="2"/>`;
  else if (c === "party")
    g = `<path d="M56 38 L70 2 L84 38 Z" fill="#00e5d0"/><path d="M60 28 L80 28 M63 19 L77 19 M66 10 L74 10" stroke="#ff2d95" stroke-width="3"/><circle cx="70" cy="2" r="4" fill="#ffb347"/>`;
  else if (c === "monocle")
    g = `<circle cx="81" cy="63" r="11" fill="none" stroke="#ffd36a" stroke-width="2.4"/><path d="M92 66 Q100 84 96 104" fill="none" stroke="#ffd36a" stroke-width="1.2"/>`;
  else if (c === "crown")
    g = `<path d="M48 40 L52 18 L62 30 L70 12 L78 30 L88 18 L92 40 Z" fill="#ffd36a" stroke="#b5862a" stroke-width="1.4"/><circle cx="70" cy="30" r="3" fill="#ff2d95"/><circle cx="58" cy="34" r="2" fill="#00e5d0"/><circle cx="82" cy="34" r="2" fill="#00e5d0"/>`;
  else if (c === "sunglasses")
    g = `<path d="M47 57 H93 V60 H47 Z" fill="#0a0a0a"/><path d="M48 58 Q48 74 59 74 Q69 74 69 58 Z M71 58 Q71 74 81 74 Q92 74 92 58 Z" fill="#0a0a0a"/><path d="M52 62 l6 -2 M75 62 l6 -2" stroke="#fff" stroke-width="1.6" opacity=".7"/>`;
  return g ? `<svg ${VB}>${g}</svg>` : "";
}

const cassette = (x: number, y: number, s = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-12" y="-8" width="24" height="16" rx="2.5" fill="#2a2420" stroke="#ff8fd4" stroke-width="1.2"/><rect x="-8" y="-5" width="16" height="5" rx="1" fill="#efe3c4"/><circle cx="-5" cy="3" r="2.4" fill="#efe3c4"/><circle cx="5" cy="3" r="2.4" fill="#efe3c4"/></g>`;

/** A hand prop (or a whole-body morph). Empty string = nothing to draw. */
export function propSvg(p: VortexProp): string {
  let g = "";
  if (p === "juggle")
    g = `<g class="vxa-juggle">${cassette(30, 6, 1.35)}${cassette(70, -16, 1.35)}${cassette(110, 6, 1.35)}</g>`;
  else if (p === "alarm")
    g = `<g class="vxa-ring" transform="translate(70 22) scale(1.5) translate(-70 -22)"><circle cx="70" cy="22" r="13" fill="#efe3c4" stroke="#b5533c" stroke-width="2.4"/><path d="M70 22 V14 M70 22 L76 25" stroke="#2b2219" stroke-width="2" stroke-linecap="round"/><circle cx="59" cy="10" r="4" fill="#b5533c"/><circle cx="81" cy="10" r="4" fill="#b5533c"/></g>`;
  else if (p === "fan")
    g = `<g transform="translate(112 94) scale(1.5) translate(-112 -94)"><g class="vxa-fanning"><path d="M110 92 L132 70 Q140 84 128 100 Z" fill="#ffd36a" stroke="#b5862a"/><path d="M112 92 L124 74 M114 94 L130 82" stroke="#b5862a"/></g></g>`;
  else if (p === "tea")
    g = `<g transform="translate(110 100) scale(1.6) translate(-110 -100)"><path d="M100 96 h20 v8 q0 9 -10 9 q-10 0 -10 -9 Z" fill="#efe3c4" stroke="#6b5a44"/><path d="M120 99 q7 0 6 5 q-1 4 -6 3" fill="none" stroke="#6b5a44" stroke-width="1.6"/><path class="vxa-steam" d="M106 90 q3 -5 0 -10 M113 90 q3 -5 0 -10" stroke="#fff" stroke-width="1.4" fill="none" opacity=".7"/></g>`;
  else if (p === "tomato")
    g = `<g transform="translate(116 98) scale(1.55) translate(-116 -98)"><circle cx="116" cy="98" r="11" fill="#e0402a"/><path d="M110 88 l6 4 l6 -4 l-2 5 l-4 -1 l-4 1 Z" fill="#3fae6a"/><circle cx="112" cy="94" r="2.6" fill="#fff" opacity=".45"/></g>`;
  else if (p === "rewind")
    g = `<g transform="translate(70 -4) scale(1.4)"><rect x="-22" y="-12" width="44" height="24" rx="4" fill="#2a2420" stroke="#00e5d0" stroke-width="1.4"/><g class="vxa-rewind"><circle cx="-9" cy="2" r="5.5" fill="#efe3c4"/><path d="M-9 -3 v10 M-14 2 h10" stroke="#2a2420" stroke-width="1.6"/></g><g class="vxa-rewind"><circle cx="9" cy="2" r="5.5" fill="#efe3c4"/><path d="M9 -3 v10 M4 2 h10" stroke="#2a2420" stroke-width="1.6"/></g><text x="0" y="-15" text-anchor="middle" font-family="monospace" font-size="9" fill="#00e5d0">◀◀</text></g>`;
  else if (p === "morph-cassette")
    g = `<g transform="translate(70 70) scale(2.6)">${cassette(0, 0)}</g><g transform="translate(70 70)"><circle cx="-13" cy="8" r="2.6" fill="#1a0033"/><circle cx="13" cy="8" r="2.6" fill="#1a0033"/></g>`;
  else if (p === "morph-knob")
    g = `<circle cx="70" cy="70" r="34" fill="#2a2420" stroke="#6b5a44" stroke-width="3"/><circle cx="70" cy="70" r="26" fill="url(#vxknob)"/><path d="M70 48 V60" stroke="#ff2d95" stroke-width="4" stroke-linecap="round"/><circle cx="62" cy="74" r="2.4" fill="#1a0033"/><circle cx="78" cy="74" r="2.4" fill="#1a0033"/><defs><radialGradient id="vxknob" cx="40%" cy="35%"><stop offset="0" stop-color="#f7f1e2"/><stop offset="1" stop-color="#8c7a5c"/></radialGradient></defs>`;
  return g ? `<svg ${VB}>${g}</svg>` : "";
}

/** The stress ball is a real button (you squeeze it). */
export const STRESS_BALL_SVG =
  '<svg viewBox="0 0 40 40" aria-hidden="true" style="display:block;width:100%;height:100%"><circle cx="20" cy="20" r="17" fill="#ff8fd4" stroke="#c0207a" stroke-width="2"/><circle cx="14" cy="16" r="2.2" fill="#1a0033"/><circle cx="26" cy="16" r="2.2" fill="#1a0033"/><path d="M14 25 Q20 29 26 25" stroke="#1a0033" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
