// B-24 · he dresses for the season where YOU are (hemisphere from the
// timezone): a scarf in winter, melting a little in summer, a leaf stuck to
// him in autumn, a sprout in spring. Rain drops come from R-16 (weather).

export type Season = "winter" | "spring" | "summer" | "autumn";

const SOUTH =
  /^(America\/(Sao_Paulo|Argentina|Buenos_Aires|Santiago|Montevideo|Asuncion|La_Paz|Cuiaba|Campo_Grande|Porto_Velho|Recife|Bahia|Maceio|Fortaleza|Belem|Araguaina|Punta_Arenas)|Australia\/|Pacific\/(Auckland|Chatham|Fiji|Tongatapu)|Africa\/(Johannesburg|Maputo|Harare|Windhoek|Gaborone|Lusaka)|Antarctica\/|Indian\/(Mauritius|Reunion))/;

export function season(date = new Date(), tz?: string): Season {
  const zone = tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  const south = SOUTH.test(zone);
  const m = date.getMonth(); // 0..11
  const north: Season =
    m === 11 || m <= 1
      ? "winter"
      : m <= 4
        ? "spring"
        : m <= 7
          ? "summer"
          : "autumn";
  if (!south) return north;
  return (
    {
      winter: "summer",
      summer: "winter",
      spring: "autumn",
      autumn: "spring",
    } as const
  )[north];
}

/** Accessory overlay in the body's coordinate space (viewBox -10 -6 160 150). */
export function seasonSvg(s: Season): string {
  const open = `<svg viewBox="-10 -6 160 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="overflow:visible;display:block;width:100%;height:100%">`;
  switch (s) {
    case "winter":
      return `${open}<path d="M40 96 Q70 112 100 96 L100 104 Q70 120 40 104 Z" fill="#b5533c"/><path d="M46 100 l4 6 M56 104 l4 6 M66 106 l4 6 M76 106 l4 6 M86 104 l4 6" stroke="#e9e1c9" stroke-width="2"/><path d="M88 102 l8 22 l8 -2 l-6 -22 Z" fill="#9c4330"/><path d="M92 120 l1 6 M96 119 l2 6 M100 118 l2 5" stroke="#e9e1c9" stroke-width="1.6"/></svg>`;
    case "summer":
      return `${open}<path class="vxr-melt" d="M52 102 q2 10 4 2 q2 14 6 0 q3 8 6 -1 q3 12 7 0 q2 9 5 -2" fill="#3d0c5c" opacity=".9"/><circle cx="62" cy="118" r="2.2" fill="#3d0c5c" opacity=".8"/></svg>`;
    case "autumn":
      return `${open}<path d="M92 38 q8 -6 14 2 q-4 2 -2 6 q-6 -1 -8 4 q-2 -6 -8 -6 q4 -2 4 -6Z" fill="#c8962e" transform="rotate(18 98 40)"/><path d="M96 46 l-6 4" stroke="#8a7356" stroke-width="1.2"/></svg>`;
    case "spring":
      return `${open}<path d="M70 34 v-10" stroke="#6f8a4a" stroke-width="2" stroke-linecap="round"/><path d="M70 28 q-8 -6 -10 2 q6 2 10 -2Z M70 26 q8 -8 12 0 q-6 3 -12 0Z" fill="#6f8a4a"/></svg>`;
  }
}
