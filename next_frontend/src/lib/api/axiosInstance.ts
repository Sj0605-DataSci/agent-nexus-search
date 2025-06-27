import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { supabase } from "@/integrations/supabase/client";

// Create Axios instance
const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL || "/api",
  timeout: 10000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
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
    if (typeof window !== "undefined") {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    }
    if (process.env.NODE_ENV === "development") {
      console.debug("➡️ Request:", config.method?.toUpperCase(), config.url);
    }
    return config;
  },
  error => Promise.reject(error)
);

// Response interceptor
axiosInstance.interceptors.response.use(
  response => {
    if (process.env.NODE_ENV === "development") {
      console.debug("✅ Response:", response.config.url, response.status);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest: any = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers["Authorization"] = "Bearer " + token;
            return axiosInstance(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_BASE_URL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = data.access_token;
        const newRefreshToken = data.refresh_token;

        await supabase.auth.setSession({
          access_token: newAccessToken,
          refresh_token: newRefreshToken,
        });

        axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// // Retry logic for network/server errors
// axiosRetry(axiosInstance, {
//   retries: 3,
//   retryDelay: axiosRetry.exponentialDelay,
//   retryCondition: (error: { response: { status: number } }) =>
//     axiosRetry.isNetworkOrIdempotentRequestError(error) ||
//     error.response?.status === 500,
// });

export default axiosInstance;
