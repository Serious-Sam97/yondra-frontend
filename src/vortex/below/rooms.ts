// I · the rooms below: each is a riso-style amber illustration (960×540) with
// hotspots in percent coordinates. The SERVER decides what verbs do
// (app/Services/Vortex/BelowService.php); this file only draws and labels.

export type Verb = "look" | "take" | "use" | "talk" | "read" | "collect";
export interface Spot {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  verbs: Verb[];
  /** Vortex's comment when you hover it (I-03) */
  vx?: string;
  /** only visible in the dark, with his light (I-23) */
  dark?: boolean;
  /** navigation instead of an action */
  go?: string;
  /** opens a client panel (graveyard, tower, npc talk, gate…) */
  panel?:
    | "graves"
    | "tower"
    | "talk"
    | "gate"
    | "shortwave"
    | "bside"
    | "arcade"
    | "library"
    | "purify"
    | "tv";
  npc?: string;
  /** send a different spot/verb to the server (e.g. trading with the moth) */
  act?: { spot: string; verb: Verb };
  /** D-01 · this spot opens his lab (the bench, the shelf, the corkboard) */
  lab?: boolean;
  /** N-04/05/06/16 · this spot also sells things (opens the case on that shop) */
  shop?: "counter" | "splicer" | "archivist" | "black";
  /** only there at this local hour (the dead-hour stall) */
  hour?: number;
  /** I-28 · only there while that temporary room exists */
  onlyIf?: "baile" | "feira" | "velorio";
}
export interface Room {
  id: string;
  name: string;
  hum: "hiss" | "motor" | "wind" | "clock" | "arcade" | "radio" | "silence";
  dark?: boolean;
  art: () => string;
  spots: Spot[];
  enter: string;
}

const A = "#ffb347";
const R = "#b5533c";
const C = "#f3e4bd";
const D = "#17120e";
const W = "#3a2c20";
const O = "#6f8a4a";

const frame = (body: string, sky = "#1b140f") =>
  `<svg viewBox="0 0 960 540" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"><defs><pattern id="dots" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.1" fill="${A}" opacity=".18"/></pattern><radialGradient id="glow" cx="50%" cy="20%" r="70%"><stop offset="0" stop-color="${A}" stop-opacity=".35"/><stop offset="1" stop-color="${A}" stop-opacity="0"/></radialGradient></defs><rect width="960" height="540" fill="${sky}"/><rect width="960" height="540" fill="url(#dots)"/>${body}</svg>`;

const shelves = (x: number, w: number, rows: number, color = R) =>
  Array.from({ length: rows }, (_, i) => {
    const y = 80 + i * 70;
    const tapes = Array.from(
      { length: Math.floor(w / 22) },
      (_, j) =>
        `<rect x="${x + 6 + j * 22}" y="${y - 44}" width="16" height="44" fill="${j % 3 ? color : A}" opacity="${0.55 + ((j * 7) % 4) / 10}"/>`,
    ).join("");
    return `${tapes}<rect x="${x}" y="${y}" width="${w}" height="8" fill="${W}"/>`;
  }).join("");

