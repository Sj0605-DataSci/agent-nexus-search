"use client";

import { ReactNode, useState, useEffect, useCallback } from "react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider as ReduxProvider } from "react-redux";
import { store } from "@/store";
import { useAppDispatch, useAppSelector } from "@/store";
import { fetchProfile } from "@/store/profileSlice";
import { fetchAgentTemplates, fetchHiredAgents } from "@/store/agentsSlice";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { AnalyticsProvider } from "@/components/providers/AnalyticsProvider";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import posthog from "posthog-js";
import { ThemeProvider } from "next-themes";
import { Toaster } from "react-hot-toast";
import { supabaseHandler } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { resetAxiosInstanceState } from "@/lib/api/axiosInstance";
import toast from "react-hot-toast";
import { ErrorBoundary } from "react-error-boundary";
import { saveTokens, clearTokens, getStoredToken } from "@/utils/tokenManagement";
import { ErrorFallback } from "@/components/ErrorHandling/ErrorFallback";
import { logError } from "@/utils/errorLogging";
import { identifyPostHogUser, setPostHogGuest } from "@/utils/posthog-helpers";
// import { ClerkProvider } from "@clerk/nextjs";

function ProfileDataFetcher({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const profile = useAppSelector(state => state.profile.profile);
  const agentsStatus = useAppSelector(state => state.agents.status);
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      try {
        const { data, error } = await supabaseHandler.auth.getSession();

        if (error) {
          console.error("Error getting session:", error);
          return;
        }

        if (isMounted && data.session) {
          setSession(data.session);

          if (data.session.access_token && data.session.refresh_token) {
            saveTokens(data.session.access_token, data.session.refresh_token);
          }
        }
      } catch (error) {
        console.error("Failed to initialize session:", error);
      } finally {
        if (isMounted) {
          setIsInitialized(true);
        }
      }
    };

    initSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const {
      data: { subscription },
    } = supabaseHandler.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      if (newSession) {
        setSession(newSession);
      } else if (event === "SIGNED_OUT") {
        setSession(null);
        clearTokens();
        resetAxiosInstanceState();
      }

      if (event === "TOKEN_REFRESHED" && newSession) {
        saveTokens(newSession.access_token, newSession.refresh_token);
        toast.success("Session refreshed", { id: "session-refresh" });
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfileData = useCallback(async () => {
    if (!isInitialized) return;

    const token = getStoredToken() || session?.access_token || "";

    // Handle guest user tracking if no token or profile is available
    if (!token && !profile) {
      setPostHogGuest();
    } else if (token && !profile) {
      try {
        posthog.capture("profile_fetch_attempted", {
          source: "ProfileDataFetcher",
          hasToken: !!token,
          sessionExists: !!session,
        });

        const profileResult = await dispatch(fetchProfile()).unwrap();

        if (profileResult.success && profileResult.status_code === 200) {
          const profileData = profileResult.data;

          // Properly identify user and set person properties
          identifyPostHogUser(null, profileData);

          posthog.capture("login_successful", {
            userId: profileData.id,
            hasConnections: profileData.has_connections,
          });

          posthog.capture("profile_fetch_successful", {
            hasProfile: !!profileResult.data,
          });

          try {
            await Promise.all([
              dispatch(fetchAgentTemplates()).unwrap(),
              dispatch(fetchHiredAgents()).unwrap(),
            ]);
          } catch (agentError) {
            console.error("Error fetching agent data:", agentError);
          }
        } else {
          throw new Error(profileResult.message || "Failed to fetch profile");
        }
      } catch (error) {
        console.error("Profile fetch error:", error);
        posthog.capture("profile_fetch_error", {
          error: error instanceof Error ? error.message : String(error),
        });

        if (
          error instanceof Error &&
          (error.message.includes("unauthorized") ||
            error.message.includes("Unauthorized") ||
            error.message.includes("token"))
        ) {
          clearTokens();
          resetAxiosInstanceState();
        }
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
  }, [isInitialized, session, profile, dispatch, agentsStatus]);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (isMounted) {
        await fetchProfileData();
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [fetchProfileData, user, pathname]);

  useEffect(() => {
    const handleOAuthRedirect = async () => {
      if (typeof window === "undefined") return;

      try {
        if (window.location.hash) {
          const hash = window.location.hash.substring(1);
          const params = new URLSearchParams(hash);
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken && refreshToken) {
            saveTokens(accessToken, refreshToken);

            try {
              await supabaseHandler.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
            } catch (supabaseError) {
              console.error("Failed to set Supabase session:", supabaseError);
            }

            window.history.replaceState({}, document.title, window.location.pathname);

            if (!profile) {
              dispatch(fetchProfile());
            }

            toast.success("Successfully signed in");
          }
        }
      } catch (error) {
        console.error("Error handling OAuth redirect:", error);
      }
    };
  }, [dispatch, profile]);

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 2,
            staleTime: 30000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const handleError = (event: ErrorEvent) => {
      console.error("Unhandled error:", event.error);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("error", handleError);

      return () => {
        window.removeEventListener("error", handleError);
      };
    }
  }, []);

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={logError}
      onReset={() => {
        window.location.reload();
      }}
    >
      <QueryClientProvider client={queryClient}>
        <ReduxProvider store={store}>
          <ThemeProvider attribute="class" forcedTheme="light">
            {/* <ClerkProvider> */}
            <AuthProvider>
              <Toaster
                position="top-center"
                reverseOrder={false}
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: "#fff",
                    color: "#000",
                  },
                }}
              />
              <ProfileDataFetcher>
                <PostHogProvider>
                  <AnalyticsProvider>
                    {isMounted && <ServiceWorkerRegistration />}
                    <main suppressHydrationWarning>{children}</main>
                  </AnalyticsProvider>
                </PostHogProvider>
              </ProfileDataFetcher>
            </AuthProvider>
            {/* </ClerkProvider> */}
          </ThemeProvider>
        </ReduxProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
