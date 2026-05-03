// Vibration patterns — each is a rhythm of [on, off, on, ...] milliseconds.
// navigator.vibrate is undefined on iOS (not supported) and on desktop;
// the optional chaining makes every call a silent no-op on those platforms.

export function hapticPick()   { navigator.vibrate?.(7); }
export function hapticDrop()   { navigator.vibrate?.([10, 5, 15]); }
export function hapticDone()   { navigator.vibrate?.([6, 4, 6]); }
export function hapticReject() { navigator.vibrate?.([50, 25, 50, 25, 50]); }
