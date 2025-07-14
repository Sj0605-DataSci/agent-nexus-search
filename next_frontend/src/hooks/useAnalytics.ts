import { useCallback } from 'react';
import posthog from 'posthog-js';

export function useAnalytics() {
  /**
   * Identify a user with their ID and properties
   */
  const identify = useCallback((userId: string, properties?: Record<string, any>) => {
    if (typeof window !== 'undefined' && userId) {
      posthog.identify(userId, properties);
    }
  }, []);

  /**
   * Capture a custom event with optional properties
   */
  const capture = useCallback((eventName: string, properties?: Record<string, any>) => {
    if (typeof window !== 'undefined') {
      posthog.capture(eventName, properties);
    }
  }, []);

  /**
   * Reset the current user's identity (use when logging out)
   */
  const reset = useCallback(() => {
    if (typeof window !== 'undefined') {
      posthog.reset();
    }
  }, []);

  return {
    identify,
    capture,
    reset,
  };
}

export default useAnalytics;
