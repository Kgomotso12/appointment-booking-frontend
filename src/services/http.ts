import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';
import { getRouter } from 'src/router/router-instance';
import { useAuthStore } from 'src/stores/authStore';

const baseURL = import.meta.env.VITE_API_BASE_URL;

if (!baseURL) {
  throw new Error('VITE_API_BASE_URL is not defined in your environment');
}

export type ApiErrorKind =
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'network'
  | 'unknown';

export type FriendlyAxiosError = AxiosError & {
  friendlyMessage?: string;
  kind?: ApiErrorKind;
};

export const http: AxiosInstance = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

http.interceptors.request.use((config) => {
  // Prefer Pinia auth store (single source of truth), fallback to legacy localStorage key
  const auth = useAuthStore();
  const token = auth.token || localStorage.getItem('access_token');

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const ax = error as FriendlyAxiosError;

    // Network error (no response)
    if (!error.response) {
      ax.kind = 'network';
      ax.friendlyMessage = error.message || 'Network error. Please try again.';
      return Promise.reject(ax);
    }

    const status = error.response.status;
    const data = error.response.data;

    // Derive a friendly message from backend response
    let message = `Request failed (${status})`;

    if (typeof data === 'string') {
      message = data;
    } else if (data && typeof data === 'object') {
      const record = data as Record<string, unknown>;
      if (typeof record.message === 'string') message = record.message;
      else if (typeof record.error === 'string') message = record.error;
    } else if (error.message) {
      message = error.message;
    }

    ax.friendlyMessage = message;

    // Map status → kind (used by UI + logic)
    if (status === 400 || status === 422) ax.kind = 'validation';
    else if (status === 401) ax.kind = 'unauthorized';
    else if (status === 403) ax.kind = 'forbidden';
    else if (status === 404) ax.kind = 'not_found';
    else if (status === 409) ax.kind = 'conflict';
    else ax.kind = 'unknown';

    if (status === 401) {
      const auth = useAuthStore();
      auth.logout();

      const router = getRouter();

      if (router) {
        const current = router.currentRoute.value;

        if (current.path !== '/login') {
          await router.replace({
            path: '/login',
            query: { redirect: current.fullPath, reason: 'expired' },
          });
        }
      } else {
        // Fallback if router not initialized yet
        window.location.hash = '#/login';
      }
    }

    return Promise.reject(ax);
  },
);
