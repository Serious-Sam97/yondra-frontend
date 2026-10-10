// N-07 · THE WARDROBE: the costumes sold at the token counter, drawn in his
// body's own viewBox (lib/vortexArt: -10 -6 160 150, body circle at 70,70 r36,
// eyes at y63, x 59/81). Numbers and constants only — safe to inject.

const VB =
  'viewBox="-10 -6 160 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="overflow:visible;display:block;width:100%;height:100%"';

const hat = (top: string) => top;
const brim = (y: number, w: number, c: string) =>
  `<ellipse cx="70" cy="${y}" rx="${w}" ry="5" fill="${c}"/>`;

const C: Record<string, string> = {
  astronaut: `<circle cx="70" cy="68" r="44" fill="#8fe3e3" opacity=".18" stroke="#e8f4f4" stroke-width="3"/><path d="M40 40 q30 -18 60 0" stroke="#fff" stroke-width="3" fill="none" opacity=".6"/><rect x="60" y="104" width="20" height="10" rx="3" fill="#d8d8d8"/>`,
  vampire: `<path d="M34 92 Q70 76 106 92 L114 120 Q70 100 26 120 Z" fill="#2a0010"/><path d="M40 92 Q70 82 100 92 L104 104 Q70 92 36 104Z" fill="#b5333c"/><path d="M64 84 l3 6 l3 -6 M72 84 l3 6 l3 -6" fill="#fff"/>`,
  chef: `${brim(38, 22, "#f3f3f3")}<circle cx="56" cy="22" r="12" fill="#fff"/><circle cx="70" cy="16" r="14" fill="#fff"/><circle cx="84" cy="22" r="12" fill="#fff"/><rect x="50" y="24" width="40" height="14" fill="#fff"/>`,
  mime: `<rect x="44" y="30" width="52" height="10" rx="3" fill="#111"/><path d="M50 30 Q70 8 90 30 Z" fill="#111"/><path d="M50 86 h40" stroke="#fff" stroke-width="3"/><path d="M42 100 h56 M42 108 h56" stroke="#111" stroke-width="4"/>`,
  dj: `<path d="M34 64 Q34 26 70 26 Q106 26 106 64" fill="none" stroke="#2a2420" stroke-width="5"/><rect x="26" y="56" width="14" height="22" rx="5" fill="#2a2420"/><rect x="100" y="56" width="14" height="22" rx="5" fill="#2a2420"/><circle cx="33" cy="67" r="4" fill="#ff8fd4"/><circle cx="107" cy="67" r="4" fill="#ff8fd4"/>`,
  groom: `<path d="M56 98 L70 106 L84 98 L84 110 L70 104 L56 110Z" fill="#111"/><rect x="48" y="16" width="44" height="22" fill="#111"/>${brim(38, 26, "#111")}<rect x="48" y="30" width="44" height="4" fill="#fff"/>`,
  pirate: `<path d="M30 40 Q70 0 110 40 Q70 30 30 40Z" fill="#1a1a1a"/><circle cx="70" cy="24" r="5" fill="#fff"/><path d="M66 30 l8 -8 M74 30 l-8 -8" stroke="#fff" stroke-width="2"/><rect x="74" y="58" width="16" height="12" rx="3" fill="#111"/><path d="M74 60 L46 50" stroke="#111" stroke-width="2"/>`,
  detective: `<path d="M36 40 Q70 10 104 40 Z" fill="#8a6a3a"/>${brim(40, 34, "#6b4f2a")}<rect x="40" y="34" width="60" height="5" fill="#3a2a14"/><circle cx="108" cy="96" r="10" fill="none" stroke="#c8962e" stroke-width="3"/><path d="M100 104 l-10 10" stroke="#c8962e" stroke-width="4"/>`,
  ghost: `<path d="M24 76 Q24 18 70 18 Q116 18 116 76 L116 118 l-10 -8 l-10 8 l-10 -8 l-10 8 l-10 -8 l-10 8 l-10 -8 l-10 8 l-10 -8 l-12 8Z" fill="#f3f3f3" opacity=".92"/><ellipse cx="59" cy="62" rx="6" ry="8" fill="#111"/><ellipse cx="81" cy="62" rx="6" ry="8" fill="#111"/>`,
  knight: `<path d="M30 74 Q30 22 70 22 Q110 22 110 74 L104 74 Q104 34 70 34 Q36 34 36 74Z" fill="#9aa3a8"/><rect x="40" y="56" width="60" height="4" fill="#5a6368"/><path d="M70 22 Q76 6 92 4" stroke="#b5333c" stroke-width="5" fill="none"/>`,
  wizard: `<path d="M44 40 L76 -6 Q80 10 96 40 Z" fill="#3a2a8a"/>${brim(40, 32, "#2a1a6a")}<path d="M60 20 l3 6 l6 1 l-5 4 l1 6 l-5 -3 l-5 3 l1 -6 l-5 -4 l6 -1z" fill="#ffd27a"/>`,
  cowboy: `${brim(38, 40, "#8a5a2a")}<path d="M48 38 Q50 14 70 18 Q90 14 92 38 Z" fill="#a8703a"/><rect x="48" y="32" width="44" height="4" fill="#3a2a14"/>`,
  nurse: `<path d="M48 38 L52 22 H88 L92 38 Z" fill="#fff"/><rect x="66" y="25" width="8" height="10" fill="#b5333c"/><rect x="65" y="27" width="10" height="6" fill="#b5333c"/>`,
  clown: `<circle cx="70" cy="76" r="7" fill="#ff3b3b"/><circle cx="40" cy="44" r="10" fill="#ff8a1c"/><circle cx="100" cy="44" r="10" fill="#ff8a1c"/><circle cx="52" cy="34" r="9" fill="#ffd27a"/><circle cx="88" cy="34" r="9" fill="#ffd27a"/><circle cx="70" cy="30" r="9" fill="#00e5d0"/>`,
  ninja: `<path d="M34 50 H106 V70 H34Z" fill="#111" opacity=".9"/><rect x="48" y="56" width="44" height="12" rx="6" fill="#f3e4bd" opacity=".9"/><circle cx="59" cy="62" r="3" fill="#111"/><circle cx="81" cy="62" r="3" fill="#111"/><path d="M106 54 l18 -6 M106 60 l18 4" stroke="#111" stroke-width="5"/>`,
  beekeeper: `${brim(36, 38, "#e8dcb8")}<path d="M44 36 Q46 14 70 16 Q94 14 96 36Z" fill="#e8dcb8"/><path d="M32 38 L28 96 M108 38 L112 96" stroke="#e8dcb8" stroke-width="2" opacity=".7"/><path d="M30 38 Q70 50 110 38 L112 96 Q70 106 28 96Z" fill="#fff" opacity=".22"/>`,
  diver: `<circle cx="70" cy="68" r="44" fill="none" stroke="#c8962e" stroke-width="7"/><circle cx="70" cy="64" r="24" fill="#8fe3e3" opacity=".2" stroke="#c8962e" stroke-width="4"/><circle cx="30" cy="68" r="5" fill="#c8962e"/><circle cx="110" cy="68" r="5" fill="#c8962e"/>`,
  scientist: `<path d="M40 40 Q36 18 54 22 Q58 6 72 14 Q86 4 92 20 Q108 18 100 40" fill="none" stroke="#e8e8e8" stroke-width="6" stroke-linecap="round"/><circle cx="59" cy="63" r="10" fill="none" stroke="#111" stroke-width="2"/><circle cx="81" cy="63" r="10" fill="none" stroke="#111" stroke-width="2"/><path d="M69 63 h2" stroke="#111" stroke-width="2"/>`,
  king: `<path d="M44 40 L48 14 L58 28 L70 6 L82 28 L92 14 L96 40 Z" fill="#c8962e" stroke="#8a6a1e" stroke-width="1.4"/><path d="M34 96 Q70 120 106 96 L110 124 Q70 136 30 124Z" fill="#8a1a2a"/><path d="M34 96 Q70 112 106 96" stroke="#f3f3f3" stroke-width="5" fill="none"/>`,
  angel: `<ellipse cx="70" cy="22" rx="22" ry="6" fill="none" stroke="#ffd27a" stroke-width="4"/><path d="M34 78 Q8 60 14 40 Q30 56 36 64Z M106 78 Q132 60 126 40 Q110 56 104 64Z" fill="#fff" opacity=".9"/>`,
  devil: `<path d="M44 40 Q38 22 48 12 Q50 28 56 36Z M96 40 Q102 22 92 12 Q90 28 84 36Z" fill="#c0202a"/><path d="M104 96 Q124 104 122 120 l6 -2 l-4 8 l-6 -4 l4 -1 Q120 108 100 102" fill="#c0202a"/>`,
  robot: `<rect x="66" y="10" width="8" height="24" fill="#8a8a8a"/><circle cx="70" cy="8" r="5" fill="#ff3b3b"/><rect x="26" y="60" width="10" height="16" fill="#8a8a8a"/><rect x="104" y="60" width="10" height="16" fill="#8a8a8a"/><path d="M52 84 h36" stroke="#8a8a8a" stroke-width="3" stroke-dasharray="4 3"/>`,
  mummy: `${[40, 52, 76, 90].map((y, i) => `<path d="M32 ${y} Q70 ${y + (i % 2 ? 8 : -6)} 108 ${y}" stroke="#e8dcb8" stroke-width="7" fill="none" opacity=".92"/>`).join("")}`,
  sailor: `<path d="M48 36 Q70 26 92 36 L90 42 Q70 34 50 42Z" fill="#fff"/><rect x="50" y="36" width="40" height="4" fill="#1a3a8a"/><path d="M44 96 L70 112 L96 96 L92 104 L70 118 L48 104Z" fill="#1a3a8a"/>`,
  painter: `<path d="M36 40 Q60 22 92 30 Q106 34 100 42 Q70 34 36 44Z" fill="#b5333c"/><circle cx="96" cy="30" r="3" fill="#b5333c"/><path d="M110 82 l14 -26" stroke="#8a5a2a" stroke-width="4"/><path d="M122 58 l6 -10" stroke="#ffd27a" stroke-width="6"/>`,
  rockstar: `<path d="M40 50 Q30 20 50 24 Q48 8 66 14 Q76 2 88 14 Q106 8 102 26 Q116 26 100 50" fill="#1a1a1a"/><path d="M48 58 H92 V62 H48Z" fill="#111"/><path d="M49 59 Q49 72 59 72 Q69 72 69 59Z M71 59 Q71 72 81 72 Q91 72 91 59Z" fill="#111"/><path d="M112 70 l4 -8 l4 8 l-4 8z" fill="#ffd27a"/>`,
  librarian: `<path d="M48 64 h22 M70 64 h22" stroke="#8a6a3a" stroke-width="2"/><rect x="48" y="56" width="22" height="14" rx="4" fill="none" stroke="#8a6a3a" stroke-width="2.4"/><rect x="70" y="56" width="22" height="14" rx="4" fill="none" stroke="#8a6a3a" stroke-width="2.4"/><circle cx="70" cy="30" r="10" fill="#6b4f2a"/>`,
  farmer: `${brim(36, 38, "#d8b860")}<path d="M48 36 Q52 18 70 18 Q88 18 92 36Z" fill="#e8c870"/><path d="M58 96 v20 M82 96 v20" stroke="#3a6aa8" stroke-width="5"/><path d="M60 22 l-6 -10 M64 20 l-2 -12" stroke="#d8b860" stroke-width="2"/>`,
  magician: `<rect x="50" y="2" width="40" height="34" fill="#111"/>${brim(36, 30, "#111")}<rect x="50" y="28" width="40" height="5" fill="#b5333c"/><path d="M110 92 l18 -24" stroke="#111" stroke-width="4"/><path d="M126 70 l4 -4" stroke="#fff" stroke-width="4"/>`,
  skater: `<path d="M40 44 Q70 18 100 44 Q86 36 70 36 Q54 36 40 44Z" fill="#ff8a1c"/><path d="M96 40 l18 4" stroke="#ff8a1c" stroke-width="5"/><rect x="34" y="114" width="72" height="6" rx="3" fill="#b5333c"/><circle cx="44" cy="124" r="4" fill="#111"/><circle cx="96" cy="124" r="4" fill="#111"/>`,
  ballerina: `<path d="M30 98 Q70 84 110 98 Q120 110 104 112 Q70 104 36 112 Q20 110 30 98Z" fill="#ff8fd4" opacity=".85"/><circle cx="70" cy="30" r="8" fill="#ff8fd4"/>`,
  firefighter: `${brim(40, 40, "#b5333c")}<path d="M44 40 Q46 14 70 14 Q94 14 96 40Z" fill="#d8303a"/><rect x="62" y="16" width="16" height="16" rx="2" fill="#ffd27a"/>`,
  explorer: `${brim(38, 40, "#c8a870")}<path d="M46 38 Q48 16 70 16 Q92 16 94 38Z" fill="#d8b880"/><rect x="46" y="32" width="48" height="4" fill="#6b4f2a"/><circle cx="112" cy="98" r="8" fill="none" stroke="#c8962e" stroke-width="2"/><path d="M112 92 v12 M106 98 h12" stroke="#c8962e" stroke-width="1.4"/>`,
  scarecrow: `${brim(36, 40, "#b88a4a")}<path d="M46 36 Q50 10 70 14 Q90 10 94 36Z" fill="#c89a5a"/><path d="M30 92 l-8 8 M32 96 l-10 2 M110 92 l8 8 M108 96 l10 2" stroke="#e8c870" stroke-width="2.4"/><rect x="54" y="20" width="10" height="8" fill="#8a5a2a"/>`,
  snowman: `<rect x="52" y="6" width="36" height="30" fill="#111"/>${brim(36, 26, "#111")}<path d="M70 72 l18 4 l-18 2z" fill="#ff8a1c"/><path d="M38 96 Q70 106 102 96 L102 104 Q70 114 38 104Z" fill="#b5333c"/>`,
  bat: `<path d="M34 60 Q8 40 2 58 Q14 58 14 70 Q22 62 30 72Z M106 60 Q132 40 138 58 Q126 58 126 70 Q118 62 110 72Z" fill="#2a1a3a"/><path d="M48 38 l6 -14 l6 12 M80 36 l6 -12 l6 14" fill="#2a1a3a"/>`,
};

