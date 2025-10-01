"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { getCanonicalUrl } from "@/utils/seo";

/**
 * OptimizedCanonicalUrl - Efficient canonical URL management
 * Follows Single Responsibility Principle
 * Uses direct DOM manipulation instead of Script injection for better performance
 */
export default function OptimizedCanonicalUrl() {
  const pathname = usePathname();

  useEffect(() => {
    // Only run in production
    if (process.env.NODE_ENV !== "production" || !pathname) return;

    const canonicalUrl = getCanonicalUrl(pathname);

    // Direct DOM manipulation - more efficient than Script injection
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;

    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }

    canonical.href = canonicalUrl;
  }, [pathname]);

  return null;
}
