"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseHandler } from "@/integrations/supabase/client";
import { apiClient, setAuthToken } from "@/integrations/fastapi/client";

declare global {
  interface Window {
    posthog?: any;
  }
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams?.get("error");
  const code = searchParams?.get("code");
  const hasProcessed = useRef(false);
  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const handleAuth = async () => {
      try {
        if (error) {
          const errorDescription = searchParams?.get("error_description");
          const errorCode = searchParams?.get("error_code");

          if (errorCode === "bad_oauth_state") {
            console.error("OAuth state mismatch. Attempting to recover...");
            router.replace("/user-auth");
            return;
          }

          throw new Error(
            `OAuth error: ${error}${errorDescription ? ` - ${errorDescription}` : ""}`
          );
        }

        // Handle OAuth code flow (for server-side auth)
        if (code) {
          try {
            const {
              data: { session },
              error: sessionError,
            } = await supabaseHandler.auth.exchangeCodeForSession(code);

            if (sessionError) throw sessionError;
            if (!session) throw new Error("No session returned from OAuth");

            // Store tokens in localStorage
            localStorage.setItem("discover_minds_access_token", session.access_token);
            localStorage.setItem("discover_minds_refresh_token", session.refresh_token);
            setAuthToken(session.access_token);

            await new Promise(resolve => setTimeout(resolve, 500));

            const {
              data: { session: verifiedSession },
            } = await supabaseHandler.auth.getSession();
            if (!verifiedSession) {
              throw new Error("Session verification failed");
            }
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, "", cleanUrl);

            router.replace("/chat/new");
            return;
          } catch (err) {
            console.error("Error exchanging code for session:", err);
            throw err;
          }
        }

        // Handle token in hash (client-side auth)
        if (window.location.hash) {
          const hash = window.location.hash.substring(1);
          const params = new URLSearchParams(hash);
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          const hashError = params.get("error");

          if (hashError) {
            throw new Error(`OAuth error: ${hashError}`);
          }

          if (accessToken && refreshToken) {
            localStorage.setItem("discover_minds_access_token", accessToken);
            localStorage.setItem("discover_minds_refresh_token", refreshToken);
            setAuthToken(accessToken);

            try {
              // Set Supabase session
              const { error: sessionError } = await supabaseHandler.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

              if (sessionError) {
                console.error("Supabase session error:", sessionError);
                throw sessionError;
              }

              await new Promise(resolve => setTimeout(resolve, 500));

              const {
                data: { session: verifiedSession },
              } = await supabaseHandler.auth.getSession();
              if (!verifiedSession) {
                throw new Error("Session verification failed");
              }

              console.log("Hash-based session verified, redirecting...");

              // Clear the URL hash
              const cleanUrl = window.location.origin + window.location.pathname;
              window.history.replaceState({}, "", cleanUrl);

              router.replace("/chat/new");
              return;
            } catch (error) {
              console.error("Error during hash-based OAuth callback:", error);
              throw error;
            }
          }
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabaseHandler.auth.getSession();

        if (sessionError) {
          throw new Error("Session error: " + sessionError.message);
        }

        if (session) {
          if (session.access_token) {
            localStorage.setItem("discover_minds_access_token", session.access_token);
            localStorage.setItem("discover_minds_refresh_token", session.refresh_token);
            setAuthToken(session.access_token);
          }

          router.replace("/chat/new");
          return;
        }

        throw new Error("No authentication data found");
      } catch (error) {
        console.error("Authentication error:", error);

        localStorage.removeItem("discover_minds_access_token");
        localStorage.removeItem("discover_minds_refresh_token");
        setAuthToken(null);

        await supabaseHandler.auth.signOut();

        // Redirect to error page
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const errorHash = window.location.hash
          ? `&hash=${encodeURIComponent(window.location.hash)}`
          : "";
        router.replace(`/auth/error?error=${encodeURIComponent(errorMessage)}${errorHash}`);
      }
    };

    handleAuth();
  }, []);

  return (
    <div className="min-h-screen grid place-items-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
