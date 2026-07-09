// Planning Poker session snapshot — the server is the source of truth. Vote values
// are only present once `revealed` is true (the server withholds them before that).

export interface PlanningParticipant {
  user_id: number;
  name: string;
  has_voted: boolean;
  value: string | null; // Fibonacci number or '?', only when revealed
}

export interface PlanningSnapshot {
  card_id: number;
  board_id: number;
  round: number;
  revealed: boolean;
  started_by: number | null;
  participants: PlanningParticipant[];
  applied_value: number | null;
}

// Broadcast payload: either a full snapshot or a "session closed" marker.
export type PlanningEventPayload =
  | PlanningSnapshot
  | { card_id: number; board_id: number; cleared: true };
