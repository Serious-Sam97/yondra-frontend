import { notFound } from "next/navigation";
import AnimTimeline from "@/vortex/dev/AnimTimeline";

// S-05 · the animation timeline (dev only).
export default function AnimPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <AnimTimeline />;
}
