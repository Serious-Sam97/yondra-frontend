"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Toggle } from "@/components/ui/ConsoleModule";
import { type ApiError, apiFetch } from "@/lib/api";
import { fetchBoards } from "@/lib/auth";
import { useSoul } from "@/vortex/core/soul";
import {
  download,
  SCENES,
  type Scene,
  shareCard,
  type Wallpaper,
  wallpaper,
} from "./art";
import { readPager, writePager } from "./Pager";
import { disablePush, enablePush } from "./push";
import "./outside.css";
import { tr, useVxLang } from "@/vortex/core/i18n";

// LADO Q · his channels outside the app. Every one is off until you flip it.

interface Settings {
  email: boolean;
  calendar: string | null;
  slack: string | null;
  terminal: string | null;
  done?: number;
}

function Row({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="vxu-row">
      <div className="vxu-text">
        <p className="vxu-title">{tr(title)}</p>
        <p className="vxu-hint">{tr(hint)}</p>
      </div>
      {children}
    </div>
  );
}

export default function OutsidePanel() {
  useVxLang(); // T-13 · re-render on language change
  const soul = useSoul();
  const [s, setS] = useState<Settings | null>(null);
  const [slack, setSlack] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pager, setPager] = useState(readPager);
  const [busy, setBusy] = useState(false);
  const [scene, setScene] = useState<Scene>("nest");
  const [boards, setBoards] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    apiFetch<Settings>("/api/mascot/outside")
      .then(setS)
      .catch(() => {});
    fetchBoards()
      .then(({ owned, shared }) =>
        setBoards(
          [...owned, ...shared].map((b) => ({ id: b.id, name: b.name })),
        ),
      )
      .catch(() => {});
  }, []);

  const save = async (
    patch: Partial<Record<keyof Settings, unknown>>,
    ok: string,
  ) => {
    try {
      const r = await apiFetch<{ settings: Settings }>("/api/mascot/outside", {
        method: "POST",
        body: JSON.stringify(patch),
      });
      setS((prev) => ({ ...r.settings, done: prev?.done }));
      setMsg(ok);
    } catch (e) {
      try {
        setMsg(JSON.parse((e as ApiError).body).reason ?? "no.");
      } catch {
        setMsg("no.");
      }
    }
  };

  const setPagerOn = async (on: boolean, night = pager.night) => {
    if (
      (on || night) &&
      typeof Notification !== "undefined" &&
      Notification.permission !== "granted"
    ) {
      const p = await Notification.requestPermission();
      if (p !== "granted") {
        setMsg(
          "your browser said no. respect the browser. i don't, but you should.",
        );
        return;
      }
    }
    const next = { ...pager, on, night };
    writePager(next);
    setPager(next);
    // Q-03 · and the real thing: push that arrives with the tab closed
    if (on || night) {
      const ok = await enablePush(night).catch(() => false);
      setMsg(
        ok
          ? "done. i can reach you now even with the tab closed. once a day. i promise. (mostly.)"
          : "only while the tab is open, on this browser. still counts.",
      );
    } else void disablePush();
  };

  const art = async (kind: Wallpaper | "share") => {
    setBusy(true);
    try {
      if (kind === "share") {
        download(
          await shareCard(soul, { done: s?.done ?? 0, boards: boards.length }),
          "vortex-share.png",
        );
      } else
        download(
          await wallpaper(kind, soul, scene),
          `vortex-${scene}-${kind}.png`,
        );
    } finally {
      setBusy(false);
    }
  };

  if (!s) return null;
  return (
    <div className="vxu">
      <p className="vxu-head">{tr("OUTSIDE THE APP · every channel opt-in")}</p>

      <Row
        title={tr("The Void Report")}
        hint="Monday morning, by email: your week in his voice. One click unsubscribes. If you vanish for two weeks, one note. Just one."
      >
        <Toggle
          on={s.email}
          onChange={() =>
            void save(
              { email: !s.email },
              s.email ? "no more letters. fine." : "monday. 9am. be afraid.",
            )
          }
          label={tr("Send the Void Report by email")}
        />
      </Row>

      <Row
        title={tr("His calendar")}
        hint="Subscribe in any calendar app: your deadlines (with commentary), tape moons, the anniversary of the migration."
      >
        <Toggle
          on={!!s.calendar}
          onChange={() =>
            void save(
              { calendar: !s.calendar },
              s.calendar
                ? "link burned. it's dead."
                : "copy the link. don't share it.",
            )
          }
          label={tr("Publish the calendar feed")}
        />
      </Row>
      {s.calendar && (
        <div className="vxu-copy">
          <input
            readOnly
            value={s.calendar}
            aria-label={tr("calendar link")}
            onFocus={(e) => e.target.select()}
          />
          <button
            type="button"
            onClick={() =>
              void navigator.clipboard
                ?.writeText(s.calendar ?? "")
                .then(() => setMsg("copied."))
            }
          >
            {tr("copy")}
          </button>
        </div>
      )}

      <Row
        title={tr("Slack, weekly")}
        hint="A Slack incoming-webhook URL. He posts the week there in his Polite voice. Clear it to stop."
      >
        <span className="vxu-state">{tr(s.slack ? "on" : "off")}</span>
      </Row>
      <form
        className="vxu-copy"
        onSubmit={(e) => {
          e.preventDefault();
          void save(
            { slack },
            slack ? "he'll behave there. mostly." : "slack's off.",
          );
          setSlack("");
        }}
      >
        <input
          value={slack}
          onChange={(e) => setSlack(e.target.value)}
          placeholder={s.slack ?? "https://hooks.slack.com/services/…"}
          aria-label={tr("Slack webhook URL")}
        />
        <button type="submit">
          {tr(slack ? "save" : s.slack ? "clear" : "save")}
        </button>
      </form>

      <Row
        title={tr("Terminal")}
        hint="A read-only key for npx yondra-vortex: he comments on your open cards from the shell. Switch off and the key dies."
      >
        <Toggle
          on={!!s.terminal}
          onChange={() =>
            void save(
              { terminal: !s.terminal },
              s.terminal ? "key burned." : "run it. i'll be rude in monospace.",
            )
          }
          label={tr("Create a terminal key")}
        />
      </Row>
      {s.terminal && (
        <div className="vxu-copy">
          <input
            readOnly
            value={`YONDRA_API=${process.env.NEXT_PUBLIC_API ?? ""} npx ./tools/yondra-vortex ${s.terminal}`}
            aria-label={tr("terminal command")}
            onFocus={(e) => e.target.select()}
          />
          <button
            type="button"
            onClick={() =>
              void navigator.clipboard
                ?.writeText(
                  `YONDRA_API=${process.env.NEXT_PUBLIC_API ?? ""} npx ./tools/yondra-vortex ${s.terminal}`,
                )
                .then(() => setMsg("copied. paste it somewhere dark."))
            }
          >
            {tr("copy")}
          </button>
        </div>
      )}

      <Row
        title={tr("Browser pages")}
        hint="He can page you, even with the tab closed. One per day, max."
      >
        <Toggle
          on={pager.on}
          onChange={() => void setPagerOn(!pager.on)}
          label={tr("Allow one browser notification a day")}
        />
      </Row>
      <Row
        title={tr("03:13")}
        hint={
          'If the tab is open at 3:13 am, a single "you up?". You asked for this.'
        }
      >
        <Toggle
          on={pager.night}
          onChange={() => void setPagerOn(pager.on, !pager.night)}
          label={tr("Allow the 3:13 page")}
        />
      </Row>

      <div className="vxu-out">
        <span>{tr("take him with you:")}</span>
        <select
          value={scene}
          onChange={(e) => setScene(e.target.value as Scene)}
          aria-label={tr("wallpaper scene")}
        >
          {SCENES.map((x) => (
            <option key={x} value={x}>
              {tr(
                x === "nest"
                  ? "his nest"
                  : x === "below"
                    ? "the below"
                    : "dimension 1985",
              )}
            </option>
          ))}
        </select>
        {(["phone", "desktop", "ultrawide"] as Wallpaper[]).map((k) => (
          <button
            key={k}
            type="button"
            disabled={busy}
            onClick={() => void art(k)}
          >
            {tr(`${k} wallpaper`)}
          </button>
        ))}
        <button type="button" disabled={busy} onClick={() => void art("share")}>
          {tr("share card")}
        </button>
        <Link href="/zine">{tr("print the zine")}</Link>
      </div>
      {boards.length > 0 && (
        <div className="vxu-out">
          <span>{tr("cassette j-card for:")}</span>
          {boards.slice(0, 8).map((b) => (
            <Link key={b.id} href={`/jcard/${b.id}`}>
              {b.name}
            </Link>
          ))}
        </div>
      )}
      {msg && <p className="vxu-msg">{msg}</p>}
    </div>
  );
}
