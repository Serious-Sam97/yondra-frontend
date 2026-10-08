// Vortex MK-II sprite (design/vortex-concept.png): the original round pink→violet
// body, pink→cyan rim, white swirl and two big eyes — pushed darker and more
// expressive. Returns SVG markup built only from numbers and constants (never
// user text), so it is safe to inject. Pupils sit in `.vxa-pupils` (moved by the
// --vx-lx/--vx-ly CSS vars for cursor tracking) and the eye whites in
// `.vxa-eyesg` (scaled for blinks), so neither needs a re-render.

export type VortexMood =
  | "dormant"
  | "curious"
  | "smug"
  | "hungry"
  | "judging"
  | "sleepy"
  | "dizzy"
  | "happy"
  | "yawn"
  | "mourning"
  | "possessed";

export type VortexPose =
  | "rest"
  | "grab"
  | "crossed"
  | "poke"
  | "stomp"
  | "wave"
  | "none";

const W = "#ffffff";
const INK = "#1a0033";
const ARM = "#2a0a40";
const LX = 59;
const RX = 81;
const EY = 63;

function defaultPose(mood: VortexMood): VortexPose {
  if (mood === "hungry") return "grab";
  if (mood === "judging") return "crossed";
  if (mood === "sleepy" || mood === "dormant" || mood === "yawn") return "none";
  if (mood === "mourning") return "crossed";
  if (mood === "happy") return "wave";
  return "rest";
}

