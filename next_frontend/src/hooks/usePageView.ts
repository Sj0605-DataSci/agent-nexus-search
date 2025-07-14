import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';

/**
 * Hook to track page views in PostHog
 * Use this in layout components to automatically track page views
 */
export function usePageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Track page views when the route changes
    if (pathname) {
      let url = window.origin + pathname;
      
      // Add search parameters to the URL if they exist
      if (searchParams?.toString()) {
        url += `?${searchParams.toString()}`;
      }
      
      // Capture page view event
      posthog.capture('$pageview', {
        $current_url: url,
        path: pathname,
      });
    }
  }, [pathname, searchParams]);
}

export default usePageView;
