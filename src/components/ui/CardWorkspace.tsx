"use client";

import { usePlanningSession } from "@/hooks/usePlanningSession";
import { useSentinelCard } from "@/hooks/useSentinelCard";
import { rollupStatus, STATUS_META } from "@/interfaces/QAInterface";
import CardEdit, { type CardEditProps } from "./CardEdit";
import { PlanningPoker } from "./PlanningPoker";
import { SentinelPanel } from "./sentinel/SentinelPanel";

// Wraps the card modal: owns the Planning Poker and Sentinel (QA) sessions and feeds
// CardEdit its top-level tab switch. Each tab is independent — Planning is Scrum-only,
// QA is gated by the board's qa_enabled flag; both need a saved card and a live backend.
export function CardWorkspace(
  props: CardEditProps & { currentUserId: number; qaEnabled?: boolean },
) {
  const { currentUserId, qaEnabled = false, ...cardProps } = props;
  const { boardType, isDemo, card, boardId, isReadOnly } = cardProps;

  const savedCard = !isDemo && !!card?.id && !!boardId;
  const planningActive = boardType === "scrum" && savedCard;
  const qaActive = qaEnabled && savedCard;

  // Hooks run unconditionally; the `enabled` flag gates their effects/subscriptions.
  const planning = usePlanningSession(boardId, card?.id, planningActive);
  const qa = useSentinelCard(boardId, card?.id, qaActive);
  const qaRollup = rollupStatus(qa.cases);

  return (
    <CardEdit
      {...cardProps}
      {...(planningActive
        ? {
            planningCount: planning.snapshot?.participants?.length ?? 0,
            planningAppliedValue: planning.snapshot?.applied_value ?? null,
            planningTab: (
              <PlanningPoker
                session={planning}
                currentUserId={currentUserId}
                canWrite={!isReadOnly}
              />
            ),
          }
        : {})}
      {...(qaActive
        ? {
            qaStatusColor: qaRollup ? STATUS_META[qaRollup].color : undefined,
            qaTab: (
              <SentinelPanel
                session={qa}
                boardId={boardId!}
                canWrite={!isReadOnly}
              />
            ),
          }
        : {})}
    />
  );
}
