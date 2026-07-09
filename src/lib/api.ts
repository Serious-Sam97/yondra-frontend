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

// Endpoints where a 401 means "bad credentials", not "session expired" —
// they must not trigger the global logout redirect.
const PUBLIC_AUTH_PATHS = [
  "/api/login",
  "/api/register",
  "/api/forgot-password",
  "/api/reset-password",
];

export async function apiFetch(path: string, options: RequestInit = {}) {
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

  if (res.status === 204) return null;
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 401 && !PUBLIC_AUTH_PATHS.includes(path)) {
      // Session expired or token revoked — clear auth state and send the user to login.
      clearAuth();
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/login")
      ) {
        window.location.href = "/login";
      }
    }
    throw new ApiError(res.status, body);
  }
  return res.json().catch(() => ({}));
}

// --- Projects ---

export async function fetchProjects() {
  return apiFetch("/api/projects");
}

export async function fetchProject(id: number) {
  return apiFetch(`/api/projects/${id}`);
}

export async function createProject(data: {
  name: string;
  description?: string | null;
  color?: string;
}) {
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
) {
  return apiFetch(`/api/projects/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteProject(id: number) {
  return apiFetch(`/api/projects/${id}`, { method: "DELETE" });
}

export async function archiveProject(id: number) {
  return apiFetch(`/api/projects/${id}/archive`, { method: "POST" });
}

export async function unarchiveProject(id: number) {
  return apiFetch(`/api/projects/${id}/unarchive`, { method: "POST" });
}

export async function copyProject(
  id: number,
  data: {
    name?: string;
    include_boards?: boolean;
    include_cards?: boolean;
  } = {},
) {
  return apiFetch(`/api/projects/${id}/copy`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getProjectMemberCandidates(projectId: number, q = "") {
  const query = q ? `?q=${encodeURIComponent(q)}` : "";
  return apiFetch(`/api/projects/${projectId}/members/candidates${query}`, {
    method: "GET",
  });
}

export async function addProjectMember(
  projectId: number,
  email: string,
  role: "owner" | "member" | "viewer" = "member",
) {
  return apiFetch(`/api/projects/${projectId}/members`, {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });
}

export async function updateProjectMember(
  projectId: number,
  userId: number,
  role: "owner" | "member" | "viewer",
) {
  return apiFetch(`/api/projects/${projectId}/members/${userId}`, {
    method: "PUT",
    body: JSON.stringify({ role }),
  });
}

export async function removeProjectMember(projectId: number, userId: number) {
  return apiFetch(`/api/projects/${projectId}/members/${userId}`, {
    method: "DELETE",
  });
}

// --- Boards ---

export async function deleteBoard(id: number) {
  return apiFetch(`/api/boards/${id}`, { method: "DELETE" });
}

export async function updateBoard(
  id: number,
  data: {
    name?: string;
    type?: "kanban" | "scrum" | "crm";
    currency?: string;
    done_section_id?: number | null;
    description?: string;
    project_id?: number | null;
    ticket_prefix?: string | null;
    next_ticket_number?: number;
    background?: string | null;
    default_permission?: "read" | "write" | "owner";
    github_repo?: string | null;
    github_token?: string | null;
  },
) {
  return apiFetch(`/api/boards/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function archiveBoard(id: number) {
  return apiFetch(`/api/boards/${id}/archive`, { method: "POST" });
}

export async function unarchiveBoard(id: number) {
  return apiFetch(`/api/boards/${id}/unarchive`, { method: "POST" });
}

export async function copyBoard(
  id: number,
  data: { name?: string; include_cards?: boolean } = {},
) {
  return apiFetch(`/api/boards/${id}/copy`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function createBoard(data: {
  name: string;
  description: string;
  project_id?: number | null;
  type?: "kanban" | "scrum" | "crm";
  currency?: string;
}) {
  return apiFetch("/api/boards", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchBoard(id: number, signal?: AbortSignal) {
  return apiFetch(`/api/boards/${id}`, { method: "GET", signal });
}

// --- Sections ---

export async function deleteSection(boardId: number, sectionId: number) {
  return apiFetch(`/api/boards/${boardId}/sections/${sectionId}`, {
    method: "DELETE",
  });
}

export async function createSection(boardId: number, name: string) {
  return apiFetch(`/api/boards/${boardId}/sections`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function updateSection(
  boardId: number,
  sectionId: number,
  data: { name?: string; aging_hours?: number | null },
) {
  return apiFetch(`/api/boards/${boardId}/sections/${sectionId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function reorderSections(boardId: number, sectionIds: number[]) {
  return apiFetch(`/api/boards/${boardId}/sections/reorder`, {
    method: "POST",
    body: JSON.stringify({ section_ids: sectionIds }),
  });
}

// --- Tags ---

export async function createTag(
  boardId: number,
  data: { name: string; color: string },
) {
  return apiFetch(`/api/boards/${boardId}/tags`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTag(
  boardId: number,
  tagId: number,
  data: { name?: string; color?: string },
) {
  return apiFetch(`/api/boards/${boardId}/tags/${tagId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteTag(boardId: number, tagId: number) {
  return apiFetch(`/api/boards/${boardId}/tags/${tagId}`, { method: "DELETE" });
}

// --- Cards ---

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
) {
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
) {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// --- Sprints (scrum) ---

export async function fetchSprints(boardId: number) {
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
) {
  return apiFetch(`/api/boards/${boardId}/sprints`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSprint(
  boardId: number,
  sprintId: number,
  data: {
    name?: string;
    start_date?: string | null;
    end_date?: string | null;
    is_active?: boolean;
  },
) {
  return apiFetch(`/api/boards/${boardId}/sprints/${sprintId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function startSprint(
  boardId: number,
  sprintId: number,
  data: { goal?: string | null; start_date?: string | null; end_date?: string | null } = {},
) {
  return apiFetch(`/api/boards/${boardId}/sprints/${sprintId}/start`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function completeSprint(
  boardId: number,
  sprintId: number,
  data: { move_to: string; new_sprint_name?: string },
) {
  return apiFetch(`/api/boards/${boardId}/sprints/${sprintId}/complete`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getSprintReport(boardId: number, sprintId: number) {
  return apiFetch(`/api/boards/${boardId}/sprints/${sprintId}/report`, {
    method: "GET",
  });
}

export async function deleteSprint(boardId: number, sprintId: number) {
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
) {
  return apiFetch(`/api/boards/${boardId}/cards/reorder`, {
    method: "PUT",
    body: JSON.stringify({ section_id: sectionId, ordered_ids: orderedIds }),
  });
}

export async function deleteCard(boardId: number, cardId: number | string) {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}`, {
    method: "DELETE",
  });
}

export async function restoreCard(boardId: number, cardId: number | string) {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}/restore`, {
    method: "PUT",
  });
}

export async function getArchivedCards(boardId: number) {
  return apiFetch(`/api/boards/${boardId}/cards/archived`);
}

// --- Checklist ---

export async function createChecklistItem(
  boardId: number,
  cardId: number | string,
  text: string,
) {
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
) {
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
) {
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
) {
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
  const data = await apiFetch(`/api/boards/${boardId}/uploads`, {
    method: "POST",
    body: form,
  });
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
) {
  return apiFetch(
    `/api/boards/${boardId}/cards/${cardId}/attachments/${imageId}`,
    { method: "DELETE" },
  );
}

// --- Card GitHub links ---

// Returns the reloaded card (with its `links` array) so the caller can merge it.
export async function addCardLink(
  boardId: number,
  cardId: number | string,
  url: string,
) {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}/links`, {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

export async function refreshCardLink(
  boardId: number,
  cardId: number | string,
  linkId: number,
) {
  return apiFetch(
    `/api/boards/${boardId}/cards/${cardId}/links/${linkId}/refresh`,
    { method: "POST" },
  );
}

export async function deleteCardLink(
  boardId: number,
  cardId: number | string,
  linkId: number,
) {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}/links/${linkId}`, {
    method: "DELETE",
  });
}

// --- Comments ---

export async function getComments(boardId: number, cardId: number | string) {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}/comments`);
}

export async function createComment(
  boardId: number,
  cardId: number | string,
  body: string,
) {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export async function deleteComment(
  boardId: number,
  cardId: number | string,
  commentId: number,
) {
  return apiFetch(
    `/api/boards/${boardId}/cards/${cardId}/comments/${commentId}`,
    { method: "DELETE" },
  );
}

// --- Activity ---

export async function getActivity(boardId: number) {
  return apiFetch(`/api/boards/${boardId}/activity`);
}

// --- Notifications ---

export async function getNotifications() {
  return apiFetch("/api/notifications");
}

export async function markNotificationRead(id: number) {
  return apiFetch(`/api/notifications/${id}/read`, { method: "PUT" });
}

export async function markAllNotificationsRead() {
  return apiFetch("/api/notifications/read-all", { method: "PUT" });
}

// --- Sharing ---

export async function shareBoard(
  boardId: number,
  email: string,
  permission: "read" | "write" | "owner" = "write",
) {
  return apiFetch(`/api/boards/${boardId}/share`, {
    method: "POST",
    body: JSON.stringify({ email, permission }),
  });
}

export async function shareBoardWithUser(
  boardId: number,
  userId: number,
  permission: "read" | "write" | "owner" = "write",
) {
  return apiFetch(`/api/boards/${boardId}/share`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId, permission }),
  });
}

export async function getShareCandidates(boardId: number) {
  return apiFetch(`/api/boards/${boardId}/share/candidates`, { method: "GET" });
}

export async function updateSharePermission(
  boardId: number,
  userId: number,
  permission: "read" | "write" | "owner",
) {
  return apiFetch(`/api/boards/${boardId}/share/${userId}`, {
    method: "PUT",
    body: JSON.stringify({ permission }),
  });
}

export async function unshareBoard(boardId: number, userId: number) {
  return apiFetch(`/api/boards/${boardId}/share/${userId}`, {
    method: "DELETE",
  });
}

// --- Templates ---

export async function getTemplates(boardId: number) {
  return apiFetch(`/api/boards/${boardId}/templates`);
}

export async function createTemplate(
  boardId: number,
  data: { name: string; template_data: object },
) {
  return apiFetch(`/api/boards/${boardId}/templates`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteTemplate(boardId: number, templateId: number) {
  return apiFetch(`/api/boards/${boardId}/templates/${templateId}`, {
    method: "DELETE",
  });
}

// --- Board Chat ---

export async function getBoardMessages(boardId: number) {
  return apiFetch(`/api/boards/${boardId}/messages`);
}

export async function createBoardMessage(boardId: number, body: string) {
  return apiFetch(`/api/boards/${boardId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
}

export async function deleteBoardMessage(boardId: number, messageId: number) {
  return apiFetch(`/api/boards/${boardId}/messages/${messageId}`, {
    method: "DELETE",
  });
}

// --- Subtasks ---

export async function getSubtasks(boardId: number, cardId: number | string) {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}/subtasks`);
}

export async function createSubtask(
  boardId: number,
  cardId: number | string,
  data: { name: string; description?: string },
) {
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
) {
  return apiFetch(
    `/api/boards/${boardId}/cards/${cardId}/subtasks/${subtaskId}`,
    { method: "PUT", body: JSON.stringify(data) },
  );
}

// --- Planning Poker ---

const planningBase = (boardId: number, cardId: number | string) =>
  `/api/boards/${boardId}/cards/${cardId}/planning`;

export async function getPlanning(
  boardId: number,
  cardId: number | string,
  signal?: AbortSignal,
) {
  return apiFetch(planningBase(boardId, cardId), { method: "GET", signal });
}

export async function joinPlanning(boardId: number, cardId: number | string) {
  return apiFetch(`${planningBase(boardId, cardId)}/join`, { method: "POST" });
}

export async function leavePlanning(boardId: number, cardId: number | string) {
  return apiFetch(`${planningBase(boardId, cardId)}/leave`, { method: "POST" });
}

export async function votePlanning(
  boardId: number,
  cardId: number | string,
  value: string,
) {
  return apiFetch(`${planningBase(boardId, cardId)}/vote`, {
    method: "POST",
    body: JSON.stringify({ value }),
  });
}

export async function revealPlanning(boardId: number, cardId: number | string) {
  return apiFetch(`${planningBase(boardId, cardId)}/reveal`, { method: "POST" });
}

export async function resetPlanning(boardId: number, cardId: number | string) {
  return apiFetch(`${planningBase(boardId, cardId)}/reset`, { method: "POST" });
}

export async function applyPlanning(
  boardId: number,
  cardId: number | string,
  value: number,
) {
  return apiFetch(`${planningBase(boardId, cardId)}/apply`, {
    method: "POST",
    body: JSON.stringify({ value }),
  });
}
