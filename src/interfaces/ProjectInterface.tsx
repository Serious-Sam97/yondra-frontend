// Shapes returned by the Laravel project endpoints (ProjectModelRepository):
// index/show eager-load owner, members (with pivot role) and boards
// (with cards_count, owner and shared_with).

export interface UserSummary {
  id: number;
  name: string;
  email?: string;
}

export interface ProjectMember extends UserSummary {
  email: string;
  role?: "owner" | "member" | "viewer";
}

export interface BoardFlow {
  todo: number;
  doing: number;
  done: number;
}

export interface ProjectBoard {
  id: number;
  name: string;
  description?: string | null;
  project_id?: number | null;
  // Manual order within a project (YON-125); drives the "Manual" sort mode.
  position?: number;
  color?: string | null;
  background?: string | null;
  cards_count?: number;
  done_count?: number;
  flow?: BoardFlow;
  archived_at?: string | null;
  updated_at?: string | null;
  owner?: UserSummary | null;
  shared_with: {
    id: number;
    name: string;
    permission?: "read" | "write" | "owner";
  }[];
}

export interface ProjectInterface {
  id: number;
  name: string;
  description?: string | null;
  color: string;
  owner_id: number;
  default_permission?: "read" | "write" | "owner";
  archived_at?: string | null;
  owner?: UserSummary | null;
  members: ProjectMember[];
  boards?: ProjectBoard[];
  archived_boards?: ProjectBoard[];
  boards_count?: number;
  // Server-computed capability for the current user (co-owner-aware).
  can_manage?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

// Payload produced by the project create/edit forms.
export interface ProjectFormData {
  name: string;
  description: string | null;
  color: string;
}
