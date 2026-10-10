"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { getProgress } from "@/components/vortex/mk4/progress";
import { useVortexEnabled } from "@/lib/vortex";
import { useLado } from "./flags";
import { syncMk4 } from "./mk4sync";
import { flushTelemetry } from "./telemetry";

// T-03 / T-11 · everything around his core loads lazily, after the page, and
// only if its side is switched on: the radio, the case, the hunts, the gadget
// belt, the deck, the pager, the weird senses and the creator runtime. With
// Vortex off, none of it is even downloaded.

// T-03 · even his core (rig, director, body, bubbles) is fetched after the
// page renders; the app's own first load carries none of it.
export const VortexAssistant = dynamic(
  () => import("@/components/vortex/VortexAssistant"),
  { ssr: false },
);
const Walkman = dynamic(() => import("@/vortex/radio/Walkman"), { ssr: false });
const TapeCase = dynamic(() => import("@/vortex/econ/TapeCase"), {
  ssr: false,
});
const Hunts = dynamic(() => import("@/vortex/arcade/Hunts"), { ssr: false });
const GadgetBelt = dynamic(() => import("@/vortex/lab/GadgetBelt"), {
  ssr: false,
});
const Deck = dynamic(() => import("@/vortex/multiverse/Deck"), { ssr: false });
const Pager = dynamic(() => import("@/vortex/outside/Pager"), { ssr: false });
const Weird = dynamic(() => import("@/vortex/weird/Weird"), { ssr: false });
const Creator = dynamic(() => import("@/vortex/creator/Creator"), {
  ssr: false,
});

export default function Extras() {
  const enabled = useVortexEnabled();
  const radio = useLado("radio");
  const econ = useLado("economia");
  const arcade = useLado("arcade");
  const lab = useLado("lab");
  const multi = useLado("multiverso");
  const fora = useLado("fora");
  const weird = useLado("experimental");
  const criador = useLado("criador");
  // T-07 / T-12 · once per session: yesterday's counts (with consent), MK-IV sync
  useEffect(() => {
    if (!enabled || !localStorage.getItem("token")) return;
    const t = setTimeout(() => {
      void flushTelemetry();
      void syncMk4(getProgress());
    }, 15_000);
    return () => clearTimeout(t);
  }, [enabled]);
  if (!enabled) return null;
  return (
    <>
      {radio && <Walkman />}
      {econ && <TapeCase />}
      {arcade && <Hunts />}
      {lab && <GadgetBelt />}
      {multi && <Deck />}
      {fora && <Pager />}
      {weird && <Weird />}
      {criador && <Creator />}
    </>
  );
}

/** a page of a side that's switched off renders as if it didn't exist */
export function LadoPage({
  lado,
  children,
}: {
  lado: Parameters<typeof useLado>[0];
  children: React.ReactNode;
}) {
  const on = useLado(lado);
  if (!on)
    return (
      <p
        style={{
          padding: "140px 16px",
          textAlign: "center",
          fontFamily: "ui-monospace, monospace",
          color: "var(--cf-text-dim)",
        }}
      >
        nothing here. (there was. there isn&apos;t.)
      </p>
    );
  return <>{children}</>;
}
