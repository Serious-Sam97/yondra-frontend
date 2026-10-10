"use client";

import { useEffect, useState } from "react";
import { type ApiError, apiFetch } from "@/lib/api";
import { vortexSvg } from "@/lib/vortexArt";
import { animNames } from "@/vortex/body/anims";
import { refreshSoul, useSoul } from "@/vortex/core/soul";
import { type CustomCostume, customCostumeSvg } from "@/vortex/econ/costumes";
import { equip } from "@/vortex/econ/econ";
import { decodeGenome, encodeGenome, genomeOf } from "./genome";
import "./creator.css";
import { tr, useVxLang } from "@/vortex/core/i18n";

// LADO S · the panel where you shape him: tricks (S-01), lines (S-02), the
// taste your thumbs built (S-03), a costume of your own (S-08) and his genome
// to share (S-09). Every write goes through the server and its red lines.

interface Trick {
  id: string;
  trigger: string;
  anim: string;
  line: string;
}
interface CreatorState {
  tricks: Trick[];
  lines: { text: string; verdict: string; at: string }[];
  taste: Record<string, number>;
  costume: CustomCostume | null;
  triggers: string[];
  hats: string[];
  accessories: string[];
}

const TRIGGER_LABEL: Record<string, string> = {
  done: "a card hits done",
  moved: "a card moves",
  opened: "a card opens",
  archived: "a card is archived",
  jammed: "a card jams",
  renamed: "a card is renamed",
  hello: "you arrive",
};

const reasonOf = (e: unknown) => {
  try {
    return JSON.parse((e as ApiError).body).reason ?? "no.";
  } catch {
    return "no.";
  }
};

