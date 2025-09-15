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
          persistence: 'localStorage',
          autocapture: true,
          capture_pageleave: true,
          session_recording: {
            maskAllInputs: false,
            recordCrossOriginIframes: true
          },
          property_blacklist: ['$current_url', '$host'],
          loaded: (ph) => {
            // Set default properties for all users including guests
            const userAgent = navigator.userAgent;
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
            const browser = ph.get_session_id();
            const deviceId = ph.get_distinct_id();
            
            // Set default properties for all users (including guests)
            ph.register({
              is_guest: true,
              device_type: isMobile ? 'mobile' : 'desktop',
              browser: browser,
              device_id: deviceId,
              locale: navigator.language,
              screen_width: window.screen.width,
              screen_height: window.screen.height,
              referrer: document.referrer,
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            });
            
            // Attempt to get location data (will be limited by browser permissions)
            try {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    ph.register({
                      latitude: position.coords.latitude,
                      longitude: position.coords.longitude
                    });
                  },
                  () => {}, // Silent error
                  { timeout: 10000, enableHighAccuracy: false }
                );
              }
            } catch (e) {
              console.log('Geolocation not available or permitted');
            }
          }
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