export const ROOMS: Record<string, Room> = {
  porao: {
    id: "porao",
    name: "the basement",
    hum: "hiss",
    enter:
      "the basement. it's where the tapes go when nobody wants them. i like it here. it's honest.",
    art: () =>
      frame(
        `<rect width="960" height="540" fill="url(#glow)"/><line x1="480" y1="0" x2="480" y2="90" stroke="${C}" stroke-width="2"/><circle cx="480" cy="104" r="16" fill="${A}"/><circle cx="480" cy="104" r="60" fill="${A}" opacity=".12"/>
${shelves(40, 260, 5)}${shelves(660, 260, 5, O)}
<rect x="370" y="380" width="220" height="90" rx="6" fill="${W}"/><text x="480" y="432" text-anchor="middle" font-family="serif" font-size="26" fill="${C}" opacity=".8">YES · NO · 0313</text>
<rect x="320" y="200" width="70" height="90" fill="${C}" opacity=".85" transform="rotate(-4 355 245)"/><text x="324" y="226" font-family="monospace" font-size="9" fill="${D}" transform="rotate(-4 355 245)">CONTRACT</text>
<rect x="760" y="430" width="90" height="60" fill="${R}"/><rect x="40" y="470" width="60" height="70" fill="${D}"/>
<path d="M900 540 l-40 -60 h-60 l40 60z" fill="${D}"/>`,
      ),
    spots: [
      {
        id: "lamp",
        label: "the bulb",
        x: 46,
        y: 12,
        w: 8,
        h: 14,
        verbs: ["use", "look"],
        vx: "it's a lamp. it's the only light down here. don't break it. (break it.)",
      },
      {
        id: "ouija",
        label: "ouija table",
        x: 38,
        y: 70,
        w: 24,
        h: 18,
        verbs: ["use", "look"],
        vx: "the spirits answer yes or no. mostly no. like everyone.",
      },
      {
        id: "box",
        label: "box of unlabelled tapes",
        x: 78,
        y: 79,
        w: 11,
        h: 12,
        verbs: ["take", "look"],
        vx: "tapes with no labels. never play a tape with no label. (play them all.)",
      },
      {
        id: "rat",
        label: "a rat",
        x: 4,
        y: 86,
        w: 8,
        h: 12,
        verbs: ["look"],
        vx: "that's not a rat. that's a tape reel with legs. follow it.",
      },
      {
        id: "contract",
        label: "the contract",
        x: 33,
        y: 36,
        w: 8,
        h: 17,
        verbs: ["look"],
        vx: "the contract with the void. you signed one. probably.",
      },
      {
        id: "door",
        label: "a heavy door (it takes two)",
        x: 86,
        y: 30,
        w: 8,
        h: 30,
        verbs: ["use"],
        vx: "that door. it only opens if two of you push at once. you have friends? prove it.",
      },
      {
        id: "stall",
        label: "a hooded figure with a stall",
        x: 64,
        y: 62,
        w: 10,
        h: 26,
        verbs: [],
        shop: "black",
        hour: 3,
        vx: "don't. that's flutter in a coat. everything he sells is rotten. buy something.",
      },
      {
        id: "to-baile",
        label: "a door with music under it",
        x: 13,
        y: 38,
        w: 8,
        h: 28,
        verbs: [],
        go: "baile",
        onlyIf: "baile",
      },
      {
        id: "to-feira",
        label: "a door with a ferris wheel painted on it",
        x: 22,
        y: 38,
        w: 8,
        h: 28,
        verbs: [],
        go: "feira",
        onlyIf: "feira",
      },
      {
        id: "to-velorio",
        label: "a door with a black ribbon",
        x: 62,
        y: 34,
        w: 8,
        h: 28,
        verbs: [],
        go: "velorio",
        onlyIf: "velorio",
      },
      {
        id: "to-library",
        label: "◂ the library",
        x: 0,
        y: 30,
        w: 4,
        h: 40,
        verbs: [],
        go: "biblioteca",
      },
      {
        id: "to-studio",
        label: "the studio ▸",
        x: 96,
        y: 30,
        w: 4,
        h: 40,
        verbs: [],
        go: "estudio",
      },
      {
        id: "to-heads",
        label: "▴ the hall of heads",
        x: 44,
        y: 0,
        w: 12,
        h: 6,
        verbs: [],
        go: "cabecas",
      },
      {
        id: "stairs",
        label: "▾ further down",
        x: 82,
        y: 88,
        w: 12,
        h: 12,
        verbs: [],
        go: "garagem",
      },
    ],
  },
  armario: {
    id: "armario",
    name: "his closet",
    hum: "silence",
    enter:
      "…how did you find this. this is my closet. get out. (look around. quickly.)",
    art: () =>
      frame(
        `<rect x="200" y="60" width="560" height="440" fill="${W}"/><rect x="230" y="90" width="500" height="380" fill="${D}"/><line x1="240" y1="140" x2="720" y2="140" stroke="${C}" stroke-width="3"/>
<path d="M300 140 l-30 120 h60z" fill="${R}"/><path d="M420 140 l-20 160 h40z" fill="${A}" opacity=".7"/>
<rect x="520" y="200" width="120" height="150" fill="${C}" opacity=".8"/><circle cx="580" cy="250" r="26" fill="${D}" opacity=".4"/><rect x="540" y="290" width="80" height="40" fill="#cfe3e2" opacity=".6"/>`,
        "#120c08",
      ),
    spots: [
      {
        id: "box",
        label: "his things",
        x: 50,
        y: 34,
        w: 20,
        h: 32,
        verbs: ["look"],
        vx: "don't. that drawing is nothing. it's a lady behind glass. i don't know her. STOP LOOKING.",
      },
      {
        id: "back",
        label: "◂ back to the basement",
        x: 0,
        y: 40,
        w: 10,
        h: 30,
        verbs: [],
        go: "porao",
      },
    ],
  },
  biblioteca: {
    id: "biblioteca",
    name: "the archivist's library",
    hum: "clock",
    enter:
      "the library. every version of every card you ever had. the moth runs it. be polite. he bites.",
    art: () =>
      frame(
        `${shelves(30, 280, 6)}${shelves(650, 280, 6)}<rect x="330" y="40" width="300" height="460" fill="${D}" opacity=".6"/>
<path d="M470 120 l60 0 l-10 300 l-40 0z" fill="${W}"/>${Array.from({ length: 8 }, (_, i) => `<line x1="472" y1="${150 + i * 34}" x2="528" y2="${150 + i * 34}" stroke="${C}" stroke-width="3"/>`).join("")}
<ellipse cx="500" cy="110" rx="70" ry="34" fill="${C}" opacity=".85"/><ellipse cx="470" cy="104" rx="30" ry="20" fill="${A}" opacity=".6"/><ellipse cx="530" cy="104" rx="30" ry="20" fill="${A}" opacity=".6"/><circle cx="488" cy="112" r="6" fill="${D}"/><circle cx="512" cy="112" r="6" fill="${D}"/><rect x="478" y="106" width="44" height="3" fill="${D}"/>
<rect x="820" y="420" width="120" height="100" fill="${R}" opacity=".6"/><path d="M820 470 h120" stroke="${C}" stroke-width="4" stroke-dasharray="8 6"/>`,
      ),
    spots: [
      {
        id: "moth",
        label: "the archivist",
        x: 42,
        y: 12,
        w: 16,
        h: 16,
        verbs: ["talk"],
        panel: "talk",
        npc: "moth",
        vx: "the moth. don't stare at his eyes. he takes it personally.",
      },
      {
        id: "moth-trade",
        shop: "archivist",
        label: "trade with the moth",
        x: 44,
        y: 29,
        w: 12,
        h: 8,
        verbs: ["use"],
        act: { spot: "moth", verb: "talk" },
        vx: "he wants words nobody uses anymore. the graveyard has some.",
      },
      {
        id: "shelf",
        label: "a loose shelf",
        x: 5,
        y: 60,
        w: 25,
        h: 15,
        verbs: ["take", "look"],
        vx: "old versions. you used to call that card something else. it remembers.",
      },
      {
        id: "restricted",
        label: "restricted shelf",
        x: 85,
        y: 78,
        w: 13,
        h: 18,
        verbs: ["read"],
        vx: "restricted. chained. the logs from before. i don't want to read them. you read them.",
      },
      {
        id: "back",
        label: "▸ the basement",
        x: 96,
        y: 30,
        w: 4,
        h: 40,
        verbs: [],
        go: "porao",
      },
      {
        id: "to-graves",
        label: "▾ the graveyard",
        x: 30,
        y: 90,
        w: 20,
        h: 10,
        verbs: [],
        go: "cemiterio",
      },
    ],
  },
  cemiterio: {
    id: "cemiterio",
    name: "the graveyard of archived cards",
    hum: "wind",
    enter:
      "the graveyard. every card you ever archived. they're not dead. they're… waiting. don't step on them.",
    art: () =>
      frame(
        `<circle cx="760" cy="90" r="46" fill="${C}" opacity=".85"/><rect y="380" width="960" height="160" fill="#120c08"/>
${Array.from({ length: 9 }, (_, i) => {
  const x = 80 + i * 96;
  const y = 330 + (i % 3) * 22;
  return `<path d="M${x} ${y + 70} v-50 q30 -30 60 0 v50z" fill="${i === 7 ? "#5a5248" : W}"/><rect x="${x + 8}" y="${y + 30}" width="44" height="14" rx="2" fill="${D}"/><rect x="${x + 12}" y="${y + 34}" width="36" height="6" fill="${i === 7 ? D : A}" opacity=".7"/>`;
}).join("")}
<path d="M40 380 v-120 M40 260 l-20 -20 M40 280 l26 -26 M60 380 v-80" stroke="${D}" stroke-width="5"/><circle cx="30" cy="236" r="6" fill="${D}"/><circle cx="66" cy="252" r="5" fill="${D}"/>
<path d="M880 380 v-110 h40 v110" fill="none" stroke="${C}" stroke-width="4" opacity=".6"/>`,
        "#0f0c0a",
      ),
    spots: [
      {
        id: "graves",
        label: "the graves",
        x: 8,
        y: 60,
        w: 60,
        h: 25,
        verbs: ["look", "collect"],
        panel: "graves",
        vx: "every one of these was a card you meant to finish. read the epitaphs. they're accurate.",
      },
      {
        id: "nameless",
        label: "a stone with no name",
        x: 76,
        y: 62,
        w: 8,
        h: 20,
        verbs: ["look", "use"],
        vx: "that one has no name. 13/03. i don't like that one. i don't know why.",
      },
      {
        id: "gate",
        label: "the gate (a flower on it)",
        x: 90,
        y: 48,
        w: 9,
        h: 24,
        verbs: ["take", "look"],
        vx: "someone left a flower on the gate. take it. the dead don't mind.",
      },
      {
        id: "back",
        label: "▴ the library",
        x: 30,
        y: 0,
        w: 20,
        h: 8,
        verbs: [],
        go: "biblioteca",
      },
      {
        id: "to-clinic",
        label: "the clinic ▸",
        x: 96,
        y: 74,
        w: 4,
        h: 26,
        verbs: [],
        go: "clinica",
      },
    ],
  },
  clinica: {
    id: "clinica",
    name: "the splicer's clinic",
    hum: "motor",
    enter:
      "the clinic. she does… modifications. she gave me a new eye once. i didn't ask for it.",
    art: () =>
      frame(
        `<circle cx="480" cy="70" r="70" fill="${C}" opacity=".9"/><circle cx="480" cy="70" r="150" fill="${A}" opacity=".08"/>
