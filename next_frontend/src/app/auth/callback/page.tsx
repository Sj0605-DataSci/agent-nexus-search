"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseHandler } from "../../supabaseClient";
import { apiClient, setAuthToken } from "@/integrations/fastapi/client";

declare global {
  interface Window {
    posthog?: any;
  }
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams?.get('error');
  const code = searchParams?.get('code');

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // Check for OAuth error first
        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        // Handle OAuth code flow (for server-side auth)
        if (code) {
          try {
            const { data: { session }, error: sessionError } = await supabaseHandler.auth.exchangeCodeForSession(code);
            
            if (sessionError) throw sessionError;
            if (!session) throw new Error('No session returned from OAuth');

            // Store tokens in localStorage
            localStorage.setItem("discover_minds_access_token", session.access_token);
            localStorage.setItem("discover_minds_refresh_token", session.refresh_token);
            setAuthToken(session.access_token);

            // Clear the URL parameters
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, '', cleanUrl);

            // Redirect to chat
            router.push("/chat/new");
            return;
          } catch (err) {
            console.error('Error exchanging code for session:', err);
            throw err;
          }
        }

        // Handle token in hash (client-side auth)
        if (window.location.hash) {
          const hash = window.location.hash.substring(1);
          const params = new URLSearchParams(hash);
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          const error = params.get("error");

          if (error) {
            throw new Error(`OAuth error: ${error}`);
          }

          if (accessToken && refreshToken) {
            // Store tokens in localStorage
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
                console.warn("Supabase session error, but continuing:", sessionError);
              }

              // Clear the URL hash
              const cleanUrl = window.location.origin + window.location.pathname;
              window.history.replaceState({}, '', cleanUrl);

              // Redirect to chat
              router.push("/chat/new");
              return;
            } catch (error) {
              console.error("Error during OAuth callback:", error);
              throw error;
            }
          }
        }

        // If we get here with no code or hash, check for existing session
        const { data: { session }, error: sessionError } = await supabaseHandler.auth.getSession();

        if (sessionError) {
          throw new Error("Session error: " + sessionError.message);
        }

        if (session) {
          // If we have a session, redirect to chat
          router.push("/chat/new");
          return;
        }

        // No session or tokens found
        throw new Error("No authentication data found");

      } catch (error) {
        console.error("Authentication error:", error);
        // Clear any partial auth state
        localStorage.removeItem("discover_minds_access_token");
        localStorage.removeItem("discover_minds_refresh_token");

        // Redirect to error page with error details
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorHash = window.location.hash
          ? `&hash=${encodeURIComponent(window.location.hash)}`
          : "";
        router.push(`/auth/error?error=${encodeURIComponent(errorMessage)}${errorHash}`);
      }
    };

    handleAuth();
  }, [router, code, error]);

  return (
    <div className="min-h-screen grid place-items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen grid place-items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
