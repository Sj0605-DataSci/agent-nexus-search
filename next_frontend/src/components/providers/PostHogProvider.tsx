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

    if (apiKey) {
      posthog.init(apiKey, {
        api_host: apiHost,
        capture_pageview: true,
        persistence: "localStorage",
      });
    } else {
      console.warn("PostHog API key not found. Analytics will not be tracked.");
    }
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
