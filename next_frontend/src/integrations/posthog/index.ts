import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';

// Check if we're in a browser environment
const isClient = typeof window !== 'undefined';

// Initialize PostHog only on the client side
if (isClient) {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_API_KEY;
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

  if (apiKey) {
    posthog.init(apiKey, {
      api_host: apiHost,
      capture_pageview: true, // Automatically capture pageviews
      persistence: 'localStorage',
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') {
          // In development, log events to console instead of sending to PostHog
          posthog.debug();
        }
      },
    });
  } else {
    console.warn('PostHog API key not found. Analytics will not be tracked.');
  }
}

// Helper functions for common PostHog operations
export const Analytics = {
  /**
   * Identify a user with their ID and properties
   * @param userId - The unique ID of the user
   * @param properties - Additional user properties
   */
  identify: (userId: string, properties?: Record<string, any>) => {
    if (isClient && userId) {
      posthog.identify(userId, properties);
    }
  },

  /**
   * Capture a custom event with optional properties
   * @param eventName - The name of the event to capture
   * @param properties - Additional event properties
   */
  capture: (eventName: string, properties?: Record<string, any>) => {
    if (isClient) {
      posthog.capture(eventName, properties);
    }
  },

  /**
   * Reset the current user's identity
   */
  reset: () => {
    if (isClient) {
      posthog.reset();
    }
  },

  /**
   * Get the PostHog instance
   */
  getInstance: () => {
    if (isClient) {
      return posthog;
    }
    return null;
  },
};

export { PostHogProvider };
export default Analytics;