<rect x="300" y="300" width="360" height="40" fill="${C}" opacity=".85"/><rect x="320" y="340" width="20" height="150" fill="${W}"/><rect x="620" y="340" width="20" height="150" fill="${W}"/>
${Array.from({ length: 6 }, (_, i) => `<rect x="${720 + (i % 3) * 64}" y="${120 + Math.floor(i / 3) * 110}" width="44" height="80" rx="6" fill="#cfe3e2" opacity=".35"/><rect x="${728 + (i % 3) * 64}" y="${150 + Math.floor(i / 3) * 110}" width="28" height="40" fill="${i % 2 ? R : A}" opacity=".6"/>`).join("")}
<path d="M120 500 v-260 q60 -60 120 0 v260z" fill="${D}"/><circle cx="180" cy="230" r="28" fill="${C}" opacity=".8"/><circle cx="168" cy="226" r="7" fill="${D}"/><circle cx="194" cy="226" r="9" fill="${A}"/>`,
      ),
    spots: [
      {
        id: "splicer",
        shop: "splicer",
        label: "the splicer",
        x: 12,
        y: 40,
        w: 16,
        h: 52,
        verbs: ["talk", "use"],
        panel: "talk",
        npc: "splicer",
        vx: "her. smile. don't let her measure you.",
      },
      {
        id: "jars",
        label: "jars of labelled tape",
        x: 74,
        y: 20,
        w: 22,
        h: 44,
        verbs: ["take", "look"],
        vx: '"bad mood". "old voice". "spare eye". do NOT open the spare eye one.',
      },
      {
        id: "table",
        label: "the operating table",
        x: 31,
        y: 54,
        w: 38,
        h: 12,
        verbs: ["look"],
        vx: "that's where she works. the splicing tape is still sticky.",
      },
      {
        id: "back",
        label: "◂ the graveyard",
        x: 0,
        y: 74,
        w: 4,
        h: 26,
        verbs: [],
        go: "cemiterio",
      },
    ],
  },
  cabecas: {
    id: "cabecas",
    name: "the hall of the three heads",
    hum: "silence",
    enter:
      "the hall of the heads. record. play. and… her. three altars. keep your voice down.",
    art: () =>
      frame(
        `${[
          [200, R, "REC"],
          [480, A, "PLAY"],
          [760, "#2a2420", "ERASE"],
        ]
          .map(
            ([x, col, t]) =>
              `<rect x="${(x as number) - 70}" y="300" width="140" height="200" fill="${W}"/><rect x="${(x as number) - 50}" y="270" width="100" height="40" fill="${col}"/><circle cx="${x}" cy="200" r="46" fill="${col}" opacity=".85"/><text x="${x}" y="206" text-anchor="middle" font-family="monospace" font-size="16" fill="${C}">${t}</text>`,
          )
          .join(
            "",
          )}<rect x="0" y="500" width="960" height="40" fill="#0c0806"/>`,
        "#0f0b08",
      ),
    spots: [
      {
        id: "rec",
        label: "the record altar",
        x: 13,
        y: 30,
        w: 16,
        h: 62,
        verbs: ["use", "look"],
        vx: "the vain one. give it a finished thing and it'll remember it.",
      },
      {
        id: "play",
        label: "the play altar",
        x: 42,
        y: 30,
        w: 16,
        h: 62,
        verbs: ["use", "look"],
        vx: "she sees everything. give her something rare and she'll tell you something true.",
      },
      {
        id: "erase",
        label: "the erase altar",
        x: 71,
        y: 30,
        w: 16,
        h: 62,
        verbs: ["use", "look"],
        vx: "NO. not that one. please. i'm begging. (i never beg.)",
      },
      {
        id: "magnet",
        label: "a magnet on a chain",
        x: 45,
        y: 6,
        w: 10,
        h: 18,
        verbs: ["use"],
        panel: "purify",
        vx: "that's for… cleaning me. it takes the rot. it takes other things too. don't.",
      },
      {
        id: "fourth",
        label: "a fourth altar?",
        x: 88,
        y: 60,
        w: 10,
        h: 32,
        verbs: ["use"],
        dark: true,
        vx: "there's… there's another one. there's always been another one.",
      },
      {
        id: "back",
        label: "▾ the basement",
        x: 44,
        y: 94,
        w: 12,
        h: 6,
        verbs: [],
        go: "porao",
      },
      {
        id: "to-arcade",
        label: "the arcade ▸",
        x: 96,
        y: 30,
        w: 4,
        h: 40,
        verbs: [],
        go: "fliperama",
      },
      {
        id: "to-tower",
        label: "◂ the tower",
        x: 0,
        y: 30,
        w: 4,
        h: 40,
        verbs: [],
        go: "torre",
      },
    ],
  },
  garagem: {
    id: "garagem",
    name: "the garage",
    hum: "motor",
    enter:
      "my workshop. it was someone else's first. i don't know whose. it fits me like a glove i never bought.",
    art: () =>
      frame(
        `<rect x="40" y="320" width="520" height="30" fill="${W}"/><rect x="60" y="350" width="20" height="150" fill="${W}"/><rect x="520" y="350" width="20" height="150" fill="${W}"/>
