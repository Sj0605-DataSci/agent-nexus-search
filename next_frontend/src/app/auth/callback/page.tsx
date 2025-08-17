"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseHandler } from "../../supabaseClient";
import { apiClient, setAuthToken } from "@/integrations/fastapi/client";

declare global {
  interface Window {
    posthog?: any;
  }
}

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // First, check if we have a hash with tokens
        if (window.location.hash) {
          const hash = window.location.hash.substring(1);
          const params = new URLSearchParams(hash);

          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken && refreshToken) {
            try {
              // Store tokens in localStorage first (this always works)
              localStorage.setItem("discover_minds_access_token", accessToken);
              localStorage.setItem("discover_minds_refresh_token", refreshToken);

              // Set default auth header for axios
              setAuthToken(accessToken);

              // Try to set the Supabase session (might fail with Invalid API key)
              // try {
              //   const { error: sessionError } = await supabaseHandler.auth.setSession({
              //     access_token: accessToken,
              //     refresh_token: refreshToken,
              //   });

              //   if (sessionError) {
              //     console.warn("Supabase session error, but continuing:", sessionError);
              //     // Continue anyway since we've stored the tokens
              //   }
              // } catch (sessionErr) {
              //   console.error("Error setting Supabase session, but continuing:", sessionErr);
              //   // Continue with the tokens we've already stored
              // }

              try {
                // Get user profile
                const profileResponse = await apiClient.fetchProfile();
                const profileData = profileResponse.data;

                // Track successful login with PostHog
                if (window.posthog) {
                  window.posthog.identify(profileData.id, {
                    email: profileData.email,
                    name: profileData.full_name,
                  });
                  window.posthog.capture("login_successful", {
                    provider: "google",
                    userId: profileData.id,
                    hasConnections: profileData.has_connections,
                  });
                }
              } catch (profileError) {
                console.error("Error fetching profile:", profileError);
                // Continue with login even if profile fetch fails
              }

              // // Clear the URL hash
              // window.history.replaceState({}, document.title, window.location.pathname);

              // Redirect to chat
              router.push("/chat/new");
              return;
            } catch (error) {
              console.error("Error during OAuth callback:", error);
              throw error;
            }
          }
        }

        // If no hash or no tokens in hash, try to get session
        const {
          data: { session },
          error: sessionError,
        } = await supabaseHandler.auth.getSession();

        if (sessionError) {
          throw new Error("Session error: " + sessionError.message);
        }

        if (session) {
          // If we have a session, redirect to chat
          router.push("/chat/new");
          return;
        }

        // No session, redirect to error page
        router.push("/auth/error?error=no_session");
      } catch (error) {
        console.error("Authentication error:", error);
        // Clear any partial auth state
        localStorage.removeItem("discover_minds_access_token");
        localStorage.removeItem("discover_minds_refresh_token");

        // Redirect to error page with the current hash if it exists
        const errorHash = window.location.hash
          ? `&hash=${encodeURIComponent(window.location.hash)}`
          : "";
        router.push(`/auth/error?error=auth_error${errorHash}`);
      }
    };

    handleAuth();
  }, [router]);

  return (
    <div className="min-h-screen grid place-items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}
