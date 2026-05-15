'use client';

import { create } from 'zustand';
import type { AuthUser, LoginResponse } from '@oneplace/types';
import { apiPost, tokens, userCache } from './api';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  init: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,
  init: () => {
    const cached = userCache.get();
    set({ user: cached, initialized: true });
  },
  login: async (email, password) => {
    set({ loading: true });
    try {
      const res = await apiPost<LoginResponse>('/auth/login', { email, password });
      tokens.set(res.accessToken, res.refreshToken);
      userCache.set(res.user);
      set({ user: res.user });
    } finally {
      set({ loading: false });
    }
  },
  logout: async () => {
    try {
      await apiPost('/auth/logout', { refreshToken: tokens.getRefresh() });
    } catch {
      // ignore
    }
    tokens.clear();
    set({ user: null });
    if (typeof window !== 'undefined') window.location.href = '/login';
  },
}));