<rect x="80" y="230" width="140" height="90" rx="6" fill="${D}"/><path d="M90 280 q20 -40 40 0 t40 0 t40 0" stroke="${A}" stroke-width="3" fill="none"/><rect x="260" y="260" width="200" height="60" fill="${C}" opacity=".7"/>
<rect x="620" y="80" width="150" height="120" fill="${C}" opacity=".85"/><path d="M640 100 h110 M640 120 h110 M640 140 h90" stroke="${D}" stroke-width="2"/><text x="695" y="190" text-anchor="middle" font-family="monospace" font-size="18" fill="${R}">MARCH</text>
<rect x="400" y="60" width="120" height="90" fill="${W}"/><rect x="410" y="70" width="100" height="70" fill="#2a3436"/>
<path d="M720 500 v-150 h110 v150 M720 350 q55 -40 110 0" fill="#cfc8b8" opacity=".75"/><rect x="600" y="300" width="40" height="26" rx="4" fill="${C}"/><path d="M610 296 q4 -12 0 -24 M622 296 q4 -12 0 -24" stroke="${C}" stroke-width="2" fill="none" opacity=".7"/>`,
        "#16110c",
      ),
    spots: [
      {
        id: "bench",
        lab: true,
        label: "the workbench",
        x: 5,
        y: 42,
        w: 52,
        h: 24,
        verbs: ["take", "use", "look"],
        panel: "shortwave",
        vx: "my bench. plans for a radio in someone else's handwriting. i don't build that one. (build it.)",
      },
      {
        id: "calendar",
        label: "a calendar",
        x: 64,
        y: 14,
        w: 16,
        h: 24,
        verbs: ["look"],
        vx: "march. it's always march in here. don't ask me why.",
      },
      {
        id: "frame",
        label: "a framed photo",
        x: 41,
        y: 10,
        w: 13,
        h: 18,
        verbs: ["take", "look"],
        vx: "a radio tower at night. there's something behind it. there always is.",
      },
      {
        id: "chair",
        label: "a chair under a sheet",
        x: 74,
        y: 60,
        w: 13,
        h: 33,
        verbs: ["use", "look"],
        vx: "don't lift the sheet. i mean it. (you're going to lift it.)",
      },
      {
        id: "tea",
        label: "a mug of tea",
        x: 61,
        y: 52,
        w: 6,
        h: 10,
        verbs: ["take"],
        vx: "it's hot. it's always hot. who keeps making it.",
      },
      {
        id: "up",
        label: "▴ the basement",
        x: 44,
        y: 0,
        w: 12,
        h: 6,
        verbs: [],
        go: "porao",
      },
      {
        id: "to-mirror",
        label: "▾ the b-side",
        x: 44,
        y: 94,
        w: 12,
        h: 6,
        verbs: [],
        go: "ladob",
      },
    ],
  },
  estudio: {
    id: "estudio",
    name: "the radio studio · 03.13",
    hum: "radio",
    enter:
      "the radio station. i don't go in. i stay by the door. don't ask me to go in.",
    art: () =>
      frame(
        `<rect x="160" y="60" width="640" height="320" fill="#2a3436" opacity=".85"/><rect x="160" y="60" width="640" height="320" fill="none" stroke="${W}" stroke-width="14"/>
