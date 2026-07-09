'use client'

import { useEffect, useState } from 'react'
import { FIBONACCI } from '@/lib/estimation'
import type { usePlanningSession } from '@/hooks/usePlanningSession'
import type { PlanningParticipant } from '@/interfaces/PlanningInterface'

const HAND: string[] = [...FIBONACCI.map(String), '?']
const AVATAR_COLORS = ['#4CAF50', '#FF9800', '#1976D2', '#F44336', '#7B1FA2', '#FFC107', '#00BCD4', '#E91E63']

const SCREEN = '#0d1410'
const CREAM = '#ddd6c1'
const INK = '#2a2620'

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

function Avatar({ id, name, size = 30 }: { id: number; name: string; size?: number }) {
  return (
    <div
      title={name}
      style={{
        backgroundColor: AVATAR_COLORS[id % AVATAR_COLORS.length],
        width: size,
        height: size,
        fontSize: size * 0.4,
        border: '1.5px solid rgba(255,255,255,0.85)',
      }}
      className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
    >
      {initials(name)}
    </div>
  )
}

type Session = ReturnType<typeof usePlanningSession>

export function PlanningPoker({
  session,
  currentUserId,
  canWrite,
}: {
  session: Session
  currentUserId: number
  canWrite: boolean
}) {
  const { snapshot, busy, join, leave, vote, reveal, reset, apply } = session
  // My own pick is kept locally — the server hides every value (incl. mine) pre-reveal.
  const [selected, setSelected] = useState<string | null>(null)
  const [finalPick, setFinalPick] = useState<number | null>(null)

  const me = snapshot?.participants.find((p) => p.user_id === currentUserId) ?? null
  const inSession = !!me
  const round = snapshot?.round ?? 0

  // Clear the local pick whenever a new round starts or I leave.
  useEffect(() => {
    setSelected(null)
    setFinalPick(null)
  }, [round, inSession])

  // ── Entry / join ──────────────────────────────────────────────────────────
  if (!inSession) {
    const others = snapshot?.participants.length ?? 0
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
        <p style={{ color: 'var(--cf-text-muted)', fontSize: '13px' }}>
          {others > 0
            ? `${others} ${others === 1 ? 'person is' : 'people are'} estimating this card.`
            : 'No planning session on this card yet.'}
        </p>
        <p style={{ color: 'var(--cf-text-dim)', fontSize: '11px' }} className="cf-mono">
          Vote with the team — cards stay hidden until reveal.
        </p>
        <button
          onClick={() => join()}
          disabled={busy}
          className="aero-btn aero-btn--cyan px-5 py-2 uppercase tracking-widest font-bold text-xs disabled:opacity-50"
        >
          ▶ {others > 0 ? 'Join session' : 'Enter planning'}
        </button>
      </div>
    )
  }

  const participants = snapshot!.participants
  const votedCount = participants.filter((p) => p.has_voted).length
  const revealed = snapshot!.revealed

  // Consensus stats (revealed): ignore '?' for the numeric spread.
  const numeric = participants
    .map((p) => p.value)
    .filter((v): v is string => !!v && v !== '?')
    .map(Number)
    .sort((a, b) => a - b)
  const median = numeric.length ? numeric[Math.floor((numeric.length - 1) / 2)] : null
  const spread = numeric.length ? `${numeric[0]}–${numeric[numeric.length - 1]}` : '—'
  const distinctVotes = [...new Set(numeric)].sort((a, b) => a - b)

  const cardBack = (p: PlanningParticipant) => (
    <div
      style={{
        width: 46,
        height: 62,
        borderRadius: 7,
        background: revealed && p.value ? CREAM : SCREEN,
        color: revealed ? INK : p.has_voted ? 'var(--cf-phosphor)' : 'var(--cf-text-dim)',
        border: revealed
          ? `1px solid ${median !== null && p.value && p.value !== '?' && Number(p.value) !== median ? 'var(--cf-red)' : '#b9b39d'}`
          : `1px solid ${p.has_voted ? 'var(--cf-phosphor)' : '#33463a'}`,
        boxShadow: !revealed && p.has_voted ? 'inset 0 0 8px rgba(154,166,126,0.25)' : undefined,
      }}
      className="flex items-center justify-center font-bold"
    >
      <span style={{ fontSize: revealed ? 20 : 16 }}>
        {revealed ? (p.value ?? '·') : p.has_voted ? '✓' : '…'}
      </span>
    </div>
  )

  return (
    <div className="flex flex-col gap-5 px-6 py-5">
      {/* Status line */}
      <p className="cf-mono" style={{ fontSize: '11px', letterSpacing: '0.14em', color: 'var(--cf-text-dim)' }}>
        {revealed
          ? `REVEALED · ${median !== null ? `MEDIAN ${median} · ` : ''}SPREAD ${spread}`
          : `ESTIMATING · ROUND ${round} · ${votedCount} OF ${participants.length} VOTED`}
      </p>

      {/* Roster */}
      <div className="flex flex-wrap gap-5">
        {participants.map((p) => (
          <div key={p.user_id} className="flex flex-col items-center gap-1.5">
            {cardBack(p)}
            <Avatar id={p.user_id} name={p.name} />
            <span style={{ fontSize: '10px', color: 'var(--cf-text-muted)' }} className="cf-mono">
              {p.name.split(' ')[0]}
            </span>
          </div>
        ))}
      </div>

      {/* Your hand (voting only) */}
      {!revealed && (
        <div className="flex flex-col gap-2 pt-1">
          <p className="cf-mono" style={{ fontSize: '11px', letterSpacing: '0.14em', color: 'var(--cf-text-dim)' }}>
            YOUR HAND
          </p>
          <div className="flex flex-wrap gap-2">
            {HAND.map((v) => {
              const sel = selected === v
              return (
                <button
                  key={v}
                  onClick={() => {
                    setSelected(v)
                    vote(v)
                  }}
                  disabled={busy}
                  style={{
                    width: 46,
                    height: 62,
                    borderRadius: 7,
                    background: sel ? '#e6e0cb' : CREAM,
                    color: v === '?' ? '#6a6453' : INK,
                    border: sel ? '2px solid var(--cf-phosphor)' : '1px solid #b9b39d',
                    boxShadow: sel ? '0 0 10px rgba(154,166,126,0.6)' : undefined,
                    fontSize: 20,
                  }}
                  className="flex items-center justify-center font-bold cursor-pointer disabled:opacity-60"
                >
                  {v}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Reveal / apply controls */}
      <div className="flex items-center gap-2.5 flex-wrap pt-3 border-t" style={{ borderColor: 'var(--cf-edge)' }}>
        {!revealed ? (
          <button
            onClick={() => reveal()}
            disabled={busy || votedCount === 0}
            className="aero-btn aero-btn--cyan px-4 py-2 uppercase tracking-widest font-bold text-xs disabled:opacity-40"
          >
            ◉ Reveal
          </button>
        ) : (
          <>
            <span className="cf-mono" style={{ fontSize: '11px', letterSpacing: '0.12em', color: 'var(--cf-text-dim)' }}>
              FINAL
            </span>
            {distinctVotes.map((v) => {
              const sel = finalPick === v
              return (
                <button
                  key={v}
                  onClick={() => setFinalPick(v)}
                  style={{
                    background: sel ? 'var(--cf-phosphor)' : '#1c1a16',
                    color: sel ? '#0d1410' : 'var(--cf-text)',
                    boxShadow: sel ? '0 0 8px rgba(154,166,126,0.4)' : undefined,
                    fontSize: '12px',
                  }}
                  className="cf-mono px-2.5 py-1 rounded-sm font-bold cursor-pointer"
                >
                  {v}
                </button>
              )
            })}
            {canWrite && (
              <button
                onClick={() => finalPick !== null && apply(finalPick)}
                disabled={busy || finalPick === null}
                className="aero-btn aero-btn--cyan px-4 py-2 uppercase tracking-widest font-bold text-xs disabled:opacity-40"
              >
                ✓ Apply{finalPick !== null ? ` ${finalPick}` : ''} → points
              </button>
            )}
          </>
        )}

        <button
          onClick={() => reset()}
          disabled={busy}
          className="aero-btn aero-btn--ghost px-4 py-2 uppercase tracking-widest font-bold text-xs disabled:opacity-50"
        >
          ↻ New round
        </button>
        <button
          onClick={() => leave()}
          disabled={busy}
          className="aero-btn aero-btn--ghost px-4 py-2 uppercase tracking-widest font-bold text-xs disabled:opacity-50 ml-auto"
        >
          Leave
        </button>
      </div>
    </div>
  )
}
