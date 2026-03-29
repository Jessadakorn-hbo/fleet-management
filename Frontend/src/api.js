import axios from 'axios';
import { clearAccessToken, getAccessToken, setAccessToken } from './auth';

const baseURL = 'http://localhost:5000';

const api = axios.create({
  baseURL,
  withCredentials: true,
});

const authClient = axios.create({
  baseURL,
  withCredentials: true,
});

let refreshPromise = null;

export async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = authClient
      .post('/auth/refresh')
      .then((response) => {
        const nextAccessToken = response.data.accessToken;
        setAccessToken(nextAccessToken);
        return nextAccessToken;
      })
      .catch((error) => {
        clearAccessToken();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestPath = originalRequest?.url || '';
    const shouldSkipRefresh =
      requestPath.includes('/auth/login') || requestPath.includes('/auth/refresh');

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !shouldSkipRefresh
    ) {
      originalRequest._retry = true;

      try {
        const nextAccessToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        clearAccessToken();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 401 && requestPath.includes('/auth/refresh')) {
      clearAccessToken();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