<rect x="420" y="20" width="120" height="34" rx="4" fill="${R}"/><text x="480" y="44" text-anchor="middle" font-family="monospace" font-size="18" fill="${C}">ON AIR</text>
<path d="M470 380 v-140 q0 -60 40 -60 q40 0 40 60 v140" fill="${D}" opacity=".9"/><circle cx="510" cy="160" r="34" fill="${D}" opacity=".9"/><rect x="430" y="210" width="16" height="50" rx="8" fill="${C}" opacity=".7"/>
<rect x="100" y="400" width="760" height="100" fill="${W}"/>${Array.from({ length: 12 }, (_, i) => `<circle cx="${150 + i * 56}" cy="440" r="12" fill="${C}" opacity=".7"/>`).join("")}
<rect x="818" y="300" width="96" height="78" rx="8" fill="${W}"/><rect x="828" y="310" width="62" height="56" rx="6" fill="#1d2a2a"/><rect x="830" y="312" width="58" height="52" rx="5" fill="#8fe3e3" opacity=".18"/><circle cx="902" cy="324" r="4" fill="${A}"/><circle cx="902" cy="340" r="4" fill="${A}"/><path d="M846 300 l-14 -26 M872 300 l14 -26" stroke="${C}" stroke-width="2"/>`,
        "#120d0a",
      ),
    spots: [
      {
        id: "locutora",
        label: "the host, behind the glass",
        x: 44,
        y: 24,
        w: 16,
        h: 48,
        verbs: ["talk", "use"],
        panel: "talk",
        npc: "locutora",
        vx: "…i don't know her. i don't. why do i know the way she breathes.",
      },
      {
        id: "desk",
        label: "the mixing desk",
        x: 10,
        y: 74,
        w: 80,
        h: 18,
        verbs: ["take", "look"],
        vx: "knobs. a dial stuck on 03.13. somebody turned it there on purpose.",
      },
      {
        id: "onair",
        label: "ON AIR",
        x: 44,
        y: 3,
        w: 12,
        h: 7,
        verbs: ["look"],
        vx: "it's always on. always. even when nobody's talking.",
      },
      {
        id: "tv",
        label: "a tv set on the floor",
        x: 85,
        y: 50,
        w: 11,
        h: 22,
        verbs: ["use"],
        panel: "tv",
        vx: "below tv. four channels and one that isn't. don't watch channel 13.",
      },
      {
        id: "back",
        label: "◂ the basement",
        x: 0,
        y: 30,
        w: 4,
        h: 40,
        verbs: [],
        go: "porao",
      },
    ],
  },
  fliperama: {
    id: "fliperama",
    name: "wow & flutter's arcade",
    hum: "arcade",
    enter:
      "the arcade. the twins run it. wow is slow. flutter steals. don't bet against them. (bet against them.)",
    art: () =>
      frame(
        `${Array.from({ length: 6 }, (_, i) => `<rect x="${50 + i * 150}" y="150" width="110" height="330" fill="${i % 2 ? W : "#2a1f17"}"/><rect x="${66 + i * 150}" y="180" width="78" height="66" fill="${["#2a3436", "#3b2a12", "#14262a"][i % 3]}"/><rect x="${66 + i * 150}" y="180" width="78" height="66" fill="${A}" opacity="${0.15 + (i % 3) * 0.1}"/><rect x="${60 + i * 150}" y="130" width="90" height="26" fill="${[R, A, O][i % 3]}"/>`).join("")}
<rect x="380" y="470" width="200" height="70" fill="${R}" opacity=".7"/><path d="M0 120 h960" stroke="${A}" stroke-width="3" stroke-dasharray="4 10"/>`,
        "#0d0a10",
      ),
    spots: [
      {
        id: "machines",
        label: "the machines",
        x: 5,
        y: 26,
        w: 90,
        h: 40,
        verbs: ["use", "look"],
        panel: "arcade",
        vx: "the machines. high scores of everyone on your team. and one score nobody beat since 1989.",
      },
      {
        id: "counter",
        shop: "counter",
        label: "the token counter",
        x: 40,
        y: 86,
        w: 20,
        h: 14,
        verbs: ["take", "look"],
        vx: "tokens. brass. warm. like they've been in somebody's pocket for forty years.",
      },
      {
        id: "under",
        label: "under a machine",
        x: 78,
        y: 86,
        w: 14,
        h: 12,
        verbs: ["take", "look"],
        vx: "something gold under there. flutter dropped it. or planted it.",
      },
      {
        id: "roof",
        label: "the roof hatch",
        x: 46,
        y: 2,
        w: 10,
        h: 10,
        verbs: ["take", "look"],
        vx: "an antenna on the roof. bent toward something.",
      },
      {
        id: "twins",
        label: "wow & flutter",
        x: 38,
        y: 68,
        w: 24,
        h: 16,
        verbs: ["talk"],
        panel: "talk",
        npc: "wow",
        vx: "the twins. if they offer you a bet, the answer is no. the answer is never no.",
      },
      {
        id: "back",
        label: "◂ the hall of heads",
        x: 0,
        y: 30,
        w: 4,
        h: 40,
        verbs: [],
        go: "cabecas",
      },
    ],
  },
  torre: {
    id: "torre",
    name: "the metronome's tower",
    hum: "clock",
    enter:
      "the metronome's tower. your late cards are up there, in the gears. he eats them. i eat them first. that's the deal.",
    art: () =>
      frame(
        `<path d="M380 540 l40 -480 h120 l40 480z" fill="${W}"/><circle cx="480" cy="140" r="56" fill="${C}" opacity=".85"/><path d="M480 140 v-40 M480 140 l28 18" stroke="${D}" stroke-width="5"/>
