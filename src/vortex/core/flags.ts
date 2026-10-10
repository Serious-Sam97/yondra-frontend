import { useSyncExternalStore } from "react";
import { apiFetch } from "@/lib/api";

// T-11 · which sides of MK-V are on (server: config/vortex_mk5.php). Fetched
// once per session; until it answers, everything counts as on (so a slow API
// never hides features), and a side switched off simply never mounts.

export type Lado =
  | "abaixo"
  | "arcade"
  | "economia"
  | "radio"
  | "lab"
  | "multiverso"
  | "social"
  | "fora"
  | "experimental"
  | "criador"
  | "temporadas"
  | "misterios"
  | "agente"
  | "dark";

let lados: Partial<Record<Lado, boolean>> = {};
let started = false;
const subs = new Set<() => void>();

function load() {
  if (started || typeof window === "undefined") return;
  started = true;
  if (!localStorage.getItem("token")) return;
  apiFetch<{ lados: Partial<Record<Lado, boolean>> }>("/api/mascot/flags")
    .then((r) => {
      lados = r.lados ?? {};
      for (const s of subs) s();
    })
    .catch(() => {});
}

export const ladoOn = (k: Lado) => lados[k] !== false;

export function useLado(k: Lado): boolean {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      load();
      return () => subs.delete(cb);
    },
    () => ladoOn(k),
    () => true,
  );
}
