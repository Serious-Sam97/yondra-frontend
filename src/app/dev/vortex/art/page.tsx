import { notFound } from "next/navigation";
import SceneGen from "@/vortex/dev/SceneGen";

// S-07 · the Below scene generator (dev only).
export default function ArtPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <SceneGen />;
}
