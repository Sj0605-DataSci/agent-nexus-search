"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { isProduction, getCanonicalUrl } from "@/utils/seo";

interface CanonicalUrlProps {
  path?: string;
}

/**
 * Component that adds canonical URL meta tag to prevent duplicate content issues
 * Only renders in production environments
 *
 * Note: For Next.js App Router, canonical URLs should ideally be set in the metadata
 * object of each page. This component is a client-side fallback for dynamic routes
 * or when you need to set canonical URLs programmatically.
 */
export default function CanonicalUrl({ path }: CanonicalUrlProps) {
  const pathname = usePathname();

  // Only render in production environment
  if (!isProduction()) {
    return null;
  }

  // Use provided path or current pathname
  const canonicalPath = path || pathname;

  // Get canonical URL using utility function
  const canonicalUrl = getCanonicalUrl(canonicalPath);

  // Using Script component to inject the canonical link
  return (
    <Script id="canonical-url" strategy="afterInteractive">
      {`
        (function() {
          // Check if canonical link already exists
          let canonical = document.querySelector('link[rel="canonical"]');
          if (!canonical) {
            // Create and append canonical link if it doesn't exist
            canonical = document.createElement('link');
            canonical.rel = 'canonical';
            document.head.appendChild(canonical);
          }
          // Set or update the href attribute
          canonical.href = '${canonicalUrl}';
        })();
      `}
    </Script>
  );
}