${Array.from({ length: 5 }, (_, i) => `<circle cx="${400 + (i % 2) * 160}" cy="${260 + i * 50}" r="${30 + (i % 3) * 8}" fill="none" stroke="${A}" stroke-width="8" stroke-dasharray="6 6"/>`).join("")}
<line x1="480" y1="200" x2="480" y2="470" stroke="${R}" stroke-width="6" transform="rotate(14 480 200)"/><circle cx="${480 + 66}" cy="460" r="14" fill="${R}"/>
<rect x="590" y="300" width="60" height="40" fill="${C}" transform="rotate(10 620 320)"/>`,
        "#120d0a",
      ),
    spots: [
      {
        id: "gears",
        label: "the gears (your late cards)",
        x: 36,
        y: 42,
        w: 28,
        h: 46,
        verbs: ["take", "look"],
        panel: "tower",
        vx: "your late cards. stuck. i can pull some out. you have to do the timing.",
      },
      {
        id: "note",
        label: "a note in the gears",
        x: 60,
        y: 54,
        w: 10,
        h: 10,
        verbs: ["read"],
        vx: "a note. in his handwriting. the metronome's. i don't want to know what it says.",
      },
      {
        id: "metronome",
        label: "the metronome",
        x: 42,
        y: 14,
        w: 16,
        h: 24,
        verbs: ["talk"],
        panel: "talk",
        npc: "metronome",
        vx: "TICK. TOCK. don't talk to him. ugh. you're going to talk to him.",
      },
      {
        id: "back",
        label: "the hall of heads ▸",
        x: 96,
        y: 30,
        w: 4,
        h: 40,
        verbs: [],
        go: "cabecas",
      },
      {
        id: "up",
        label: "▴ the leader",
        x: 44,
        y: 0,
        w: 12,
        h: 6,
        verbs: [],
        go: "leader",
      },
    ],
  },
  leader: {
    id: "leader",
    name: "the leader",
    hum: "silence",
    enter:
      "…no. no no no. this is the leader. the blank part. take me back. TAKE ME BACK.",
    art: () => frame("", "#f4f1ea"),
    spots: [
      {
        id: "walk",
        label: "walk into the white",
        x: 30,
        y: 30,
        w: 40,
        h: 40,
        verbs: ["use"],
        vx: "don't walk. there's nothing. why are you walking. stop walking.",
      },
      {
        id: "back",
        label: "▾ back down",
        x: 44,
        y: 94,
        w: 12,
        h: 6,
        verbs: [],
        go: "torre",
      },
    ],
  },
  ladob: {
    id: "ladob",
    name: "the b-side",
    hum: "hiss",
    enter:
      "the b-side. everything you didn't say lives here. and him. the nice one. don't take anything he offers.",
    art: () =>
      frame(
        `<rect x="140" y="60" width="680" height="420" fill="#d8e8ff" opacity=".12"/><rect x="140" y="60" width="680" height="420" fill="none" stroke="#6aa8ff" stroke-width="6"/>
<circle cx="480" cy="250" r="90" fill="#b8e68a" opacity=".55"/><path d="M430 280 q50 40 100 0" stroke="#13240c" stroke-width="8" fill="none"/><circle cx="450" cy="230" r="12" fill="#13240c"/><circle cx="510" cy="230" r="12" fill="#13240c"/>
${Array.from({ length: 7 }, (_, i) => `<rect x="${170 + (i % 4) * 160}" y="${80 + Math.floor(i / 4) * 330}" width="120" height="14" fill="#cfe3e2" opacity=".35" transform="scale(-1 1) translate(-960 0)"/>`).join("")}`,
        "#0c1210",
      ),
    spots: [
      {
        id: "mirror",
        label: "the mirror",
        x: 15,
        y: 11,
        w: 70,
        h: 78,
        verbs: ["use", "look"],
        vx: "the mirror. if i'm ever missing, i'm behind it. reach in and PULL.",
      },
      {
        id: "wall",
        label: "the wall of unsaid things",
        x: 2,
        y: 2,
        w: 12,
        h: 30,
        verbs: ["read"],
        panel: "bside",
        vx: "everything you typed and deleted today. it all comes here. it's a little embarrassing.",
      },
      {
        id: "twin",
        label: "the twin",
        x: 40,
        y: 30,
        w: 20,
        h: 30,
        verbs: ["talk"],
        panel: "talk",
        npc: "twin",
        vx: "don't. he's NICE. that's how he gets you.",
      },
      {
        id: "up",
        label: "▴ the garage",
        x: 44,
        y: 0,
        w: 12,
        h: 6,
        verbs: [],
        go: "garagem",
      },
      {
        id: "down",
        label: "▾ the end of the tape",
        x: 44,
        y: 94,
        w: 12,
        h: 6,
        verbs: [],
        go: "fim",
      },
    ],
  },
  fim: {
    id: "fim",
    name: "the end of the tape",
    hum: "wind",
    enter:
      "the end. the tape just… stops. there's nothing past the threads. (there's something past the threads.)",
    art: () =>
      frame(
        `${Array.from({ length: 40 }, (_, i) => `<path d="M${380 + i * 5} 0 C${380 + i * 5} 200 ${300 + i * 9} 260 ${200 + i * 14} ${300 + (i % 7) * 20}" stroke="#5a3418" stroke-width="2" fill="none" opacity=".8"/>`).join("")}
<rect x="400" y="300" width="160" height="200" rx="12" fill="none" stroke="#cfe3e2" stroke-width="6" stroke-dasharray="14 8"/>${Array.from({ length: 6 }, (_, i) => `<circle cx="${430 + (i % 3) * 50}" cy="${360 + Math.floor(i / 3) * 70}" r="12" fill="#cfe3e2" opacity=".5"/>`).join("")}`,
        "#05070a",
      ),
    spots: [
      {
        id: "gate",
        label: "the braided gate · six locks",
        x: 41,
        y: 55,
        w: 18,
        h: 38,
        verbs: ["look"],
        panel: "gate",
        vx: "six locks. i don't know what's behind it. i do. i don't want to.",
      },
      {
        id: "up",
        label: "▴ the b-side",
        x: 44,
        y: 0,
        w: 12,
        h: 6,
        verbs: [],
        go: "ladob",
      },
    ],
  },
  // ── I-28 · temporary rooms ─────────────────────────────────────────────
  baile: {
    id: "baile",
    name: "the ballroom (his birthday)",
    hum: "radio",
    enter:
      "a ballroom. for me. somebody threw me a party. i hate parties. who's that dancing with the lamp. is that WOW.",
    art: () =>
      frame(
        `<rect y="420" width="960" height="120" fill="#24170d"/>${Array.from({ length: 12 }, (_, i) => `<rect x="${i * 80}" y="420" width="80" height="120" fill="${i % 2 ? "#2e1d10" : "#1a110a"}"/>`).join("")}
