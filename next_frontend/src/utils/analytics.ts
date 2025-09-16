import posthog from "posthog-js";
import { updatePostHogUserProperties } from "@/utils/posthog-helpers";

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
};

export default Analytics;
