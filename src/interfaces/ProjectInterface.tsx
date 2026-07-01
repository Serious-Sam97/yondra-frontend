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

export interface ProjectBoard {
  id: number;
  name: string;
  description?: string | null;
  project_id?: number | null;
  cards_count?: number;
  updated_at?: string | null;
  owner?: UserSummary | null;
  shared_with: { id: number; name: string; permission?: "read" | "write" }[];
}

export interface ProjectInterface {
  id: number;
  name: string;
  description?: string | null;
  color: string;
  owner_id: number;
  owner?: UserSummary | null;
  members: ProjectMember[];
  boards?: ProjectBoard[];
  boards_count?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

// Payload produced by the project create/edit forms.
export interface ProjectFormData {
  name: string;
  description: string | null;
  color: string;
}
