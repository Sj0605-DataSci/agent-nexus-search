"use client";

import { ReactNode, useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastContainer } from "react-toastify";
import { Provider as ReduxProvider } from "react-redux";
import { store } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store";
import { setProfileFromAPI } from "@/store/profileSlice";
import { loadAgents } from "@/store/agentsSlice";
import { useRouter } from "next/navigation";
import "react-toastify/dist/ReactToastify.css";
import Sidebar from "@/components/CustomSideBar/Sidebar";
import { usePathname } from "next/navigation";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { AnalyticsProvider } from "@/components/providers/AnalyticsProvider";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import { apiClient } from "@/integrations/fastapi/client";
import posthog from "posthog-js";

function ProfileDataFetcher({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const profile = useAppSelector(state => state.profile.profile);
  const agentsStatus = useAppSelector(state => state.agents.status);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fetchProfileData = async () => {
      const token = localStorage.getItem("discover_minds_access_token");

      if (token && !profile) {
        try {
          posthog.capture("profile_fetch_attempted", {
            source: "ProfileDataFetcher",
            hasToken: true,
          });

          const profileData = await apiClient.fetchProfileFromAPI();
          dispatch(setProfileFromAPI(profileData));

          posthog.capture("profile_fetch_successful", {
            hasProfile: !!profileData,
          });

          if (agentsStatus === "idle") {
            dispatch(loadAgents());
          }

          if (pathname !== "/chat/new") {
            router.push("/chat/new");
          }
        } catch (error) {
          console.error("Error fetching profile data:", error);

          posthog.capture("profile_fetch_error", {
            error: error instanceof Error ? error.message : String(error),
          });

          localStorage.removeItem("discover_minds_access_token");
          localStorage.removeItem("discover_minds_refresh_token");
          router.push("/login");
        }
      } else if (!user && !token && !profile) {
        if (
          pathname !== "/login" &&
          pathname !== "/join-waitlist" &&
          !pathname.startsWith("/reset-password")
        ) {
          router.push("/join-waitlist");
        }
      }
    };

    fetchProfileData();
  }, [user, profile, dispatch, router, pathname, agentsStatus]);

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ReduxProvider store={store}>
        <AuthProvider>
          <ProfileDataFetcher>
            <PostHogProvider>
              <AnalyticsProvider>
                <ToastContainer
                  position="top-right"
                  autoClose={5000}
                  hideProgressBar={false}
                  closeOnClick
                  pauseOnHover
                  limit={4}
                  draggable
                  theme="light"
                />
                <ServiceWorkerRegistration />
                <main>{children}</main>
              </AnalyticsProvider>
            </PostHogProvider>
          </ProfileDataFetcher>
        </AuthProvider>
      </ReduxProvider>
    </QueryClientProvider>
  );
}
