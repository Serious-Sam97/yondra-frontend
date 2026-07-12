import type { CardInterface } from "./CardInterface";
import type { SprintInterface } from "./SprintInterface";
import type { TagInterface } from "./TagInterface";

export interface SectionData {
  id: number;
  name: string;
  board_id?: number;
  // Column position on the board (0-based).
  order?: number;
  // CRM SLA aging threshold (hours); null = no aging for this stage.
  aging_hours?: number | null;
}

export type BoardPermission = "read" | "write" | "owner";

export type BoardType = "kanban" | "scrum" | "crm";

export interface SharedUser {
  id: number;
  name: string;
  email: string;
  permission?: BoardPermission;
}

// Board shape returned by the list/update/archive/copy endpoints
// (BoardModelRepository::index/update/setArchived/duplicate): every board
// attribute plus owner/shared_with and cards_count, but no sections/cards/tags.
export interface BoardSummaryInterface {
  id: number;
  name: string;
  type?: BoardType;
  currency?: string;
  // Section that marks a card done/closed (CRM "won" stage, or any chosen column).
  // null = fall back to a column literally named "Done".
  done_section_id?: number | null;
  // Sentinel (QA) module toggle for this board.
  qa_enabled?: boolean;
  description: string;
  user_id?: number;
  project_id?: number | null;
  ticket_prefix?: string | null;
  next_ticket_number?: number;
  background?: string | null;
  default_permission?: BoardPermission;
  archived_at?: string | null;
  github_repo?: string | null;
  github_connected?: boolean;
  github_webhook_secret?: string | null;
  whatsapp_provider?: "meta" | "bsp" | null;
  whatsapp_phone_number_id?: string | null;
  whatsapp_waba_id?: string | null;
  whatsapp_connected?: boolean;
  whatsapp_verify_token?: string | null;
  owner?: SharedUser;
  shared_with?: SharedUser[];
  cards_count?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

// Full board as returned by GET /api/boards/{id} (BoardModelRepository::show),
// with relations loaded and the current user's server-computed capabilities.
export interface BoardInterface extends BoardSummaryInterface {
  sections: SectionData[];
  sprints?: SprintInterface[];
  cards: CardInterface[];
  tags?: TagInterface[];
  // Server-computed capabilities for the current user (project-aware).
  can_write?: boolean;
  can_manage?: boolean;
}
