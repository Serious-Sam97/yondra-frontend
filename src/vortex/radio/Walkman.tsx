"use client";

import { useEffect, useState } from "react";
import { type ApiError, apiFetch } from "@/lib/api";
import { setVortexFlag } from "@/lib/vortex";
import {
  dedicate,
  flip,
  PROGRAMS,
  RARE_COUNT,
  rec,
  request,
  setStationVoice,
  skip,
  tuneOut,
  useStation,
} from "./station";
import { radio } from "./synth";
import { playVoidHour } from "./voidHour";
import "./radio.css";

// O-01 · the walkman: the station minimised into a cassette player that
// follows you around the app. Flip (F20), skip, REC (O-09), requests (O-07),
// dedications (O-06), the Host's voice, and The Void Hour (O-12).

export default function Walkman() {
  const st = useStation();
  const [mini, setMini] = useState(false);
  const [menu, setMenu] = useState<null | "req" | "ded">(null);
  const [team, setTeam] = useState<{ id: number; name: string }[]>([]);
  const [to, setTo] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [vol, setVol] = useState(0.6);

  useEffect(() => {
    if (menu !== "ded" || team.length) return;
    apiFetch<{ team: { id: number; name: string }[] }>("/api/mascot/radio/team")
      .then((r) => {
        setTeam(r.team);
        setTo(r.team[0]?.id ?? null);
      })
      .catch(() => {});
  }, [menu, team.length]);

  if (!st.on) return null;
  const prog = st.program ? PROGRAMS[st.program].name : "TUNING";

  if (mini)
    return (
      <button
        type="button"
        className="vxo-mini"
        onClick={() => setMini(false)}
        title="03.13 · open the walkman"
      >
        <i className={`reel${st.song?.backwards ? " is-back" : ""}`} />
        <span>03.13</span>
      </button>
    );

  return (
    <section className="vxo-walkman" aria-label="ghost radio walkman">
      <header>
        <b>03.13 · DEAD AIR</b>
        <span className="onair">ON AIR</span>
        <button
          type="button"
          className="x"
          onClick={() => setMini(true)}
          aria-label="Minimise"
        >
          ▁
        </button>
        <button
          type="button"
          className="x"
          onClick={tuneOut}
          aria-label="Switch the radio off"
        >
          ⏻
        </button>
      </header>
      <div className="vfd">
        <span className="prog">{prog}</span>
        <span className="song">
          {st.song?.rare && <em className="rare">★ RARE · </em>}
          {st.song ? st.song.name : "…"}
          {st.recorded && <em className="got"> · KEPT</em>}
        </span>
        {st.host && <span className="host">“{st.host}”</span>}
      </div>
      <div className="deck" aria-hidden>
        <i className={`reel${st.song?.backwards ? " is-back" : ""}`} />
        <i className={`reel${st.song?.backwards ? " is-back" : ""}`} />
      </div>
      <div className="keys">
        <button type="button" onClick={flip} title="flip the cassette">
          ⇄
        </button>
        <button type="button" onClick={skip} title="next song">
          ▶▶
        </button>
        <button
          type="button"
          className={`recb${st.rareAiring ? " is-hot" : ""}`}
          onClick={() => void rec()}
          title="record what's playing"
        >
          ● REC
        </button>
        <button
          type="button"
          onClick={() => setMenu(menu === "req" ? null : "req")}
          title="request a song"
        >
          REQ
        </button>
        <button
          type="button"
          onClick={() => setMenu(menu === "ded" ? null : "ded")}
          title="dedicate a song to a teammate"
        >
          DED
        </button>
        <button
          type="button"
          className={st.voice ? "is-on" : ""}
          onClick={() => {
            setStationVoice(!st.voice);
            setVortexFlag("radio-voice", !st.voice);
          }}
          title="hear the host's voice"
        >
          🎙
        </button>
      </div>
      <label className="vol">
        <span>VOL</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={vol}
          onChange={(e) => {
            const v = Number(e.target.value);
            setVol(v);
            radio.setVolume(v);
          }}
        />
        <span className="tapes" title="rare tapes you've kept">
          {st.collected.length}/{RARE_COUNT} tapes
        </span>
      </label>
      {menu === "req" && (
        <div className="menu">
          {(["synthwave", "lofi", "elevator", "ambient"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => void request(g).then(() => setMenu(null))}
            >
              {g}
            </button>
          ))}
          <button
            type="button"
            className="board"
            onClick={() => void request("board").then(() => setMenu(null))}
          >
            the song of my board
          </button>
          <button
            type="button"
            className="void"
            onClick={() => {
              setMenu(null);
              void playVoidHour();
            }}
          >
            ▶ the void hour (this week)
          </button>
        </div>
      )}
      {menu === "ded" && (
        <form
          className="menu ded"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!to || !text.trim()) return;
            try {
              await dedicate(to, text);
              setMsg("sent. the host will read it on air.");
              setText("");
            } catch (err) {
              let r = "the host won't read that.";
              try {
                r = JSON.parse((err as ApiError).body).reason ?? r;
              } catch {}
              setMsg(r);
            }
          }}
        >
          {team.length === 0 ? (
            <span className="empty">
              no team on your boards yet. the radio only reaches them.
            </span>
          ) : (
            <>
              <select
                value={to ?? ""}
                onChange={(e) => setTo(Number(e.target.value))}
                aria-label="to"
              >
                {team.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <input
                value={text}
                maxLength={140}
                onChange={(e) => setText(e.target.value)}
                placeholder="for closing 12 cards today…"
                aria-label="dedication"
              />
              <button type="submit">send to the host</button>
            </>
          )}
          {msg && <span className="msg">{msg}</span>}
        </form>
      )}
    </section>
  );
}
