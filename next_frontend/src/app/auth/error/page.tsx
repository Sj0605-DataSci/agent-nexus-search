"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { supabaseHandler } from "@/integrations/supabase/client";
import { setAuthToken } from "@/integrations/fastapi/client";

type AuthErrorType =
  | "no_code"
  | "exchange_failed"
  | "provider_token_invalid"
  | "insufficient_scopes"
  | "profile_fetch_failed"
  | "missing_phone"
  | "server_error"
  | "auth_error";

function AuthErrorContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const error = (sp.get("error") as AuthErrorType) ?? "auth_error";
  const errorDescription = sp.get("error_description") ?? "";
  const [isProcessing, setIsProcessing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const processOAuthFlow = useCallback(async () => {
    if (typeof window === "undefined" || !window.location.hash) return;

    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) return;

    setIsProcessing(true);

    try {
      localStorage.setItem("discover_minds_access_token", accessToken);
      localStorage.setItem("discover_minds_refresh_token", refreshToken);
      setAuthToken(accessToken);

      const { error: sessionError } = await supabaseHandler.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        console.warn("Supabase session warning:", sessionError);
      }

      window.history.replaceState({}, document.title, window.location.pathname);

      await new Promise(resolve => setTimeout(resolve, 500));

      router.push("/chat/new");
    } catch (error) {
      console.error("Error processing OAuth flow:", error);
      if (retryCount >= 2) {
        localStorage.removeItem("discover_minds_access_token");
        localStorage.removeItem("discover_minds_refresh_token");
      }
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [router, retryCount]);
  useEffect(() => {
    const cleanupOAuthState = () => {
      localStorage.removeItem("oauth_loading");
      localStorage.removeItem("oauth_state");
      localStorage.removeItem("oauth_provider");
    };

    return () => {
      cleanupOAuthState();
    };
  }, [router]);
  useEffect(() => {
    const handleOAuthFlow = async () => {
      try {
        await processOAuthFlow();
      } catch (error) {
        console.error("Failed to process OAuth flow:", error);
      }
    };

    handleOAuthFlow();
  }, [processOAuthFlow]);

  const handleRetry = useCallback(async () => {
    setRetryCount(prev => prev + 1);
    try {
      await processOAuthFlow();
    } catch (error) {
      console.error("Retry failed:", error);
    }
  }, [processOAuthFlow]);

  const getErrorMessage = (error: AuthErrorType, isProcessing: boolean): string => {
    const messages: Record<AuthErrorType, string> = {
      no_code: isProcessing
        ? "Processing your login..."
        : "Missing authorization code. Please try signing in again.",
      exchange_failed:
        "We couldn't complete the sign-in process. The authentication service might be temporarily unavailable.",
      provider_token_invalid: "Your session has expired. Please sign in again.",
      insufficient_scopes:
        "Additional permissions are required to complete sign-in. Please grant all requested permissions.",
      profile_fetch_failed: "We couldn't retrieve your profile information. Please try again.",
      missing_phone:
        "A phone number is required to continue. Please add a phone number to your account.",
      server_error: "Our servers are experiencing issues. Please try again in a few minutes.",
      auth_error: "An unexpected error occurred during authentication.",
    };

    return messages[error] || errorDescription || messages.auth_error;
  };

  const friendly = getErrorMessage(error, isProcessing);

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="max-w-md w-full bg-white rounded shadow p-6 text-center">
        <h1 className="text-2xl font-semibold mb-3">
          {isProcessing ? "Completing Sign In..." : "Authentication Error"}
        </h1>
        <p className="text-gray-700 mb-6">{friendly}</p>
        <div className="mt-6 space-y-3">
          {isProcessing ? (
            <div className="flex items-center justify-center text-indigo-600">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-600 mr-2"></div>
              <span>Processing...</span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={handleRetry}
                disabled={isProcessing}
                className={`px-4 py-2 rounded-md ${
                  isProcessing
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                } transition-colors`}
              >
                {retryCount > 0 ? "Try Again" : "Retry"}
              </button>
              <Link
                href="/user-auth"
                className="px-4 py-2 text-center border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Return to Sign In
              </Link>
            </div>
          )}
          {retryCount > 1 && (
            <p className="text-sm text-gray-500 text-center mt-2">
              Still having trouble? Please contact support if the issue persists.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
