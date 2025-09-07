"use client";

import { ReactNode, useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastContainer } from "react-toastify";
import { Provider as ReduxProvider } from "react-redux";
import { store } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store";
import { fetchProfile } from "@/store/profileSlice";
import { fetchAgentTemplates, fetchHiredAgents } from "@/store/agentsSlice";
import { useRouter } from "next/navigation";
import "react-toastify/dist/ReactToastify.css";
import { usePathname } from "next/navigation";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { AnalyticsProvider } from "@/components/providers/AnalyticsProvider";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import posthog from "posthog-js";
import { ThemeProvider } from "next-themes";
import { Toaster } from "react-hot-toast";
import { supabaseHandler } from "./supabaseClient";
import { Session } from "@supabase/supabase-js";
// import { ClerkProvider } from "@clerk/nextjs";
function ProfileDataFetcher({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const profile = useAppSelector(state => state.profile.profile);
  const agentsStatus = useAppSelector(state => state.agents.status);
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabaseHandler.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabaseHandler.auth.onAuthStateChange(async (event, session) => {
      setSession(session);

      if (event === "TOKEN_REFRESHED" && session) {
        localStorage.setItem("discover_minds_access_token", session.access_token);
        localStorage.setItem("discover_minds_refresh_token", session.refresh_token);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchProfileData = async () => {
      const token =
        localStorage.getItem("discover_minds_access_token") || session?.access_token || "";

      if (token && !profile) {
        try {
          posthog.capture("profile_fetch_attempted", {
            source: "ProfileDataFetcher",
            hasToken: true,
          });

          const profileResult = await dispatch(fetchProfile()).unwrap();

          if (profileResult.success && profileResult.status_code === 200) {
            posthog.capture("profile_fetch_successful", {
              hasProfile: !!profileResult.data,
            });

            try {
              await Promise.all([
                dispatch(fetchAgentTemplates()).unwrap(),
                dispatch(fetchHiredAgents()).unwrap(),
              ]);
            } catch (agentError) {}
          } else {
            throw new Error(profileResult.message || "Failed to fetch profile");
          }
        } catch (error) {
          posthog.capture("profile_fetch_error", {
            error: error instanceof Error ? error.message : String(error),
          });

          localStorage.removeItem("discover_minds_access_token");
          localStorage.removeItem("discover_minds_refresh_token");
        }
      } else if (profile && agentsStatus === "idle") {
        try {
          await Promise.all([
            dispatch(fetchAgentTemplates()).unwrap(),
            dispatch(fetchHiredAgents()).unwrap(),
          ]);
        } catch (agentError) {
          console.error("Error fetching agent data after refresh:", agentError);
        }
      }
    };

    fetchProfileData();
  }, [user, profile, dispatch, router, pathname, agentsStatus]);

  useEffect(() => {
    const handleGoogleAuth = async () => {
      if (typeof window !== "undefined" && window.location.hash) {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          localStorage.setItem("discover_minds_access_token", accessToken);
          localStorage.setItem("discover_minds_refresh_token", refreshToken);

          await supabaseHandler.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          window.history.replaceState({}, document.title, window.location.pathname);

          if (profile) {
            dispatch(fetchProfile());
          }
        }
      }
    };

    handleGoogleAuth();
  }, [dispatch, profile]);

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ReduxProvider store={store}>
        <ThemeProvider attribute="class" forcedTheme="light">
          {/* <ClerkProvider> */}
            <AuthProvider>
              <Toaster position="top-center" reverseOrder={false} />
              <ProfileDataFetcher>
                <PostHogProvider>
                  <AnalyticsProvider>
                    {isMounted && (
                      <>
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
                      </>
                    )}
                    <main>{children}</main>
                  </AnalyticsProvider>
                </PostHogProvider>
              </ProfileDataFetcher>
            </AuthProvider>
          {/* </ClerkProvider> */}
        </ThemeProvider>
      </ReduxProvider>
    </QueryClientProvider>
  );
}
