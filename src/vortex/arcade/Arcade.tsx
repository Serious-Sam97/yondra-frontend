"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { getProgress } from "@/components/vortex/mk4/progress";
import { type ApiError, apiFetch, fetchDashboard } from "@/lib/api";
import { loadSoul, useSoul } from "@/vortex/core/soul";
import { loadCase } from "@/vortex/econ/econ";
import { type Game, type Rule, run, sfx } from "./engine";
import { invaders, runner, tetris, whack } from "./games1";
import { dash, pong, splice, vuhero } from "./games2";
import { duel, forbidden, memory, quiz, rps } from "./games3";
import "./arcade.css";

// M-01 · WOW & FLUTTER'S ARCADE. A room of cabinets with attract mode; click
// one to zoom into its CRT. Bets with the twins before you play (M-21), a
// hidden CHEATER! button when he cheats (M-24), the team leaderboard, the
// daily mutant machine (M-25), the weekly champion's crown (M-20), and the
// fortune machines: tarot (M-12), roulette (M-13), hide & seek (M-14), the
// golden tape (M-15) and the escape-room machine (M-19).

const FACTORY: Record<string, () => Game> = {
  invaders,
  runner,
  tetris,
  splice,
  whack,
  dash,
  vuhero,
  pong,
  rps,
  duel,
  quiz,
  memory,
  forbidden,
};
const MARQUEE: Record<string, string> = {
  invaders: "#b5533c",
  runner: "#c8962e",
  tetris: "#6f8a4a",
  splice: "#8a6a3a",
  whack: "#8fe3e3",
  dash: "#ffb547",
  vuhero: "#ff8fd4",
  pong: "#f3e4bd",
  rps: "#b07aff",
  duel: "#d8b860",
  quiz: "#ff8a1c",
  memory: "#5fa9ad",
  forbidden: "#2a2a2a",
};

interface Info {
  games: { id: string; name: string }[];
  daily: { game: string; rule: Rule; day: string };
  champion: { name: string; you: boolean; titles: number } | null;
  balance: { tokens: number; minutes: number; echoes: number };
  forbidden: boolean;
  freed: boolean;
}
interface Result {
  score: number;
  tokens: number;
  bet: { won: boolean; pay: number; twin: string } | null;
  best: { name: string; best: number } | null;
}

