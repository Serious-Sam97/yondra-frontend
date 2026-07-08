"use client";

import ProjectsProvider from "@/components/projects/ProjectsProvider";

// Persists the project sidebar state across /projects/[id] navigations (App Router
// keeps this layout mounted), replacing the old module-level cache globals.
export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProjectsProvider>{children}</ProjectsProvider>;
}