const SEASONAL: Record<string, string> = {
  "season-rewind-mask": `<path d="M40 54 Q70 44 100 54 L100 70 Q86 76 70 68 Q54 76 40 70Z" fill="#111"/><circle cx="59" cy="62" r="5" fill="#ffd27a" opacity=".25"/><circle cx="81" cy="62" r="5" fill="#ffd27a" opacity=".25"/><path d="M52 50 l-6 -10 M88 50 l6 -10" stroke="#b5333c" stroke-width="3"/>`,
  "season-birthday-hat": `<path d="M58 36 L70 4 L82 36 Z" fill="#8fe3e3"/><path d="M61 28 L79 28 M64 20 L76 20" stroke="#ff8fd4" stroke-width="3"/><circle cx="70" cy="4" r="4" fill="#ffd27a"/>`,
};

/** SVG for an equipped costume item id (costume-xyz or a seasonal one), or "". */
export function wardrobeSvg(id: string | null | undefined): string {
  if (!id) return "";
  const g = id.startsWith("costume-") ? C[id.slice(8)] : SEASONAL[id];
  return g ? `<svg ${VB}>${hat(g)}</svg>` : "";
}

/* ── S-08 · the costume you design: a hat, an accessory, two colours ── */
export interface CustomCostume {
  hat: string;
  acc: string;
  c1: string;
  c2: string;
}
const HEX = /^#[0-9a-f]{6}$/i;
const CUSTOM_HATS: Record<string, (a: string, b: string) => string> = {
  none: () => "",
  cap: (a, b) =>
    `<path d="M42 40 Q44 16 70 16 Q96 16 98 40Z" fill="${a}"/><path d="M92 38 Q112 36 118 44 Q104 46 92 44Z" fill="${b}"/><circle cx="70" cy="17" r="3" fill="${b}"/>`,
  tophat: (a, b) =>
    `<rect x="50" y="2" width="40" height="34" fill="${a}"/>${brim(36, 30, a)}<rect x="50" y="26" width="40" height="6" fill="${b}"/>`,
  horns: (a, b) =>
    `<path d="M44 40 Q34 18 46 6 Q50 26 58 36Z M96 40 Q106 18 94 6 Q90 26 82 36Z" fill="${a}" stroke="${b}" stroke-width="2"/>`,
  halo: (a, b) =>
    `<ellipse cx="70" cy="20" rx="24" ry="7" fill="none" stroke="${a}" stroke-width="5"/><ellipse cx="70" cy="20" rx="24" ry="7" fill="none" stroke="${b}" stroke-width="1.5" opacity=".7"/>`,
  crown: (a, b) =>
    `<path d="M44 40 L48 14 L58 28 L70 6 L82 28 L92 14 L96 40 Z" fill="${a}"/><circle cx="58" cy="32" r="3" fill="${b}"/><circle cx="70" cy="30" r="4" fill="${b}"/><circle cx="82" cy="32" r="3" fill="${b}"/>`,
  bow: (a, b) =>
    `<path d="M70 30 L50 18 Q44 30 50 42Z M70 30 L90 18 Q96 30 90 42Z" fill="${a}"/><circle cx="70" cy="30" r="6" fill="${b}"/>`,
  antenna: (a, b) =>
    `<path d="M60 36 L48 6 M80 36 L92 6" stroke="${a}" stroke-width="3"/><circle cx="48" cy="6" r="5" fill="${b}"/><circle cx="92" cy="6" r="5" fill="${b}"/>`,
  bandana: (a, b) =>
    `<path d="M34 50 Q70 26 106 50 L106 44 Q70 18 34 44Z" fill="${a}"/><path d="M104 46 l16 -4 l-6 10 l10 6 l-18 -2Z" fill="${a}"/><circle cx="56" cy="40" r="2" fill="${b}"/><circle cx="70" cy="36" r="2" fill="${b}"/><circle cx="84" cy="40" r="2" fill="${b}"/>`,
  beanie: (a, b) =>
    `<path d="M38 44 Q38 12 70 12 Q102 12 102 44Z" fill="${a}"/><rect x="36" y="38" width="68" height="10" rx="4" fill="${b}"/><circle cx="70" cy="9" r="7" fill="${b}"/>`,
};
const CUSTOM_ACCS: Record<string, (a: string, b: string) => string> = {
  none: () => "",
  glasses: (a) =>
    `<circle cx="59" cy="63" r="10" fill="none" stroke="${a}" stroke-width="3"/><circle cx="81" cy="63" r="10" fill="none" stroke="${a}" stroke-width="3"/><path d="M69 63 h2" stroke="${a}" stroke-width="3"/>`,
  monocle: (a, b) =>
    `<circle cx="81" cy="63" r="11" fill="none" stroke="${a}" stroke-width="3"/><path d="M92 66 Q100 90 92 108" stroke="${b}" stroke-width="1.5" fill="none"/>`,
  mustache: (a) =>
    `<path d="M70 80 Q60 72 50 80 Q56 86 70 82 Q84 86 90 80 Q80 72 70 80Z" fill="${a}"/>`,
  bandaid: (a, b) =>
    `<rect x="84" y="74" width="18" height="8" rx="3" fill="${a}" transform="rotate(-20 93 78)"/><circle cx="93" cy="78" r="1.5" fill="${b}"/>`,
  flower: (a, b) =>
    `${[0, 72, 144, 216, 288].map((r) => `<ellipse cx="104" cy="44" rx="4" ry="8" fill="${a}" transform="rotate(${r} 104 50)"/>`).join("")}<circle cx="104" cy="50" r="4" fill="${b}"/>`,
  scar: (a) =>
    `<path d="M52 50 L64 74" stroke="${a}" stroke-width="2.5"/><path d="M54 56 l6 -2 M57 62 l6 -2 M60 68 l6 -2" stroke="${a}" stroke-width="2"/>`,
  bowtie: (a, b) =>
    `<path d="M70 104 L54 96 L54 112Z M70 104 L86 96 L86 112Z" fill="${a}"/><circle cx="70" cy="104" r="4" fill="${b}"/>`,
  earring: (a, b) =>
    `<circle cx="33" cy="78" r="5" fill="none" stroke="${a}" stroke-width="2.5"/><circle cx="33" cy="84" r="2.5" fill="${b}"/>`,
};

/** SVG for a designed costume (validated again here: it's injected as markup) */
export function customCostumeSvg(c: CustomCostume | null | undefined): string {
  if (!c || !HEX.test(c.c1) || !HEX.test(c.c2)) return "";
  const hatFn = CUSTOM_HATS[c.hat] ?? CUSTOM_HATS.none;
  const accFn = CUSTOM_ACCS[c.acc] ?? CUSTOM_ACCS.none;
  return `<svg ${VB}>${hatFn(c.c1, c.c2)}${accFn(c.c2, c.c1)}</svg>`;
}
export const CUSTOM_HAT_IDS = Object.keys(CUSTOM_HATS);
export const CUSTOM_ACC_IDS = Object.keys(CUSTOM_ACCS);
