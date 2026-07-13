import type {
  BoardInterface,
  BoardPermission,
  BoardSummaryInterface,
  BoardType,
  SectionData,
} from "@/interfaces/BoardInterface";
import type {
  CardComment,
  CardDocument,
  CardImage,
  CardInterface,
  ChecklistItem,
  SubtaskCard,
} from "@/interfaces/CardInterface";
import type { DashboardPayload } from "@/interfaces/DashboardInterface";
import type { PlanningSnapshot } from "@/interfaces/PlanningInterface";
import type { ProjectInterface } from "@/interfaces/ProjectInterface";
import type {
  GherkinLine,
  ReusableStep,
  RunItem,
  TestCase,
  TestPlan,
  TestPlanOverview,
  Verdict,
} from "@/interfaces/QAInterface";
import type {
  SprintInterface,
  SprintReportData,
} from "@/interfaces/SprintInterface";
import type { TagInterface } from "@/interfaces/TagInterface";

// Laravel simplePaginate payload, returned bare from a controller (comments).
export interface SimplePaginated<T> {
  current_page: number;
  data: T[];
  first_page_url: string;
  from: number | null;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
}

// A simplePaginate()d API Resource collection (archived cards). Even with
// JsonResource::withoutWrapping(), paginated resource collections keep the
// data/links/meta envelope — `links.next` is null on the last page.
export interface PaginatedResource<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    path: string;
    per_page: number;
    to: number | null;
  };
}

export class ApiError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`API ERROR: ${status} ${body}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.setItem("isLogged", "false");
}

// Latch so only the FIRST 401 of a burst navigates to /login. A page typically
// fires several requests in parallel; with an expired token every one of them
// 401s, and each would otherwise kick off its own full-page navigation.
// A full navigation reloads the module, so the flag never needs resetting.
let redirectingToLogin = false;

// Endpoints where a 401 means "bad credentials", not "session expired" —
// they must not trigger the global logout redirect.
const PUBLIC_AUTH_PATHS = [
  "/api/login",
  "/api/register",
  "/api/forgot-password",
  "/api/reset-password",
];

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${process.env.NEXT_PUBLIC_API}${path}`;

  // For FormData (file uploads) the browser must set Content-Type itself so the
  // multipart boundary is included — never force application/json in that case.
  const isForm = options.body instanceof FormData;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(isForm ? {} : { "Content-Type": "application/json" }),
    ...((options.headers as Record<string, string>) || {}),
  };

  const token = localStorage.getItem("token");
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers, signal: options.signal });

  // 204 has no body. The cast is the one loose spot of the whole boundary — it is
  // only sound because void-ish endpoints are declared Promise<void> (or `| null`
  // for the few endpoints that legitimately answer 204, e.g. planning).
  if (res.status === 204) return null as unknown as T;
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 401 && !PUBLIC_AUTH_PATHS.includes(path)) {
      // Session expired or token revoked — clear auth state and send the user to
      // login, carrying the current location so a fresh sign-in returns them here.
      clearAuth();
      if (
        typeof window !== "undefined" &&
        !redirectingToLogin &&
        !window.location.pathname.startsWith("/login")
      ) {
        redirectingToLogin = true;
        const returnTo = `${window.location.pathname}${window.location.search}`;
        window.location.href = `/login?next=${encodeURIComponent(returnTo)}`;
      }
    }
    throw new ApiError(res.status, body);
  }
  return res.json().catch(() => ({})) as Promise<T>;
}

// --- Projects ---

// GET /api/projects — "owned" includes co-owned (owner pivot role) projects.
export async function fetchProjects(): Promise<{
  owned: ProjectInterface[];
  member: ProjectInterface[];
}> {
  return apiFetch("/api/projects");
}

// --- Dashboard ---

export async function fetchDashboard(): Promise<DashboardPayload> {
  return apiFetch("/api/dashboard");
}

// Workspace omnisearch hits (SearchController) — boards + cards across every
// board the current user can see.
export interface SearchBoardResult {
  id: number;
  name: string;
  project_id: number | null;
  type: BoardType;
}

export interface SearchCardResult {
  id: number;
  name: string;
  board_id: number;
  board_name: string | null;
  section: string | null;
  is_deal: boolean;
  ticket_key: string;
}

export async function searchWorkspace(q: string): Promise<{
  boards: SearchBoardResult[];
  cards: SearchCardResult[];
}> {
  return apiFetch(`/api/search?q=${encodeURIComponent(q)}`);
}

export async function fetchProject(id: number): Promise<ProjectInterface> {
  return apiFetch(`/api/projects/${id}`);
}

