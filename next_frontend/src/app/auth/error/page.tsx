"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseTemp } from "../../supabaseClient";
import { setAuthToken } from "@/integrations/fastapi/client";

export default function AuthErrorPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const error = sp.get("error") ?? "auth_error";
  const errorDescription = sp.get("error_description") ?? "";
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const processOAuthFlow = async () => {
      // Check for tokens in the URL hash (fragment)
      if (typeof window !== "undefined" && window.location.hash) {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);

        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          setIsProcessing(true);
          try {
            try {
              // Store tokens in localStorage first (this always works)
              localStorage.setItem("discover_minds_access_token", accessToken);
              localStorage.setItem("discover_minds_refresh_token", refreshToken);
              
              // Set default auth header for axios
              setAuthToken(accessToken);
              
              // Try to set the Supabase session (might fail with Invalid API key)
              const { error: sessionError } = await supabaseTemp.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              
              if (sessionError) {
                console.warn("Supabase session error, but continuing:", sessionError);
                // Continue anyway since we've stored the tokens
              }
              
              // Clear the URL hash
              window.history.replaceState({}, document.title, window.location.pathname);
              
              // Redirect to chat
              router.push("/chat/new");
              return;
            } catch (innerError) {
              console.error("Inner error setting session:", innerError);
              // Continue with the tokens we've already stored
              window.history.replaceState({}, document.title, window.location.pathname);
              router.push("/chat/new");
              return;
            }
          } catch (err) {
            console.error("Error processing OAuth tokens:", err);
            setIsProcessing(false);
          }
        }
      }
    };

    processOAuthFlow();
  }, [router]);

  const friendly =
    error === "no_code" && isProcessing
      ? "Processing your login..."
      : error === "no_code"
        ? "Missing authorization code."
        : error === "exchange_failed"
          ? "We couldn't finish signing you in."
          : error === "provider_token_invalid"
            ? "Your Google session expired. Please try again."
            : error === "insufficient_scopes"
              ? "Permission not granted for required data."
              : error === "profile_fetch_failed"
                ? "Couldn't read your profile."
                : error === "missing_phone"
                  ? "A phone number is required to continue."
                  : error === "server_error"
                    ? "A server error occurred during authentication."
                    : errorDescription || "An error occurred during authentication.";

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="max-w-md w-full bg-white rounded shadow p-6 text-center">
        <h1 className="text-2xl font-semibold mb-3">
          {isProcessing ? "Completing Sign In..." : "Authentication Error"}
        </h1>
        <p className="text-gray-700 mb-6">{friendly}</p>
        {!isProcessing && (
          <div className="flex justify-center gap-4">
            <Link href="/user-auth" className="text-indigo-600 hover:underline">
              Return to Sign In
            </Link>
            <button onClick={() => location.reload()} className="text-gray-600 hover:underline">
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
