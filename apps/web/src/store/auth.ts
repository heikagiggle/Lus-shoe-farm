'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile } from '@lsf/shared-types';
import { api, ApiError } from '@/lib/api';

interface AuthState {
  token: string | null; user: Profile | null
  setSession: (token: string, user: Profile) => void
  setUser: (u: Profile) => void
  logout: () => void
  refresh: () => Promise<void>
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null, user: null,
      setSession: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
      // Validates the stored session on page load; a revoked/expired token signs the customer out.
      refresh: async () => {
        if (!get().token) return;
        try { set({ user: await cust<Profile>('/user/profile') }); } catch {}
      },
    }),
    { name: 'lsf-auth' },
  ),
);

/** Authenticated customer API call. A 401 means the session ended, so the client signs out. */
export async function cust<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    return await api<T>(path, { ...init, token: useAuth.getState().token ?? undefined });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) useAuth.getState().logout();
    throw e;
  }
}

