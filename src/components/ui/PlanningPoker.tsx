"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { usePlanningSession } from "@/hooks/usePlanningSession";
import type {
  PlanningDeck,
  PlanningParticipant,
} from "@/interfaces/PlanningInterface";
import { FIBONACCI } from "@/lib/estimation";

// Fallback hand for snapshots that predate server-driven decks.
const DEFAULT_HAND: string[] = [...FIBONACCI.map(String), "?"];

const DECK_META: Record<
  PlanningDeck,
  { label: string; hint: string; preview: string[] }
> = {
  fib: { label: "Fibonacci", hint: "1–21 · the classic", preview: ["1", "5", "21"] },
  "fib-x": {
    label: "Fibonacci XL",
    hint: "0–100 · with ½ and ☕",
    preview: ["½", "8", "100"],
  },
  tshirt: {
    label: "T-shirt",
    hint: "XS–XL · sizes, not points",
    preview: ["S", "M", "L"],
  },
};

const AVATAR_COLORS = [
  "#4CAF50",
  "#FF9800",
  "#1976D2",
  "#F44336",
  "#7B1FA2",
  "#FFC107",
  "#00BCD4",
  "#E91E63",
];

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Avatar({
  id,
  name,
  size = 30,
}: {
  id: number;
  name: string;
  size?: number;
}) {
  return (
    <div
      title={name}
      style={{
        backgroundColor: AVATAR_COLORS[id % AVATAR_COLORS.length],
        width: size,
        height: size,
        fontSize: size * 0.4,
        border: "1.5px solid rgba(255,255,255,0.85)",
      }}
      className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
    >
      {initials(name)}
    </div>
  );
}

// '0.5' is stored plainly but reads better as the ½ card.
function cardLabel(v: string): string {
  return v === "0.5" ? "½" : v;
}

function isNumericCard(v: string): boolean {
  return v !== "?" && v !== "" && !Number.isNaN(Number(v));
}

// Proper median (average of the two middles on even counts) — may land between
// deck values; that's fine, it's a discussion anchor, not the estimate itself.
function medianOf(sorted: number[]): number | null {
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function fmtClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Ticks while a deadline is live so the countdown re-renders.
function useCountdown(endsAt: string | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endsAt) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [endsAt]);
  if (!endsAt) return null;
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - now) / 1000));
}

type Session = ReturnType<typeof usePlanningSession>;

