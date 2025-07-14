'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import posthog from 'posthog-js';
import { useAuth } from '@/hooks/useAuth';

interface AnalyticsProviderProps {
  children: ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Track page views when the route changes
  useEffect(() => {
    if (pathname && typeof window !== 'undefined') {
      // Get search params safely on the client side only
      const searchParamsString = window.location.search;
      
      let url = window.origin + pathname;
      
      // Add search parameters to the URL if they exist
      if (searchParamsString) {
        url += searchParamsString;
      }
      
      // Capture page view event
      posthog.capture('$pageview', {
        $current_url: url,
        path: pathname,
      });
    }
  }, [pathname]);

  // Set up super properties that will be sent with every event
  useEffect(() => {
    // Set super properties that will be included with all events
    posthog.register({
      app_version: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
      platform: 'web',
      is_authenticated: !!user,
    });

    // If user is authenticated, set user-specific super properties
    if (user) {
      posthog.register({
        user_id: user.id,
        email_domain: user.email ? user.email.split('@')[1] : null,
      });
    }
  }, [user]);

  return <>{children}</>;
}

export default AnalyticsProvider;
