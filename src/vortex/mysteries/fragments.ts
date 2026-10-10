"use client";

import { apiFetch } from "@/lib/api";
import { refreshSoul } from "@/vortex/core/soul";
import "./fragments.css";

// K-02 · the client side of the ARG: claim a fragment (the server validates),
// say a phrase (the server checks every reachable code), and the little VFD
// toast that files a new fragment into the dossier. Texts only ever come back
// for fragments the user now owns.

export interface Fragment {
  id: string;
  layer: number;
  where: string;
  text: string;
}

function announce(f: Fragment) {
  const el = document.createElement("div");
  el.className = "vxk-toast";
  el.setAttribute("role", "status");
  el.innerHTML = `<b>FRAGMENT ${f.id} RECORDED</b><span></span>`;
  (el.querySelector("span") as HTMLSpanElement).textContent = f.text;
  document.body.appendChild(el);
  window.dispatchEvent(new CustomEvent("vortex:fragment", { detail: f }));
  setTimeout(() => el.classList.add("is-filing"), 5200);
  setTimeout(() => el.remove(), 6200);
}

/** Claim one fragment with optional proof. Resolves with it when granted. */
export async function claimFragment(
  id: string,
  proof?: string,
): Promise<Fragment | null> {
  try {
    const r = await apiFetch<{ ok: boolean; fragment?: Fragment }>(
      "/api/mascot/fragments/claim",
      {
        method: "POST",
        body: JSON.stringify({ id, proof }),
      },
    );
    if (r.ok && r.fragment) {
      const seen = sessionStorage.getItem(`yd:vortex.frag.${id}`);
      if (!seen) {
        sessionStorage.setItem(`yd:vortex.frag.${id}`, "1");
        announce(r.fragment);
        void refreshSoul();
      }
      return r.fragment;
    }
  } catch {
    // not yet / not here / nothing happens
  }
  return null;
}

/** Say something to him: the server checks it against every reachable secret. */
export async function guessPhrase(phrase: string): Promise<Fragment[]> {
  const p = phrase.trim();
  if (p.length < 3 || p.length > 80 || p.startsWith("/")) return [];
  try {
    const r = await apiFetch<{ won: Fragment[] }>(
      "/api/mascot/fragments/guess",
      {
        method: "POST",
        body: JSON.stringify({ phrase: p }),
      },
    );
    for (const f of r.won) announce(f);
    if (r.won.length) void refreshSoul();
    return r.won;
  } catch {
    return [];
  }
}

/** Server-granted fragments that arrived with a soul view (drip, bond…). */
export function announceNew(ids: string[], list: Fragment[]) {
  for (const id of ids) {
    const f = list.find((x) => x.id === id);
    if (f) announce(f);
  }
}

export async function fetchFragments(): Promise<{
  owned: Fragment[];
  total: number;
  hint: string | null;
  hint_where: string | null;
}> {
  return apiFetch("/api/mascot/fragments");
}