export default function CreatorPanel({ disabled }: { disabled: boolean }) {
  useVxLang(); // T-13 · re-render on language change
  const soul = useSoul();
  const [open, setOpen] = useState(false);
  const [d, setD] = useState<CreatorState | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [trick, setTrick] = useState({
    trigger: "done",
    anim: "slowclap",
    line: "",
  });
  const [line, setLine] = useState("");
  const [cos, setCos] = useState<CustomCostume>({
    hat: "crown",
    acc: "monocle",
    c1: "#ff2e88",
    c2: "#ffd319",
  });
  const [code, setCode] = useState("");

  useEffect(() => {
    if (!open) return;
    apiFetch<CreatorState>("/api/mascot/creator")
      .then((r) => {
        setD(r);
        if (r.costume) setCos(r.costume);
      })
      .catch(() => {});
  }, [open]);

  const post = async <T,>(url: string, body: unknown, method = "POST") => {
    try {
      return await apiFetch<T>(url, {
        method,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (e) {
      setMsg(reasonOf(e));
      return null;
    }
  };

  const anims = animNames().sort();
  const preview = {
    __html: `<div class="vxcr-prev-face">${vortexSvg("smug", "cprev")}</div><div class="vxcr-prev-hat">${customCostumeSvg(cos)}</div>`,
  };

  return (
    <div className="vxu" style={{ opacity: disabled ? 0.5 : 1 }}>
      <button
        type="button"
        className="vxu-head vxu-fold"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {open ? "▾" : "▸"}{" "}
        {tr("SHAPE HIM · tricks, lines, a costume, his genome")}
      </button>
      {open && d && (
        <div className="vxcr">
          {/* S-01 */}
          <section>
            <h4>
              {tr("tricks")} ({d.tricks.length}/10)
            </h4>
            <form
              className="vxcr-row"
              onSubmit={async (e) => {
                e.preventDefault();
                const r = await post<{ tricks: Trick[]; say: string }>(
                  "/api/mascot/creator/tricks",
                  trick,
                );
                if (r) {
                  setD({ ...d, tricks: r.tricks });
                  setMsg(r.say);
                  setTrick({ ...trick, line: "" });
                  void refreshSoul();
                }
              }}
            >
              <span>{tr("when")}</span>
              <select
                value={trick.trigger}
                onChange={(e) =>
                  setTrick({ ...trick, trigger: e.target.value })
                }
                aria-label={tr("trigger")}
              >
                {d.triggers.map((t) => (
                  <option key={t} value={t}>
                    {tr(TRIGGER_LABEL[t] ?? t)}
                  </option>
                ))}
              </select>
              <span>{tr("do")}</span>
              <select
                value={trick.anim}
                onChange={(e) => setTrick({ ...trick, anim: e.target.value })}
                aria-label={tr("animation")}
              >
                {anims.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <input
                value={trick.line}
                onChange={(e) => setTrick({ ...trick, line: e.target.value })}
                maxLength={140}
                placeholder={tr("and say… (optional)")}
                aria-label={tr("what he says")}
              />
              <button type="submit" disabled={disabled}>
                {tr("teach")}
              </button>
            </form>
            <ul className="vxcr-list">
              {d.tricks.map((t) => (
                <li key={t.id}>
                  <span>
                    {tr(TRIGGER_LABEL[t.trigger] ?? t.trigger)} →{" "}
                    <b>{t.anim}</b>
                    {t.line ? ` · “${t.line}”` : ""}
                  </span>
                  <button
                    type="button"
                    aria-label={tr("forget this trick")}
                    onClick={async () => {
                      const r = await post<{ tricks: Trick[] }>(
                        `/api/mascot/creator/tricks/${t.id}`,
                        undefined,
                        "DELETE",
                      );
                      if (r) {
                        setD({ ...d, tricks: r.tricks });
                        void refreshSoul();
                      }
                    }}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* S-02 */}
          <section>
            <h4>
              {tr("teach him a line")} ({d.lines.length}/40)
            </h4>
            <form
              className="vxcr-row"
              onSubmit={async (e) => {
                e.preventDefault();
                const r = await post<{
                  verdict: string;
                  lines: CreatorState["lines"];
                }>("/api/mascot/creator/lines", { text: line });
                if (r) {
                  setD({ ...d, lines: r.lines });
                  setMsg(`“${line}” — ${r.verdict}`);
                  setLine("");
                }
              }}
            >
              <input
                value={line}
                onChange={(e) => setLine(e.target.value)}
                maxLength={160}
                placeholder={tr("something he'd say. or should.")}
                aria-label={tr("a line for him")}
              />
              <button
                type="submit"
                disabled={disabled || line.trim().length < 3}
              >
                {tr("teach")}
              </button>
            </form>
            <ul className="vxcr-list">
              {d.lines.map((l, i) => (
                <li key={l.text}>
                  <span>
                    “{l.text}” <i>— {l.verdict}</i>
                  </span>
                  <button
                    type="button"
                    aria-label={tr("make him forget this line")}
                    onClick={async () => {
                      const r = await post<{ lines: CreatorState["lines"] }>(
                        `/api/mascot/creator/lines/${i}`,
                        undefined,
                        "DELETE",
                      );
                      if (r) setD({ ...d, lines: r.lines });
                    }}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* S-03 */}
          {Object.keys(d.taste).length > 0 && (
            <section>
              <h4>{tr("his taste, according to your thumbs")}</h4>
              <div className="vxcr-taste">
                {Object.entries(d.taste).map(([k, v]) => (
                  <span
                    key={k}
                    style={
                      { "--w": `${Math.abs(v) * 10}%` } as React.CSSProperties
                    }
                    className={v >= 0 ? "up" : "down"}
                  >
                    {k} {v > 0 ? `+${v}` : v}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* S-08 */}
          <section>
            <h4>{tr("a costume of your own")}</h4>
            <div className="vxcr-costume">
              {/* biome-ignore lint/security/noDangerouslySetInnerHtml: generated SVG, colours validated */}
              <div className="vxcr-prev" dangerouslySetInnerHTML={preview} />
              <div className="vxcr-col">
                <label>
                  {tr("hat")}
                  <select
                    value={cos.hat}
                    onChange={(e) => setCos({ ...cos, hat: e.target.value })}
                  >
                    {d.hats.map((h) => (
                      <option key={h} value={h}>
                        {tr(h)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {tr("extra")}
                  <select
                    value={cos.acc}
                    onChange={(e) => setCos({ ...cos, acc: e.target.value })}
                  >
                    {d.accessories.map((h) => (
                      <option key={h} value={h}>
                        {tr(h)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {tr("colour")}
                  <input
                    type="color"
                    value={cos.c1}
                    onChange={(e) => setCos({ ...cos, c1: e.target.value })}
                  />
                </label>
                <label>
                  {tr("detail")}
                  <input
                    type="color"
                    value={cos.c2}
                    onChange={(e) => setCos({ ...cos, c2: e.target.value })}
                  />
                </label>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={async () => {
                    const r = await post<{ say: string }>(
                      "/api/mascot/creator/costume",
                      cos,
                    );
                    if (!r) return;
                    await equip("costume", "custom-costume"); // reloads the case
                    await refreshSoul();
                    setMsg(r.say);
                  }}
                >
                  {tr("sew it & wear it")}
                </button>
              </div>
            </div>
          </section>

          {/* S-09 */}
          <section>
            <h4>{tr("his genome")}</h4>
            <p className="vxu-hint">
              {tr(
                "Traits, tastes, scars and costume. Nothing about you or your work. A teammate can paste it to get a visit.",
              )}
            </p>
            {soul && (
              <div className="vxu-copy">
                <input
                  readOnly
                  value={encodeGenome(genomeOf(soul))}
                  aria-label={tr("genome code")}
                  onFocus={(e) => e.target.select()}
                />
                <button
                  type="button"
                  onClick={() =>
                    void navigator.clipboard
                      ?.writeText(encodeGenome(genomeOf(soul)))
                      .then(() =>
                        setMsg(
                          "copied. send it to someone who deserves a visit.",
                        ),
                      )
                  }
                >
                  {tr("copy")}
                </button>
              </div>
            )}
            <form
              className="vxu-copy"
              onSubmit={(e) => {
                e.preventDefault();
                const g = decodeGenome(code);
                if (!g) {
                  setMsg("that's not a genome. that's a cry for help.");
                  return;
                }
                window.dispatchEvent(
                  new CustomEvent("vortex:visitor", { detail: g }),
                );
                setCode("");
                setMsg("the door's open. something's coming.");
              }}
            >
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={tr("paste a VX1… genome")}
                aria-label={tr("a genome to invite")}
              />
              <button type="submit" disabled={!code.trim()}>
                {tr("invite a visitor")}
              </button>
            </form>
          </section>
          {msg && <p className="vxu-msg">{msg}</p>}
        </div>
      )}
    </div>
  );
}
