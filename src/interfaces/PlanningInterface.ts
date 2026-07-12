// Planning Poker session snapshot — the server is the source of truth. Vote values
// are only present once `revealed` is true (the server withholds them before that).

export interface PlanningParticipant {
  user_id: number;
  name: string;
  has_voted: boolean;
  value: string | null; // deck card ('5', '?', 'M', …), only when revealed
  // Spectators watch from the table without a hand (PO, stakeholder).
  is_spectator: boolean;
}

export type PlanningDeck = "fib" | "fib-x" | "tshirt";

// A closed round: its votes are public record (that's what re-votes converge on).
export interface PlanningRound {
  round: number;
  votes: { user_id: number; name: string; value: string }[];
}

export interface PlanningSnapshot {
  card_id: number;
  board_id: number;
  round: number;
  revealed: boolean;
  started_by: number | null;
  // The session chair — only they (or board writers) can reveal / start rounds.
  facilitator_id: number | null;
  // Deck fixed at session creation; `hand` is the server-authoritative card list.
  deck: PlanningDeck;
  hand: string[];
  // Soft voting deadline (ISO) — the round auto-reveals when it lapses.
  timer_ends_at: string | null;
  participants: PlanningParticipant[];
  applied_value: number | null;
  // When an estimate was last committed to the card (ISO) — apply-event marker.
  applied_at: string | null;
  history: PlanningRound[];
  // The caller's own pre-reveal vote. Only present on HTTP responses — broadcast
  // snapshots omit the key entirely (undefined ⇒ keep whatever we already know).
  my_value?: string | null;
}

// Broadcast payload: either a full snapshot or a "session closed" marker.
export type PlanningEventPayload =
  | PlanningSnapshot
  | { card_id: number; board_id: number; cleared: true };
