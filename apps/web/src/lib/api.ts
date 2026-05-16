'use client';

import type { AuthUser, LoginResponse } from '@oneplace/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const BASE = `${API}/api/v1`;

const TOKEN_KEY = 'oneplace.access';
const REFRESH_KEY = 'oneplace.refresh';
const USER_KEY = 'oneplace.user';

export const tokens = {
  get: () => (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null),
  getRefresh: () => (typeof window !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null),
  set: (access: string, refresh: string) => {
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export const userCache = {
  get: (): AuthUser | null => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  },
  set: (u: AuthUser) => localStorage.setItem(USER_KEY, JSON.stringify(u)),
};

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

async function refresh(): Promise<boolean> {
  const r = tokens.getRefresh();
  if (!r) return false;
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: r }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as LoginResponse;
    tokens.set(data.accessToken, data.refreshToken);
    userCache.set(data.user);
    return true;
  } catch {
    return false;
  }
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = tokens.get();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401 && retry) {
    const ok = await refresh();
    if (ok) return api<T>(path, options, false);
    tokens.clear();
    if (typeof window !== 'undefined') window.location.href = '/login';
  }

  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const errBody = body as { error?: string; message?: string; details?: unknown };
    throw new ApiError(
      res.status,
      errBody.error ?? 'ERROR',
      errBody.message ?? 'Request failed',
      errBody.details,
    );
  }
  return body as T;
}

export const apiGet = <T>(path: string) => api<T>(path);
export const apiPost = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
export const apiPatch = <T>(path: string, body: unknown) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
export const apiDelete = <T>(path: string) => api<T>(path, { method: 'DELETE' });
