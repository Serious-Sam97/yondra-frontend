import { notFound } from "next/navigation";
import ContentEditor from "@/vortex/dev/ContentEditor";

// S-04 · the content editor (dev only).
export default function ContentPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ContentEditor />;
}
