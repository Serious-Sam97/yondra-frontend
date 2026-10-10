import Leader from "@/vortex/world/Leader";

// 404 page — any unmatched route (or a notFound() call) lands here. In the
// tape universe this is THE LEADER: the blank stretch at the start of every
// tape, before anything was recorded (design/vortex-mk5 · E-20). White, silent,
// and the only place Vortex is truly afraid of.
export default function NotFound() {
  return <Leader />;
}
