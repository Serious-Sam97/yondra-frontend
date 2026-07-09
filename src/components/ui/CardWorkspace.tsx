'use client'

import { usePlanningSession } from '@/hooks/usePlanningSession'
import CardEdit, { type CardEditProps } from './CardEdit'
import { PlanningPoker } from './PlanningPoker'

// Wraps the card modal: owns the Planning Poker session and feeds CardEdit a
// top-level "Card / Planning Poker" switch. Planning is Scrum-only, needs a saved
// card and a live backend (not demo). Otherwise CardEdit renders exactly as before.
export function CardWorkspace(props: CardEditProps & { currentUserId: number }) {
  const { currentUserId, ...cardProps } = props
  const { boardType, isDemo, card, boardId, isReadOnly } = cardProps

  const planningEnabled =
    boardType === 'scrum' && !isDemo && !!card?.id && !!boardId

  const session = usePlanningSession(boardId, card?.id, planningEnabled)

  if (!planningEnabled) return <CardEdit {...cardProps} />

  return (
    <CardEdit
      {...cardProps}
      planningCount={session.snapshot?.participants?.length ?? 0}
      planningAppliedValue={session.snapshot?.applied_value ?? null}
      planningTab={
        <PlanningPoker
          session={session}
          currentUserId={currentUserId}
          canWrite={!isReadOnly}
        />
      }
    />
  )
}
