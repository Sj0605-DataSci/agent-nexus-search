import posthog from "posthog-js";
import { updatePostHogUserProperties } from "@/utils/posthog-helpers";

// Define flow stages for tracking user journeys
export type UserFlowStage =
  | "landing_page_view"
  | "signup_started"
  | "signup_completed"
  | "login_started"
  | "login_completed"
  | "profile_view"
  | "search_started"
  | "search_results_view"
  | "connection_view"
  | "connection_request_sent"
  | "checkout_started"
  | "checkout_completed"
  | "feature_discovery"
  | "settings_changed";

// Define user flow types
export type UserFlowType =
  | "onboarding"
  | "search"
  | "connection"
  | "profile_completion"
  | "subscription"
  | "feature_exploration";

/**
 * Utility functions for tracking analytics events
 */
export const Analytics = {
  /**
   * Track a feature usage event
   */
  trackFeatureUsage: (featureName: string, properties?: Record<string, any>) => {
    posthog.capture("feature_used", {
      feature_name: featureName,
      ...properties,
    });
  },

  /**
   * Track an error event
   */
  trackError: (errorType: string, errorMessage: string, properties?: Record<string, any>) => {
    posthog.capture("error_occurred", {
      error_type: errorType,
      error_message: errorMessage,
      ...properties,
    });
  },

  /**
   * Track a button click event
   */
  trackButtonClick: (buttonName: string, properties?: Record<string, any>) => {
    posthog.capture("button_clicked", {
      button_name: buttonName,
      ...properties,
    });
  },

  /**
   * Track a form submission event
   */
  trackFormSubmission: (formName: string, properties?: Record<string, any>) => {
    posthog.capture("form_submitted", {
      form_name: formName,
      ...properties,
    });
  },

  /**
   * Track a user preference change
   */
  trackPreferenceChange: (preferenceName: string, newValue: any, oldValue?: any) => {
    posthog.capture("preference_changed", {
      preference_name: preferenceName,
      new_value: newValue,
      old_value: oldValue,
    });
  },

  /**
   * Track when a user views a specific content item
   */
  trackContentView: (contentType: string, contentId: string, properties?: Record<string, any>) => {
    posthog.capture("content_viewed", {
      content_type: contentType,
      content_id: contentId,
      ...properties,
    });
  },

  /**
   * Track when a user shares content
   */
  trackShare: (
    contentType: string,
    contentId: string,
    shareMethod: string,
    properties?: Record<string, any>
  ) => {
    posthog.capture("content_shared", {
      content_type: contentType,
      content_id: contentId,
      share_method: shareMethod,
      ...properties,
    });
  },

  /**
   * Track a search event
   */
  trackSearch: (query: string, resultsCount: number, properties?: Record<string, any>) => {
    posthog.capture("search_performed", {
      query,
      results_count: resultsCount,
      ...properties,
    });
  },

  /**
   * Set user properties that will persist
   */
  setUserProperties: (properties: Record<string, any>) => {
    updatePostHogUserProperties(properties);
  },

  /**
   * Increment a user property by a given value
   * Note: This is implemented as a custom event since direct increment may not be available
   */
  incrementUserProperty: (property: string, value: number = 1) => {
    // Track an increment event instead of using posthog.people.increment which may not be available
    posthog.capture("$increment_property", {
      property_name: property,
      property_value: value,
    });

    // You can also use this approach to update user properties
    // posthog.people.set({
    //   [property]: value // This sets the absolute value, not increments
    // });
  },

  /**
   * Track a user flow stage
   * This helps visualize the user journey through the application
   */
  trackUserFlow: (
    flowType: UserFlowType,
    stage: UserFlowStage,
    properties?: Record<string, any>
  ) => {
    posthog.capture("user_flow_progression", {
      flow_type: flowType,
      flow_stage: stage,
      timestamp: new Date().toISOString(),
      ...properties,
    });
  },

  /**
   * Start tracking a user flow
   * Call this at the beginning of a flow to mark its start
   */
  startUserFlow: (flowType: UserFlowType, properties?: Record<string, any>) => {
    // Store the flow start time in session storage
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`flow_start_${flowType}`, new Date().toISOString());
    }

    posthog.capture("user_flow_started", {
      flow_type: flowType,
      timestamp: new Date().toISOString(),
      ...properties,
    });
  },

  /**
   * Complete a user flow
   * Call this at the end of a flow to mark its completion and calculate duration
   */
  completeUserFlow: (flowType: UserFlowType, properties?: Record<string, any>) => {
    let duration = 0;
    let startTime = null;

    // Retrieve the flow start time from session storage
    if (typeof window !== "undefined") {
      const storedStartTime = sessionStorage.getItem(`flow_start_${flowType}`);
      if (storedStartTime) {
        startTime = new Date(storedStartTime);
        const endTime = new Date();
        duration = endTime.getTime() - startTime.getTime();

        // Clean up storage
        sessionStorage.removeItem(`flow_start_${flowType}`);
      }
    }

    posthog.capture("user_flow_completed", {
      flow_type: flowType,
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      start_time: startTime ? startTime.toISOString() : null,
      ...properties,
    });
  },

  /**
   * Track a page view with enhanced context
   * This provides more context than the default page view tracking
   */
  trackPageView: (pageName: string, pageCategory?: string, properties?: Record<string, any>) => {
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
   * Track user engagement metrics
   */
  trackEngagement: (
    engagementType: string,
    duration?: number,
    properties?: Record<string, any>
  ) => {
    posthog.capture("user_engagement", {
      engagement_type: engagementType,
      duration_seconds: duration,
      ...properties,
    });
  },
};

export default Analytics;
