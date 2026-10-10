"use client";

import { useEffect, useState } from "react";
import "./echoes.css";

// K-04 / K-05 / K-07 · echoes in the forgotten pages. They sit OUTSIDE the
// real legal text (the documents themselves are untouched): near-invisible
// lines you only find by selecting, waiting, or reading the source. Claims made
// while logged out wait in a queue and are filed on the next session.

const PENDING = "yd:vortex.pendingClaims";

export function queueClaim(id: string, proof?: string) {
  try {
    const list = JSON.parse(localStorage.getItem(PENDING) ?? "[]") as {
      id: string;
      proof?: string;
    }[];
    if (!list.some((x) => x.id === id)) list.push({ id, proof });
    localStorage.setItem(PENDING, JSON.stringify(list));
  } catch {}
}
export function takePendingClaims(): { id: string; proof?: string }[] {
  try {
    const list = JSON.parse(localStorage.getItem(PENDING) ?? "[]");
    localStorage.removeItem(PENDING);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** K-04 · comments in the page source (view-source shows them). */
export function SourceComments() {
  return (
    <div
      hidden
      // biome-ignore lint/security/noDangerouslySetInnerHtml: static comments, no user input
      dangerouslySetInnerHTML={{
        __html:
          "<!-- he's not supposed to be here --><!-- remove before migration — M. --><!-- 0313 -->",
      }}
    />
  );
}

/** K-05 · terms: a quiet clause 13, visible when selected. */
export function TermsEcho() {
  return (
    <p className="vxk-echo" aria-hidden>
      13. the user acknowledges that recordings may be overwritten.
    </p>
  );
}

/** K-05 · privacy: an unnumbered footnote; wait on it and the page reveals more. */
export function PrivacyEcho() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    const check = () => {
      if (t) clearTimeout(t);
      if (location.hash === "#side-c")
        t = setTimeout(() => {
          setShown(true);
          queueClaim("F04", "side-c");
          document
            .getElementById("side-c")
            ?.scrollIntoView({ behavior: "smooth" });
        }, 13_000);
    };
    check();
    window.addEventListener("hashchange", check);
    return () => {
      if (t) clearTimeout(t);
      window.removeEventListener("hashchange", check);
    };
  }, []);
  return (
    <div className="vxk-footnote">
      <a href="#side-c" aria-label="footnote">
        *
      </a>
      <p id="side-c" className={shown ? "is-shown" : ""}>
        data retention, continued: deleted data goes to the b-side. overwritten
        data goes somewhere else. we do not have a policy for somewhere else.
      </p>
    </div>
  );
}

/** K-05 · the reset-password email placeholder remembers someone. */
export function useGhostPlaceholder(normal: string): {
  placeholder: string;
  onClick: () => void;
} {
  const [n, setN] = useState(0);
  return {
    placeholder: n >= 3 ? "m.vex@vortexos.local" : normal,
    onClick: () =>
      setN((x) => {
        const next = x + 1;
        if (next === 3) queueClaim("F05", "m.vex@vortexos.local");
        return next;
      }),
  };
}

/** K-07 · amber on amber: only a full selection reveals it. */
export function HiddenLine({ text }: { text: string }) {
  return (
    <span className="vxk-hidden" aria-hidden>
      {text}
    </span>
  );
}
