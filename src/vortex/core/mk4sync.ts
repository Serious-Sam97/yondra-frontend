import {
  type Progress,
  updateProgress,
} from "@/components/vortex/mk4/progress";
import { apiFetch } from "@/lib/api";

// T-12 · MK-IV kept its progress on the device. This moves it to his soul
// without losses (the server takes the union / the max, idempotently) and, on
// a fresh device, brings it back from the server.

interface ServerMk4 {
  achievements: string[];
  costumes: string[];
  streak: number;
  compliments: number;
  escape: number;
  jams: number;
  birthday?: string | null;
}
const DONE = "yd:vortex.mk4-synced";

export async function syncMk4(local: Progress): Promise<void> {
  try {
    if (localStorage.getItem(DONE) === new Date().toDateString()) return;
    const body = {
      achievements: Object.keys(local.achievements),
      costumes: local.costumes.filter((c) => c !== "none"),
      streak: local.streak.count,
      compliments: local.compliments,
      escape: local.escape,
      jams: local.jamsCleared,
      ...(local.birthday ? { birthday: local.birthday } : {}),
    };
    const server = await apiFetch<ServerMk4 | null>("/api/mascot/mk4", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (server) {
      // bring back what this device didn't have (a new phone, a cleared browser)
      updateProgress((p) => {
        const ach = { ...p.achievements };
        for (const a of server.achievements) ach[a] ??= Date.now();
        return {
          ...p,
          achievements: ach,
          costumes: [
            ...new Set([
              ...p.costumes,
              ...(server.costumes as Progress["costumes"]),
            ]),
          ],
          compliments: Math.max(p.compliments, server.compliments),
          escape: Math.max(p.escape, server.escape),
          jamsCleared: Math.max(p.jamsCleared, server.jams),
          birthday: p.birthday ?? server.birthday ?? null,
        };
      });
    }
    localStorage.setItem(DONE, new Date().toDateString());
  } catch {}
}
