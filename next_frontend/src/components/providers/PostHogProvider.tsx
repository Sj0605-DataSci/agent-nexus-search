'use client';

import { ReactNode, useEffect } from 'react';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import posthog from 'posthog-js';

interface PostHogProviderProps {
  children: ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  useEffect(() => {
    // Initialize PostHog only on the client side
    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_API_KEY;
    const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

    if (apiKey) {
      posthog.init(apiKey, {
        api_host: apiHost,
        capture_pageview: true,
        persistence: 'localStorage',
        loaded: (posthog) => {
          if (process.env.NODE_ENV === 'development') {
            posthog.debug();
          }
        },
      });
    } else {
      console.warn('PostHog API key not found. Analytics will not be tracked.');
    }
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

export default PostHogProvider;
