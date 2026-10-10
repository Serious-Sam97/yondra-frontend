"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ALL_MOODS } from "@/lib/vortexArt";
import { animNames } from "@/vortex/body/anims";
import { rewatch } from "@/vortex/core/story";
import { wardrobeSvg } from "@/vortex/econ/costumes";
import "./lab.css";

// S-04 · THE CONTENT EDITOR (internal). Reads the live catalogs (episodes,
// fragments, items, NPC prompts), lets you draft an entry as JSON, validates
// it against the same rules the server uses, previews it for real (episodes
// play on the actual Vortex in this tab) and exports PHP to paste into
// config/. It never writes files: content still ships through code review.

type Kind = "episodes" | "fragments" | "items" | "npcs" | "lines";
type Catalog = Record<Exclude<Kind, "lines">, Record<string, unknown>>;

const STEP_KINDS = ["say", "mood", "anim", "wait", "fx", "choice", "below"];
const FX = [
  "squeal",
  "pencil",
  "hand",
  "rewind-card",
  "melt",
  "crash",
  "print-through",
  "overwritten",
  "wall-eyes",
  "static",
  "radio",
  "die",
  "reform",
];
const SLOTS = ["costume", "eye", "border", "voice", "trail", null];

function validate(kind: Kind, v: unknown): string[] {
  const e: string[] = [];
  const o = v as Record<string, unknown>;
  if (kind === "lines") {
    const t = String(v ?? "");
    if (t.length < 2 || t.length > 200) e.push("a line is 2–200 characters");
    if (/https?:|www\.|@\w/.test(t)) e.push("no links or @mentions");
    if (/[A-Z]{6,}/.test(t) && !/^[A-Z\s.!?]+$/.test(t))
      e.push("he writes in lowercase (shouting is fine, all of it)");
    return e;
  }
  if (typeof v !== "object" || v === null || Array.isArray(v))
    return ["an entry is a JSON object"];
  if (kind === "episodes") {
    for (const k of ["season", "n", "title", "steps"])
      if (!(k in o)) e.push(`missing "${k}"`);
    if (!Array.isArray(o.steps)) return [...e, '"steps" must be a list'];
    (o.steps as unknown[]).forEach((s, i) => {
      if (!Array.isArray(s) || !STEP_KINDS.includes(String(s[0]))) {
        e.push(`step ${i + 1}: unknown step "${Array.isArray(s) ? s[0] : s}"`);
        return;
      }
      const [k, a, b] = s as [string, unknown, unknown];
      if (k === "say" && typeof a !== "string")
        e.push(`step ${i + 1}: say needs text`);
      if (
        (k === "say" && b && !ALL_MOODS.includes(b as never)) ||
        (k === "mood" && !ALL_MOODS.includes(a as never))
      )
        e.push(`step ${i + 1}: unknown mood`);
      if (k === "anim" && !animNames().includes(String(a)))
        e.push(`step ${i + 1}: no animation "${a}"`);
      if (k === "fx" && !FX.includes(String(a)))
        e.push(`step ${i + 1}: unknown fx "${a}"`);
      if (k === "wait" && (typeof a !== "number" || a < 0 || a > 20000))
        e.push(`step ${i + 1}: wait is 0–20000 ms`);
      if (
        k === "choice" &&
        (!Array.isArray(s[3]) || (s[3] as unknown[]).length < 2)
      )
        e.push(`step ${i + 1}: a choice needs 2+ options`);
    });
  }
  if (kind === "fragments") {
    for (const k of ["layer", "where", "claim", "text", "hints"])
      if (!(k in o)) e.push(`missing "${k}"`);
    if (Array.isArray(o.hints) && o.hints.length !== 3)
      e.push("a fragment has exactly 3 hints (vague → exact)");
    if ("secret" in o)
      e.push('never put "secret" in a draft — the hash lives only in config');
  }
  if (kind === "items") {
    for (const k of ["name", "price"]) if (!(k in o)) e.push(`missing "${k}"`);
    if ("slot" in o && !SLOTS.includes(o.slot as never))
      e.push(`unknown slot "${o.slot}"`);
  }
  return e;
}