export function vortexSvg(
  mood: VortexMood,
  uid: string,
  pose: VortexPose = defaultPose(mood),
): string {
  const id = `vx${uid}`;
  const red = mood === "possessed";
  // Mood's resting gaze; cursor tracking adds a small offset on top.
  const px = mood === "curious" ? 2.6 : mood === "judging" ? -1.5 : 0;
  const py = mood === "curious" ? -2.6 : mood === "hungry" ? 1.5 : 0.5;

  const pupil = (cx: number) =>
    red
      ? `<ellipse cx="${cx + px}" cy="${EY + py}" rx="4.6" ry="5.4" fill="#ff2d2d"/><ellipse cx="${cx + px}" cy="${EY + py}" rx="1.1" ry="4.6" fill="#120000"/>`
      : mood === "dizzy"
        ? `<path d="M${cx - 3.5} ${EY - 3.5} l7 7 M${cx + 3.5} ${EY - 3.5} l-7 7" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`
        : `<circle cx="${cx + px}" cy="${EY + py}" r="${mood === "hungry" ? 4.8 : 4}" fill="${INK}"/><circle cx="${cx + px + 1.7}" cy="${EY + py - 2}" r="1.35" fill="#fff"/><circle cx="${cx + px - 1.4}" cy="${EY + py + 1.8}" r=".6" fill="#fff" opacity=".8"/>`;

  let eyes: string;
  if (mood === "dormant" || mood === "happy" || mood === "yawn") {
    // closed: sleepy arcs, or happy upturned arcs
    eyes = [LX, RX]
      .map((cx) =>
        mood === "happy"
          ? `<path d="M${cx - 7} ${EY + 3} Q${cx} ${EY - 6} ${cx + 7} ${EY + 3}" fill="none" stroke="${W}" stroke-width="2.8" stroke-linecap="round"/>`
          : `<path d="M${cx - 7} ${EY + 1} Q${cx} ${EY + 7} ${cx + 7} ${EY + 1}" fill="none" stroke="${W}" stroke-width="2.4" stroke-linecap="round"/>`,
      )
      .join("");
  } else {
    eyes = `<g class="vxa-eyesg">${[LX, RX]
      .map(
        (cx) =>
          `<ellipse cx="${cx}" cy="${EY}" rx="8.2" ry="10.2" fill="${W}"/><ellipse cx="${cx}" cy="${EY}" rx="8.2" ry="10.2" fill="url(#${id}es)"/>`,
      )
      .join("")}<g class="vxa-pupils">${pupil(LX)}${pupil(RX)}</g></g>`;
  }

  // Lids in the body's mid tone, clipped to each eye.
  const lidAt: Record<string, [number, number]> = {
    smug: [0, 4.5],
    mourning: [4, 4],
    sleepy: [6, 6],
    judging: [3, 3],
    possessed: [-1, -1],
  };
  let lids = "";
  const lid = lidAt[mood];
  if (lid)
    lids = (
      [
        [LX, lid[0]],
        [RX, lid[1]],
      ] as const
    )
      .map(([cx, d]) => {
        const bend = mood === "smug" ? -1 : 1;
        return `<g clip-path="url(#${id}e${cx})"><path d="M${cx - 10} ${EY - 12} H${cx + 10} V${EY - 3 + d} Q${cx} ${EY + d + bend} ${cx - 10} ${EY - 3 + d} Z" fill="url(#${id}lid)"/><path d="M${cx + 10} ${EY - 3 + d} Q${cx} ${EY + d + bend} ${cx - 10} ${EY - 3 + d}" fill="none" stroke="${INK}" stroke-width="1.4"/></g>`;
      })
      .join("");
  if (mood === "judging")
    lids += [LX, RX]
      .map(
        (cx) =>
          `<g clip-path="url(#${id}e${cx})"><path d="M${cx - 10} ${EY + 12} H${cx + 10} V${EY + 5} Q${cx} ${EY + 3} ${cx - 10} ${EY + 5} Z" fill="url(#${id}lid)"/></g>`,
      )
      .join("");

  const browPath: Partial<Record<VortexMood, string>> = {
    curious: "M50 49 Q57 42 65 47 M74 51 Q81 49 89 51",
    smug: "M51 50 Q58 48 65 51 M74 49 Q82 43 90 47",
    hungry: "M50 48 Q57 44 64 49 M75 49 Q82 44 89 48",
    judging: "M50 51 L66 54 M73 54 L89 51",
    possessed: "M48 46 L66 56 M73 56 L91 46",
    dizzy: "M51 49 Q57 45 64 50 M75 50 Q82 45 88 49",
    happy: "M51 49 Q58 44 65 48 M74 48 Q81 44 89 49",
    mourning: "M51 47 Q58 51 65 50 M74 50 Q81 51 89 47",
    yawn: "M51 47 Q58 43 65 47 M74 47 Q81 43 89 47",
  };
  const brows = browPath[mood]
    ? `<path d="${browPath[mood]}" stroke="${red ? "#ff5a3c" : INK}" stroke-width="3" stroke-linecap="round" fill="none"/>`
    : "";

  let mouth: string;
  if (mood === "yawn")
    mouth = `<ellipse cx="70" cy="85" rx="9" ry="11" fill="${INK}" stroke="${W}" stroke-width="1.6"/><ellipse cx="70" cy="91" rx="5" ry="3" fill="#ff5fa8"/>`;
  else if (mood === "mourning")
    mouth = `<path d="M62 85 Q70 81 78 85" stroke="${W}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  else if (mood === "hungry")
    mouth = `<path d="M55 80 Q70 98 85 80 Q70 86 55 80Z" fill="${INK}" stroke="${W}" stroke-width="1.6" stroke-linejoin="round"/><path d="M58 81.5 l2.6 4 l2.6 -3.4 l2.6 4 l2.6 -3.4 l2.6 4 l2.6 -3.4 l2.6 4 l2.6 -3.4 l2.6 4 l2.6 -3.4" fill="none" stroke="${W}" stroke-width="1.2" stroke-linejoin="round"/><ellipse cx="72" cy="89.5" rx="5.5" ry="2.4" fill="#ff5fa8"/>`;
  else if (red)
    mouth = `<path d="M50 78 Q70 100 90 78 Q70 88 50 78Z" fill="#120000" stroke="#ff5a3c" stroke-width="1.2"/><path d="M53 79.5 l2.4 4 l2.4 -3 l2.4 5 l2.4 -4 l2.4 5 l2.4 -4 l2.4 5 l2.4 -4 l2.4 5 l2.4 -4 l2.4 4 l2.4 -3 l2.4 4 l2.4 -3" fill="none" stroke="${W}" stroke-width="1.2"/>`;
  else if (mood === "sleepy" || mood === "dizzy")
    mouth = `<ellipse cx="72" cy="83" rx="2.8" ry="3.4" fill="${INK}" stroke="${W}" stroke-width="1.3"/>`;
  else if (mood === "dormant")
    mouth = `<path d="M64 81 Q70 84 76 81" stroke="${W}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".85"/>`;
  else if (mood === "judging")
    mouth = `<path d="M61 83 H79" stroke="${W}" stroke-width="2.4" stroke-linecap="round"/>`;
  else if (mood === "curious")
    mouth = `<ellipse cx="71" cy="82" rx="3.4" ry="2.8" fill="${INK}" stroke="${W}" stroke-width="1.6"/>`;
  else if (mood === "happy")
    mouth = `<path d="M57 78 Q70 94 83 78 Q70 84 57 78Z" fill="${INK}" stroke="${W}" stroke-width="1.8" stroke-linejoin="round"/><ellipse cx="70" cy="85.5" rx="4.5" ry="2" fill="#ff5fa8"/>`;
  else
    mouth = `<path d="M60 79 Q72 88 84 77" stroke="${W}" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M66 82.6 l1 2.6 l1.4 -2" stroke="${W}" stroke-width="1.3" fill="none" stroke-linejoin="round"/>`;

  const hand = (x: number, y: number) =>
    `<circle cx="${x}" cy="${y}" r="5.4" fill="${W}" stroke="${INK}" stroke-width="1.2"/><circle cx="${x - 1.7}" cy="${y - 1.7}" r="1.4" fill="#ffd6ef"/>`;
  const arm = (d: string) =>
    `<path d="${d}" stroke="${ARM}" stroke-width="4.6" fill="none" stroke-linecap="round"/>`;
  const restL = arm("M37 82 Q29 90 31 99") + hand(31, 100);
  let arms = "";
  if (pose === "rest")
    arms = restL + arm("M103 82 Q111 90 109 99") + hand(109, 100);
  else if (pose === "grab")
    arms =
      arm("M37 76 Q22 70 18 58") +
      hand(17, 56) +
      arm("M103 76 Q118 70 122 58") +
      hand(123, 56);
  else if (pose === "crossed")
    arms =
      arm("M38 92 Q60 106 86 98") +
      arm("M102 92 Q80 106 54 98") +
      hand(86, 98) +
      hand(54, 98);
  else if (pose === "poke")
    arms =
      restL +
      arm("M103 72 Q114 62 117 52") +
      `<path d="M113 60 L148 38" stroke="#8a5a32" stroke-width="2.6" stroke-linecap="round"/><path d="M136 46 l5 -7 M143 41 l4 -6" stroke="#8a5a32" stroke-width="1.4"/>` +
      hand(117, 52);
  else if (pose === "stomp")
    arms =
      arm("M37 74 Q25 62 27 50") +
      hand(27, 48) +
      arm("M103 74 Q115 62 113 50") +
      hand(113, 48) +
      `<path d="M60 104 v11 M80 104 v11" stroke="${ARM}" stroke-width="5" stroke-linecap="round"/><ellipse cx="58" cy="117" rx="7" ry="3.4" fill="${W}" stroke="${INK}"/><ellipse cx="82" cy="113" rx="7" ry="3.4" fill="${W}" stroke="${INK}"/>`;
  else if (pose === "wave")
    arms = restL + arm("M103 74 Q117 64 119 48") + hand(119, 46);

  let extra = "";
  if (mood === "sleepy")
    extra = `<path d="M44 48 Q66 22 104 40 L120 12 Z" fill="#6a1a8a"/><path d="M58 35 Q78 28 101 40 M74 28 Q90 24 108 33" stroke="${W}" stroke-width="4" fill="none" opacity=".9"/><path d="M42 49 Q70 32 106 44" stroke="${W}" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="121" cy="11" r="6" fill="${W}"/><text x="104" y="74" font-family="monospace" font-size="14" fill="#00e5d0">z</text><text x="112" y="62" font-family="monospace" font-size="18" fill="#00e5d0" opacity=".8">z</text>`;
  else if (mood === "curious")
    extra = `<text x="106" y="40" font-family="monospace" font-size="26" fill="#00e5d0">?</text>`;
  else if (mood === "mourning")
    // black top hat + bow tie for the weekly obituary
    extra = `<path d="M44 40 h52 v4 h-52 Z" fill="#0c0610"/><path d="M54 40 V14 h32 V40 Z" fill="#120a18"/><path d="M54 32 h32 v4 h-32 Z" fill="#6a1a8a"/><path d="M60 104 l-8 -5 v10 Z M80 104 l8 -5 v10 Z" fill="#0c0610"/><circle cx="70" cy="104" r="3" fill="#0c0610"/>`;
  else if (mood === "yawn")
    extra = `<text x="102" y="52" font-family="monospace" font-size="13" fill="#00e5d0" opacity=".8">*yawn*</text>`;
  else if (mood === "dizzy")
    extra = `<g class="vxa-stars"><circle cx="40" cy="30" r="2.4" fill="#00e5d0"/><circle cx="70" cy="22" r="2" fill="#fff"/><circle cx="100" cy="30" r="2.4" fill="#ff8fd4"/></g>`;

  // the mouth sits in its own group so CSS can flap it while he talks
  const face = `${eyes}${lids}${brows}<g class="vxa-mouth">${mouth}</g>`;
  const chroma = red
    ? `<g opacity=".5" transform="translate(-2.4 0)">${face.replaceAll(W, "#ff2d2d")}</g><g opacity=".4" transform="translate(2.4 0)">${face.replaceAll(W, "#2ad8ff")}</g>`
    : "";
  // the rim shows his mood: red angry, grey bored, gold proud, default pink→cyan
  const [rimA, rimB] = red
    ? ["#ff3b2f", "#ffb000"]
    : mood === "judging"
      ? ["#ff5a3c", "#b5533c"]
      : mood === "dormant" || mood === "yawn" || mood === "sleepy"
        ? ["#8a8378", "#4a453d"]
        : mood === "happy"
          ? ["#ffd36a", "#ffb000"]
          : mood === "mourning"
            ? ["#3a3a3a", "#6a1a8a"]
            : ["#ff2d95", "#00e5d0"];
  const [c1, c2, c3, c4] = red
    ? ["#ff6a5a", "#c0150f", "#3a0605", "#0a0101"]
    : ["#ff7ac8", "#e0157f", "#3d0c5c", "#080010"];

  return `<svg viewBox="-10 -6 160 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="overflow:visible;display:block;width:100%;height:100%">
<defs>
<radialGradient id="${id}b" cx="40%" cy="32%" r="72%"><stop offset="0" stop-color="${c1}"/><stop offset=".3" stop-color="${c2}"/><stop offset=".68" stop-color="${c3}"/><stop offset="1" stop-color="${c4}"/></radialGradient>
<linearGradient id="${id}rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${rimA}"/><stop offset="1" stop-color="${rimB}"/></linearGradient>
<radialGradient id="${id}g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${red ? "#ff3b2f" : "#ff2d95"}" stop-opacity=".38"/><stop offset=".6" stop-color="${red ? "#ff3b2f" : "#7a2cff"}" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}es" cx="50%" cy="30%" r="80%"><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#c9b6ff" stop-opacity=".55"/></radialGradient>
<linearGradient id="${id}lid" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${red ? "#7a0a08" : "#c0207a"}"/><stop offset="1" stop-color="${red ? "#4a0605" : "#8a1468"}"/></linearGradient>
<clipPath id="${id}e${LX}"><ellipse cx="${LX}" cy="${EY}" rx="8.6" ry="10.6"/></clipPath>
<clipPath id="${id}e${RX}"><ellipse cx="${RX}" cy="${EY}" rx="8.6" ry="10.6"/></clipPath>
<pattern id="${id}sl" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1.4" fill="#000"/></pattern>
</defs>
<circle class="vxa-aura" cx="70" cy="70" r="66" fill="url(#${id}g)"/>
<g class="vxa-orbit"><circle cx="18" cy="52" r="1.6" fill="#00e5d0"/><circle cx="124" cy="86" r="1.3" fill="#ff8fd4"/><circle cx="104" cy="26" r="1" fill="#fff"/><circle cx="30" cy="112" r="1.1" fill="#00e5d0" opacity=".7"/></g>
<circle cx="70" cy="70" r="36" fill="url(#${id}b)" stroke="url(#${id}rim)" stroke-width="3.2"/>
<circle cx="70" cy="70" r="31.5" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="1"/>
<g class="vxa-swirl"><path d="M70 42 A24 24 0 1 1 46 66" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".42"/><path d="M70 52 A14 14 0 1 1 56 66" fill="none" stroke="${red ? "#ffb000" : "#00e5d0"}" stroke-width="1.6" stroke-linecap="round" opacity=".45"/></g>
<ellipse cx="57" cy="47" rx="9" ry="5" fill="#fff" opacity=".22" transform="rotate(-30 57 47)"/>
${chroma}${face}${arms}${extra}
${red ? `<circle cx="70" cy="70" r="36" fill="url(#${id}sl)" opacity=".38"/>` : ""}
</svg>`;
}
