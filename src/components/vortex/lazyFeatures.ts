import { later, startLater, warm } from "@/vortex/core/later";

// T-03 · same names and signatures as the real modules, so VortexAssistant's
// call sites don't change — but the code behind them is fetched on idle, not
// shipped in his core chunk.
//   · start-style functions return their cleanup immediately (works even if
//     the module arrives later);
//   · prank checks answer `false` until the module is there (pranks never
//     fire in a session's first minutes anyway);
//   · async ones simply await the module.

type Pranks = typeof import("@/components/vortex/vortexPranks");
type Story = typeof import("@/vortex/core/story");
type Gadgets = typeof import("@/vortex/lab/gadgets");

const pranks = later(() => import("@/components/vortex/vortexPranks"));
const story = later(() => import("@/vortex/core/story"));
const gadgets = later(() => import("@/vortex/lab/gadgets"));
const soundtrack = later(() => import("@/vortex/radio/soundtrack"));
const station = later(() => import("@/vortex/radio/station"));
const attack = later(() => import("@/vortex/social/attack"));
const curses = later(() => import("@/vortex/econ/curses"));
const senses = later(() => import("@/vortex/world/senses"));
const clues = later(() => import("@/vortex/mysteries/clues"));
const voice = later(() => import("@/vortex/voice/babble"));

/** fetch them all once the browser is idle (called when he mounts) */
export const warmFeatures = () =>
  warm(
    pranks,
    story,
    gadgets,
    soundtrack,
    station,
    attack,
    curses,
    senses,
    clues,
  );

/* ── pranks (MK-II…IV) ── */
const bool =
  <K extends keyof Pranks>(k: K) =>
  (...a: Parameters<Pranks[K]>): boolean =>
    (
      pranks.now()?.[k] as
        | ((...x: Parameters<Pranks[K]>) => boolean)
        | undefined
    )?.(...a) ?? false;
const cleanup =
  <K extends keyof Pranks>(k: K) =>
  (...a: Parameters<Pranks[K]>): (() => void) =>
    startLater(pranks, (m) =>
      (m[k] as (...x: Parameters<Pranks[K]>) => () => void)(...a),
    );

export const gravityTilt = bool("gravityTilt");
export const ghostCursor = bool("ghostCursor");
export const lyingClock = bool("lyingClock");
export const whisperPlaceholder = bool("whisperPlaceholder");
export const looseScrew = bool("looseScrew");
export const radioInterference = bool("radioInterference");
export const cursorPull = bool("cursorPull");
export const eyesInTheDark = cleanup("eyesInTheDark");
export const tabHijack = cleanup("tabHijack");
export const armFleeingArchive = cleanup("armFleeingArchive");
export const possessedOverlay = cleanup("possessedOverlay");
export const listenSecrets = cleanup("listenSecrets");
export const listenWords = cleanup("listenWords");
export const basement = cleanup("basement");
export const seanceGhosts = (...a: Parameters<Pranks["seanceGhosts"]>) =>
  void pranks.get().then((m) => m.seanceGhosts(...a));

/* ── the series (L) ── */
export const playEpisode = async (...a: Parameters<Story["playEpisode"]>) =>
  (await story.get()).playEpisode(...a);
export const fetchDueEpisode = async () =>
  (await story.get()).fetchDueEpisode();
export const markSeen = async (...a: Parameters<Story["markSeen"]>) =>
  (await story.get()).markSeen(...a);

/* ── the rest ── */
/** D-08 · counts only once the lab module is loaded (it warms on idle) */
export const recordOpen = (...a: Parameters<Gadgets["recordOpen"]>): number =>
  gadgets.now()?.recordOpen(...a) ?? 0;
export const startSoundtrack = () =>
  void soundtrack.get().then((m) => m.startSoundtrack());
export const tuneOut = () => void station.get().then((m) => m.tuneOut());
export const staticAttack = (from: string[]) =>
  void attack.get().then((m) => m.staticAttack(from));
export const startCurses = (showTwin: () => void) =>
  startLater(curses, (m) => m.startCurses(showTwin));
export const startSenses = (
  a: Parameters<typeof import("@/vortex/world/senses")["startSenses"]>[0],
) => startLater(senses, (m) => m.startSenses(a));
export const startClues = (
  o: Parameters<typeof import("@/vortex/mysteries/clues")["startClues"]>[0],
) => startLater(clues, (m) => m.startClues(o));

/** R-03 · his own voice: the synthesizer loads the first time he speaks */
export const speakBabble = (
  text: string,
  preset: Parameters<typeof import("@/vortex/voice/babble")["babble"]>[1],
) => startLater(voice, (m) => m.babble(text, preset));
