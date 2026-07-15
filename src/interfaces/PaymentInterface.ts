// Payment ledger + milestone automations (YON-63).

export interface PaymentRow {
  id: number;
  amount: number;
  note: string | null;
  paid_at: string | null;
  recorded_by: string | null;
}

export interface PaymentSummary {
  value: number | null;
  amount_paid: number;
  amount_remaining: number | null;
  // Paid % vs deal value; null when the deal has no value set.
  payment_pct: number | null;
  currency: string;
}

export interface PaymentMilestoneEventRow {
  threshold_pct: number;
  label: string | null;
  message_status: "none" | "sent" | "failed" | "skipped";
  message_channel: "whatsapp" | "email" | null;
  moved_to_section_id: number | null;
  error: string | null;
  triggered_at: string | null;
}

export interface CardPaymentsPayload {
  summary: PaymentSummary;
  payments: PaymentRow[];
  events: PaymentMilestoneEventRow[];
}

export type PaymentChannel = "auto" | "whatsapp" | "email";

export interface PaymentMilestone {
  id: number;
  board_id: number;
  threshold_pct: number;
  label: string | null;
  notify: boolean;
  channel: PaymentChannel;
  whatsapp_template_name: string | null;
  language: string;
  email_subject: string | null;
  email_body: string | null;
  move_to_section_id: number | null;
  move_to_section?: { id: number; name: string } | null;
  enabled: boolean;
  position: number;
}

export interface PaymentMilestonesConfig {
  milestones: PaymentMilestone[];
  sections: { id: number; name: string }[];
}
