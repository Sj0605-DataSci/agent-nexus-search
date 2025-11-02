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
          defaults: "2025-05-24",
          person_profiles: "identified_only",
          capture_pageview: true,
          persistence: "localStorage",
          autocapture: true,
          capture_pageleave: true,

          // Enhanced session recording configuration
          session_recording: {
            full_snapshot_interval_millis: 10000,
            maskAllInputs: false,
          },
          // Enable heatmaps for all pages
          enable_recording_console_log: true,
          capture_performance: true,
          capture_heatmaps: true,
          capture_dead_clicks: true,
          rageclick: true,

          // Properly track UTM parameters
          property_blacklist: [],
          respect_dnt: false,

          loaded: ph => {
            // Set default properties for all users including guests
            const userAgent = navigator.userAgent;
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
              userAgent
            );
            const browser = ph.get_session_id();
            const deviceId = ph.get_distinct_id();

            // Extract UTM parameters from URL
            const urlParams = new URLSearchParams(window.location.search);
            const utmSource = urlParams.get("utm_source");
            const utmMedium = urlParams.get("utm_medium");
            const utmCampaign = urlParams.get("utm_campaign");
            const utmContent = urlParams.get("utm_content");
            const utmTerm = urlParams.get("utm_term");

            // Set default properties for all users (including guests)
            ph.register({
              is_guest: true,
              device_type: isMobile ? "mobile" : "desktop",
              browser: browser,
              device_id: deviceId,
              locale: navigator.language,
              screen_width: window.screen.width,
              screen_height: window.screen.height,
              referrer: document.referrer,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              // Store UTM parameters if available
              ...(utmSource && { utm_source: utmSource }),
              ...(utmMedium && { utm_medium: utmMedium }),
              ...(utmCampaign && { utm_campaign: utmCampaign }),
              ...(utmContent && { utm_content: utmContent }),
              ...(utmTerm && { utm_term: utmTerm }),
              initial_referrer: document.referrer || "direct",
              initial_referring_domain: document.referrer
                ? new URL(document.referrer).hostname
                : "direct",
            });

            // Start session recording
            ph.startSessionRecording();

          },
        });
      } else {
        console.warn("PostHog API key not found. Analytics will not be tracked.");
      }
    };

    initializePostHog();

    // Clean up function
    return () => {
      // Stop session recording when component unmounts
      if (posthog && posthog.stopSessionRecording) {
        posthog.stopSessionRecording();
      }
    };
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
