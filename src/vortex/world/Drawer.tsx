"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { loadSoul, useSoul } from "@/vortex/core/soul";
import { type Episode, fetchLibrary, rewatch } from "@/vortex/core/story";
import { type Fragment, fetchFragments } from "@/vortex/mysteries/fragments";
import GhostsTab from "@/vortex/social/GhostsTab";
import "./drawer.css";
import { achTitle, tr, useVxLang } from "@/vortex/core/i18n";

// The drawer in your profile where his things live: vital signs (C-04, with the
// mood's cause, C-06), his diary once you find the key (C-12), and — as later
// phases land — the dossier, his letters, the fragment file and the videotapes.

export type DrawerTab =
  | "vitals"
  | "diary"
  | "dossier"
  | "letters"
  | "fragments"
  | "tapes"
  | "shelf"
  | "ghosts";

const NEED_LABEL: Record<string, string> = {
  hunger: "HUNGER",
  boredom: "BOREDOM",
  sanity: "SANITY",
  loneliness: "LONELY",
  ego: "EGO",
  energy: "ENERGY",
};

function Vitals() {
  const soul = useSoul();
  if (!soul) return <p className="vxd-empty">{tr("tuning in…")}</p>;
  const rel = soul.relation;
  return (
    <div className="vxd-vitals">
      <div className="vxd-vfd">
        <span className="ghost" aria-hidden>
          8888888888888888888888888888888
        </span>
        <span className="txt">
          {tr("MOOD")}: {soul.mood.toUpperCase()} · {tr("CAUSE")}:{" "}
          {soul.cause.toUpperCase()}
        </span>
      </div>
      <div className="vxd-meters">
        {Object.entries(soul.needs).map(([k, v]) => (
          <div key={k} className="vxd-meter">
            <span className="lbl">{tr(NEED_LABEL[k] ?? k)}</span>
            <span className="sr-only">{`${tr(NEED_LABEL[k] ?? k)} ${v}%`}</span>
            <span className="bar" aria-hidden="true">
              {Array.from({ length: 20 }, (_, i) => (
                <i
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed segments
                  key={i}
                  className={
                    i * 5 < v ? (i >= 16 ? "hot" : i >= 12 ? "warm" : "on") : ""
                  }
                />
              ))}
            </span>
            <span className="num">{String(v).padStart(3, "0")}</span>
          </div>
        ))}
      </div>
      <div className="vxd-rel">
        <span className="lbl">{tr("CONTEMPT")}</span>
        <span className="track">
          <i style={{ left: `${(rel + 100) / 2}%` }} />
        </span>
        <span className="lbl">{tr("RESPECT")}</span>
        <span className="nick">
          {tr("calls you")} “{soul.nickname}”
        </span>
      </div>
      <dl className="vxd-facts">
        <div>
          <dt>{tr("age")}</dt>
          <dd>
            {soul.age_days} {tr("days")}
          </dd>
        </div>
        {soul.tape_left !== undefined && (
          // H-30 · the whole tape, for everyone
          <div className={soul.tape_left < 25 ? "is-red" : ""}>
            <dt>{tr("tape left (all of us)")}</dt>
            <dd>{soul.tape_left}%</dd>
          </div>
        )}
        <div>
          <dt>{tr("deaths")}</dt>
          <dd>{soul.deaths}</dd>
        </div>
        <div>
          <dt>{tr("traits")}</dt>
          <dd>{soul.traits.length ? soul.traits.join(" · ") : "unformed"}</dd>
        </div>
        <div>
          <dt>{tr("scars")}</dt>
          <dd>
            {soul.scars.length ? soul.scars.join(" · ") : tr("none. yet.")}
          </dd>
        </div>
        {soul.stage > 0 && (
          // H-01 · the red meter only shows once there's something to show
          <div className="is-red">
            <dt>{tr("corruption")}</dt>
            <dd>
              {tr("stage")} {soul.stage} · {soul.corruption}%
            </dd>
          </div>
        )}
        {soul.sick && (
          <div className="is-red">
            <dt>{tr("condition")}</dt>
            <dd>{tr("mould. stay a while, move some cards, talk to him.")}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function Diary() {
  const [data, setData] = useState<{
    locked: boolean;
    entries: { day: string; body: string }[];
  } | null>(null);
  useEffect(() => {
    apiFetch<{ locked: boolean; entries: { day: string; body: string }[] }>(
      "/api/mascot/diary",
    )
      .then(setData)
      .catch(() => setData({ locked: true, entries: [] }));
  }, []);
  if (!data) return <p className="vxd-empty">{tr("opening…")}</p>;
  if (data.locked)
    return (
      <div className="vxd-locked">
        <span className="lock" aria-hidden>
          🔒
        </span>
        <p>
          {tr(
            "a small notebook, padlocked. it says DO NOT on the cover. just “do not”.",
          )}
        </p>
        <p className="hint">
          {tr(
            "the key is somewhere below. he'd never leave it lying around. (he would.)",
          )}
        </p>
      </div>
    );
  if (data.entries.length === 0)
    return (
      <p className="vxd-empty">
        {tr("nothing written yet. he writes at night.")}
      </p>
    );
  return (
    <div className="vxd-diary">
      {data.entries.map((e) => (
        <article key={e.day}>
          <h4>{e.day}</h4>
          {e.body.split("\n").map((line, i) => {
            const other = /«([^»]+)»/.exec(line);
            return other ? (
              // K-15 · a different hand
              // biome-ignore lint/suspicious/noArrayIndexKey: static lines
              <p key={i} className="other">
                {other[1]}
              </p>
            ) : (
              // biome-ignore lint/suspicious/noArrayIndexKey: static lines
              <p key={i}>{line}</p>
            );
          })}
        </article>
      ))}
    </div>
  );
}

/** F-02 · the dossier: a typewritten police file of what he knows about you. */
function Dossier() {
  const [facts, setFacts] = useState<
    { id: number; category: string; fact: string; created_at: string }[] | null
  >(null);
  const [gone, setGone] = useState<string | null>(null);
  useEffect(() => {
    apiFetch<
      { id: number; category: string; fact: string; created_at: string }[]
    >("/api/mascot/memories")
      .then(setFacts)
      .catch(() => setFacts([]));
  }, []);
  const forget = async (id?: number) => {
    await apiFetch(`/api/mascot/memories${id ? `/${id}` : ""}`, {
      method: "DELETE",
    }).catch(() => null);
    setFacts((f) => (id ? (f ?? []).filter((x) => x.id !== id) : []));
    setGone(
      id
        ? "you can delete the file. i still remember. (i don't. it's deleted. that's how computers work.)"
        : "the whole file. gone. who are you again? (i mean it this time.)",
    );
  };
  if (!facts) return <p className="vxd-empty">{tr("pulling the file…")}</p>;
  return (
    <div className="vxd-dossier">
      <div className="vxd-file">
        <div className="stamp">{tr("CONFIDENTIAL")}</div>
        <h4>
          {tr("SUBJECT FILE")} · {facts.length} {tr("entries")}
        </h4>
        {facts.length === 0 ? (
          <p className="none">
            {tr(
              "nothing on file. talk to him and it fills up. that's the deal.",
            )}
          </p>
        ) : (
          <ul>
            {facts.map((f) => (
              <li key={f.id}>
                <span className="cat">{f.category}</span>
                <span className="fact">{f.fact}</span>
                <button
                  type="button"
                  onClick={() => void forget(f.id)}
                  title={tr("Forget this")}
                >
                  {tr("redact")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {facts.length > 0 && (
        <button
          type="button"
          className="vxd-burn"
          onClick={() => void forget()}
        >
          {tr("burn the whole file")}
        </button>
      )}
      {gone && <p className="vxd-quip">{gone}</p>}
    </div>
  );
}

/** F-14 · his letters, in a drawer. */
function Letters() {
  const [list, setList] = useState<
    { id: number; day: string; body: string; new: boolean }[] | null
  >(null);
  useEffect(() => {
    apiFetch<{ id: number; day: string; body: string; new: boolean }[]>(
      "/api/mascot/letters",
    )
      .then(setList)
      .catch(() => setList([]));
  }, []);
  if (!list) return <p className="vxd-empty">{tr("opening the drawer…")}</p>;
  if (list.length === 0)
    return (
      <p className="vxd-empty">
        {tr("no letters yet. he writes once a month. on a day only he knows.")}
      </p>
    );
  return (
    <div className="vxd-letters">
      {list.map((l) => {
        const lines = l.body.split("\n");
        const ps = lines.findIndex((x) => x.trim().startsWith("p.s"));
        return (
          <article key={l.id} className={l.new ? "is-new" : ""}>
            <h4>{l.day}</h4>
            {(ps >= 0 ? lines.slice(0, ps) : lines).map((x, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static lines
              <p key={i}>{x}</p>
            ))}
            {ps >= 0 && <p className="ps">{lines.slice(ps).join(" ")}</p>}
            <p className="sig">— v.</p>
          </article>
        );
      })}
    </div>
  );
}

/** K-01 · the fragment file: clipped cards, layer by layer, and a hint if you're stuck. */
function Fragments() {
  const [data, setData] = useState<{
    owned: Fragment[];
    total: number;
    hint: string | null;
    hint_where: string | null;
  } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    fetchFragments()
      .then(setData)
      .catch(() =>
        setData({ owned: [], total: 64, hint: null, hint_where: null }),
      );
  }, []);
  if (!data) return <p className="vxd-empty">{tr("pulling the file…")}</p>;
  return (
    <div className="vxk-file">
      <div className="vxk-head">
        <b>
          {String(data.owned.length).padStart(2, "0")}/{data.total}
        </b>
        {tr("fragments recorded · the rest are hiding")}
      </div>
      {data.hint && (
        <div className="vxk-hint">
          you've been stuck a while. somewhere around {data.hint_where}:{" "}
          {data.hint}
        </div>
      )}
      <div className="vxk-cards">
        {data.owned.map((f, i) => (
          <article
            key={f.id}
            className={`vxk-card l${f.layer}`}
            style={{ "--r": `${((i * 37) % 5) - 2}deg` } as React.CSSProperties}
          >
            <h5>
              <span>{f.id}</span>
              <span>L{f.layer}</span>
            </h5>
            <p>{f.text}</p>
            <div className="where">found: {f.where}</div>
            <button
              type="button"
              className="vxk-share"
              onClick={() => {
                // K-30 · share where, never what
                void navigator.clipboard?.writeText(
                  `vortex fragment ${f.id} (layer ${f.layer}) — look around: ${f.where}.`,
                );
                setCopied(f.id);
              }}
            >
              {copied === f.id
                ? "copied the clue (not the answer)"
                : "share the clue"}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

interface Album {
  name: string;
  level: number;
  days: number;
  public: boolean;
  albums: {
    id: string;
    name: string;
    got: number;
    total: number;
    labels: {
      id: string;
      title: string;
      got: boolean;
      secret: boolean;
      progress: number;
    }[];
  }[];
  collections: {
    id: string;
    name: string;
    have: number;
    size: number;
    complete: boolean;
  }[];
}

/** N-10 / N-19 · the shelf: level, three albums of tape labels, sets, time together. */
function Shelf() {
  const [a, setA] = useState<Album | null>(null);
  const [side, setSide] = useState("A");
  const [team, setTeam] = useState<{ id: number; name: string }[]>([]);
  const [peek, setPeek] = useState<Album | "private" | null>(null);
  useEffect(() => {
    apiFetch<Album>("/api/mascot/album")
      .then(setA)
      .catch(() => {});
    apiFetch<{ team: { id: number; name: string }[] }>("/api/mascot/radio/team")
      .then((r) => setTeam(r.team))
      .catch(() => {});
  }, []);
  if (!a) return <p className="vxd-empty">{tr("dusting the shelf…")}</p>;
  const al = a.albums.find((x) => x.id === side) ?? a.albums[0];
  return (
    <div className="vxs-shelf">
      <div className="vxs-top">
        <b>LV {a.level}</b>
        <span>
          {a.days} {tr("days together")}
        </span>
        <span>
          {a.albums.reduce((n, x) => n + x.got, 0)}/
          {a.albums.reduce((n, x) => n + x.total, 0)} {tr("labels")}
        </span>
        <label className="pub">
          <input
            type="checkbox"
            checked={a.public}
            onChange={async (e) => {
              const on = e.target.checked;
              setA({ ...a, public: on });
              await apiFetch("/api/mascot/album/public", {
                method: "POST",
                body: JSON.stringify({ on }),
              }).catch(() => {});
            }}
          />{" "}
          {tr("let my team see this shelf")}
        </label>
      </div>
      <div className="vxs-sides">
        {a.albums.map((x) => (
          <button
            key={x.id}
            type="button"
            className={side === x.id ? "is-on" : ""}
            onClick={() => setSide(x.id)}
          >
            {tr(x.name)} · {x.got}/{x.total}
          </button>
        ))}
      </div>
      <ul className="vxs-labels">
        {al.labels.map((l) => (
          <li
            key={l.id}
            className={`${l.got ? "is-got" : ""}${l.secret ? " is-secret" : ""}`}
            title={achTitle(l)}
          >
            <span>{achTitle(l)}</span>
            {!l.got && !l.secret && (
              <i
                className="bar"
                style={{ width: `${Math.round(l.progress * 100)}%` }}
              />
            )}
          </li>
        ))}
      </ul>
      <div className="vxs-sets">
        {a.collections.map((c) => (
          <span key={c.id} className={c.complete ? "is-done" : ""}>
            {tr(c.name)}: {c.have}/{c.size}
          </span>
        ))}
      </div>
      {team.length > 0 && (
        <div className="vxs-team">
          <span>{tr("their shelves:")}</span>
          {team.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() =>
                apiFetch<Album>(`/api/mascot/album/${m.id}`)
                  .then(setPeek)
                  .catch(() => setPeek("private"))
              }
            >
              {m.name.split(" ")[0]}
            </button>
          ))}
          {peek === "private" && (
            <em>{tr("that shelf is behind glass. private.")}</em>
          )}
          {peek && peek !== "private" && (
            <em>
              {peek.name.split(" ")[0]}: LV {peek.level} · {peek.days} days ·{" "}
              {peek.albums.reduce((n, x) => n + x.got, 0)} labels
            </em>
          )}
        </div>
      )}
    </div>
  );
}

/** L-14 · the Videoteca: every episode you've watched, on VHS, to rewatch. */
function Videoteca() {
  const [eps, setEps] = useState<Episode[] | null>(null);
  useEffect(() => {
    void fetchLibrary().then(setEps);
  }, []);
  if (!eps) return <p className="vxd-empty">{tr("rewinding the tapes…")}</p>;
  if (eps.length === 0)
    return (
      <p className="vxd-empty">
        {tr("no episodes yet. the series starts when he's ready. you'll know.")}
      </p>
    );
  return (
    <ul className="vxl-shelf">
      {eps.map((e) => (
        <li key={e.id}>
          <button
            type="button"
            className={`vxl-vhs s${e.season}${e.finale ? " is-finale" : ""}`}
            onClick={() => rewatch(e)}
            title={tr("rewatch")}
          >
            <span className="lbl">
              {e.special
                ? "SPECIAL"
                : e.season === 0
                  ? "BONUS"
                  : `S${e.season} · E${e.n}`}
            </span>
            <b>{e.title}</b>
            {e.chosen && Object.keys(e.chosen).length > 0 && (
              <small>{tr("your choice is on this tape")}</small>
            )}
            <i>{tr("▶ rewatch")}</i>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function VortexDrawer() {
  useVxLang(); // T-13 · re-render on language change
  const [tab, setTab] = useState<DrawerTab>(() =>
    typeof window !== "undefined" && window.location.hash === "#vortex-letters"
      ? "letters"
      : "vitals",
  );
  useEffect(() => {
    void loadSoul();
    if (window.location.hash === "#vortex-letters")
      document
        .getElementById("vortex-letters")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  const tabs: { id: DrawerTab; label: string }[] = [
    { id: "vitals", label: "vital signs" },
    { id: "dossier", label: "the dossier" },
    { id: "letters", label: "letters" },
    { id: "diary", label: "his diary" },
  ];
  const soulNow = useSoul();
  // K-01 · the file only shows up after the first fragment
  if ((soulNow?.fragments.length ?? 0) > 0)
    tabs.push({ id: "fragments", label: "the file" });
  if ((soulNow?.story.seen.length ?? 0) > 0)
    tabs.push({ id: "tapes", label: "videotapes" });
  tabs.push({ id: "shelf", label: "the shelf" });
  tabs.push({ id: "ghosts", label: "the ghosts" });
  return (
    <section
      className="vxd"
      id="vortex-letters"
      aria-label={tr("Vortex's drawer")}
    >
      <header className="vxd-h">
        <h3>{tr("his drawer")}</h3>
        <span>{tr("things he keeps. don't tell him you looked.")}</span>
        <button
          type="button"
          className="vxd-case"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("vortex:case", { detail: {} }))
          }
        >
          {tr("▤ open his case")}
        </button>
      </header>
      <div className="vxd-tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {tr(t.label)}
          </button>
        ))}
      </div>
      <div className="vxd-body" role="tabpanel">
        {tab === "vitals" ? (
          <Vitals />
        ) : tab === "dossier" ? (
          <Dossier />
        ) : tab === "letters" ? (
          <Letters />
        ) : tab === "fragments" ? (
          <Fragments />
        ) : tab === "tapes" ? (
          <Videoteca />
        ) : tab === "shelf" ? (
          <Shelf />
        ) : tab === "ghosts" ? (
          <GhostsTab />
        ) : (
          <Diary />
        )}
      </div>
    </section>
  );
}
