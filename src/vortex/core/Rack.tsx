"use client";

import { useEffect, useState } from "react";
import { setVortexVolume, vortexVolume } from "@/components/vortex/vortexSound";
import { apiFetch } from "@/lib/api";
import {
  farewellThenDisable,
  setVortexCalm,
  setVortexEnabled,
  setVortexFlag,
  setVortexHeadGames,
  setVortexIntensity,
  setVortexSound,
  useVortexCalm,
  useVortexEnabled,
  useVortexFlag,
  useVortexHeadGames,
  useVortexIntensity,
  useVortexSound,
  type VortexIntensity,
} from "@/lib/vortex";
import { pauseScares, scaresPausedUntil } from "@/vortex/dark/scares";
import { readPager, writePager } from "@/vortex/outside/Pager";
import { disablePush, enablePush } from "@/vortex/outside/push";
import { startSoundtrack, stopSoundtrack } from "@/vortex/radio/soundtrack";
import { askMotion } from "@/vortex/weird/device";
import { type Lang, setVxLang, t, useVxLang, type VxKey } from "./i18n";
import { darkCap, setDarkCap } from "./soul";
import "./rack.css";

// T-01 · THE EFFECTS RACK. Every group of Vortex settings is one 19" unit:
// intensity, head games, tape noises, dark, sensors, social, outside, memory,
// calm — and the real power switch under an acrylic cover. Switches show their
// state with an LED; the rack reads and writes the same settings as before.

function Unit({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <section className="vxrk-unit" aria-label={label}>
      <i className="vxrk-ear" aria-hidden />
      <div className="vxrk-face">
        <h4>{label}</h4>
        <div className="vxrk-ctl">{children}</div>
        {hint && <p className="vxrk-hint">{hint}</p>}
      </div>
      <i className="vxrk-ear" aria-hidden />
    </section>
  );
}

function Switch({
  on,
  onChange,
  label,
  disabled,
}: {
  on: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`vxrk-sw${on ? " is-on" : ""}`}
      aria-pressed={on}
      onClick={onChange}
      disabled={disabled}
    >
      <span className="led" aria-hidden />
      <span className="bat" aria-hidden />
      <span className="lbl">{label}</span>
    </button>
  );
}

