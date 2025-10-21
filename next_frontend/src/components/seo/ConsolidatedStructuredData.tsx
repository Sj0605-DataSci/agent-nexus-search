"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { BASE_URL, generateBreadcrumbs } from "@/utils/seo";

/**
 * ConsolidatedStructuredData - Single component for all structured data
 * Follows Single Responsibility & Open/Closed Principles
 * Reduces script injections from 5 to 1, improving performance
 */
export default function ConsolidatedStructuredData() {
  const pathname = usePathname();

  // Only render in production
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  const structuredDataArray = [
    // Organization
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "DiscoverMinds.ai",
      url: BASE_URL,
      logo: `${BASE_URL}/Logo.png`,
      sameAs: [
        "https://twitter.com/discovermindsai",
        "https://www.linkedin.com/company/discoverminds-ai",
      ],
      description:
        "Your secret weapon for professional networking that turns your network into your competitive advantage.",
    },
    // WebSite
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "DiscoverMinds.ai",
      url: BASE_URL,
      potentialAction: {
        "@type": "SearchAction",
        target: `${BASE_URL}/user-query?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    // SoftwareApplication
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "DiscoverMinds.ai",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
    // BreadcrumbList
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: (pathname ? generateBreadcrumbs(pathname) : []).map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: item.item,
      })),
    },
    // FAQPage
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is DiscoverMinds.ai?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "DiscoverMinds.ai is your secret weapon for professional networking. Turn your network into your competitive advantage with AI-powered search and warm introductions.",
          },
        },
        {
          "@type": "Question",
          name: "How does DiscoverMinds.ai work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "DiscoverMinds.ai analyzes your professional network and uses AI to identify connections and opportunities that might otherwise remain hidden. It helps you discover the most relevant people in your extended network for specific needs.",
          },
        },
      ],
    },
  ];

  return (
    <Script
      id="consolidated-structured-data"
      type="application/ld+json"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredDataArray) }}
    />
  );
}
