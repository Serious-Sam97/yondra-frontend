import type { TagInterface } from "./TagInterface";

export interface ChecklistItem {
  id: number;
  text: string;
  is_done: boolean;
  position: number;
}

export interface CardImage {
  id: number;
  url: string;
  original_name?: string | null;
  mime_type?: string | null;
  size?: number | null;
  position: number;
  uploader?: { id: number; name: string } | null;
}

export interface CardLink {
  id: number;
  provider: string; // 'github'
  type: "pr" | "issue";
  url: string;
  owner?: string | null;
  repo?: string | null;
  number?: number | null;
  title?: string | null;
  state?: "open" | "closed" | "merged" | "draft" | null;
  merged?: boolean;
  checks_state?: "success" | "failure" | "pending" | null;
  author?: string | null;
  html_url?: string | null;
  last_synced_at?: string | null;
}

export interface CardInterface {
  id: number | string;
  section_id: number;
  assigned_user_id?: number | null;
  assigned_user?: { id: number; name: string } | null;
  created_by_user_id?: number | null;
  created_by?: { id: number; name: string } | null;
  tags?: TagInterface[];
  name: string;
  description: string;
  due_date?: string | null;
  priority?: "low" | "medium" | "high" | null;
  position?: number;
  // CRM: deal value (board currency). Serialized as a string by Laravel's decimal cast.
  value?: number | string | null;
  // When the card entered its current section — drives CRM SLA aging.
  section_entered_at?: string | null;
  // Scrum: effort estimate + sprint assignment.
  story_points?: number | null;
  sprint_id?: number | null;
  checklist_items?: ChecklistItem[];
  images?: CardImage[];
  links?: CardLink[];
  created_at?: string | null;
  updated_at?: string | null;
  archived_at?: string | null;
  done_at?: string | null;
  parent_card_id?: number | null;
  is_done?: boolean;
  ticket_number?: number | null;
  ticket_key?: string;
}