export default function Rack() {
  const lang = useVxLang();
  const T = (k: VxKey) => t(k, lang);
  const enabled = useVortexEnabled();
  const intensity = useVortexIntensity();
  const headGames = useVortexHeadGames();
  const sound = useVortexSound();
  const soundtrack = useVortexFlag("soundtrack");
  const calm = useVortexCalm();
  const noScares = useVortexFlag("noscares");
  const mic = useVortexFlag("weird-mic");
  const camera = useVortexFlag("weird-camera");
  const motion = useVortexFlag("weird-motion");
  const weather = useVortexFlag("weird-weather");
  const consent = useVortexFlag("telemetry");
  const [cover, setCover] = useState(false);
  const [vol, setVol] = useState(1);
  const [cap, setCap] = useState(5);
  const [paused, setPaused] = useState(0);
  const [pager, setPager] = useState({ on: false, night: false });
  const [social, setSocial] = useState<{
    on: boolean;
    contempt_on: boolean;
  } | null>(null);
  const [outside, setOutside] = useState<{
    email: boolean;
    calendar: string | null;
  } | null>(null);
  const [facts, setFacts] = useState<number | null>(null);
  const [forgetOpen, setForgetOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [keep, setKeep] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setVol(vortexVolume());
    setCap(darkCap());
    setPaused(scaresPausedUntil());
    setPager(readPager());
    apiFetch<{ on: boolean; contempt_on: boolean }>("/api/mascot/social")
      .then(setSocial)
      .catch(() => {});
    apiFetch<{ email: boolean; calendar: string | null }>("/api/mascot/outside")
      .then(setOutside)
      .catch(() => {});
    apiFetch<unknown[]>("/api/mascot/memories")
      .then((m) => setFacts(m.length))
      .catch(() => {});
  }, []);

  const socialSet = (patch: Record<string, boolean>) =>
    apiFetch("/api/mascot/social/settings", {
      method: "POST",
      body: JSON.stringify(patch),
    })
      .then(() =>
        setSocial((s) =>
          s
            ? {
                ...s,
                ...(patch.on !== undefined ? { on: patch.on } : {}),
                ...(patch.contempt !== undefined
                  ? { contempt_on: patch.contempt }
                  : {}),
              }
            : s,
        ),
      )
      .catch(() => {});
  const outsideSet = (patch: Record<string, boolean>) =>
    apiFetch<{ settings: { email: boolean; calendar: string | null } }>(
      "/api/mascot/outside",
      { method: "POST", body: JSON.stringify(patch) },
    )
      .then((r) => setOutside(r.settings))
      .catch(() => {});
  const pagerSet = async (on: boolean) => {
    if (
      on &&
      typeof Notification !== "undefined" &&
      Notification.permission !== "granted" &&
      (await Notification.requestPermission()) !== "granted"
    )
      return;
    const next = { ...readPager(), on };
    writePager(next);
    setPager(next);
    // Q-03 · real push (tab closed) when the browser supports it
    if (on) void enablePush(next.night).catch(() => {});
    else if (!next.night) void disablePush();
  };
  const dim = !enabled;
  const fmtDate = (ms: number) =>
    new Date(ms).toLocaleString(lang === "pt" ? "pt-BR" : "en-GB", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="vxrk" data-off={dim || undefined}>
      <header className="vxrk-top">
        <b>{T("rack")}</b>
        <span className="vxrk-lang">
          {T("lang")}
          {(["en", "pt"] as Lang[]).map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={lang === l}
              onClick={() => setVxLang(l)}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </span>
      </header>
      <p className="vxrk-hint">{T("rackHint")}</p>

      <Unit label={T("power")} hint={T("powerHint")}>
        <div className={`vxrk-cover${cover ? " is-open" : ""}`}>
          <button
            type="button"
            className={`vxrk-red${enabled ? " is-on" : ""}`}
            disabled={!cover}
            onClick={() => {
              if (enabled) farewellThenDisable();
              else setVortexEnabled(true);
              setCover(false);
            }}
            aria-label={enabled ? "turn Vortex off" : "turn Vortex on"}
          >
            {enabled ? T("on") : T("off")}
          </button>
          <button
            type="button"
            className="vxrk-lid"
            onClick={() => setCover(!cover)}
            aria-expanded={cover}
          >
            {cover ? T("close") : T("lift")}
          </button>
        </div>
      </Unit>

      <Unit label={T("intensity")}>
        <fieldset className="vxrk-3pos" aria-label={T("intensity")}>
          {(["polite", "mischief", "unhinged"] as VortexIntensity[]).map(
            (k) => (
              <button
                key={k}
                type="button"
                aria-pressed={intensity === k}
                disabled={dim}
                onClick={() => setVortexIntensity(k)}
              >
                {T(k)}
              </button>
            ),
          )}
        </fieldset>
      </Unit>

      <Unit label={T("headgames")} hint={T("headgamesHint")}>
        <Switch
          on={headGames}
          onChange={() => setVortexHeadGames(!headGames)}
          label={headGames ? T("on") : T("off")}
          disabled={dim}
        />
      </Unit>

      <Unit label={T("noises")}>
        <Switch
          on={sound}
          onChange={() => setVortexSound(!sound)}
          label={sound ? T("on") : T("off")}
          disabled={dim}
        />
        <label className="vxrk-knob">
          {T("volume")}
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={vol}
            disabled={dim || !sound}
            onChange={(e) => {
              setVol(Number(e.target.value));
              setVortexVolume(Number(e.target.value));
            }}
          />
        </label>
        <Switch
          on={soundtrack}
          onChange={() => {
            setVortexFlag("soundtrack", !soundtrack);
            if (soundtrack) stopSoundtrack();
            else startSoundtrack();
          }}
          label={T("soundtrack")}
          disabled={dim}
        />
      </Unit>

      <Unit label={T("dark")}>
        <Switch
          on={!noScares}
          onChange={() => setVortexFlag("noscares", !noScares)}
          label={T("scares")}
          disabled={dim}
        />
        <button
          type="button"
          className="vxrk-btn"
          disabled={dim}
          onClick={() => {
            pauseScares(86_400_000);
            setPaused(scaresPausedUntil());
          }}
        >
          {T("pauseDay")}
        </button>
        <button
          type="button"
          className="vxrk-btn"
          disabled={dim}
          onClick={() => {
            pauseScares(7 * 86_400_000);
            setPaused(scaresPausedUntil());
          }}
        >
          {T("pauseWeek")}
        </button>
        <label className="vxrk-knob">
          {T("maxStage")} <b>{cap}</b>
          <input
            type="range"
            min={0}
            max={5}
            step={1}
            value={cap}
            disabled={dim}
            onChange={(e) => {
              setCap(Number(e.target.value));
              setDarkCap(Number(e.target.value));
            }}
          />
        </label>
        {paused > Date.now() && (
          <span className="vxrk-lcd">
            {T("pausedUntil")} {fmtDate(paused)}
          </span>
        )}
      </Unit>

      <Unit label={T("sensors")}>
        <Switch
          on={mic}
          onChange={() => setVortexFlag("weird-mic", !mic)}
          label={T("mic")}
          disabled={dim}
        />
        <Switch
          on={camera}
          onChange={() => setVortexFlag("weird-camera", !camera)}
          label={T("camera")}
          disabled={dim}
        />
        <Switch
          on={motion}
          onChange={async () => {
            if (!motion && !(await askMotion())) return;
            setVortexFlag("weird-motion", !motion);
          }}
          label={T("motion")}
          disabled={dim}
        />
        <Switch
          on={weather}
          onChange={() => setVortexFlag("weird-weather", !weather)}
          label={T("location")}
          disabled={dim}
        />
      </Unit>

      <Unit label={T("social")}>
        <Switch
          on={!!social?.on}
          onChange={() => void socialSet({ on: !social?.on })}
          label={T("visits")}
          disabled={dim || !social}
        />
        <Switch
          on={!!social?.contempt_on}
          onChange={() => void socialSet({ contempt: !social?.contempt_on })}
          label={T("rankings")}
          disabled={dim || !social?.on}
        />
      </Unit>

      <Unit label={T("outside")}>
        <Switch
          on={!!outside?.email}
          onChange={() => void outsideSet({ email: !outside?.email })}
          label={T("email")}
          disabled={dim || !outside}
        />
        <Switch
          on={pager.on}
          onChange={() => void pagerSet(!pager.on)}
          label={T("push")}
          disabled={dim}
        />
        <Switch
          on={!!outside?.calendar}
          onChange={() => void outsideSet({ calendar: !outside?.calendar })}
          label={T("calendar")}
          disabled={dim || !outside}
        />
      </Unit>

      <Unit label={T("memory")} hint={consent ? T("telemetryHint") : undefined}>
        <span className="vxrk-lcd">
          {facts ?? "–"} {T("facts")}
        </span>
        <Switch
          on={consent}
          onChange={() => setVortexFlag("telemetry", !consent)}
          label={T("telemetry")}
        />
        <button
          type="button"
          className="vxrk-btn is-danger"
          onClick={() => setForgetOpen(!forgetOpen)}
          aria-expanded={forgetOpen}
        >
          {T("forget")}
        </button>
        {forgetOpen && (
          <form
            className="vxrk-forget"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await apiFetch("/api/mascot/forget", {
                  method: "POST",
                  body: JSON.stringify({
                    password: pw,
                    keep_achievements: keep,
                  }),
                });
                for (const k of Object.keys(localStorage))
                  if (
                    k.startsWith("yd:vortex.") &&
                    !k.startsWith("yd:vortex.flag.") &&
                    k !== "yd:vortex.enabled"
                  )
                    localStorage.removeItem(k);
                setMsg(T("forgotten"));
                setFacts(0);
                setForgetOpen(false);
                setPw("");
              } catch {
                setMsg("✕");
              }
            }}
          >
            <p>{T("forgetHint")}</p>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder={T("password")}
              autoComplete="current-password"
              aria-label={T("password")}
            />
            <label>
              <input
                type="checkbox"
                checked={keep}
                onChange={(e) => setKeep(e.target.checked)}
              />{" "}
              {T("keepAch")}
            </label>
            <span>
              <button
                type="submit"
                className="vxrk-btn is-danger"
                disabled={!pw}
              >
                {T("confirmForget")}
              </button>
              <button
                type="button"
                className="vxrk-btn"
                onClick={() => setForgetOpen(false)}
              >
                {T("cancel")}
              </button>
            </span>
          </form>
        )}
      </Unit>

      <Unit label={T("calm")} hint={T("calmHint")}>
        <Switch
          on={calm}
          onChange={() => setVortexCalm(!calm)}
          label={calm ? T("on") : T("off")}
          disabled={dim}
        />
      </Unit>
      {msg && <output className="vxrk-msg">{msg}</output>}
    </div>
  );
}