export function PlanningPoker({
  session,
  currentUserId,
  canWrite,
}: {
  session: Session;
  currentUserId: number;
  canWrite: boolean;
}) {
  const {
    snapshot,
    busy,
    error,
    applied,
    join,
    leave,
    vote,
    reveal,
    reset,
    apply,
    timer,
  } = session;
  // Optimistic pick for instant feedback; the server-acknowledged value arrives
  // as snapshot.my_value (which also survives modal close/reopen).
  const [selected, setSelected] = useState<string | null>(null);
  const [finalPick, setFinalPick] = useState<number | null>(null);
  const [pickedDeck, setPickedDeck] = useState<PlanningDeck>("fib");

  const me =
    snapshot?.participants.find((p) => p.user_id === currentUserId) ?? null;
  const inSession = !!me;
  const iSpectate = !!me?.is_spectator;
  const round = snapshot?.round ?? 0;
  const revealed = snapshot?.revealed ?? false;
  const hand = snapshot?.hand ?? DEFAULT_HAND;

  // Clear local picks whenever a new round starts or I leave.
  useEffect(() => {
    setSelected(null);
    setFinalPick(null);
  }, [round, inSession]);

  // A failed action means my optimistic pick may be wrong — fall back to the
  // server-acknowledged my_value.
  useEffect(() => {
    if (error) setSelected(null);
  }, [error]);

  // Committed-estimate burst: when an apply lands (mine or anyone's — the hook
  // fires on the apply *event*), stamp the number over the table, then let go.
  const [burst, setBurst] = useState<{ value: number; at: string } | null>(
    null,
  );
  useEffect(() => {
    if (!applied || applied.value == null) return;
    setBurst({ value: applied.value, at: applied.at });
    const t = setTimeout(() => setBurst(null), 1700);
    return () => clearTimeout(t);
  }, [applied]);

  const participants = snapshot?.participants ?? [];
  const voters = participants.filter((p) => !p.is_spectator);
  const spectators = participants.filter((p) => p.is_spectator);
  const votedCount = voters.filter((p) => p.has_voted).length;
  const allVoted =
    !revealed && voters.length > 0 && votedCount === voters.length;

  const facilitatorId = snapshot?.facilitator_id ?? null;
  const isFacilitator = facilitatorId === currentUserId;
  // Reveal / new round / timer steer the whole table: facilitator or board writers.
  const canModerate = isFacilitator || canWrite;

  // Deck values that can land on story_points (whole numbers only).
  const applyable = useMemo(
    () =>
      hand
        .filter((v) => isNumericCard(v) && Number.isInteger(Number(v)))
        .map(Number),
    [hand],
  );

  // Consensus stats (revealed): non-numeric cards ('?', ☕, T-shirt sizes) are
  // excluded from the numeric spread; consensus itself is value equality.
  const stats = useMemo(() => {
    const values = voters
      .map((p) => p.value)
      .filter((v): v is string => v !== null);
    const numeric = values
      .filter(isNumericCard)
      .map(Number)
      .sort((a, b) => a - b);
    const qCount = values.filter((v) => v === "?").length;
    const mean = numeric.length
      ? numeric.reduce((a, b) => a + b, 0) / numeric.length
      : null;
    const suggested =
      mean !== null && applyable.length
        ? applyable.reduce((best, v) =>
            Math.abs(v - mean) < Math.abs(best - mean) ? v : best,
          )
        : null;
    return {
      numeric,
      qCount,
      mean,
      median: medianOf(numeric),
      min: numeric[0] ?? null,
      max: numeric[numeric.length - 1] ?? null,
      consensus:
        values.length >= 2 &&
        values[0] !== "?" &&
        values.every((v) => v === values[0]),
      consensusValue: values[0] ?? null,
      suggested,
    };
  }, [voters, applyable]);

  // When the cards turn over, pre-seat the suggested value in the FINAL picker.
  useEffect(() => {
    if (revealed && stats.suggested !== null) {
      setFinalPick((prev) => prev ?? stats.suggested);
    }
  }, [revealed, stats.suggested]);

  // Soft deadline: everyone sees the countdown; the facilitator's client settles
  // it at zero (reveal if anything was cast, else clear). The server also settles
  // lapsed timers on heartbeats, so a missing facilitator only adds latency.
  const remaining = useCountdown(snapshot?.timer_ends_at ?? null);
  const autoSettledRound = useRef<number | null>(null);
  useEffect(() => {
    if (!isFacilitator || revealed || remaining === null || remaining > 0)
      return;
    if (autoSettledRound.current === round) return;
    autoSettledRound.current = round;
    if (votedCount > 0) reveal();
    else timer(0);
  }, [remaining, isFacilitator, revealed, round, votedCount, reveal, timer]);

  // ── Entry / join ──────────────────────────────────────────────────────────
  if (!inSession) {
    const live = participants.length > 0;
    return (
      <div className="pp-idle flex flex-col items-center justify-center gap-5 py-12 px-6 text-center">
        <div className="pp-idle__fan" aria-hidden>
          {[-1, 0, 1].map((o) => (
            <div
              key={o}
              className="pp-idle__card"
              style={{
                transform: `rotate(${o * 9}deg) translateY(${Math.abs(o) * 4}px)`,
                animationDelay: `${(o + 1) * 0.4}s`,
              }}
            />
          ))}
        </div>
        <p style={{ color: "var(--cf-text-muted)", fontSize: "13px" }}>
          {live
            ? `${participants.length} ${participants.length === 1 ? "person is" : "people are"} at the table.`
            : "No planning session on this card yet."}
        </p>

        {!live && (
          <div className="flex gap-2 flex-wrap justify-center" role="radiogroup" aria-label="Deck">
            {(Object.keys(DECK_META) as PlanningDeck[]).map((d) => {
              const meta = DECK_META[d];
              const sel = pickedDeck === d;
              return (
                <button
                  key={d}
                  role="radio"
                  aria-checked={sel}
                  onClick={() => setPickedDeck(d)}
                  className={`pp-deck ${sel ? "pp-deck--sel" : ""}`}
                >
                  <span className="pp-deck__cards" aria-hidden>
                    {meta.preview.map((c) => (
                      <span key={c} className="pp-deck__mini">
                        {c}
                      </span>
                    ))}
                  </span>
                  <span className="pp-deck__label cf-mono">{meta.label}</span>
                  <span className="pp-deck__hint cf-mono">{meta.hint}</span>
                </button>
              );
            })}
          </div>
        )}

        <p
          style={{ color: "var(--cf-text-dim)", fontSize: "11px" }}
          className="cf-mono"
        >
          Vote with the team — cards stay hidden until reveal.
        </p>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => join(live ? {} : { deck: pickedDeck })}
            disabled={busy}
            className="aero-btn aero-btn--cyan px-5 py-2 uppercase tracking-widest font-bold text-xs disabled:opacity-50"
          >
            ▶ {live ? "Join session" : "Start session"}
          </button>
          {live && (
            <button
              onClick={() => join({ spectator: true })}
              disabled={busy}
              className="aero-btn aero-btn--ghost px-4 py-2 uppercase tracking-widest font-bold text-xs disabled:opacity-50"
              title="Watch without a hand — you won't count toward the vote"
            >
              ◎ Spectate
            </button>
          )}
        </div>
        {error && (
          <p className="pp-error cf-mono" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  const shownPick = selected ?? snapshot?.my_value ?? null;
  const distinctNumeric = [...new Set(stats.numeric)];
  const hasSpread = distinctNumeric.length > 1;

  const outlierOf = (p: PlanningParticipant): "high" | "low" | null => {
    if (!revealed || !hasSpread || !p.value || !isNumericCard(p.value))
      return null;
    const v = Number(p.value);
    if (v === stats.max) return "high";
    if (v === stats.min) return "low";
    return null;
  };

  const seat = (p: PlanningParticipant, i: number) => {
    const outlier = outlierOf(p);
    const flipped = revealed && p.value !== null;
    return (
      <div
        key={p.user_id}
        className="pp-seat flex flex-col items-center gap-1.5"
        style={{ animationDelay: `${i * 60}ms` }}
      >
        {p.is_spectator ? (
          <div className="pp-spectator" title="Spectating">
            ◎
          </div>
        ) : (
          <div className={`pp-flip ${flipped ? "pp-flip--revealed" : ""}`}>
            <div
              className="pp-flip__inner"
              style={{ transitionDelay: flipped ? `${i * 90}ms` : "0ms" }}
            >
              <div
                className={`pp-face pp-face--front ${p.has_voted ? "pp-face--voted" : ""}`}
              >
                {p.has_voted ? "✓" : "…"}
              </div>
              <div
                className={`pp-face pp-face--back ${
                  stats.consensus
                    ? "pp-face--consensus"
                    : outlier
                      ? `pp-face--${outlier}`
                      : ""
                }`}
              >
                {p.value ? cardLabel(p.value) : "·"}
              </div>
            </div>
          </div>
        )}
        {outlier && (
          <span className={`pp-tag pp-tag--${outlier}`}>
            {outlier === "high" ? "▲ HIGH" : "▼ LOW"}
          </span>
        )}
        <Avatar id={p.user_id} name={p.name} />
        <span
          style={{ fontSize: "10px", color: "var(--cf-text-muted)" }}
          className="cf-mono flex items-center gap-1"
        >
          {p.name.split(" ")[0]}
          {p.user_id === facilitatorId && (
            <span className="pp-host" title="Session facilitator">
              HOST
            </span>
          )}
        </span>
      </div>
    );
  };

  const statusLine = revealed
    ? stats.consensus
      ? `REVEALED · CONSENSUS ON ${cardLabel(stats.consensusValue ?? "")}`
      : stats.numeric.length
        ? `REVEALED · MED ${stats.median !== null ? fmt(stats.median) : "—"} · AVG ${
            stats.mean !== null ? fmt(stats.mean) : "—"
          } · RANGE ${stats.min ?? "—"}–${stats.max ?? "—"}${
            stats.qCount ? ` · ? ×${stats.qCount}` : ""
          }`
        : `REVEALED · ROUND ${round}`
    : `ESTIMATING · ROUND ${round}`;

  return (
    <div className="relative flex flex-col gap-5 px-6 py-5">
      {/* Committed-estimate burst */}
      {burst && (
        <div className="pp-applied" key={burst.at} aria-hidden>
          <span className="pp-applied__num">{burst.value}</span>
          <span className="pp-applied__label cf-mono">
            COMMITTED → STORY POINTS
          </span>
        </div>
      )}

      {/* Status strip */}
      <div className="flex items-center gap-4 flex-wrap">
        <p
          className="cf-mono"
          aria-live="polite"
          style={{
            fontSize: "11px",
            letterSpacing: "0.14em",
            color: "var(--cf-text-dim)",
          }}
        >
          {statusLine}
        </p>
        {!revealed && remaining !== null && (
          <span
            className={`pp-timer cf-mono ${remaining <= 10 ? "pp-timer--hot" : ""}`}
            aria-live="off"
          >
            ⏱ {fmtClock(remaining)}
          </span>
        )}
        {!revealed && (
          <div className="flex items-center gap-2 ml-auto">
            <div className="pp-meter" aria-hidden>
              {voters.map((p) => (
                <span
                  key={p.user_id}
                  className={`pp-meter__seg ${p.has_voted ? "pp-meter__seg--on" : ""}`}
                />
              ))}
            </div>
            <span
              className="cf-mono"
              style={{ fontSize: "11px", color: "var(--cf-text-dim)" }}
            >
              {votedCount}/{voters.length}
            </span>
          </div>
        )}
      </div>

      {/* All-votes-in banner */}
      {allVoted && (
        <p className="pp-banner cf-mono" aria-live="polite">
          ● ALL VOTES IN
          {canModerate ? " — REVEAL WHEN READY" : " — WAITING FOR HOST"}
        </p>
      )}

      {/* Table */}
      <div className="relative">
        <div className="flex flex-wrap gap-5">
          {[...voters, ...spectators].map(seat)}
        </div>
        {revealed && stats.consensus && (
          <span className="pp-stamp stamp-in" aria-hidden>
            ✓ CONSENSUS
          </span>
        )}
      </div>

      {/* Round history */}
      {(snapshot?.history?.length ?? 0) > 0 && (
        <div className="pp-history cf-mono">
          <span className="pp-history__label">PRIOR ROUNDS</span>
          {snapshot!.history.map((h) => (
            <span key={h.round} className="pp-history__round">
              R{h.round}{" "}
              <b>
                {h.votes
                  .map((v) => v.value)
                  .sort((a, b) =>
                    isNumericCard(a) && isNumericCard(b)
                      ? Number(a) - Number(b)
                      : a.localeCompare(b),
                  )
                  .map(cardLabel)
                  .join(" · ")}
              </b>
            </span>
          ))}
        </div>
      )}

      {/* Your hand (players, voting only) */}
      {!revealed && !iSpectate && (
        <div className="flex flex-col gap-2 pt-1">
          <p
            className="cf-mono"
            style={{
              fontSize: "11px",
              letterSpacing: "0.14em",
              color: "var(--cf-text-dim)",
            }}
          >
            YOUR HAND
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            {hand.map((v) => {
              const sel = shownPick === v;
              return (
                <button
                  key={v}
                  onClick={() => {
                    setSelected(v);
                    vote(v);
                  }}
                  disabled={busy}
                  aria-pressed={sel}
                  className={`pp-hand-card ${sel ? "pp-hand-card--sel" : ""} ${
                    !isNumericCard(v) ? "pp-hand-card--q" : ""
                  }`}
                >
                  {cardLabel(v)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Spectator note */}
      {!revealed && iSpectate && (
        <p
          className="cf-mono"
          style={{ fontSize: "11px", color: "var(--cf-text-dim)" }}
        >
          ◎ SPECTATING — you're watching this round.{" "}
          <button
            onClick={() => join({ spectator: false })}
            disabled={busy}
            className="underline cursor-pointer disabled:opacity-50"
            style={{ color: "var(--cf-phosphor)" }}
          >
            Grab a hand
          </button>
        </p>
      )}

      {/* Reveal / timer / apply controls */}
      <div
        className="flex items-center gap-2.5 flex-wrap pt-3 border-t"
        style={{ borderColor: "var(--cf-edge)" }}
      >
        {!revealed ? (
          canModerate ? (
            <>
              <button
                onClick={() => reveal()}
                disabled={busy || votedCount === 0}
                className={`aero-btn aero-btn--cyan px-4 py-2 uppercase tracking-widest font-bold text-xs disabled:opacity-40 ${
                  allVoted ? "pp-ready" : ""
                }`}
              >
                ◉ Reveal
              </button>
              <span className="pp-timer-set cf-mono" aria-label="Voting timer">
                ⏱
                {[30, 60, 120].map((s) => (
                  <button
                    key={s}
                    onClick={() => timer(s)}
                    disabled={busy}
                    className="pp-timer-set__chip"
                  >
                    {s < 60 ? `${s}s` : `${s / 60}m`}
                  </button>
                ))}
                {remaining !== null && (
                  <button
                    onClick={() => timer(0)}
                    disabled={busy}
                    className="pp-timer-set__chip pp-timer-set__chip--off"
                  >
                    OFF
                  </button>
                )}
              </span>
            </>
          ) : (
            <span
              className="cf-mono"
              style={{ fontSize: "11px", color: "var(--cf-text-dim)" }}
            >
              THE HOST REVEALS THE ROUND
            </span>
          )
        ) : (
          <>
            <span
              className="cf-mono"
              style={{
                fontSize: "11px",
                letterSpacing: "0.12em",
                color: "var(--cf-text-dim)",
              }}
            >
              FINAL
            </span>
            {applyable.length ? (
              <>
                {applyable.map((v) => {
                  const sel = finalPick === v;
                  const suggested = stats.suggested === v;
                  return (
                    <button
                      key={v}
                      onClick={() => setFinalPick(v)}
                      title={
                        suggested ? "Suggested (closest to the average)" : ""
                      }
                      className={`pp-final ${sel ? "pp-final--sel" : ""} ${
                        suggested ? "pp-final--hint" : ""
                      } cf-mono`}
                    >
                      {v}
                      {suggested ? " ★" : ""}
                    </button>
                  );
                })}
                {canWrite && (
                  <button
                    onClick={() => finalPick !== null && apply(finalPick)}
                    disabled={busy || finalPick === null}
                    className="aero-btn aero-btn--cyan px-4 py-2 uppercase tracking-widest font-bold text-xs disabled:opacity-40"
                  >
                    ✓ Apply{finalPick !== null ? ` ${finalPick}` : ""} → points
                  </button>
                )}
              </>
            ) : (
              <span
                className="cf-mono"
                style={{ fontSize: "11px", color: "var(--cf-text-dim)" }}
              >
                THIS DECK DOESN'T MAP TO POINTS — SET THEM ON THE CARD
              </span>
            )}
          </>
        )}

        {canModerate && (
          <button
            onClick={() => reset()}
            disabled={busy}
            className="aero-btn aero-btn--ghost px-4 py-2 uppercase tracking-widest font-bold text-xs disabled:opacity-50"
          >
            ↻ New round
          </button>
        )}
        <button
          onClick={() => leave()}
          disabled={busy}
          className="aero-btn aero-btn--ghost px-4 py-2 uppercase tracking-widest font-bold text-xs disabled:opacity-50 ml-auto"
        >
          Leave
        </button>
      </div>

      {error && (
        <p className="pp-error cf-mono" role="alert">
          ⚠ {error}
        </p>
      )}
    </div>
  );
}
