import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import posthog from 'posthog-js';

/**
 * Hook to track page views in PostHog
 * Use this in layout components to automatically track page views
 */
export function usePageView() {
  const pathname = usePathname();
  
  useEffect(() => {
    // Track page views when the route changes
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
}

export default usePageView;
