function getCookie(name: string): string | null {
  const v = `; ${document.cookie}`;
  const p = v.split(`; ${name}=`);
  if (p.length === 2) return decodeURIComponent(p.pop()!.split(';').shift()!);
  return null;
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

export async function createCard(boardId: number, data: { section_id: number; name: string; description: string }) {
  return apiFetch(`/api/boards/${boardId}/cards`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCard(boardId: number, cardId: number, data: { section_id?: number; name?: string; description?: string }) {
  return apiFetch(`/api/boards/${boardId}/cards/${cardId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const url = `${process.env.NEXT_PUBLIC_API}${path}`;
  const method = (options.method ?? 'GET').toUpperCase();

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (method !== 'GET' && method !== 'HEAD') {
    if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const xsrf = getCookie('XSRF-TOKEN');
    if (xsrf) headers['X-XSRF-TOKEN'] = xsrf;
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }

  const res = await fetch(url, { ...options, headers, credentials: 'include' });

  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`API ERROR: ${res.status} ${await res.text()}`);
  return res.json().catch(() => ({}));
}