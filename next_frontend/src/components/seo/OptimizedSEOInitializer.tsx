"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import SEOAnalytics from "@/utils/seo-analytics";

/**
 * OptimizedSEOInitializer - Efficient SEO tracking initialization
 * Follows Single Responsibility Principle
 * Prevents redundant initializations and optimizes tracking
 */
export default function OptimizedSEOInitializer() {
  const pathname = usePathname();
  const initializedRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Initialize only once
    if (!initializedRef.current) {
      const cleanup = SEOAnalytics.init();
      cleanupRef.current = cleanup || null;
      initializedRef.current = true;
    }

    // Track page view on route change
    if (pathname) {
      const pageName = pathname.split("/").pop() || "home";
      SEOAnalytics.trackPageView(pageName, { custom_path: pathname });
    }

    // Cleanup on unmount
    return () => {
      if (cleanupRef.current && typeof cleanupRef.current === "function") {
        cleanupRef.current();
        cleanupRef.current = null;
        initializedRef.current = false;
      }
    };
  }, [pathname]);

  return null;
}
