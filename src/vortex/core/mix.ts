// T-15 · the mixer: while the radio is on air, his own sounds and voice duck
// so the music isn't fighting a cassette ghost. Tiny on purpose (it's in his core).

let radioOn = false;
const DUCK = 0.35;

export function setRadioOn(on: boolean) {
  radioOn = on;
}
/** multiply any of his gains by this */
export const duck = () => (radioOn ? DUCK : 1);

/* the speech budget: ambient lines (vortex:say from the modules) may not
   pile up — at most 4 a minute and 6 s apart. Lines with choices or actions,
   and anything marked force, always get through. */
const said: number[] = [];
export function speechAllowed(force = false, now = Date.now()): boolean {
  while (said.length && now - said[0] > 60_000) said.shift();
  if (
    !force &&
    (said.length >= 4 ||
      (said.length > 0 && now - said[said.length - 1] < 6000))
  )
    return false;
  said.push(now);
  return true;
}