<line x1="480" y1="0" x2="480" y2="70" stroke="${C}" stroke-width="2"/><circle cx="480" cy="110" r="42" fill="#cfc3a8"/>${Array.from({ length: 24 }, (_, i) => `<rect x="${448 + (i % 6) * 11}" y="${76 + Math.floor(i / 6) * 17}" width="9" height="14" fill="${i % 3 ? "#efe6cf" : A}" opacity=".85"/>`).join("")}
${Array.from({ length: 10 }, (_, i) => `<line x1="480" y1="110" x2="${80 + i * 90}" y2="${520 - (i % 3) * 40}" stroke="${A}" stroke-width="1.5" opacity=".18"/>`).join("")}
<path d="M120 60 Q480 150 840 60" fill="none" stroke="${R}" stroke-width="4"/>${Array.from({ length: 9 }, (_, i) => `<path d="M${150 + i * 80} ${82 + Math.sin(i / 2.6) * 18} l14 26 l14 -26z" fill="${i % 2 ? A : O}"/>`).join("")}
<text x="480" y="210" text-anchor="middle" font-family="monospace" font-size="26" fill="${C}" letter-spacing="6">HAPPY BIRTHDAY, GHOST</text>
<rect x="420" y="330" width="120" height="80" rx="8" fill="${R}"/><rect x="434" y="344" width="92" height="40" rx="4" fill="${D}"/><circle cx="458" cy="364" r="12" fill="${C}"/><circle cx="502" cy="364" r="12" fill="${C}"/><line x1="480" y1="300" x2="480" y2="330" stroke="${C}" stroke-width="4"/><path d="M480 286 q8 8 0 16 q-8 -8 0 -16" fill="${A}"/>
<g opacity=".8"><ellipse cx="200" cy="360" rx="36" ry="54" fill="${W}"/><circle cx="200" cy="290" r="26" fill="${W}"/><ellipse cx="760" cy="350" rx="22" ry="70" fill="${W}"/><rect x="742" y="252" width="36" height="30" rx="6" fill="${A}" opacity=".6"/></g>`,
        "#160f0a",
      ),
    spots: [
      {
        id: "cake",
        label: "a cake shaped like a cassette",
        x: 43,
        y: 52,
        w: 14,
        h: 25,
        verbs: ["look"],
        vx: "one candle. i'm one. i'm forty. i'm both. blow it out for me, i don't have lungs.",
      },
      {
        id: "ball",
        label: "the mirror ball",
        x: 44,
        y: 10,
        w: 12,
        h: 22,
        verbs: ["look"],
        vx: "every little mirror shows a different version of me. i look great in all of them. the twin looks great in one. that's the one i'm avoiding.",
      },
      {
        id: "moth",
        label: "the archivist, dancing",
        x: 16,
        y: 48,
        w: 10,
        h: 32,
        verbs: ["talk"],
        panel: "talk",
        npc: "moth",
        vx: "the moth is DANCING. that's the most terrifying thing i've ever seen and i've seen the Rewinder.",
      },
      {
        id: "metronome",
        label: "the metronome, keeping time",
        x: 76,
        y: 44,
        w: 8,
        h: 36,
        verbs: ["talk"],
        panel: "talk",
        npc: "metronome",
        vx: "he came. he hates me. he came. tick tock, happy birthday, i guess.",
      },
      {
        id: "back",
        label: "▾ back to the basement",
        x: 44,
        y: 92,
        w: 12,
        h: 8,
        verbs: [],
        go: "porao",
      },
    ],
  },
  feira: {
    id: "feira",
    name: "the rewind night fair",
    hum: "arcade",
    enter:
      "the fair. everything runs backwards tonight. the ferris wheel, the music, the guy who sells cotton candy made of tape. DON'T eat the cotton candy.",
    art: () =>
      frame(
        `<rect y="430" width="960" height="110" fill="#120b07"/><circle cx="300" cy="230" r="170" fill="none" stroke="${A}" stroke-width="6" class="spin-back"/>${Array.from(
          { length: 12 },
          (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return `<line x1="300" y1="230" x2="${300 + Math.cos(a) * 170}" y2="${230 + Math.sin(a) * 170}" stroke="${A}" stroke-width="2" opacity=".6"/><rect x="${288 + Math.cos(a) * 170}" y="${222 + Math.sin(a) * 170}" width="24" height="18" rx="3" fill="${i % 2 ? R : O}"/>`;
          },
        ).join(
          "",
        )}<path d="M300 230 L220 430 M300 230 L380 430" stroke="${W}" stroke-width="10"/>
