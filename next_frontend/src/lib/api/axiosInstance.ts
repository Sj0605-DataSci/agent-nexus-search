import axios, { AxiosError, InternalAxiosRequestConfig, AxiosRequestConfig } from "axios";
import { supabase } from "@/integrations/supabase/client";
import { getStoredToken, saveTokens, clearTokens, getRefreshToken } from "@/utils/tokenManagement";
import { getDeviceInfo } from "@/utils/deviceInfo";
import toast from "react-hot-toast";

const baseURL =
  process.env.NODE_ENV === "production"
    ? process.env.NEXT_PUBLIC_BASE_URL
    : process.env.NEXT_PUBLIC_STAGING_BASE_URL;

const axiosInstance = axios.create({
  baseURL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

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
    try {
      if (typeof window !== "undefined") {
        const storedToken = getStoredToken();

        if (storedToken) {
          config.headers["Authorization"] = `Bearer ${storedToken}`;
        } else {
          try {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;
            if (token) {
              config.headers["Authorization"] = `Bearer ${token}`;
              if (typeof window !== "undefined") {
                localStorage.setItem("discover_minds_access_token", token);
                if (data.session?.refresh_token) {
                  localStorage.setItem("discover_minds_refresh_token", data.session.refresh_token);
                }
              }
            }
          } catch (supabaseError) {
            console.error("Failed to get Supabase session:", supabaseError);
          }
        }

        try {
          const info = await getDeviceInfo({ skipIpLookup: false });
          config.headers["X-Device-ID"] = info.deviceId;
          config.headers["X-Device-Type"] = info.deviceType;
          if (info.ipAddress) {
            config.headers["X-Client-IP"] = info.ipAddress;
          }
        } catch (err) {
          console.warn("Could not get device info:", err);
        }
      }

      if (process.env.NODE_ENV === "development") {
        console.debug("➡️ Request:", config.method?.toUpperCase(), config.url);
      }
      return config;
    } catch (error) {
      console.error("Error in request interceptor:", error);
      return config;
    }
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
    if (!error.config) {
      console.error("Axios error without config:", error);
      return Promise.reject(error);
    }

    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (!error.response) {
      console.error("Network error or timeout:", error.message);
      return Promise.reject(error);
    }

    if (error.response?.status === 429) {
      console.error("Rate limit exceeded (429):", error.response.data);

      try {
        if (typeof window !== "undefined") {
          let errorMessage = "You've reached the maximum number of free searches.";

          const responseData = error.response.data as any;
          if (responseData && typeof responseData === "object" && responseData.message) {
            errorMessage = responseData.message;
          }

          toast.error(errorMessage, {
            id: "rate-limit-error",
            duration: 5000,
          });
        }
      } catch (toastError) {
        console.error("Error showing toast notification:", toastError);
      }

      return Promise.reject(error);
    }

    if (error.response?.status === 403) {
      console.error("Access forbidden (403):", error.response.data);
      if (typeof window !== "undefined") {
        clearTokens();
        setTimeout(() => {
          window.location.href = "/user-auth";
        }, 100);
      }
      return Promise.reject(error);
    }

    const unauthenticatedEndpoints = [
      "/login",
      "/user-auth",
      "/pricing",
      "/signup",
      "/",
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
            if (token && originalRequest.headers) {
              originalRequest.headers["Authorization"] = `Bearer ${token}`;
            }
            return axiosInstance(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = getRefreshToken();

        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        const refreshRequest = axios.create({
          timeout: 10000,
        });

        const { data } = await refreshRequest.post(`${baseURL}/auth/refresh_token`, {
          refresh_token: refreshToken,
        });

        if (!data.success || !data.data || !data.data.access_token || !data.data.refresh_token) {
          throw new Error("Invalid refresh token response");
        }

        const newAccessToken = data.data.access_token;
        const newRefreshToken = data.data.refresh_token;

        saveTokens(newAccessToken, newRefreshToken);

        try {
          await supabase.auth.setSession({
            access_token: newAccessToken,
            refresh_token: newRefreshToken,
          });
        } catch (supabaseError) {
          console.error("Failed to update Supabase session:", supabaseError);
        }

        axiosInstance.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;

        if (originalRequest.headers) {
          originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken);

        return axiosInstance(originalRequest);
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        processQueue(refreshError, null);

        if (typeof window !== "undefined") {
          clearTokens();
          setTimeout(() => {
            window.location.href = "/user-auth";
          }, 100);
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

export const resetAxiosInstanceState = () => {
  isRefreshing = false;
  failedQueue = [];
  delete axiosInstance.defaults.headers.common["Authorization"];
};

export default axiosInstance;
