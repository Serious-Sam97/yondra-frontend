"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type {
  ProjectInterface,
  UserSummary,
} from "@/interfaces/ProjectInterface";

interface ProjectsState {
  user: UserSummary | null;
  owned: ProjectInterface[];
  member: ProjectInterface[];
  hydrated: boolean;
  setAll: (
    user: UserSummary | null,
    owned: ProjectInterface[],
    member: ProjectInterface[],
  ) => void;
}

const ProjectsContext = createContext<ProjectsState | null>(null);

// Holds the sidebar's user + project lists. Mounted by the /projects layout, which
// App Router keeps alive across project switches — so the rail survives route
// changes without module-level globals, and is torn down on logout (no cross-user leak).
export default function ProjectsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<{
    user: UserSummary | null;
    owned: ProjectInterface[];
    member: ProjectInterface[];
    hydrated: boolean;
  }>({
    user: null,
    owned: [],
    member: [],
    hydrated: false,
  });

  const value = useMemo<ProjectsState>(
    () => ({
      ...state,
      setAll: (user, owned, member) =>
        setState({ user, owned, member, hydrated: true }),
    }),
    [state],
  );

  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects(): ProjectsState {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error("useProjects must be used within ProjectsProvider");
  return ctx;
}
