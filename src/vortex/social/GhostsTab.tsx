"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type ApiError, apiFetch } from "@/lib/api";
import { fetchBoards } from "@/lib/auth";
import "./social.css";
import { tr, useVxLang } from "@/vortex/core/i18n";

// LADO P · the drawer tab for the society of ghosts: opt in (P), your team's
// ghosts and how yours gets along with each (P-02/P-12), the Elder (P-04),
// factions and the cult (P-05/P-06), a group prank (P-07), the static choir
// (P-08), golden plaques (P-14), the contempt ranking (P-18, opt-in),
// reports and the workspace off-switch for admins (P-20).

interface Ghost {
  user_id: number;
  owner: string;
  mood: string;
  age_days: number;
  deaths: number;
  dead: boolean;
  faction: string | null;
  level: number;
  plaques: number;
}
interface Social {
  on: boolean;
  off_by_workspace: boolean;
  ghosts: Ghost[];
  gossip: string[];
  elder: { owner: string; user_id: number } | null;
  faction: string | null;
  factions: Record<string, number>;
  relations: Record<string, { score: number; met: number }>;
  contempt_on: boolean;
  contempt: { rank: number; ghost: string; why: string }[];
  weather: string;
}
const kind = (s: number) =>
  s >= 70
    ? "♥ in love"
    : s >= 30
      ? "friends"
      : s <= -60
        ? "contempt"
        : s <= -30
          ? "rivals"
          : "strangers";

