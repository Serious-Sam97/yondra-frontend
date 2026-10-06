// Background-tab-aware polling. Ticks are skipped while the tab is hidden (no
// fetch + re-render nobody sees); on becoming visible again it refreshes at once
// if a tick was missed. Doesn't run `fn` up front — callers do their own initial
// load. Returns the cleanup for a useEffect.
export function pollWhileVisible(fn: () => void, ms: number): () => void {
  let last = Date.now();
  const run = () => {
    last = Date.now();
    fn();
  };
  const interval = setInterval(() => {
    if (!document.hidden) run();
  }, ms);
  const onVisible = () => {
    if (!document.hidden && Date.now() - last >= ms) run();
  };
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    clearInterval(interval);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
