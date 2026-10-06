import { api, ApiError } from './api';

const KEY = 'lsf-admin-token';
export const getToken = () => (typeof window === 'undefined' ? null : localStorage.getItem(KEY));
export const setToken = (t: string) => localStorage.setItem(KEY, t);
export const clearToken = () => localStorage.removeItem(KEY);

/** Authenticated admin call; bounces to /admin/login when the token is missing/expired. */
export async function adm<T>(path: string, init: RequestInit = {}): Promise<T> {
  // paths starting with "~" skip the /admin prefix (e.g. "~/notifications")
  const url = path.startsWith('~') ? path.slice(1) : `/admin${path}`;
  try {
    return await api<T>(url, { ...init, token: getToken() ?? undefined });
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
      clearToken();
      if (typeof window !== 'undefined') window.location.href = '/admin/login';
    }
    throw e;
  }
}
export const body = (b: unknown) => JSON.stringify(b);
