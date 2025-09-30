"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import SEOAnalytics from "@/utils/seo-analytics";

/**
 * SEOInitializer Component
 * 
 * This component initializes SEO tracking and analytics when the application loads.
 * It should be included in the root layout to ensure proper tracking across the site.
 */
export default function SEOInitializer() {
  const pathname = usePathname();

  useEffect(() => {
    // Initialize SEO tracking
    const cleanup = SEOAnalytics.init();
    
    // Track page view on route change
    if (pathname) {
      const pageName = pathname.split('/').pop() || 'home';
      
      // Track page view with enhanced context
      SEOAnalytics.trackPageView(pageName, {
        custom_path: pathname
      });
    }
    
    // Clean up event listeners when component unmounts
    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [pathname]);

  // This is a utility component that doesn't render anything visible
  return null;
}