export default function Arcade() {
  const [info, setInfo] = useState<Info | null>(null);
  const [sel, setSel] = useState<{ id: string; daily: boolean } | null>(null);
  const [fortune, setFortune] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, unknown>>({});

  const load = useCallback(() => {
    apiFetch<Info>("/api/mascot/arcade")
      .then(setInfo)
      .catch(() => {});
  }, []);
  useEffect(() => {
    load();
    fetchDashboard()
      .then((d) => {
        const deck = d.deck;
        const late = deck.filter(
          (c) => c.due_date && new Date(c.due_date) < new Date(),
        );
        setData({
          titles: (late.length ? late : deck).map((c) => c.name),
          cards: deck.map((c) => ({
            id: c.id,
            name: c.name,
            board: c.board_id,
          })),
          done7: d.vitals.done_7d,
          overdue: d.vitals.overdue,
          playing: d.vitals.in_progress,
          oldest: late[0]?.name,
        });
      })
      .catch(() => setData({ titles: [] }));
  }, [load]);

  const tarot = async () => {
    try {
      const r = await apiFetch<{ name: string; reading: string }>(
        "/api/mascot/arcade/tarot",
        {
          method: "POST",
          body: JSON.stringify({
            overdue: data.overdue ?? 0,
            done_7d: data.done7 ?? 0,
            in_progress: data.playing ?? 0,
          }),
        },
      );
      setFortune(`🂠 ${r.name.toUpperCase()} — ${r.reading}`);
      void loadCase();
    } catch {
      setFortune("the cards are stuck together.");
    }
  };
  const roulette = async () => {
    try {
      const r = await apiFetch<{ label: string }>(
        "/api/mascot/arcade/roulette",
        { method: "POST" },
      );
      sfx("coin");
      setFortune(`the wheel stops on… ${r.label}`);
      load();
    } catch (e) {
      try {
        setFortune(JSON.parse((e as ApiError).body).reason);
      } catch {
        setFortune("the wheel is stuck.");
      }
    }
  };
  const hide = async () => {
    const r = await apiFetch<{
      session: string;
      page: string;
      clue: string;
      x: number;
      y: number;
    }>("/api/mascot/arcade/hide", { method: "POST" }).catch(() => null);
    if (!r) return;
    try {
      sessionStorage.setItem(
        "yd:vortex.seek",
        JSON.stringify({ ...r, at: Date.now() }),
      );
    } catch {}
    setFortune(`he's gone. clue: "${r.clue}"`);
  };
  const [golden, setGolden] = useState<{
    week: string;
    found_by: string | null;
  } | null>(null);
  useEffect(() => {
    apiFetch<{ week: string; found_by: string | null }>(
      "/api/mascot/arcade/golden",
    )
      .then(setGolden)
      .catch(() => {});
  }, []);
  const tapeRoom = getProgress().escape;
  const soul = useSoul();
  const escape2 = (soul?.fragments ?? []).filter((f) =>
    ["F57", "F58", "F59", "F60", "F61", "F62"].includes(f),
  ).length;
  useEffect(() => {
    void loadSoul();
  }, []);

  return (
    <main className="vxq">
      <header className="vxq-head">
        <h1>
          <span>WOW</span> &amp; <span>FLUTTER</span>&apos;S ARCADE
        </h1>
        <div className="bal">
          ◉ {info?.balance.tokens ?? 0} tokens
          {info?.champion && (
            <span className="crown" title="this week's team champion">
              👑 {info.champion.you ? "you" : info.champion.name.split(" ")[0]}{" "}
              · {info.champion.titles} titles
            </span>
          )}
        </div>
      </header>

      <section className="vxq-room">
        {info?.games
          .filter(
            (g) => g.id !== "seek" && (g.id !== "forbidden" || info.forbidden),
          )
          .map((g) => (
            <button
              key={g.id}
              type="button"
              className={`cab c-${g.id}${info.daily.game === g.id ? " is-daily" : ""}`}
              style={{ "--mq": MARQUEE[g.id] } as React.CSSProperties}
              onClick={() => setSel({ id: g.id, daily: false })}
            >
              <span className="mq">{g.name}</span>
              <span className="crt">
                <i className="attract" />
                <b>{g.id === "forbidden" ? "" : "INSERT COIN"}</b>
              </span>
              <span className="panel" />
            </button>
          ))}
        {!info?.forbidden && (
          <div className="cab is-sheet" title="a machine under a sheet">
            <span className="sheet">a machine under a sheet. it hums.</span>
          </div>
        )}
      </section>

      <section className="vxq-side">
        {info && (
          <button
            type="button"
            className="daily"
            onClick={() => setSel({ id: info.daily.game, daily: true })}
          >
            TODAY&apos;S MUTANT MACHINE ·{" "}
            {info.games.find((g) => g.id === info.daily.game)?.name} · rule:{" "}
            {info.daily.rule}
          </button>
        )}
        <div className="fortunes">
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent("vortex:case", { detail: { shop: "counter" } }),
              )
            }
          >
            ◉ the token counter
          </button>
          <button type="button" onClick={() => void tarot()}>
            🂠 tarot of the tape
          </button>
          <button type="button" onClick={() => void roulette()}>
            ◎ the roulette
          </button>
          <button type="button" onClick={() => void hide()}>
            ⌕ hide &amp; seek
          </button>
          <span className="golden">
            ✦ golden tape this week:{" "}
            {golden
              ? golden.found_by
                ? `found by ${golden.found_by}`
                : "still hidden somewhere in the app"
              : "…"}
          </span>
          <span className="escape">
            ▣ escape machine: tape room {tapeRoom}/4 · the gate {escape2}/6
          </span>
        </div>
        {fortune && <p className="fortune">{fortune}</p>}
        <Link href="/below/fliperama" className="below">
          ▾ the arcade below
        </Link>
      </section>

      {sel && (
        <Cabinet
          id={sel.id}
          daily={sel.daily}
          data={{ ...data, freed: info?.freed }}
          onClose={() => {
            setSel(null);
            load();
          }}
        />
      )}
    </main>
  );
}

