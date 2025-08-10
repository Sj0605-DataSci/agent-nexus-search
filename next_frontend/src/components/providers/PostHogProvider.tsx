"use client";

import { ReactNode, useEffect } from "react";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import posthog from "posthog-js";

interface PostHogProviderProps {
  children: ReactNode;
}

function NoopPostHogProvider({ children }: PostHogProviderProps) {
  useEffect(() => {
    console.log("PostHog disabled in development environment");
  }, []);

  return <>{children}</>;
}

function ProductionPostHogProvider({ children }: PostHogProviderProps) {
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_API_KEY;
    const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";

    // Ad-blocker detection
    const checkAdBlocker = async () => {
      try {
        await fetch("https://www.google-analytics.com/analytics.js", {
          method: "HEAD",
          mode: "no-cors",
          cache: "no-store",
        });
        return false; // Not blocked
      } catch (error) {
        return true; // Blocked
      }
    };

    const initializePostHog = async () => {
      const isBlocked = await checkAdBlocker();
      if (isBlocked) {
        console.log("Ad-blocker detected. PostHog will not be initialized.");
        return;
      }

      if (apiKey) {
        posthog.init(apiKey, {
          api_host: apiHost,
          capture_pageview: true,
        });
      } else {
        console.warn("PostHog API key not found. Analytics will not be tracked.");
      }
    };

    initializePostHog();
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const isDevelopment = process.env.NODE_ENV === "development";

  if (isDevelopment) {
    return <NoopPostHogProvider>{children}</NoopPostHogProvider>;
  }

  return <ProductionPostHogProvider>{children}</ProductionPostHogProvider>;
}

export default PostHogProvider;