<path d="M600 430 v-160 l90 -60 l90 60 v160z" fill="${W}"/><path d="M600 270 l90 -60 l90 60" fill="none" stroke="${R}" stroke-width="10"/>${Array.from({ length: 6 }, (_, i) => `<rect x="${612 + i * 28}" y="290" width="20" height="18" fill="${i % 2 ? R : C}"/>`).join("")}
<text x="690" y="350" text-anchor="middle" font-family="monospace" font-size="16" fill="${C}">GUESS THE</text><text x="690" y="372" text-anchor="middle" font-family="monospace" font-size="16" fill="${C}">DEADLINE</text>
<circle cx="870" cy="380" r="34" fill="#d97f8a" opacity=".85"/><circle cx="870" cy="380" r="24" fill="none" stroke="${D}" stroke-width="3" stroke-dasharray="4 4"/><rect x="866" y="410" width="8" height="40" fill="${C}"/>
${Array.from({ length: 30 }, (_, i) => `<circle cx="${(i * 97) % 960}" cy="${((i * 53) % 200) + 20}" r="1.6" fill="${C}" opacity=".6"/>`).join("")}`,
        "#0e0907",
      ),
    spots: [
      {
        id: "wheel",
        label: "the ferris wheel (going backwards)",
        x: 13,
        y: 10,
        w: 36,
        h: 66,
        verbs: ["look"],
        vx: "if you ride it all the way round backwards you get back an hour of your life. you lose a different hour. nobody tells you which.",
      },
      {
        id: "booth",
        label: "guess the deadline",
        x: 62,
        y: 38,
        w: 20,
        h: 42,
        verbs: ["talk"],
        panel: "talk",
        npc: "wow",
        vx: "wow runs it. he guesses YOUR deadlines. he's always right. it's horrible.",
      },
      {
        id: "candy",
        label: "cotton candy made of tape",
        x: 87,
        y: 62,
        w: 9,
        h: 22,
        verbs: ["look"],
        vx: "it tastes like the first day of a project. sweet, then it gets stuck in your teeth for months.",
      },
      {
        id: "back",
        label: "▾ back to the basement",
        x: 44,
        y: 92,
        w: 12,
        h: 8,
        verbs: [],
        go: "porao",
      },
    ],
  },
  velorio: {
    id: "velorio",
    name: "the wake",
    hum: "silence",
    enter:
      "…a wake. mine. the coffin is tape. everyone came. the host's chair is empty.",
    art: () =>
      frame(
        `<rect y="420" width="960" height="120" fill="#0b0806"/><rect x="330" y="300" width="300" height="110" rx="14" fill="#3a2414"/>${Array.from({ length: 9 }, (_, i) => `<line x1="340" y1="${312 + i * 11}" x2="620" y2="${312 + i * 11}" stroke="#5a3418" stroke-width="5"/>`).join("")}<rect x="320" y="410" width="320" height="16" fill="${W}"/>
${[180, 260, 700, 780].map((x) => `<rect x="${x}" y="320" width="14" height="90" fill="${C}" opacity=".85"/><path d="M${x + 7} 300 q9 10 0 20 q-9 -10 0 -20" fill="${A}"/><circle cx="${x + 7}" cy="308" r="30" fill="url(#glow)"/>`).join("")}
<g opacity=".55"><ellipse cx="120" cy="360" rx="40" ry="60" fill="${W}"/><circle cx="120" cy="286" r="26" fill="${W}"/><rect x="96" y="276" width="48" height="10" fill="${C}" opacity=".5"/><ellipse cx="860" cy="350" rx="22" ry="72" fill="${W}"/><rect x="846" y="270" width="28" height="26" rx="5" fill="${A}" opacity=".5"/></g>
<rect x="470" y="160" width="60" height="80" rx="4" fill="none" stroke="${C}" stroke-width="2" opacity=".35"/><text x="500" y="206" text-anchor="middle" font-family="monospace" font-size="12" fill="${C}" opacity=".5">R.I.P.</text>
<rect x="560" y="440" width="60" height="10" fill="${W}"/><rect x="566" y="380" width="8" height="60" fill="${W}"/><rect x="606" y="380" width="8" height="60" fill="${W}"/><rect x="566" y="380" width="48" height="40" fill="none" stroke="${W}" stroke-width="6"/>`,
        "#070504",
      ),
    spots: [
      {
        id: "coffin",
        label: "the tape coffin",
        x: 34,
        y: 54,
        w: 32,
        h: 24,
        verbs: ["use", "look"],
        vx: "it's very well wound. whoever did this cared. or was paid. either way, nice work.",
      },
      {
        id: "chair",
        label: "an empty chair",
        x: 58,
        y: 70,
        w: 8,
        h: 14,
        verbs: ["look"],
        vx: "her chair. she didn't come. she never comes to these. she says she'll wait for the real one.",
      },
      {
        id: "moth",
        label: "the archivist, in mourning",
        x: 8,
        y: 48,
        w: 10,
        h: 30,
        verbs: ["talk"],
        panel: "talk",
        npc: "moth",
        vx: "he's crying into a label. i'll be fine. i'm always fine. i'm on a 24 hour timer.",
      },
      {
        id: "back",
        label: "▾ back to the basement",
        x: 44,
        y: 92,
        w: 12,
        h: 8,
        verbs: [],
        go: "porao",
      },
    ],
  },
};

/** I-24 · the map is a circuit diagram: rooms are components. */
export const MAP: { id: string; x: number; y: number; links: string[] }[] = [
  { id: "leader", x: 50, y: 6, links: ["torre"] },
  { id: "biblioteca", x: 18, y: 30, links: ["porao", "cemiterio"] },
  {
    id: "porao",
    x: 50,
    y: 34,
    links: ["biblioteca", "estudio", "cabecas", "garagem", "armario"],
  },
  { id: "estudio", x: 82, y: 30, links: ["porao"] },
  { id: "cabecas", x: 50, y: 16, links: ["porao", "fliperama", "torre"] },
  { id: "torre", x: 22, y: 12, links: ["cabecas", "leader"] },
  { id: "fliperama", x: 80, y: 12, links: ["cabecas"] },
  { id: "cemiterio", x: 18, y: 52, links: ["biblioteca", "clinica"] },
  { id: "clinica", x: 18, y: 72, links: ["cemiterio"] },
  { id: "armario", x: 34, y: 46, links: ["porao"] },
  { id: "garagem", x: 50, y: 58, links: ["porao", "ladob"] },
  { id: "ladob", x: 50, y: 76, links: ["garagem", "fim"] },
  { id: "fim", x: 50, y: 92, links: ["ladob"] },
];
