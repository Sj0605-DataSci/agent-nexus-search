import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { supabase } from "@/integrations/supabase/client";

// Create Axios instance
const baseURL =
  process.env.NODE_ENV === "production"
    ? process.env.NEXT_PUBLIC_BASE_URL
    : process.env.NEXT_PUBLIC_STAGING_BASE_URL;

const axiosInstance = axios.create({
  baseURL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

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

axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("discover_minds_access_token");

      if (storedToken) {
        config.headers["Authorization"] = `Bearer ${storedToken}`;
      } else {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) {
          config.headers["Authorization"] = `Bearer ${token}`;
        }
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

    if (error.response?.status === 403) {
      console.error("Access forbidden (403):", error.response.data);
      if (typeof window !== "undefined") {
        localStorage.removeItem("discover_minds_access_token");
        localStorage.removeItem("discover_minds_refresh_token");
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }

    const unauthenticatedEndpoints = [
      "/login",
      "/user-auth",
      "/pricing",
      "/signup",
      "/join-waitlist",
      "/privacy-policy",
      "/terms",
      "/reset-password",
    ];
    const isUnauthenticatedEndpoint = unauthenticatedEndpoints.some(path =>
      originalRequest.url?.includes(path)
    );

    if (error.response?.status === 401 && !originalRequest._retry && !isUnauthenticatedEndpoint) {
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
        const refreshToken = localStorage.getItem("discover_minds_refresh_token");
        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        const { data } = await axios.post(`${baseURL}/auth/refresh_token`, {
          refresh_token: refreshToken,
        });

        if (!data.success || !data.data || !data.data.access_token || !data.data.refresh_token) {
          throw new Error("Invalid refresh token response");
        }

        const newAccessToken = data.data.access_token;
        const newRefreshToken = data.data.refresh_token;
        if (typeof window !== "undefined") {
          localStorage.setItem("discover_minds_access_token", newAccessToken);
          localStorage.setItem("discover_minds_refresh_token", newRefreshToken);
        }

        await supabase.auth.setSession({
          access_token: newAccessToken,
          refresh_token: newRefreshToken,
        });

        axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        processQueue(refreshError, null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("discover_minds_access_token");
          localStorage.removeItem("discover_minds_refresh_token");
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    if (process.env.NODE_ENV === "development") {
      console.debug("❌ Error:", error.response?.status, error.response?.data);
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
