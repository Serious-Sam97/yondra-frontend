"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import YondraIcon from "@/components/icons/yondra.png";
import { useDocumentTitle } from "@/lib/useDocumentTitle";

export type Lang = "pt" | "en";

// A paragraph is either flowing text or a bulleted list.
export type LegalBlock = string | { list: string[] };

export interface LegalSection {
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDoc {
  // Document title, e.g. "Privacy Policy".
  title: string;
  // Short kicker shown above the title, e.g. "LEGAL · PRIVACY".
  kicker: string;
  // Lead paragraphs before the numbered sections.
  intro: LegalBlock[];
  sections: LegalSection[];
}

export interface LegalContent {
  // ISO date the documents took effect — rendered per-locale.
  effectiveDate: string;
  pt: LegalDoc;
  en: LegalDoc;
}

// Bilingual chrome (banner, labels) so the shell never mixes languages.
const CHROME = {
  pt: {
    review:
      "Modelo em rascunho — pendente de revisão jurídica. Este texto é um ponto de partida e não constitui aconselhamento jurídico. Faça-o revisar por um advogado antes de publicá-lo.",
    reviewTag: "Rascunho",
    effective: "Em vigor a partir de",
    back: "Voltar ao Yondra",
    langLabel: "Idioma",
    toc: "Nesta página",
  },
  en: {
    review:
      "Draft template — pending legal review. This text is a starting point and is not legal advice. Have a licensed attorney review it before you publish.",
    reviewTag: "Draft",
    effective: "In effect from",
    back: "Back to Yondra",
    langLabel: "Language",
    toc: "On this page",
  },
} as const;

function formatDate(iso: string, lang: Lang): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(lang === "pt" ? "pt-BR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Stable key for a content block (static data, so text is a safe key).
function blockKey(block: LegalBlock): string {
  return typeof block === "string" ? block : `list:${block.list[0]}`;
}

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === "string") {
    return <p style={{ color: "var(--cf-text)", lineHeight: 1.7 }}>{block}</p>;
  }
  return (
    <ul className="flex flex-col gap-1.5 pl-1">
      {block.list.map((item) => (
        <li
          key={item}
          className="flex gap-2.5"
          style={{ color: "var(--cf-text)", lineHeight: 1.6 }}
        >
          <span
            className="cf-led flex-shrink-0 mt-2"
            style={{
              background: "var(--cf-phosphor)",
              boxShadow: "0 0 6px var(--cf-phosphor)",
            }}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function LegalShell({ content }: { content: LegalContent }) {
  // Default to the browser's language when it's Portuguese, else English —
  // the product is Brazilian but the app UI ships in English.
  const [lang, setLang] = useState<Lang>("pt");
  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setLang(navigator.language.toLowerCase().startsWith("pt") ? "pt" : "en");
    }
  }, []);

  const doc = content[lang];
  const chrome = CHROME[lang];
  useDocumentTitle(`Yondra — ${doc.title}`);

  return (
    <div className="min-h-[90vh] px-4 py-10 flex justify-center">
      <div className="relative z-10 w-full max-w-3xl flex flex-col gap-6">
        {/* Header faceplate */}
        <div className="aero-menu px-6 py-6 flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <Link href="/" className="flex items-center gap-3 group">
              <Image
                src={YondraIcon}
                alt="Yondra"
                width={40}
                height={40}
                className="rounded-xl"
                style={{ boxShadow: "0 0 18px rgba(0,240,255,0.35)" }}
              />
              <span className="chrome-text text-lg">YONDRA</span>
            </Link>

            {/* Language toggle — each button is individually labelled. */}
            <div className="flex items-center gap-1">
              {(["pt", "en"] as const).map((code) => {
                const active = lang === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLang(code)}
                    aria-pressed={active}
                    aria-label={code === "pt" ? "Português" : "English"}
                    className="aero-pill uppercase tracking-widest px-2.5 py-1 cursor-pointer font-bold transition-colors"
                    style={{
                      fontSize: "10px",
                      color: active ? "#1c1a16" : "var(--cf-text-muted)",
                      background: active ? "var(--cf-phosphor)" : undefined,
                      boxShadow: active
                        ? "0 0 8px var(--cf-phosphor)55"
                        : undefined,
                    }}
                  >
                    {code === "pt" ? "PT-BR" : "EN"}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span
              className="cf-mono uppercase font-bold"
              style={{
                fontSize: "10px",
                letterSpacing: "0.24em",
                color: "var(--cf-text-dim)",
              }}
            >
              {doc.kicker}
            </span>
            <h1
              className="text-white font-bold"
              style={{ fontSize: "26px", lineHeight: 1.2 }}
            >
              {doc.title}
            </h1>
            <span
              className="cf-mono uppercase"
              style={{
                fontSize: "10px",
                letterSpacing: "0.16em",
                color: "var(--cf-text-muted)",
              }}
            >
              {chrome.effective} {formatDate(content.effectiveDate, lang)}
            </span>
          </div>
        </div>

        {/* Legal-review banner */}
        <div
          className="flex items-start gap-3 rounded-lg px-4 py-3"
          style={{
            border:
              "1px solid color-mix(in srgb, var(--cf-amber) 55%, transparent)",
            background: "color-mix(in srgb, var(--cf-amber) 10%, transparent)",
          }}
        >
          <span
            className="cf-mono uppercase font-bold flex-shrink-0 px-1.5 py-0.5 rounded-sm"
            style={{
              fontSize: "9px",
              letterSpacing: "0.14em",
              color: "#1c1a16",
              background: "var(--cf-amber)",
            }}
          >
            {chrome.reviewTag}
          </span>
          <span
            style={{
              color: "var(--cf-text)",
              fontSize: "13px",
              lineHeight: 1.6,
            }}
          >
            {chrome.review}
          </span>
        </div>

        {/* Body */}
        <div className="glass-panel px-6 py-7 flex flex-col gap-8">
          {/* Intro */}
          {doc.intro.length > 0 && (
            <div className="flex flex-col gap-3">
              {doc.intro.map((block) => (
                <Block key={blockKey(block)} block={block} />
              ))}
            </div>
          )}

          {/* Table of contents */}
          <nav className="flex flex-col gap-2">
            <span
              className="cf-mono uppercase font-bold"
              style={{
                fontSize: "9px",
                letterSpacing: "0.24em",
                color: "var(--cf-text-dim)",
              }}
            >
              {chrome.toc}
            </span>
            <ol className="flex flex-col gap-1">
              {doc.sections.map((s, i) => (
                <li key={s.heading}>
                  <a
                    href={`#${slugify(s.heading)}`}
                    className="cf-mono hover:text-[var(--cf-phosphor)] transition-colors"
                    style={{ fontSize: "12px", color: "var(--cf-text-muted)" }}
                  >
                    {i + 1}. {s.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {/* Sections */}
          {doc.sections.map((s, i) => (
            <section
              key={s.heading}
              id={slugify(s.heading)}
              className="flex flex-col gap-3 scroll-mt-6"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="cf-led flex-shrink-0"
                  style={{
                    background: "var(--cf-amber)",
                    boxShadow: "0 0 6px var(--cf-amber)",
                  }}
                />
                <h2
                  className="text-white font-bold"
                  style={{ fontSize: "16px" }}
                >
                  {i + 1}. {s.heading}
                </h2>
              </div>
              <div className="flex flex-col gap-3 pl-4">
                {s.blocks.map((block) => (
                  <Block key={blockKey(block)} block={block} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Footer nav */}
        <div className="flex justify-center pb-4">
          <Link
            href="/"
            className="aero-btn aero-btn--ghost px-5 py-2.5"
            style={{ fontSize: "12px" }}
          >
            ← {chrome.back}
          </Link>
        </div>
      </div>
    </div>
  );
}
