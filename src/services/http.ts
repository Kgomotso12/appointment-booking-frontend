import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL;

if (!baseURL) {
  throw new Error('VITE_API_BASE_URL is not defined in your environment');
}

export const http: AxiosInstance = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const data = error.response?.data;

    let message = 'Request failed';

    if (typeof data === 'string') {
      message = data;
    } else if (data && typeof data === 'object') {
      const record = data as Record<string, unknown>;

      if (typeof record.message === 'string') {
        message = record.message;
      } else if (typeof record.error === 'string') {
        message = record.error;
      }
    } else if (error.message) {
      message = error.message;
    }

    (error as AxiosError & { friendlyMessage?: string }).friendlyMessage = message;

    return Promise.reject(error);
  },
);
