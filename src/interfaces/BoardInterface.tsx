import type { CardInterface } from "./CardInterface";
import type { SprintInterface } from "./SprintInterface";
import type { TagInterface } from "./TagInterface";

export interface SectionData {
  id: number;
  name: string;
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

export interface BoardInterface {
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
  sections: SectionData[];
  sprints?: SprintInterface[];
  cards: CardInterface[];
  tags?: TagInterface[];
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
  owner?: SharedUser;
  shared_with?: SharedUser[];
  // Server-computed capabilities for the current user (project-aware).
  can_write?: boolean;
  can_manage?: boolean;
}