export async function createProject(data: {
  name: string;
  description?: string | null;
  color?: string;
}): Promise<ProjectInterface> {
  return apiFetch("/api/projects", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProject(
  id: number,
  data: {
    name?: string;
    description?: string | null;
    color?: string;
    default_permission?: "read" | "write" | "owner";
  },
): Promise<ProjectInterface> {
  return apiFetch(`/api/projects/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteProject(id: number): Promise<void> {
  return apiFetch(`/api/projects/${id}`, { method: "DELETE" });
}

export async function archiveProject(id: number): Promise<ProjectInterface> {
  return apiFetch(`/api/projects/${id}/archive`, { method: "POST" });
}

export async function unarchiveProject(id: number): Promise<ProjectInterface> {
  return apiFetch(`/api/projects/${id}/unarchive`, { method: "POST" });
}

export async function copyProject(
  id: number,
  data: {
    name?: string;
    include_boards?: boolean;
    include_cards?: boolean;
  } = {},
): Promise<ProjectInterface> {
  return apiFetch(`/api/projects/${id}/copy`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Users not yet in the project, matched by name/email.
export interface ProjectMemberCandidate {
  id: number;
  name: string;
  email: string;
}

export async function getProjectMemberCandidates(
  projectId: number,
  q = "",
): Promise<ProjectMemberCandidate[]> {
  const query = q ? `?q=${encodeURIComponent(q)}` : "";
  return apiFetch(`/api/projects/${projectId}/members/candidates${query}`, {
    method: "GET",
  });
}

// Member endpoints answer with the refreshed project (ProjectModelRepository::show).
export async function addProjectMember(
  projectId: number,
  email: string,
  role: "owner" | "member" | "viewer" = "member",
): Promise<ProjectInterface> {
  return apiFetch(`/api/projects/${projectId}/members`, {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });
}

export async function updateProjectMember(
  projectId: number,
  userId: number,
  role: "owner" | "member" | "viewer",
): Promise<ProjectInterface> {
  return apiFetch(`/api/projects/${projectId}/members/${userId}`, {
    method: "PUT",
    body: JSON.stringify({ role }),
  });
}

export async function removeProjectMember(
  projectId: number,
  userId: number,
): Promise<void> {
  return apiFetch(`/api/projects/${projectId}/members/${userId}`, {
    method: "DELETE",
  });
}

// --- Boards ---

export async function deleteBoard(id: number): Promise<void> {
  return apiFetch(`/api/boards/${id}`, { method: "DELETE" });
}

export async function updateBoard(
  id: number,
  data: {
    name?: string;
    type?: "kanban" | "scrum" | "crm";
    currency?: string;
    done_section_id?: number | null;
    qa_enabled?: boolean;
    description?: string;
    project_id?: number | null;
    ticket_prefix?: string | null;
    next_ticket_number?: number;
    background?: string | null;
    default_permission?: "read" | "write" | "owner";
    github_repo?: string | null;
    github_token?: string | null;
    whatsapp_provider?: "meta" | "bsp" | null;
    whatsapp_phone_number_id?: string | null;
    whatsapp_waba_id?: string | null;
    whatsapp_token?: string | null;
    whatsapp_app_secret?: string | null;
    whatsapp_verify_token?: string | null;
  },
): Promise<BoardSummaryInterface> {
  return apiFetch(`/api/boards/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function archiveBoard(id: number): Promise<BoardSummaryInterface> {
  return apiFetch(`/api/boards/${id}/archive`, { method: "POST" });
}

export async function unarchiveBoard(
  id: number,
): Promise<BoardSummaryInterface> {
  return apiFetch(`/api/boards/${id}/unarchive`, { method: "POST" });
}

export async function copyBoard(
  id: number,
  data: { name?: string; include_cards?: boolean } = {},
): Promise<BoardSummaryInterface> {
  return apiFetch(`/api/boards/${id}/copy`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// The freshly created board comes back with its seeded sections loaded.
export async function createBoard(data: {
  name: string;
  description: string;
  project_id?: number | null;
  type?: "kanban" | "scrum" | "crm";
  currency?: string;
}): Promise<BoardSummaryInterface & { sections: SectionData[] }> {
  return apiFetch("/api/boards", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchBoard(
  id: number,
  signal?: AbortSignal,
  includeSubtasks = false,
): Promise<BoardInterface> {
  const q = includeSubtasks ? "?include_subtasks=1" : "";
  return apiFetch(`/api/boards/${id}${q}`, { method: "GET", signal });
}

// --- Sections ---

export async function deleteSection(
  boardId: number,
  sectionId: number,
): Promise<void> {
  return apiFetch(`/api/boards/${boardId}/sections/${sectionId}`, {
    method: "DELETE",
  });
}

export async function createSection(
  boardId: number,
  name: string,
): Promise<SectionData> {
  return apiFetch(`/api/boards/${boardId}/sections`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function updateSection(
  boardId: number,
  sectionId: number,
  data: { name?: string; aging_hours?: number | null },
): Promise<SectionData> {
  return apiFetch(`/api/boards/${boardId}/sections/${sectionId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function reorderSections(
  boardId: number,
  sectionIds: number[],
): Promise<void> {
  return apiFetch(`/api/boards/${boardId}/sections/reorder`, {
    method: "POST",
    body: JSON.stringify({ section_ids: sectionIds }),
  });
}

// --- Tags ---

export async function createTag(
  boardId: number,
  data: { name: string; color: string },
): Promise<TagInterface> {
  return apiFetch(`/api/boards/${boardId}/tags`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTag(
  boardId: number,
  tagId: number,
  data: { name?: string; color?: string },
): Promise<TagInterface> {
  return apiFetch(`/api/boards/${boardId}/tags/${tagId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteTag(boardId: number, tagId: number): Promise<void> {
  return apiFetch(`/api/boards/${boardId}/tags/${tagId}`, { method: "DELETE" });
}

// --- Cards ---

// Create/update answer with the full reloaded card (relations + ticket_key),
// see CardModelRepository::save/update.
export async function createCard(
  boardId: number,
  data: {
    section_id: number;
    assigned_user_id?: number | null;
    tag_ids?: number[];
    name: string;
    description: string;
    due_date?: string | null;
    priority?: string | null;
    value?: number | null;
    story_points?: number | null;
    sprint_id?: number | null;
  },
): Promise<CardInterface> {
  return apiFetch(`/api/boards/${boardId}/cards`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCard(
  boardId: number,
  cardId: number | string,
  data: {
    section_id?: number;
    assigned_user_id?: number | null;
    tag_ids?: number[];
    name?: string;
    description?: string;
    due_date?: string | null;
    priority?: string | null;
    position?: number;
    value?: number | null;
    story_points?: number | null;
    sprint_id?: number | null;
  },
): Promise<CardInterface> {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// --- Sprints (scrum) ---

export async function fetchSprints(
  boardId: number,
): Promise<SprintInterface[]> {
  return apiFetch(`/api/boards/${boardId}/sprints`, { method: "GET" });
}

export async function createSprint(
  boardId: number,
  data: {
    name: string;
    start_date?: string | null;
    end_date?: string | null;
    is_active?: boolean;
  },
): Promise<SprintInterface> {
  return apiFetch(`/api/boards/${boardId}/sprints`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Returns the FULL ordered sprint list, not just the edited sprint — a date
// change can cascade-shift later sprints (SprintController::update).
export async function updateSprint(
  boardId: number,
  sprintId: number,
  data: {
    name?: string;
    start_date?: string | null;
    end_date?: string | null;
    is_active?: boolean;
  },
): Promise<SprintInterface[]> {
  return apiFetch(`/api/boards/${boardId}/sprints/${sprintId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function startSprint(
  boardId: number,
  sprintId: number,
  data: {
    goal?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  } = {},
): Promise<SprintInterface> {
  return apiFetch(`/api/boards/${boardId}/sprints/${sprintId}/start`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface CompleteSprintResponse {
  sprint: SprintInterface;
  // Present when move_to === "new".
  new_sprint: SprintInterface | null;
  // Where incomplete tickets went; null = backlog.
  target_sprint_id: number | null;
  moved_ids: number[];
}

export async function completeSprint(
  boardId: number,
  sprintId: number,
  data: { move_to: string; new_sprint_name?: string },
): Promise<CompleteSprintResponse> {
  return apiFetch(`/api/boards/${boardId}/sprints/${sprintId}/complete`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getSprintReport(
  boardId: number,
  sprintId: number,
): Promise<SprintReportData> {
  return apiFetch(`/api/boards/${boardId}/sprints/${sprintId}/report`, {
    method: "GET",
  });
}

export async function deleteSprint(
  boardId: number,
  sprintId: number,
): Promise<void> {
  return apiFetch(`/api/boards/${boardId}/sprints/${sprintId}`, {
    method: "DELETE",
  });
}

// Persist a custom card order within a section. `orderedIds` is the full, final
// list of card ids for that section; the backend writes position = array index.
export async function reorderCards(
  boardId: number,
  sectionId: number,
  orderedIds: (number | string)[],
): Promise<{ ok: true }> {
  return apiFetch(`/api/boards/${boardId}/cards/reorder`, {
    method: "PUT",
    body: JSON.stringify({ section_id: sectionId, ordered_ids: orderedIds }),
  });
}

export async function deleteCard(
  boardId: number,
  cardId: number | string,
): Promise<void> {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}`, {
    method: "DELETE",
  });
}

// 204 no body — the restored card is pushed over the board channel instead.
export async function restoreCard(
  boardId: number,
  cardId: number | string,
): Promise<void> {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}/restore`, {
    method: "PUT",
  });
}

// 25 per page, most recently archived first.
export async function getArchivedCards(
  boardId: number,
  page = 1,
): Promise<PaginatedResource<CardInterface>> {
  return apiFetch(`/api/boards/${boardId}/cards/archived?page=${page}`);
}

// --- Checklist ---

export async function createChecklistItem(
  boardId: number,
  cardId: number | string,
  text: string,
): Promise<ChecklistItem> {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}/checklist`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function updateChecklistItem(
  boardId: number,
  cardId: number | string,
  itemId: number,
  data: { text?: string; is_done?: boolean },
): Promise<ChecklistItem> {
  return apiFetch(
    `/api/boards/${boardId}/cards/${cardId}/checklist/${itemId}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
  );
}

export async function deleteChecklistItem(
  boardId: number,
  cardId: number | string,
  itemId: number,
): Promise<void> {
  return apiFetch(
    `/api/boards/${boardId}/cards/${cardId}/checklist/${itemId}`,
    { method: "DELETE" },
  );
}

// --- Card images (attachments) ---

export async function uploadCardImage(
  boardId: number,
  cardId: number | string,
  file: File,
): Promise<CardImage> {
  const form = new FormData();
  form.append("image", file);
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}/attachments`, {
    method: "POST",
    body: form,
  });
}

// Board-scoped inline-image upload for rich text — usable before a card exists.
// The backend returns a host-less "/storage/..." path; resolve it against the
// configured API origin so image URLs follow NEXT_PUBLIC_API (not the backend's APP_URL).
export async function uploadInlineImage(
  boardId: number,
  file: File,
): Promise<{ url: string }> {
  const form = new FormData();
  form.append("image", file);
  const data = await apiFetch<{ url?: string }>(
    `/api/boards/${boardId}/uploads`,
    {
      method: "POST",
      body: form,
    },
  );
  const path: string = data?.url ?? "";
  const url = /^https?:\/\//.test(path)
    ? path
    : `${process.env.NEXT_PUBLIC_API ?? ""}${path}`;
  return { url };
}

export async function deleteCardImage(
  boardId: number,
  cardId: number | string,
  imageId: number,
): Promise<void> {
  return apiFetch(
    `/api/boards/${boardId}/cards/${cardId}/attachments/${imageId}`,
    { method: "DELETE" },
  );
}

// --- Card documents (file attachments) ---

export async function uploadCardDocument(
  boardId: number,
  cardId: number | string,
  file: File,
): Promise<CardDocument> {
  const form = new FormData();
  form.append("file", file);
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}/documents`, {
    method: "POST",
    body: form,
  });
}

export async function deleteCardDocument(
  boardId: number,
  cardId: number | string,
  documentId: number,
): Promise<void> {
  return apiFetch(
    `/api/boards/${boardId}/cards/${cardId}/documents/${documentId}`,
    { method: "DELETE" },
  );
}

// Documents live on the private disk behind an auth-gated route, so a plain
// <a href> can't reach them (the Bearer token wouldn't be sent). Pull the blob
// with the auth header, then trigger a client-side "Save as".
export async function downloadCardDocument(
  boardId: number,
  cardId: number | string,
  documentId: number,
  filename: string,
): Promise<void> {
  const token = localStorage.getItem("token");
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API}/api/boards/${boardId}/cards/${cardId}/documents/${documentId}/download`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  );
  if (!res.ok) throw new ApiError(res.status, await res.text().catch(() => ""));
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "document";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// --- Card GitHub links ---

// Returns the reloaded card (with its `links` array) so the caller can merge it.
export async function addCardLink(
  boardId: number,
  cardId: number | string,
  url: string,
): Promise<CardInterface> {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}/links`, {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export async function refreshCardLink(
  boardId: number,
  cardId: number | string,
  linkId: number,
): Promise<CardInterface> {
  return apiFetch(
    `/api/boards/${boardId}/cards/${cardId}/links/${linkId}/refresh`,
    { method: "POST" },
  );
}

export async function deleteCardLink(
  boardId: number,
  cardId: number | string,
  linkId: number,
): Promise<void> {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}/links/${linkId}`, {
    method: "DELETE",
  });
}

// --- Comments ---

// 30 per page, newest first — page N+1 holds the next-older window.
export async function getComments(
  boardId: number,
  cardId: number | string,
  page = 1,
): Promise<SimplePaginated<CardComment>> {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}/comments?page=${page}`);
}

// With parentId the comment lands in that top-level comment's thread (the server
// re-parents replies-to-replies onto the thread root).
export async function createComment(
  boardId: number,
  cardId: number | string,
  body: string,
  parentId?: number,
): Promise<CardComment> {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}/comments`, {
    method: "POST",
    body: JSON.stringify({ body, ...(parentId ? { parent_id: parentId } : {}) }),
  });
}

// A thread in conversation order (oldest first), 50 per page.
export async function getCommentReplies(
  boardId: number,
  cardId: number | string,
  commentId: number,
  page = 1,
): Promise<SimplePaginated<CardComment>> {
  return apiFetch(
    `/api/boards/${boardId}/cards/${cardId}/comments/${commentId}/replies?page=${page}`,
  );
}

// Toggles the caller's reaction; answers with the comment's fresh aggregate.
export async function reactToComment(
  boardId: number,
  cardId: number | string,
  commentId: number,
  emoji: string,
): Promise<CardComment> {
  return apiFetch(
    `/api/boards/${boardId}/cards/${cardId}/comments/${commentId}/reactions`,
    { method: "POST", body: JSON.stringify({ emoji }) },
  );
}

export async function updateComment(
  boardId: number,
  cardId: number | string,
  commentId: number,
  body: string,
): Promise<CardComment> {
  return apiFetch(
    `/api/boards/${boardId}/cards/${cardId}/comments/${commentId}`,
    {
      method: "PUT",
      body: JSON.stringify({ body }),
    },
  );
}

export async function deleteComment(
  boardId: number,
  cardId: number | string,
  commentId: number,
): Promise<void> {
  return apiFetch(
    `/api/boards/${boardId}/cards/${cardId}/comments/${commentId}`,
    { method: "DELETE" },
  );
}

// --- GIFs (Tenor proxy) ---

export interface GifResult {
  id: string;
  description: string;
  preview_url: string;
  gif_url: string;
}

// Whether the backend has a Tenor key — no key, no GIF button.
export async function getGifAvailability(): Promise<{ enabled: boolean }> {
  return apiFetch("/api/gifs/availability");
}

// Empty query returns Tenor's featured feed (the picker's opening state).
export async function searchGifs(q: string, limit = 24): Promise<GifResult[]> {
  return apiFetch(
    `/api/gifs/search?q=${encodeURIComponent(q)}&limit=${limit}`,
  );
}

// --- WhatsApp ---

export interface WhatsappMessage {
  id: number;
  conversation_id?: number;
  direction: "in" | "out";
  type: string;
  body: string | null;
  status: string | null;
  template_name?: string | null;
  error?: string | null;
  sent_by?: { id: number; name: string } | null;
  created_at: string;
  updated_at?: string;
}

export interface WhatsappConversation {
  id: number;
  board_id: number;
  card_id: number;
  wa_phone: string;
  contact_name: string | null;
  last_inbound_at: string | null;
  service_window_expires_at: string | null;
  quality_state?: string | null;
  messages: WhatsappMessage[];
  created_at?: string;
  updated_at?: string;
}

export async function getWhatsappThread(
  boardId: number,
  cardId: number | string,
): Promise<{
  conversation: WhatsappConversation | null;
  window_open: boolean;
}> {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}/whatsapp`);
}

export async function sendWhatsappReply(
  boardId: number,
  cardId: number | string,
  body: string,
): Promise<WhatsappMessage> {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}/whatsapp`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

// Per-board stage→template automation config (owner-level).
export interface WhatsappStageAutomation {
  id: number;
  board_id: number;
  section_id: number;
  template_name: string;
  language: string;
  enabled: boolean;
  // Set when Meta reports a quality drop; cleared by an explicit resume.
  paused_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export async function getWhatsappAutomations(boardId: number): Promise<
  {
    section_id: number;
    section_name: string;
    automation: WhatsappStageAutomation | null;
  }[]
> {
  return apiFetch(`/api/boards/${boardId}/whatsapp/automations`);
}

export async function upsertWhatsappAutomation(
  boardId: number,
  sectionId: number,
  data: {
    template_name: string;
    language?: string;
    enabled?: boolean;
    resume?: boolean;
  },
): Promise<WhatsappStageAutomation> {
  return apiFetch(`/api/boards/${boardId}/whatsapp/automations/${sectionId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteWhatsappAutomation(
  boardId: number,
  sectionId: number,
): Promise<void> {
  return apiFetch(`/api/boards/${boardId}/whatsapp/automations/${sectionId}`, {
    method: "DELETE",
  });
}

// --- Activity ---

export interface BoardActivityEntry {
  id: number;
  board_id: number;
  user_id: number | null;
  type: string;
  description: string;
  user?: { id: number; name: string } | null;
  created_at: string;
  updated_at?: string;
}

export async function getActivity(
  boardId: number,
): Promise<BoardActivityEntry[]> {
  return apiFetch(`/api/boards/${boardId}/activity`);
}

// --- Notifications ---

// One bell entry (NotificationController flattens Laravel's data envelope).
export interface AppNotification {
  id: string;
  type?: string | null;
  message: string;
  board_id?: number | null;
  card_id?: number | null;
  deep_link?: string | null;
  read_at?: string | null;
  created_at: string;
}

export async function getNotifications(): Promise<AppNotification[]> {
  return apiFetch("/api/notifications");
}

export async function markNotificationRead(id: string | number): Promise<void> {
  return apiFetch(`/api/notifications/${id}/read`, { method: "PUT" });
}

export async function markAllNotificationsRead(): Promise<void> {
  return apiFetch("/api/notifications/read-all", { method: "PUT" });
}

export type NotificationMatrix = Record<string, Record<string, boolean>>;

export type NotificationPreferenceCatalog = {
  event_types: {
    key: string;
    label: string;
    description: string;
    active: boolean;
  }[];
  channels: { key: string; label: string }[];
  preferences: NotificationMatrix;
};

export async function getNotificationPreferences(): Promise<NotificationPreferenceCatalog> {
  return apiFetch("/api/notifications/preferences");
}

export async function updateNotificationPreferences(
  preferences: NotificationMatrix,
): Promise<NotificationPreferenceCatalog> {
  return apiFetch("/api/notifications/preferences", {
    method: "PUT",
    body: JSON.stringify({ preferences }),
  });
}

// --- Sharing ---

export interface ShareBoardResponse {
  message: string;
  user: {
    id: number;
    name: string;
    email: string;
    permission: BoardPermission;
  };
}

export async function shareBoard(
  boardId: number,
  email: string,
  permission: "read" | "write" | "owner" = "write",
): Promise<ShareBoardResponse> {
  return apiFetch(`/api/boards/${boardId}/share`, {
    method: "POST",
    body: JSON.stringify({ email, permission }),
  });
}

export async function shareBoardWithUser(
  boardId: number,
  userId: number,
  permission: "read" | "write" | "owner" = "write",
): Promise<ShareBoardResponse> {
  return apiFetch(`/api/boards/${boardId}/share`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId, permission }),
  });
}

// A parent-project member the board can be shared with, annotated with whether
// the board is already shared to them (BoardShareController::candidates).
export interface BoardShareCandidate {
  id: number;
  name: string;
  email: string;
  role: "owner" | "member" | "viewer";
  shared: boolean;
  permission: BoardPermission | null;
}

export async function getShareCandidates(
  boardId: number,
): Promise<BoardShareCandidate[]> {
  return apiFetch(`/api/boards/${boardId}/share/candidates`, { method: "GET" });
}

export async function updateSharePermission(
  boardId: number,
  userId: number,
  permission: "read" | "write" | "owner",
): Promise<{ permission: BoardPermission }> {
  return apiFetch(`/api/boards/${boardId}/share/${userId}`, {
    method: "PUT",
    body: JSON.stringify({ permission }),
  });
}

export async function unshareBoard(
  boardId: number,
  userId: number,
): Promise<void> {
  return apiFetch(`/api/boards/${boardId}/share/${userId}`, {
    method: "DELETE",
  });
}

// --- Templates ---

export interface CardTemplateInterface {
  id: number;
  board_id: number;
  user_id: number;
  name: string;
  template_data: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export async function getTemplates(
  boardId: number,
): Promise<CardTemplateInterface[]> {
  return apiFetch(`/api/boards/${boardId}/templates`);
}

export async function createTemplate(
  boardId: number,
  data: { name: string; template_data: object },
): Promise<CardTemplateInterface> {
  return apiFetch(`/api/boards/${boardId}/templates`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteTemplate(
  boardId: number,
  templateId: number,
): Promise<void> {
  return apiFetch(`/api/boards/${boardId}/templates/${templateId}`, {
    method: "DELETE",
  });
}

// --- Board Chat ---

export interface BoardChatMessage {
  id: number;
  board_id: number;
  user_id: number;
  body: string;
  user: { id: number; name: string };
  created_at: string;
  updated_at?: string;
}

export async function getBoardMessages(
  boardId: number,
): Promise<BoardChatMessage[]> {
  return apiFetch(`/api/boards/${boardId}/messages`);
}

export async function createBoardMessage(
  boardId: number,
  body: string,
): Promise<BoardChatMessage> {
  return apiFetch(`/api/boards/${boardId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export async function deleteBoardMessage(
  boardId: number,
  messageId: number,
): Promise<void> {
  return apiFetch(`/api/boards/${boardId}/messages/${messageId}`, {
    method: "DELETE",
  });
}

// --- Subtasks ---

export async function getSubtasks(
  boardId: number,
  cardId: number | string,
): Promise<SubtaskCard[]> {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}/subtasks`);
}

export async function createSubtask(
  boardId: number,
  cardId: number | string,
  data: { name: string; description?: string },
): Promise<SubtaskCard> {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}/subtasks`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSubtask(
  boardId: number,
  cardId: number | string,
  subtaskId: number,
  data: { is_done?: boolean; name?: string },
): Promise<SubtaskCard> {
  return apiFetch(
    `/api/boards/${boardId}/cards/${cardId}/subtasks/${subtaskId}`,
    { method: "PUT", body: JSON.stringify(data) },
  );
}

// --- Planning Poker ---

const planningBase = (boardId: number, cardId: number | string) =>
  `/api/boards/${boardId}/cards/${cardId}/planning`;

// 204 (→ null) when the board isn't scrum or no session is running.
export async function getPlanning(
  boardId: number,
  cardId: number | string,
  signal?: AbortSignal,
): Promise<PlanningSnapshot | null> {
  return apiFetch(planningBase(boardId, cardId), { method: "GET", signal });
}

// `deck` only takes effect when the join creates the session; `spectator` seats
// the caller without a hand (switchable until they cast a vote).
export async function joinPlanning(
  boardId: number,
  cardId: number | string,
  opts: { deck?: string; spectator?: boolean } = {},
): Promise<PlanningSnapshot> {
  return apiFetch(`${planningBase(boardId, cardId)}/join`, {
    method: "POST",
    body: JSON.stringify(opts),
  });
}

// 204 (→ null) when the last participant leaves and the room closes.
export async function leavePlanning(
  boardId: number,
  cardId: number | string,
): Promise<PlanningSnapshot | null> {
  return apiFetch(`${planningBase(boardId, cardId)}/leave`, { method: "POST" });
}

export async function votePlanning(
  boardId: number,
  cardId: number | string,
  value: string,
): Promise<PlanningSnapshot> {
  return apiFetch(`${planningBase(boardId, cardId)}/vote`, {
    method: "POST",
    body: JSON.stringify({ value }),
  });
}

export async function revealPlanning(
  boardId: number,
  cardId: number | string,
): Promise<PlanningSnapshot> {
  return apiFetch(`${planningBase(boardId, cardId)}/reveal`, {
    method: "POST",
  });
}

export async function resetPlanning(
  boardId: number,
  cardId: number | string,
): Promise<PlanningSnapshot> {
  return apiFetch(`${planningBase(boardId, cardId)}/reset`, { method: "POST" });
}

// Set (seconds > 0) or clear (0) the round's soft voting deadline.
export async function timerPlanning(
  boardId: number,
  cardId: number | string,
  seconds: number,
): Promise<PlanningSnapshot> {
  return apiFetch(`${planningBase(boardId, cardId)}/timer`, {
    method: "POST",
    body: JSON.stringify({ seconds }),
  });
}

// Presence heartbeat — 204 (→ null) when the session has closed.
export async function pingPlanning(
  boardId: number,
  cardId: number | string,
): Promise<PlanningSnapshot | null> {
  return apiFetch(`${planningBase(boardId, cardId)}/ping`, { method: "POST" });
}

// Answers with the snapshot; falls back to the bare card when no session exists.
export async function applyPlanning(
  boardId: number,
  cardId: number | string,
  value: number,
): Promise<PlanningSnapshot | CardInterface> {
  return apiFetch(`${planningBase(boardId, cardId)}/apply`, {
    method: "POST",
    body: JSON.stringify({ value }),
  });
}

// --- AI assist ---

export type AiAction =
  | "summarize"
  | "describe"
  | "checklist"
  | "tests"
  | "reply"
  | "rewrite";

export type AiRewriteMode = "improve" | "grammar" | "concise" | "translate";

export interface AiParams {
  request_id: string;
  prompt?: string; // describe/reply steer
  mode?: AiRewriteMode; // rewrite
  language?: string; // rewrite: translate target
  text?: string; // unsaved editor content to act on
}

// Kicks off a streamed AI action on a card. The heavy work runs server-side and streams
// back over the board channel as ai.token/ai.done frames — this call just arms the job
// and echoes the request_id. The caller mints the id and sets its listener filter BEFORE
// calling, so no early token is missed. 202 on success; 503 (ApiError) when the selected
// provider has no key configured; 404 for an unknown action.
export async function runCardAi(
  boardId: number,
  cardId: number | string,
  action: AiAction,
  params: AiParams,
): Promise<{ request_id: string }> {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}/ai/${action}`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

// Kicks off a board-level standup / sprint summary. Streams back over the board channel
// as scope:'board' ai.token/ai.done frames; this call just arms the job. 202 on success.
export async function startStandup(
  boardId: number,
  requestId: string,
): Promise<{ request_id: string }> {
  return apiFetch(`/api/boards/${boardId}/ai/standup`, {
    method: "POST",
    body: JSON.stringify({ request_id: requestId }),
  });
}

export interface PointsSuggestion {
  points: number;
  rationale: string;
}

// Synchronous structured suggestion — a story-point estimate on the Fibonacci scale,
// with a one-line rationale. 200 with the estimate; 503 unconfigured; 422 if the model
// couldn't produce a usable answer.
export async function suggestStoryPoints(
  boardId: number,
  cardId: number | string,
): Promise<PointsSuggestion> {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}/ai/points`, {
    method: "POST",
  });
}

export interface TriageSuggestion {
  tag_ids: number[];
  priority: "low" | "medium" | "high" | null;
  assignee_id: number | null;
  rationale: string;
}

// Synchronous structured suggestion — labels, priority and assignee, each validated
// server-side against the board's real tags/members (invented ids are dropped).
export async function suggestTriage(
  boardId: number,
  cardId: number | string,
): Promise<TriageSuggestion> {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}/ai/triage`, {
    method: "POST",
  });
}

export interface SubtaskSuggestion {
  subtasks: string[];
  rationale: string;
}

// Synchronous structured suggestion — a short list of subtask titles for the card.
// The caller creates the child cards; an empty list means the card was too thin.
export async function suggestSubtasks(
  boardId: number,
  cardId: number | string,
): Promise<SubtaskSuggestion> {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}/ai/subtasks`, {
    method: "POST",
  });
}

// --- Sentinel (QA) ---

const qaBase = (boardId: number, cardId: number | string) =>
  `/api/boards/${boardId}/cards/${cardId}/qa`;

export async function getQa(
  boardId: number,
  cardId: number | string,
  signal?: AbortSignal,
): Promise<{ cases: TestCase[] }> {
  return apiFetch(qaBase(boardId, cardId), { method: "GET", signal });
}

export async function createTestCase(
  boardId: number,
  cardId: number | string,
  data: { title: string; type?: string; gherkin?: string },
): Promise<TestCase> {
  return apiFetch(`${qaBase(boardId, cardId)}/cases`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTestCase(
  boardId: number,
  cardId: number | string,
  caseId: number,
  data: Record<string, unknown>,
): Promise<TestCase> {
  return apiFetch(`${qaBase(boardId, cardId)}/cases/${caseId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteTestCase(
  boardId: number,
  cardId: number | string,
  caseId: number,
): Promise<void> {
  return apiFetch(`${qaBase(boardId, cardId)}/cases/${caseId}`, {
    method: "DELETE",
  });
}

// Appends a run and answers with the refreshed parent case snapshot.
export async function createTestRun(
  boardId: number,
  cardId: number | string,
  caseId: number,
  data: {
    status: string;
    environment?: string | null;
    device?: string | null;
    logs?: string | null;
    evidence?: { url: string; kind?: string }[];
    items?: RunItem[];
  },
): Promise<TestCase> {
  return apiFetch(`${qaBase(boardId, cardId)}/cases/${caseId}/runs`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function linkBug(
  boardId: number,
  cardId: number | string,
  caseId: number,
): Promise<TestCase> {
  return apiFetch(`${qaBase(boardId, cardId)}/cases/${caseId}/bug`, {
    method: "POST",
  });
}

// Quality Gate — set (or clear, with null) the human verdict on a case.
export async function setCaseVerdict(
  boardId: number,
  cardId: number | string,
  caseId: number,
  verdict: Verdict | null,
): Promise<TestCase> {
  return apiFetch(`${qaBase(boardId, cardId)}/cases/${caseId}/verdict`, {
    method: "POST",
    body: JSON.stringify({ verdict }),
  });
}

// Mint / rotate the CI webhook token for a case.
export async function generateCiToken(
  boardId: number,
  cardId: number | string,
  caseId: number,
): Promise<TestCase> {
  return apiFetch(`${qaBase(boardId, cardId)}/cases/${caseId}/ci-token`, {
    method: "POST",
  });
}

// Reusable step library (per board).
const stepBase = (boardId: number) => `/api/boards/${boardId}/qa/steps`;

export async function getSteps(
  boardId: number,
  signal?: AbortSignal,
): Promise<{ steps: ReusableStep[] }> {
  return apiFetch(stepBase(boardId), { method: "GET", signal });
}

export async function createStep(
  boardId: number,
  data: {
    title: string;
    content?: string;
    gherkin_lines?: GherkinLine[];
  },
): Promise<ReusableStep> {
  return apiFetch(stepBase(boardId), {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateStep(
  boardId: number,
  stepId: number,
  data: {
    title?: string;
    content?: string | null;
    gherkin_lines?: GherkinLine[];
  },
): Promise<ReusableStep> {
  return apiFetch(`${stepBase(boardId)}/${stepId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteStep(
  boardId: number,
  stepId: number,
): Promise<void> {
  return apiFetch(`${stepBase(boardId)}/${stepId}`, { method: "DELETE" });
}

// Test plans / suites (per board).
const planBase = (boardId: number) => `/api/boards/${boardId}/qa/plans`;

export async function getTestPlans(
  boardId: number,
  signal?: AbortSignal,
): Promise<{ plans: TestPlan[] }> {
  return apiFetch(planBase(boardId), { method: "GET", signal });
}

export async function getQaOverview(
  boardId: number,
  signal?: AbortSignal,
): Promise<{ plans: TestPlanOverview[] }> {
  return apiFetch(`/api/boards/${boardId}/qa/overview`, {
    method: "GET",
    signal,
  });
}

export async function createTestPlan(
  boardId: number,
  data: { name: string; description?: string },
): Promise<TestPlan> {
  return apiFetch(planBase(boardId), {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTestPlan(
  boardId: number,
  planId: number,
  data: { name?: string; description?: string | null },
): Promise<TestPlan> {
  return apiFetch(`${planBase(boardId)}/${planId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteTestPlan(
  boardId: number,
  planId: number,
): Promise<void> {
  return apiFetch(`${planBase(boardId)}/${planId}`, { method: "DELETE" });
}
