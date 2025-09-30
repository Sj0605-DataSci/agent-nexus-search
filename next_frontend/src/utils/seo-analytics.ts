import posthog from "posthog-js";
import Analytics from "./analytics";
import { updatePostHogUserProperties } from "./posthog-helpers";

/**
 * SEO Analytics Utility
 * 
 * This utility provides enhanced tracking capabilities for SEO-relevant user interactions.
 * It complements the existing analytics.ts by focusing specifically on interactions
 * that are important for SEO metrics and conversion tracking.
 */

export type UserEngagementType = 
  | "page_scroll_depth"
  | "time_on_page"
  | "click_through"
  | "form_interaction"
  | "content_engagement"
  | "video_engagement"
  | "feature_interaction";

export type ConversionType =
  | "demo_booking"
  | "signup"
  | "subscription"
  | "feature_activation"
  | "content_download"
  | "email_subscription";

export type SEOMetric =
  | "bounce_rate"
  | "exit_rate"
  | "page_depth"
  | "session_duration"
  | "return_visits"
  | "conversion_rate";

/**
 * SEO Analytics - Enhanced tracking for SEO-relevant metrics
 */
export const SEOAnalytics = {
  /**
   * Track user engagement metrics important for SEO
   */
  trackEngagement: (
    engagementType: UserEngagementType,
    details: Record<string, any> = {},
    duration?: number
  ) => {
    posthog.capture("seo_engagement", {
      engagement_type: engagementType,
      duration_seconds: duration,
      timestamp: new Date().toISOString(),
      page_url: typeof window !== "undefined" ? window.location.href : null,
      page_path: typeof window !== "undefined" ? window.location.pathname : null,
      ...details,
    });

    // Also track in standard analytics for consistency
    Analytics.trackEngagement(engagementType, duration, details);
  },

  /**
   * Track scroll depth on a page
   * This is important for understanding content engagement
   */
  trackScrollDepth: (depth: number, pageId: string) => {
    // Only track at meaningful thresholds to avoid excessive events
    const thresholds = [25, 50, 75, 90, 100];
    const nearestThreshold = thresholds.find(t => depth <= t);
    
    if (nearestThreshold) {
      posthog.capture("scroll_depth_milestone", {
        depth_percentage: nearestThreshold,
        page_id: pageId,
        page_url: typeof window !== "undefined" ? window.location.href : null,
        timestamp: new Date().toISOString(),
      });
    }
  },

  /**
   * Track time spent on page
   * Important for understanding content value
   */
  trackTimeOnPage: (seconds: number, pageId: string) => {
    // Track at meaningful intervals
    const intervals = [10, 30, 60, 120, 300, 600];
    
    for (const interval of intervals) {
      if (seconds >= interval && seconds < interval * 1.1) {
        posthog.capture("time_on_page_milestone", {
          seconds: interval,
          page_id: pageId,
          page_url: typeof window !== "undefined" ? window.location.href : null,
          timestamp: new Date().toISOString(),
        });
        break;
      }
    }
  },

  /**
   * Track conversion events
   * Critical for measuring ROI of SEO efforts
   */
  trackConversion: (
    conversionType: ConversionType,
    value?: number,
    details: Record<string, any> = {}
  ) => {
    posthog.capture("conversion", {
      conversion_type: conversionType,
      value: value,
      page_url: typeof window !== "undefined" ? window.location.href : null,
      page_path: typeof window !== "undefined" ? window.location.pathname : null,
      referrer: typeof document !== "undefined" ? document.referrer : null,
      timestamp: new Date().toISOString(),
      ...details,
    });

    // Update user properties to reflect this conversion
    const currentCount = posthog.get_property(`${conversionType}_count`) || 0;
    updatePostHogUserProperties({
      [`has_completed_${conversionType}`]: true,
      [`${conversionType}_count`]: Number(currentCount) + 1,
      [`last_${conversionType}_date`]: new Date().toISOString(),
    });
  },

  /**
   * Track user journey through key pages
   * Important for understanding the path to conversion
   */
  trackUserJourney: (
    currentStep: string,
    previousStep?: string,
    details: Record<string, any> = {}
  ) => {
    posthog.capture("user_journey_progression", {
      current_step: currentStep,
      previous_step: previousStep,
      timestamp: new Date().toISOString(),
      ...details,
    });
  },

  /**
   * Track inbound traffic sources
   * Critical for understanding which channels drive quality traffic
   */
  trackTrafficSource: () => {
    if (typeof window === "undefined") return;
    
    const url = new URL(window.location.href);
    const utmSource = url.searchParams.get("utm_source");
    const utmMedium = url.searchParams.get("utm_medium");
    const utmCampaign = url.searchParams.get("utm_campaign");
    const referrer = document.referrer;
    
    posthog.capture("traffic_source_identified", {
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      referrer: referrer,
      landing_page: window.location.pathname,
      timestamp: new Date().toISOString(),
    });

    // Store traffic source in user properties
    if (utmSource || utmMedium || utmCampaign || referrer) {
      updatePostHogUserProperties({
        initial_traffic_source: utmSource || "direct",
        initial_traffic_medium: utmMedium || "none",
        initial_traffic_campaign: utmCampaign || "none",
        initial_referrer: referrer || "direct",
        initial_landing_page: window.location.pathname,
      });
    }
  },

  /**
   * Track key SEO metrics
   */
  trackSEOMetric: (
    metricType: SEOMetric,
    value: number,
    details: Record<string, any> = {}
  ) => {
    posthog.capture("seo_metric", {
      metric_type: metricType,
      value: value,
      page_url: typeof window !== "undefined" ? window.location.href : null,
      page_path: typeof window !== "undefined" ? window.location.pathname : null,
      timestamp: new Date().toISOString(),
      ...details,
    });
  },

  /**
   * Track demo booking events
   * This is a critical conversion point identified in the SEO audit
   */
  trackDemoBooking: (
    stage: "started" | "completed" | "abandoned",
    details: Record<string, any> = {}
  ) => {
    posthog.capture("demo_booking", {
      stage: stage,
      timestamp: new Date().toISOString(),
      page_url: typeof window !== "undefined" ? window.location.href : null,
      ...details,
    });

    if (stage === "completed") {
      SEOAnalytics.trackConversion("demo_booking", undefined, details);
    }
  },

  /**
   * Track signup events
   * Another critical conversion point
   */
  trackSignup: (
    stage: "started" | "completed" | "abandoned",
    details: Record<string, any> = {}
  ) => {
    posthog.capture("user_signup", {
      stage: stage,
      timestamp: new Date().toISOString(),
      page_url: typeof window !== "undefined" ? window.location.href : null,
      ...details,
    });

    if (stage === "completed") {
      SEOAnalytics.trackConversion("signup", undefined, details);
    }
  },

  /**
   * Track a page view with enhanced context
   * This provides more context than the default page view tracking
   */
  trackPageView: (pageName: string, properties?: Record<string, any>) => {
    const pageCategory = typeof window !== "undefined" ? 
      window.location.pathname.split('/')[1] || 'main' : 'unknown';
      
    posthog.capture("$pageview", {
      page_name: pageName,
      page_category: pageCategory,
      url: typeof window !== "undefined" ? window.location.href : null,
      path: typeof window !== "undefined" ? window.location.pathname : null,
      referrer: typeof document !== "undefined" ? document.referrer : null,
      ...properties,
    });
  },

  /**
   * Initialize SEO Analytics
   * Call this once when the app loads
   */
  init: () => {
    if (typeof window === "undefined") return;

    // Track initial traffic source
    SEOAnalytics.trackTrafficSource();

    // Set up scroll depth tracking
    let maxScrollDepth = 0;
    const pageId = window.location.pathname;
    
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      
      const scrollPosition = window.scrollY;
      const scrollDepth = Math.round((scrollPosition / scrollHeight) * 100);
      
      if (scrollDepth > maxScrollDepth) {
        maxScrollDepth = scrollDepth;
        SEOAnalytics.trackScrollDepth(maxScrollDepth, pageId);
      }
    };

    // Set up time on page tracking
    const startTime = Date.now();
    let timeTracked = false;
    
    const trackTimeBeforeLeaving = () => {
      if (timeTracked) return;
      timeTracked = true;
      
      const timeOnPage = Math.round((Date.now() - startTime) / 1000);
      SEOAnalytics.trackTimeOnPage(timeOnPage, pageId);
    };

    // Add event listeners
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("beforeunload", trackTimeBeforeLeaving);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        trackTimeBeforeLeaving();
      }
    });

    // Clean up function to be called when component unmounts
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("beforeunload", trackTimeBeforeLeaving);
      trackTimeBeforeLeaving();
    };
  }
};

export default SEOAnalytics;
