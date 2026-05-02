export async function apiFetch(path: string, options: RequestInit = {}) {
  const url = `${process.env.NEXT_PUBLIC_API}${path}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const token = localStorage.getItem('token');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });

  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`API ERROR: ${res.status} ${await res.text()}`);
  return res.json().catch(() => ({}));
}

// --- Boards ---

export async function deleteBoard(id: number) {
  return apiFetch(`/api/boards/${id}`, { method: 'DELETE' });
}

export async function createBoard(data: { name: string; description: string }) {
  return apiFetch('/api/boards', { method: 'POST', body: JSON.stringify(data) });
}

export async function fetchBoard(id: number) {
  return apiFetch(`/api/boards/${id}`, { method: 'GET' });
}

// --- Sections ---

export async function deleteSection(boardId: number, sectionId: number) {
  return apiFetch(`/api/boards/${boardId}/sections/${sectionId}`, { method: 'DELETE' });
}

export async function createSection(boardId: number, name: string) {
  return apiFetch(`/api/boards/${boardId}/sections`, { method: 'POST', body: JSON.stringify({ name }) });
}

export async function updateSection(boardId: number, sectionId: number, name: string) {
  return apiFetch(`/api/boards/${boardId}/sections/${sectionId}`, { method: 'PUT', body: JSON.stringify({ name }) });
}

// --- Tags ---

export async function createTag(boardId: number, data: { name: string; color: string }) {
  return apiFetch(`/api/boards/${boardId}/tags`, { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteTag(boardId: number, tagId: number) {
  return apiFetch(`/api/boards/${boardId}/tags/${tagId}`, { method: 'DELETE' });
}

// --- Cards ---

export async function createCard(boardId: number, data: {
  section_id: number;
  assigned_user_id?: number | null;
  tag_ids?: number[];
  name: string;
  description: string;
  due_date?: string | null;
  priority?: string | null;
}) {
  return apiFetch(`/api/boards/${boardId}/cards`, { method: 'POST', body: JSON.stringify(data) });
}

export async function updateCard(boardId: number, cardId: number | string, data: {
  section_id?: number;
  assigned_user_id?: number | null;
  tag_ids?: number[];
  name?: string;
  description?: string;
  due_date?: string | null;
  priority?: string | null;
  position?: number;
}) {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function deleteCard(boardId: number, cardId: number | string) {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}`, { method: 'DELETE' });
}

export async function restoreCard(boardId: number, cardId: number | string) {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}/restore`, { method: 'PUT' });
}

export async function getArchivedCards(boardId: number) {
  return apiFetch(`/api/boards/${boardId}/cards/archived`);
}

// --- Checklist ---

export async function createChecklistItem(boardId: number, cardId: number | string, text: string) {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}/checklist`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export async function updateChecklistItem(boardId: number, cardId: number | string, itemId: number, data: { text?: string; is_done?: boolean }) {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}/checklist/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteChecklistItem(boardId: number, cardId: number | string, itemId: number) {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}/checklist/${itemId}`, { method: 'DELETE' });
}

// --- Comments ---

export async function getComments(boardId: number, cardId: number | string) {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}/comments`);
}

export async function createComment(boardId: number, cardId: number | string, body: string) {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

export async function deleteComment(boardId: number, cardId: number | string, commentId: number) {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}/comments/${commentId}`, { method: 'DELETE' });
}

// --- Activity ---

export async function getActivity(boardId: number) {
  return apiFetch(`/api/boards/${boardId}/activity`);
}

// --- Notifications ---

export async function getNotifications() {
  return apiFetch('/api/notifications');
}

export async function markNotificationRead(id: number) {
  return apiFetch(`/api/notifications/${id}/read`, { method: 'PUT' });
}

export async function markAllNotificationsRead() {
  return apiFetch('/api/notifications/read-all', { method: 'PUT' });
}

// --- Sharing ---

export async function shareBoard(boardId: number, email: string, permission: 'read' | 'write' = 'write') {
  return apiFetch(`/api/boards/${boardId}/share`, { method: 'POST', body: JSON.stringify({ email, permission }) });
}

export async function updateSharePermission(boardId: number, userId: number, permission: 'read' | 'write') {
  return apiFetch(`/api/boards/${boardId}/share/${userId}`, { method: 'PUT', body: JSON.stringify({ permission }) });
}

export async function unshareBoard(boardId: number, userId: number) {
  return apiFetch(`/api/boards/${boardId}/share/${userId}`, { method: 'DELETE' });
}

// --- Templates ---

export async function getTemplates(boardId: number) {
  return apiFetch(`/api/boards/${boardId}/templates`);
}

export async function createTemplate(boardId: number, data: { name: string; template_data: object }) {
  return apiFetch(`/api/boards/${boardId}/templates`, { method: 'POST', body: JSON.stringify(data) });
}

export async function deleteTemplate(boardId: number, templateId: number) {
  return apiFetch(`/api/boards/${boardId}/templates/${templateId}`, { method: 'DELETE' });
}

// --- Subtasks ---

export async function getSubtasks(boardId: number, cardId: number | string) {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}/subtasks`);
}

export async function createSubtask(boardId: number, cardId: number | string, data: { name: string; description?: string }) {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}/subtasks`, { method: 'POST', body: JSON.stringify(data) });
}

export async function updateSubtask(boardId: number, cardId: number | string, subtaskId: number, data: { is_done?: boolean; name?: string }) {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}/subtasks/${subtaskId}`, { method: 'PUT', body: JSON.stringify(data) });
}
