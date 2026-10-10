"use client";

import { use } from "react";
import { LadoPage } from "@/vortex/core/Extras";
import JCard from "@/vortex/outside/JCard";

// Q-10 · a printable cassette J-card for one board.
export default function JCardPage({
  params,
}: {
  params: Promise<{ board: string }>;
}) {
  const { board } = use(params);
  return (
    <LadoPage lado="fora">
      <JCard id={Number(board)} />
    </LadoPage>
  );
}