export default function GhostsTab() {
  useVxLang(); // T-13 · re-render on language change
  const [d, setD] = useState<Social | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [plaqueFor, setPlaqueFor] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [boards, setBoards] = useState<{ id: number; name: string }[]>([]);
  const [board, setBoard] = useState<number | null>(null);
  const [voices, setVoices] = useState(0);
  const [mod, setMod] = useState<{
    social_off: boolean;
    polite_only: boolean;
  } | null>(null);
  const holding = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(() => {
    apiFetch<Social>("/api/mascot/social")
      .then(setD)
      .catch(() => {});
  }, []);
  useEffect(() => {
    load();
    fetchBoards()
      .then(({ owned, shared }) => {
        const all = [...owned, ...shared].map((b) => ({
          id: b.id,
          name: b.name,
        }));
        setBoards(all);
        setBoard(all[0]?.id ?? null);
      })
      .catch(() => {});
    apiFetch<{ social_off: boolean; polite_only: boolean }>(
      "/api/mascot/admin/moderation",
    )
      .then(setMod)
      .catch(() => {});
  }, [load]);

  const post = async (url: string, body: unknown, ok: string) => {
    try {
      await apiFetch(url, { method: "POST", body: JSON.stringify(body) });
      setMsg(ok);
      load();
    } catch (e) {
      try {
        setMsg(JSON.parse((e as ApiError).body).reason ?? "no.");
      } catch {
        setMsg("no.");
      }
    }
  };

  const holdNote = () => {
    if (!board) return;
    const note = Math.floor(Math.random() * 12);
    const send = () =>
      apiFetch<{ voices: number; chord: boolean }>("/api/mascot/social/choir", {
        method: "POST",
        body: JSON.stringify({ board, note }),
      })
        .then((r) => {
          setVoices(r.voices);
          if (r.chord)
            setMsg(
              "THE CHORD. three voices of static. somewhere below, a door opened.",
            );
        })
        .catch(() => {});
    void send();
    holding.current = setInterval(send, 2000);
  };
  const release = () => {
    if (holding.current) clearInterval(holding.current);
    holding.current = null;
  };

  if (!d) return <p className="vxd-empty">{tr("counting ghosts…")}</p>;

  return (
    <div className="vxp-tab">
      <label className="vxp-opt">
        <input
          type="checkbox"
          checked={d.on}
          onChange={(e) =>
            void post(
              "/api/mascot/social/settings",
              { on: e.target.checked },
              e.target.checked
                ? "he can visit and be seen now. behave. (he won't.)"
                : "he stays home. sulking.",
            )
          }
        />
        {tr("my vortex may visit teammates' boards and be seen")}
      </label>
      {d.off_by_workspace && (
        <p className="vxp-note">
          {tr("your workspace turned the ghost society off.")}
        </p>
      )}

      {d.on && (
        <>
          <section>
            <h4>
              the team&apos;s ghosts{" "}
              {d.weather !== "clear" ? `· weather below: ${d.weather}` : ""}
            </h4>
            {d.ghosts.length === 0 && (
              <p className="vxd-empty">
                {tr(
                  "no ghosts around. your team hasn't opted in. or they're all dead inside.",
                )}
              </p>
            )}
            <ul className="vxp-ghosts">
              {d.ghosts.map((g) => {
                const rel = d.relations[g.user_id];
                return (
                  <li key={g.user_id} className={g.dead ? "is-dead" : ""}>
                    <b>
                      {d.elder?.user_id === g.user_id && "👑 "}
                      {g.owner}&apos;s ghost
                    </b>
                    <span>
                      {g.dead ? "dead (the wake is open below)" : g.mood} ·{" "}
                      {g.age_days}d old · lv {g.level}
                      {g.faction ? ` · ${g.faction}` : ""}
                      {g.plaques ? ` · ${g.plaques} plaques` : ""}
                    </span>
                    <span className="rel">
                      {rel
                        ? `${kind(rel.score)} (${rel.met} visits)`
                        : "they haven't met"}
                    </span>
                    <span className="acts">
                      <button
                        type="button"
                        onClick={() =>
                          void post(
                            "/api/mascot/social/prank",
                            { target: g.user_id },
                            "armed. it fires when someone else on the team joins in.",
                          )
                        }
                      >
                        {tr("⚡ static attack")}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPlaqueFor(
                            plaqueFor === g.user_id ? null : g.user_id,
                          )
                        }
                      >
                        {tr("🏅 golden plaque")}
                      </button>
                    </span>
                    {plaqueFor === g.user_id && (
                      <form
                        className="plaque"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void post(
                            "/api/mascot/social/plaque",
                            { to: g.user_id, reason },
                            "engraved. it's on their shelf.",
                          );
                          setReason("");
                          setPlaqueFor(null);
                        }}
                      >
                        <input
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          maxLength={120}
                          placeholder={tr("for…")}
                          aria-label={tr("what for")}
                        />
                        <button type="submit">{tr("engrave")}</button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
            {d.elder && (
              <p className="vxp-note">
                the elder: {d.elder.owner}&apos;s ghost. the others pretend to
                respect it.
              </p>
            )}
          </section>

          {d.gossip.length > 0 && (
            <section>
              <h4>{tr("ghost gossip")}</h4>
              {d.gossip.map((g) => (
                <p key={g} className="gossip">
                  “{g}”
                </p>
              ))}
            </section>
          )}

          <section>
            <h4>factions {d.faction ? `· you: ${d.faction}` : ""}</h4>
            <div className="acts">
              {[
                ["recorders", "the recorders · make, collect, keep"],
                ["listeners", "the listeners · lore and mysteries"],
                ["demagnetised", "the demagnetised · chaos and dark"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={d.faction === id ? "is-on" : ""}
                  onClick={() =>
                    void post(
                      "/api/mascot/social/join",
                      { faction: id },
                      `you're one of ${label.split(" · ")[0]} now.`,
                    )
                  }
                >
                  {tr(label)}
                </button>
              ))}
              <button
                type="button"
                className="cult"
                title="?"
                onClick={() =>
                  void post(
                    "/api/mascot/social/join",
                    { faction: "cult" },
                    "welcome to the cult of the rewind. he won't look at you anymore.",
                  )
                }
              >
                ◉ ?
              </button>
            </div>
            {Object.keys(d.factions).length > 0 && (
              <p className="vxp-note">
                this month (echoes gathered):{" "}
                {Object.entries(d.factions)
                  .map(([f, n]) => `${f} ${n}`)
                  .join(" · ")}
              </p>
            )}
          </section>

          <section>
            <h4>{tr("the static choir (3 voices at once)")}</h4>
            <div className="acts">
              <select
                value={board ?? ""}
                onChange={(e) => setBoard(Number(e.target.value))}
                aria-label={tr("board")}
              >
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onPointerDown={holdNote}
                onPointerUp={release}
                onPointerLeave={release}
              >
                {tr("hold a note")}
              </button>
              <span>
                {voices
                  ? `${voices} voice${voices === 1 ? "" : "s"} holding`
                  : ""}
              </span>
            </div>
          </section>

          <section>
            <label className="vxp-opt">
              <input
                type="checkbox"
                checked={d.contempt_on}
                onChange={(e) =>
                  void post(
                    "/api/mascot/social/settings",
                    { contempt: e.target.checked },
                    "",
                  )
                }
              />
              {tr(
                "show his private contempt ranking (of ghosts, not people. always absurd.)",
              )}
            </label>
            {d.contempt.map((c) => (
              <p key={c.rank} className="gossip">
                #{c.rank} {c.ghost}. {c.why}
              </p>
            ))}
          </section>
        </>
      )}

      <section>
        <button
          type="button"
          className="report"
          onClick={() => {
            const text = window.prompt(
              "report a dedication, note or plaque (what did it say?)",
            );
            if (text)
              void post(
                "/api/mascot/social/report",
                { kind: "note", text },
                "reported. an admin will look.",
              );
          }}
        >
          {tr("report something a ghost delivered")}
        </button>
      </section>

      {mod && (
        <section className="admin">
          <h4>{tr("workspace moderation (admin)")}</h4>
          <label className="vxp-opt">
            <input
              type="checkbox"
              checked={mod.social_off}
              onChange={async (e) =>
                setMod(
                  await apiFetch("/api/mascot/admin/moderation", {
                    method: "POST",
                    body: JSON.stringify({ social_off: e.target.checked }),
                  }),
                )
              }
            />
            {tr("turn the ghost society off for everyone")}
          </label>
          <label className="vxp-opt">
            <input
              type="checkbox"
              checked={mod.polite_only}
              onChange={async (e) =>
                setMod(
                  await apiFetch("/api/mascot/admin/moderation", {
                    method: "POST",
                    body: JSON.stringify({ polite_only: e.target.checked }),
                  }),
                )
              }
            />
            {tr("keep every Vortex on Polite")}
          </label>
        </section>
      )}
      {msg && <p className="vxp-msg">{msg}</p>}
    </div>
  );
}
