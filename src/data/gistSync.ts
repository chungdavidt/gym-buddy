export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export const GIST_FILE_NAME = 'gym-buddy-data.json';
const GIST_DESCRIPTION = 'gym-buddy data';
const API = 'https://api.github.com';

interface GistFile {
  content?: string;
}
interface GistResponse {
  id: string;
  updated_at: string;
  files: Record<string, GistFile>;
}

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

function classifyStatus(status: number): string {
  if (status === 401) return 'Invalid token';
  // 403 on /gists is almost always a fine-grained PAT or a token missing
  // the gist scope — fine-grained PATs don't support the Gists API at all.
  // Rate-limit 403s surface with the same wording but are vanishingly rare
  // at gym-buddy's request volume.
  if (status === 403) return 'Forbidden — use a classic PAT with gist scope';
  if (status === 404) return 'Gist not found';
  if (status === 422) return 'GitHub rejected the request (422)';
  if (status >= 500) return `GitHub error (${status})`;
  return `HTTP ${status}`;
}

function buildBody(content: string): string {
  return JSON.stringify({
    description: GIST_DESCRIPTION,
    public: false,
    files: {
      [GIST_FILE_NAME]: { content },
    },
  });
}

export async function createGist(
  token: string,
  content: string,
): Promise<Result<{ id: string; updatedAt: string }>> {
  let res: Response;
  try {
    res = await fetch(`${API}/gists`, {
      method: 'POST',
      headers: authHeaders(token),
      body: buildBody(content),
    });
  } catch {
    return { ok: false, error: 'Network error' };
  }
  if (!res.ok) return { ok: false, error: classifyStatus(res.status) };
  let data: GistResponse;
  try {
    data = (await res.json()) as GistResponse;
  } catch {
    return { ok: false, error: 'Invalid response from GitHub' };
  }
  if (!data.id) return { ok: false, error: 'GitHub response missing gist id' };
  return { ok: true, value: { id: data.id, updatedAt: data.updated_at } };
}

export async function updateGist(
  token: string,
  gistId: string,
  content: string,
): Promise<Result<{ updatedAt: string }>> {
  let res: Response;
  try {
    res = await fetch(`${API}/gists/${encodeURIComponent(gistId)}`, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: buildBody(content),
    });
  } catch {
    return { ok: false, error: 'Network error' };
  }
  if (!res.ok) return { ok: false, error: classifyStatus(res.status) };
  let data: GistResponse;
  try {
    data = (await res.json()) as GistResponse;
  } catch {
    return { ok: false, error: 'Invalid response from GitHub' };
  }
  return { ok: true, value: { updatedAt: data.updated_at } };
}

export async function readGist(
  token: string,
  gistId: string,
): Promise<Result<{ content: string; updatedAt: string }>> {
  let res: Response;
  try {
    res = await fetch(`${API}/gists/${encodeURIComponent(gistId)}`, {
      method: 'GET',
      headers: authHeaders(token),
    });
  } catch {
    return { ok: false, error: 'Network error' };
  }
  if (!res.ok) return { ok: false, error: classifyStatus(res.status) };
  let data: GistResponse;
  try {
    data = (await res.json()) as GistResponse;
  } catch {
    return { ok: false, error: 'Invalid response from GitHub' };
  }
  const file = data.files?.[GIST_FILE_NAME];
  if (!file || typeof file.content !== 'string') {
    return { ok: false, error: `Gist missing ${GIST_FILE_NAME}` };
  }
  return {
    ok: true,
    value: { content: file.content, updatedAt: data.updated_at },
  };
}