function Cabinet({
  id,
  daily,
  data,
  onClose,
}: {
  id: string;
  daily: boolean;
  data: Record<string, unknown>;
  onClose: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"ready" | "play" | "over">("ready");
  const [bet, setBet] = useState<{
    on: boolean;
    twin: "wow" | "flutter";
    stake: number;
    target: number;
  }>({ on: false, twin: "wow", stake: 3, target: 100 });
  const [cheatAt, setCheatAt] = useState(0);
  const [caught, setCaughtState] = useState(false);
  const caughtRef = useRef(false);
  const setCaught = (v: boolean) => {
    caughtRef.current = v;
    setCaughtState(v);
  };
  const [, tick] = useState(0);
  useEffect(() => {
    if (!cheatAt) return;
    const t = setTimeout(() => tick((n) => n + 1), 2600);
    return () => clearTimeout(t);
  }, [cheatAt]);
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [board, setBoard] = useState<
    { name: string; best: number; you: boolean }[]
  >([]);
  const stopRef = useRef<(() => void) | null>(null);
  const game = FACTORY[id]?.();

  useEffect(() => {
    apiFetch<{ board: typeof board }>(
      `/api/mascot/arcade/board?game=${daily ? `daily-${id}` : id}`,
    )
      .then((r) => setBoard(r.board))
      .catch(() => {});
    return () => stopRef.current?.();
  }, [id, daily]);

  const start = async () => {
    setErr(null);
    let s: { session: string; cheat: boolean; rule: Rule | null };
    try {
      s = await apiFetch("/api/mascot/arcade/start", {
        method: "POST",
        body: JSON.stringify({
          game: id,
          daily,
          bet: bet.on
            ? { stake: bet.stake, target: bet.target, twin: bet.twin }
            : null,
        }),
      });
    } catch (e) {
      try {
        setErr(JSON.parse((e as ApiError).body).reason);
      } catch {
        setErr("out of order.");
      }
      return;
    }
    const g = FACTORY[id]();
    setPhase("play");
    sfx("coin");
    const cv = canvas.current;
    if (!cv) return;
    const runner = run(cv, g, {
      sfx,
      cheating: s.cheat,
      cheated: () => setCheatAt(Date.now()),
      data,
      rule: s.rule,
    });
    stopRef.current = runner.stop;
    const score = await runner.done;
    try {
      const r = await apiFetch<Result>("/api/mascot/arcade/finish", {
        method: "POST",
        body: JSON.stringify({
          session: s.session,
          score,
          caught: caughtRef.current,
        }),
      });
      setRes(r);
      void loadCase();
    } catch (e) {
      try {
        setErr(JSON.parse((e as ApiError).body).reason);
      } catch {
        setErr("the score didn't stick.");
      }
      setRes({ score, tokens: 0, bet: null, best: null });
    }
    setPhase("over");
    apiFetch<{ board: typeof board }>(
      `/api/mascot/arcade/board?game=${daily ? `daily-${id}` : id}`,
    )
      .then((r) => setBoard(r.board))
      .catch(() => {});
  };

  const cheatVisible = phase === "play" && Date.now() - cheatAt < 2500;
  const shot = (data.shot as string[] | undefined) ?? [];
  const cards =
    (data.cards as { id: number; name: string; board: number }[] | undefined) ??
    [];

  return (
    <div className="vxq-zoom" role="dialog" aria-label={game?.title ?? id}>
      <div
        className="vxq-machine"
        style={{ "--mq": MARQUEE[id] } as React.CSSProperties}
      >
        <div className="marquee">{game?.title}</div>
        <div className="screen">
          <canvas
            ref={canvas}
            width={320}
            height={240}
            tabIndex={0}
            aria-label="game screen"
          />
          {phase === "ready" && (
            <div className="over">
              <p className="help">{game?.help}</p>
              <label className="bet">
                <input
                  type="checkbox"
                  checked={bet.on}
                  onChange={(e) => setBet({ ...bet, on: e.target.checked })}
                />{" "}
                bet with the twins
              </label>
              {bet.on && (
                <div className="betrow">
                  <select
                    value={bet.twin}
                    onChange={(e) =>
                      setBet({
                        ...bet,
                        twin: e.target.value as "wow" | "flutter",
                      })
                    }
                    aria-label="twin"
                  >
                    <option value="wow">wow (pays slow)</option>
                    <option value="flutter">flutter (can&apos;t count)</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={bet.stake}
                    onChange={(e) =>
                      setBet({ ...bet, stake: Number(e.target.value) })
                    }
                    aria-label="stake"
                  />
                  <span>◉ that I score ≥</span>
                  <input
                    type="number"
                    min={1}
                    value={bet.target}
                    onChange={(e) =>
                      setBet({ ...bet, target: Number(e.target.value) })
                    }
                    aria-label="target"
                  />
                </div>
              )}
              <button
                type="button"
                className="coin"
                onClick={() => void start()}
              >
                INSERT COIN
              </button>
              {err && <p className="err">{err}</p>}
            </div>
          )}
          {cheatVisible && !caught && (
            <button
              type="button"
              className="cheater"
              onClick={() => setCaught(true)}
            >
              CHEATER!
            </button>
          )}
          {phase === "over" && res && (
            <div className="over">
              <p className="big">{res.score}</p>
              <p>
                +◉{res.tokens} tokens
                {caught ? " · caught him cheating: double" : ""}
              </p>
              {res.bet && (
                <p>
                  {res.bet.twin}{" "}
                  {res.bet.won
                    ? `pays ◉${res.bet.pay}${res.bet.twin === "wow" ? ", one… token… at… a… time" : " (he counted twice)"}`
                    : "keeps your tokens. he's laughing."}
                </p>
              )}
              {err && <p className="err">{err}</p>}
              {id === "invaders" && shot.length > 0 && (
                <div className="shot">
                  <p>you shot down:</p>
                  {[...new Set(shot)].slice(0, 6).map((t) => {
                    const c = cards.find((x) => x.name.startsWith(t));
                    return c ? (
                      <Link key={t} href={`/boards/${c.board}?card=${c.id}`}>
                        open “{c.name.slice(0, 30)}”
                      </Link>
                    ) : (
                      <span key={t}>{t}</span>
                    );
                  })}
                </div>
              )}
              <button
                type="button"
                className="coin"
                onClick={() => {
                  setPhase("ready");
                  setRes(null);
                  setCaught(false);
                }}
              >
                again
              </button>
            </div>
          )}
        </div>
        <ol className="scores">
          {board.map((b) => (
            <li key={b.name} className={b.you ? "is-you" : ""}>
              <span>{b.name}</span>
              <b>{b.best}</b>
            </li>
          ))}
          {board.length === 0 && (
            <li className="none">
              no scores yet. be the first. be embarrassing.
            </li>
          )}
        </ol>
        <button
          type="button"
          className="leave"
          onClick={() => {
            stopRef.current?.();
            onClose();
          }}
        >
          ⏏ step away
        </button>
      </div>
    </div>
  );
}
