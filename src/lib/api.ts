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

export async function deleteBoard(id: number) {
  return apiFetch(`/api/boards/${id}`, { method: 'DELETE' });
}

export async function createBoard(data: { name: string; description: string }) {
  return apiFetch('/api/boards', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchBoard(id: number) {
  return apiFetch(`/api/boards/${id}`, { method: 'GET' });
}

export async function deleteSection(boardId: number, sectionId: number) {
  return apiFetch(`/api/boards/${boardId}/sections/${sectionId}`, { method: 'DELETE' });
}

export async function createSection(boardId: number, name: string) {
  return apiFetch(`/api/boards/${boardId}/sections`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function updateSection(boardId: number, sectionId: number, name: string) {
  return apiFetch(`/api/boards/${boardId}/sections/${sectionId}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
}

export async function createTag(boardId: number, data: { name: string; color: string }) {
  return apiFetch(`/api/boards/${boardId}/tags`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteTag(boardId: number, tagId: number) {
  return apiFetch(`/api/boards/${boardId}/tags/${tagId}`, { method: 'DELETE' });
}

export async function createCard(boardId: number, data: { section_id: number; assigned_user_id?: number | null; tag_ids?: number[]; name: string; description: string }) {
  return apiFetch(`/api/boards/${boardId}/cards`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCard(boardId: number, cardId: number, data: { section_id?: number; assigned_user_id?: number | null; tag_ids?: number[]; name?: string; description?: string }) {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function shareBoard(boardId: number, email: string) {
  return apiFetch(`/api/boards/${boardId}/share`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function unshareBoard(boardId: number, userId: number) {
  return apiFetch(`/api/boards/${boardId}/share/${userId}`, {
    method: 'DELETE',
  });
}
