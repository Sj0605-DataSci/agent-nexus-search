import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import SEOAnalytics from "@/utils/seo-analytics";

/**
 * Hook to track SEO-relevant user interactions on a page
 *
 * @param pageId - Optional custom page identifier
 * @param options - Configuration options
 * @returns Tracking utility functions
 */
export function useSEOAnalytics(
  pageId?: string,
  options = {
    trackScrollDepth: true,
    trackTimeOnPage: true,
    trackPageView: true,
  }
) {
  const pathname = usePathname();
  const effectivePageId = pageId || pathname || "";
  const maxScrollDepthRef = useRef(0);
  const startTimeRef = useRef(Date.now());
  const hasTrackedTimeRef = useRef(false);

  // Track page view and initialize tracking
  useEffect(() => {
    if (!effectivePageId) return;

    // Reset tracking state for new page
    maxScrollDepthRef.current = 0;
    startTimeRef.current = Date.now();
    hasTrackedTimeRef.current = false;

    // Track page view if enabled
    if (options.trackPageView) {
      const pageName = effectivePageId.split("/").pop() || "home";
      const pageCategory = effectivePageId.split("/")[1] || "main";

      SEOAnalytics.trackTrafficSource();
      SEOAnalytics.trackUserJourney(effectivePageId);
    }

    // Set up scroll depth tracking
    let scrollHandler: (() => void) | null = null;

    if (options.trackScrollDepth) {
      scrollHandler = () => {
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (scrollHeight <= 0) return;

        const scrollPosition = window.scrollY;
        const scrollDepth = Math.round((scrollPosition / scrollHeight) * 100);

        if (scrollDepth > maxScrollDepthRef.current) {
          maxScrollDepthRef.current = scrollDepth;
          SEOAnalytics.trackScrollDepth(maxScrollDepthRef.current, effectivePageId);
        }
      };

      window.addEventListener("scroll", scrollHandler, { passive: true });
    }

    // Track time on page
    const trackTimeBeforeLeaving = () => {
      if (hasTrackedTimeRef.current) return;
      hasTrackedTimeRef.current = true;

      const timeOnPage = Math.round((Date.now() - startTimeRef.current) / 1000);
      if (options.trackTimeOnPage) {
        SEOAnalytics.trackTimeOnPage(timeOnPage, effectivePageId);
      }
    };

    if (options.trackTimeOnPage) {
      window.addEventListener("beforeunload", trackTimeBeforeLeaving);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          trackTimeBeforeLeaving();
        }
      });
    }

    // Clean up event listeners
    return () => {
      if (scrollHandler) {
        window.removeEventListener("scroll", scrollHandler);
      }

      if (options.trackTimeOnPage) {
        window.removeEventListener("beforeunload", trackTimeBeforeLeaving);
        trackTimeBeforeLeaving();
      }
    };
  }, [effectivePageId, options.trackScrollDepth, options.trackTimeOnPage, options.trackPageView]);

  // Return utility functions for component-specific tracking
  return {
    trackEngagement: (
      engagementType: Parameters<typeof SEOAnalytics.trackEngagement>[0],
      details?: Record<string, any>,
      duration?: number
    ) => {
      SEOAnalytics.trackEngagement(engagementType, details, duration);
    },

    trackConversion: (
      conversionType: Parameters<typeof SEOAnalytics.trackConversion>[0],
      value?: number,
      details?: Record<string, any>
    ) => {
      SEOAnalytics.trackConversion(conversionType, value, details);
    },

    trackDemoBooking: (
      stage: Parameters<typeof SEOAnalytics.trackDemoBooking>[0],
      details?: Record<string, any>
    ) => {
      SEOAnalytics.trackDemoBooking(stage, details);
    },

    trackSignup: (
      stage: Parameters<typeof SEOAnalytics.trackSignup>[0],
      details?: Record<string, any>
    ) => {
      SEOAnalytics.trackSignup(stage, details);
    },

    trackUserJourney: (
      currentStep: string,
      previousStep?: string,
      details?: Record<string, any>
    ) => {
      SEOAnalytics.trackUserJourney(currentStep, previousStep, details);
    },
  };
}

export default useSEOAnalytics;
