// F-10 · cursed gifts. Now and then he hands you a present with a side effect
// that lasts a while: sunglasses (the app gets darker), a party hat (on your
// avatar), a cursed coin (your cursor glows), a mystery tape (the radio plays
// something strange). You can refuse (he's offended) or accept (and live with it).
// Effects are classes on <body>, remembered with an expiry on this device.

export type GiftId = "shades" | "partyhat" | "coin" | "tape";

export const GIFTS: Record<
  GiftId,
  { name: string; offer: string; accept: string; ms: number }
> = {
  shades: {
    name: "sunglasses",
    offer: "here. sunglasses. you looked bright. too bright. take them.",
    accept: "there. everything's a little darker. like it should be.",
    ms: 60 * 60_000,
  },
  partyhat: {
    name: "a party hat",
    offer: "i got you a party hat. it's not a celebration. it's a warning.",
    accept: "look at you. festive. pathetic. festive.",
    ms: 2 * 60 * 60_000,
  },
  coin: {
    name: "a cursed coin",
    offer:
      "i found a coin under your backlog. it's cursed. you want it? you want it.",
    accept: "your cursor glows now. that's the curse. it's mostly aesthetic.",
    ms: 45 * 60_000,
  },
  tape: {
    name: "a mystery tape",
    offer:
      "a tape. no label. it was in the basement. it hums when you hold it.",
    accept: "put it in the radio sometime. or don't. i'm not your dad.",
    ms: 24 * 60 * 60_000,
  },
};

const KEY = "yd:vortex.gifts";

function load(): Partial<Record<GiftId, number>> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

/** Put the active effects on <body> (call on load and after accepting). */
export function applyGifts() {
  const now = Date.now();
  const active = load();
  for (const id of Object.keys(GIFTS) as GiftId[]) {
    const on = (active[id] ?? 0) > now;
    document.body.classList.toggle(`vxf-${id}`, on);
  }
}

export function acceptGift(id: GiftId) {
  const g = load();
  g[id] = Date.now() + GIFTS[id].ms;
  try {
    localStorage.setItem(KEY, JSON.stringify(g));
  } catch {}
  applyGifts();
}

export function hasGift(id: GiftId): boolean {
  return (load()[id] ?? 0) > Date.now();
}
