import { notFound } from "next/navigation";
import VortexLab from "@/vortex/dev/VortexLab";

// C-25 · the Vortex lab (dev only): every face, gesture and animation on a big
// rig, plus the soul/time controls later phases add. Never shipped to prod.
export default function VortexLabPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <VortexLab />;
}
