import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosRequestConfig,
} from 'axios';
import {
  getStoredToken,
  saveTokens,
  clearTokens,
  getRefreshToken,
} from '../../utils/tokenManagement';
import { getDeviceInfo } from '../../utils/deviceInfo';

// Use NODE_ENV to determine which backend to use
// IMPORTANT: When building (npm run package:*), NODE_ENV is set to 'production'
// So make sure your .env has the correct API_BASE_URL for production builds
const baseURL =
  process.env.NODE_ENV === 'production'
    ? process.env.API_BASE_URL || 'https://staging-apis.discoverminds.ai/api'
    : process.env.STAGING_API_BASE_URL || 'http://localhost:8000/api';

const axiosInstance = axios.create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Required for CORS with credentials
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor
axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      // Get token from localStorage if available
      const storedToken = getStoredToken();

      if (storedToken) {
        config.headers['Authorization'] = `Bearer ${storedToken}`;
      }

      // Add device info headers
      try {
        const info = await getDeviceInfo({ skipIpLookup: false });
        config.headers['X-Device-ID'] = info.deviceId;
        config.headers['X-Device-Type'] = info.deviceType;
        if (info.ipAddress) {
          config.headers['X-Client-IP'] = info.ipAddress;
        }
      } catch (err) {
        console.warn('Could not get device info:', err);
      }

      console.debug('➡️ Request:', config.method?.toUpperCase(), config.url);
      return config;
    } catch (error) {
      console.error('Error in request interceptor:', error);
      return config;
    }
  },
  (error) => Promise.reject(error),
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    console.debug('✅ Response:', response.config.url, response.status);
    return response;
  },
  async (error: AxiosError) => {
    if (!error.config) {
      console.error('Axios error without config:', error);
      return Promise.reject(error);
    }

    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    if (!error.response) {
      console.error('Network error or timeout:', error.message);
      return Promise.reject(error);
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.error('Access forbidden (403):', error.response.data);
      clearTokens();
      return Promise.reject(error);
    }

    // Define unauthenticated endpoints that should not attempt token refresh
    const unauthenticatedEndpoints = [
      '/auth/login',
      '/auth/register',
      '/auth/signup',
      '/auth/reset-password',
      '/auth/forgot-password',
    ];

    const isUnauthenticatedEndpoint = unauthenticatedEndpoints.some((path) =>
      originalRequest.url?.includes(path),
    );

    // Handle 401 Unauthorized with token refresh
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isUnauthenticatedEndpoint
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (token && originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
            }
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = getRefreshToken();

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const refreshRequest = axios.create({
          timeout: 10000,
        });

        const { data } = await refreshRequest.post(
          `${baseURL}/auth/refresh_token`,
          {
            refresh_token: refreshToken,
          },
        );

        if (
          !data.success ||
          !data.data ||
          !data.data.access_token ||
          !data.data.refresh_token
        ) {
          throw new Error('Invalid refresh token response');
        }

        const newAccessToken = data.data.access_token;
        const newRefreshToken = data.data.refresh_token;

        saveTokens(newAccessToken, newRefreshToken);

        axiosInstance.defaults.headers.common['Authorization'] =
          `Bearer ${newAccessToken}`;

        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken);

        return axiosInstance(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        processQueue(refreshError, null);

        clearTokens();

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    console.error('❌ Error:', error.config.url, error.response?.status);
    return Promise.reject(error);
  },
);

export const resetAxiosInstanceState = () => {
  isRefreshing = false;
  failedQueue = [];
  delete axiosInstance.defaults.headers.common['Authorization'];
};

export default axiosInstance;
