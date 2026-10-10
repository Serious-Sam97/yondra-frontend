import { notFound } from "next/navigation";
import SoulSim from "@/vortex/dev/SoulSim";

// S-06 · the soul simulator (dev only).
export default function SimPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <SoulSim />;
}
