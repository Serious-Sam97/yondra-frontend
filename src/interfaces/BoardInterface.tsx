import type { CardInterface } from "./CardInterface";
import type { TagInterface } from "./TagInterface";

export interface SectionData {
  id: number;
  name: string;
}

export type BoardPermission = "read" | "write" | "owner";

export interface SharedUser {
  id: number;
  name: string;
  email: string;
  permission?: BoardPermission;
}

export interface BoardInterface {
  id: number;
  name: string;
  description: string;
  sections: SectionData[];
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
