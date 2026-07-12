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

export interface CardDocument {
  id: number;
  original_name?: string | null;
  mime_type?: string | null;
  size?: number | null;
  position: number;
  created_at?: string | null;
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

// One emoji's aggregate on a comment; `mine` is derived client-side from
// user_ids so HTTP responses and broadcasts share the same shape.
export interface CommentReactionAgg {
  emoji: string;
  count: number;
  user_ids: number[];
  names: string[];
}

// A comment on a card (CardCommentController), author eager-loaded. Top-level
// comments (parent_id null) carry thread summaries; replies never nest further.
export interface CardComment {
  id: number;
  card_id: number;
  parent_id: number | null;
  body: string;
  user: { id: number; name: string };
  created_at: string;
  updated_at?: string;
  edited?: boolean;
  replies_count: number;
  last_reply_at: string | null;
  // Up to 3 recent distinct repliers — the collapsed thread's face stack.
  reply_avatars?: { id: number; name: string }[];
  reactions: CommentReactionAgg[];
}

// A subtask is a bare card row under parent_card_id (CardController::subtasks) —
// no relations are loaded on it.
export interface SubtaskCard {
  id: number;
  board_id: number;
  section_id: number;
  parent_card_id: number | null;
  name: string;
  description: string;
  is_done: boolean;
  position: number;
  created_at?: string | null;
  updated_at?: string | null;
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
  documents?: CardDocument[];
  created_at?: string | null;
  updated_at?: string | null;
  archived_at?: string | null;
  done_at?: string | null;
  parent_card_id?: number | null;
  is_done?: boolean;
  ticket_number?: number | null;
  ticket_key?: string;
}