/** JSON → PHP short arrays, the style config/ files use */
function php(v: unknown, ind = ""): string {
  if (Array.isArray(v)) {
    const flat = v.every((x) => typeof x !== "object" || x === null);
    return flat
      ? `[${v.map((x) => php(x)).join(", ")}]`
      : `[\n${v.map((x) => `${ind}    ${php(x, `${ind}    `)}`).join(",\n")},\n${ind}]`;
  }
  if (v && typeof v === "object")
    return `[\n${Object.entries(v)
      .map(([k, x]) => `${ind}    '${k}' => ${php(x, `${ind}    `)}`)
      .join(",\n")},\n${ind}]`;
  if (typeof v === "string")
    return `'${v.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
  if (v === null) return "null";
  return String(v);
}

function ItemArt({ id }: { id: string }) {
  const html = { __html: wardrobeSvg(id) };
  // biome-ignore lint/security/noDangerouslySetInnerHtml: our own costume SVG by id
  return <div className="vxce-item" dangerouslySetInnerHTML={html} />;
}

export default function ContentEditor() {
  const [cat, setCat] = useState<Catalog | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind>("episodes");
  const [id, setId] = useState("");
  const [draft, setDraft] = useState("");
  const [lineDraft, setLineDraft] = useState(
    "you call that a sprint? i've seen faster continental drift.",
  );

  useEffect(() => {
    apiFetch<Catalog>("/api/mascot/dev/content")
      .then(setCat)
      .catch(() =>
        setErr("content API unavailable (needs local env or VORTEX_DEV)."),
      );
  }, []);

  const ids = useMemo(
    () => (cat && kind !== "lines" ? Object.keys(cat[kind]) : []),
    [cat, kind],
  );
  const pickId = (k: string) => {
    if (!cat || kind === "lines") return;
    setId(k);
    const v = cat[kind][k];
    setDraft(
      kind === "npcs"
        ? JSON.stringify({ prompt: v }, null, 2)
        : JSON.stringify(v, null, 2),
    );
  };
  let parsed: unknown = null;
  let parseErr: string | null = null;
  try {
    parsed =
      kind === "lines" ? lineDraft : draft.trim() ? JSON.parse(draft) : null;
  } catch (e) {
    parseErr = (e as Error).message;
  }
  const problems = parseErr
    ? [`JSON: ${parseErr}`]
    : parsed === null
      ? []
      : validate(kind, parsed);
  const ok = !parseErr && parsed !== null && problems.length === 0;
  const p = parsed as Record<string, unknown> | null;

  const preview = () => {
    if (!ok || !p) return;
    if (kind === "episodes")
      rewatch({
        id: id || "draft",
        season: Number(p.season),
        n: Number(p.n),
        title: String(p.title),
        recap: String(p.recap ?? ""),
        steps: p.steps as never,
        credits: String(p.credits ?? ""),
        teaser: String(p.teaser ?? ""),
        finale: !!p.finale,
        special: "date" in p,
      });
    if (kind === "lines")
      window.dispatchEvent(
        new CustomEvent("vortex:say", { detail: { text: lineDraft } }),
      );
  };

  if (err)
    return (
      <main className="vxlab">
        <p>{err}</p>
      </main>
    );
  return (
    <main className="vxlab">
      <header>
        <h1>content editor</h1>
        <p>
          dev only · S-04 · draft, validate, preview, export. nothing here
          writes to disk.
        </p>
      </header>
      <div className="vxlab-chips">
        {(["episodes", "fragments", "items", "npcs", "lines"] as Kind[]).map(
          (k) => (
            <button
              key={k}
              type="button"
              className={k === kind ? "is-on" : ""}
              onClick={() => {
                setKind(k);
                setId("");
                setDraft("");
              }}
            >
              {k}
            </button>
          ),
        )}
      </div>
      <section className="vxce">
        {kind !== "lines" && (
          <aside className="vxce-ids">
            <button
              type="button"
              onClick={() => {
                setId("");
                setDraft(
                  kind === "episodes"
                    ? JSON.stringify(
                        {
                          season: 1,
                          n: 99,
                          title: "Untitled",
                          days: 7,
                          recap: "",
                          steps: [
                            ["mood", "curious"],
                            ["say", "hi."],
                          ],
                          credits: "",
                          teaser: "",
                        },
                        null,
                        2,
                      )
                    : "{\n}",
                );
              }}
            >
              + new
            </button>
            {ids.map((k) => (
              <button
                key={k}
                type="button"
                className={k === id ? "is-on" : ""}
                onClick={() => pickId(k)}
              >
                {k}
              </button>
            ))}
          </aside>
        )}
        <div className="vxce-main">
          {kind === "lines" ? (
            <textarea
              value={lineDraft}
              onChange={(e) => setLineDraft(e.target.value)}
              rows={4}
              aria-label="a line"
            />
          ) : (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={22}
              spellCheck={false}
              aria-label="entry JSON"
            />
          )}
          <div className={`vxce-status ${ok ? "is-ok" : ""}`}>
            {ok
              ? "✓ valid"
              : problems.length
                ? problems.map((x) => <div key={x}>✕ {x}</div>)
                : "pick an entry or start a new one"}
          </div>
          <div className="vxlab-chips">
            {(kind === "episodes" || kind === "lines") && (
              <button type="button" disabled={!ok} onClick={preview}>
                ▶ preview on Vortex
              </button>
            )}
            {kind !== "lines" && (
              <button
                type="button"
                disabled={!ok}
                onClick={() =>
                  void navigator.clipboard?.writeText(
                    `'${id || "new-id"}' => ${php(parsed)},`,
                  )
                }
              >
                copy as PHP
              </button>
            )}
          </div>
          {kind === "fragments" && ok && p && (
            <div className="vxce-card">
              <b>FRAGMENT · layer {String(p.layer)}</b>
              <p>{String(p.text)}</p>
              <ol>
                {(p.hints as string[]).map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ol>
              <i>found in: {String(p.where)}</i>
            </div>
          )}
          {kind === "items" && ok && p && (
            <div className="vxce-card">
              <b>{String(p.name)}</b> · {String(p.price)}{" "}
              {String(p.currency ?? "tokens")} · {String(p.slot ?? "—")}
              {String(p.desc ?? "") && <p>{String(p.desc)}</p>}
              {id && <ItemArt id={id} />}
            </div>
          )}
          {kind === "npcs" && ok && p && (
            <pre className="vxtl-code">{String(p.prompt ?? "")}</pre>
          )}
        </div>
      </section>
    </main>
  );
}
