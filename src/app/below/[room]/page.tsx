import BelowGame from "@/vortex/below/BelowGame";
import { LadoPage } from "@/vortex/core/Extras";

// I · the universe below Yondra — a point-and-click world (design/vortex-mk5).
export default async function BelowPage({
  params,
}: {
  params: Promise<{ room: string }>;
}) {
  const { room } = await params;
  return (
    <LadoPage lado="abaixo">
      <BelowGame room={room} />
    </LadoPage>
  );
}
