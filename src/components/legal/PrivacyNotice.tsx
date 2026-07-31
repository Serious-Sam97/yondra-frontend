"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const ACK_KEY = "yondra_privacy_ack";

// Bilingual copy — Yondra ships an EN UI but serves a Brazilian (LGPD) audience,
// so the notice follows the browser language like the legal pages do.
const COPY = {
  pt: {
    text: "Usamos apenas cookies essenciais para manter você conectado. Saiba mais na nossa",
    link: "Política de Privacidade",
    ack: "Entendi",
  },
  en: {
    text: "We use only essential cookies to keep you signed in. Learn more in our",
    link: "Privacy Policy",
    ack: "Got it",
  },
} as const;

// First-visit privacy notice. Yondra uses only strictly-necessary cookies, so
// this is an informational LGPD notice (not a consent gate): it points to the
// Privacy Policy and remembers dismissal in localStorage.
export default function PrivacyNotice() {
  // Start hidden; only reveal after we've checked localStorage on the client, so
  // an already-acknowledged visitor never sees a flash of the bar.
  const [show, setShow] = useState(false);
  const [lang, setLang] = useState<"pt" | "en">("en");

  useEffect(() => {
    try {
      if (localStorage.getItem(ACK_KEY) !== "1") setShow(true);
    } catch {
      // Private mode / storage blocked — showing the notice is the safe default.
      setShow(true);
    }
    if (typeof navigator !== "undefined") {
      setLang(navigator.language.toLowerCase().startsWith("pt") ? "pt" : "en");
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(ACK_KEY, "1");
    } catch {
      // Non-fatal: if we can't persist, the notice simply returns next visit.
    }
    setShow(false);
  };

  if (!show) return null;
  const copy = COPY[lang];

  return (
    <section
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-1.5rem)] max-w-2xl"
      aria-label={copy.link}
    >
      <div className="aero-menu flex items-center gap-4 px-4 py-3">
        <p
          className="cf-mono flex-1"
          style={{
            fontSize: "12px",
            color: "var(--cf-text-muted)",
            lineHeight: 1.5,
          }}
        >
          {copy.text}{" "}
          <Link
            href="/privacy"
            className="underline hover:text-[var(--cf-phosphor)]"
            style={{ color: "var(--cf-text)" }}
          >
            {copy.link}
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="aero-btn aero-btn--cyan px-3.5 py-2 flex-shrink-0"
          style={{ fontSize: "11px" }}
        >
          {copy.ack}
        </button>
      </div>
    </section>
  );
}
