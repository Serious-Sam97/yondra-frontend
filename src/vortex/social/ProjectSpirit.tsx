"use client";

import { useEffect } from "react";
import { apiFetch } from "@/lib/api";

// P-15 · THE PROJECT SPIRIT: the sum of the team's ghosts. It shows up at the
// project's milestones (25/50/75/100% of cards done) and gives a speech, once
// per milestone, through his mouth.

export default function ProjectSpirit({ projectId }: { projectId: number }) {
  useEffect(() => {
    if (!projectId) return;
    const t = setTimeout(async () => {
      try {
        const s = await apiFetch<{
          project: string;
          ghosts: number;
          age: number;
          deaths: number;
          progress: number;
        }>(`/api/mascot/social/spirit/${projectId}`);
        const milestone = [100, 75, 50, 25].find((m) => s.progress >= m);
        if (!milestone) return;
        const key = `yd:vortex.spirit.${projectId}.${milestone}`;
        if (localStorage.getItem(key)) return;
        localStorage.setItem(key, "1");
        const speech =
          milestone === 100
            ? `THE SPIRIT OF "${s.project.toUpperCase()}" SPEAKS: it is done. ${s.ghosts} ghosts witnessed it. ${s.deaths} funerals along the way. rest now. (you won't.)`
            : `THE SPIRIT OF "${s.project.toUpperCase()}" SPEAKS: ${milestone}% of us is finished. we are ${s.ghosts} ghosts, ${s.age} days old on average, ${s.deaths} funerals deep. keep going. we're watching. collectively.`;
        window.dispatchEvent(
          new CustomEvent("vortex:say", {
            detail: { text: speech, mood: "possessed" },
          }),
        );
      } catch {}
    }, 6000);
    return () => clearTimeout(t);
  }, [projectId]);
  return null;
}
