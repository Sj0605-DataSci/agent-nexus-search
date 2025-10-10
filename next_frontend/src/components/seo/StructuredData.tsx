"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { isProduction, BASE_URL, generateBreadcrumbs } from "@/utils/seo";

interface StructuredDataProps {
  type:
    | "Organization"
    | "WebSite"
    | "SoftwareApplication"
    | "FAQPage"
    | "Article"
    | "BreadcrumbList"
    | "WebPage"
    | "ImageObject"
    | "ReadAction"
    | "EntryPoint"
    | "PropertyValueSpecification"
    | "AggregateRating"
    | "InStock"
    | "NewCondition";
  data?: Record<string, any>;
}

/**
 * Component that adds structured data for rich results in search engines
 * Only renders in production environments
 */
export default function StructuredData({ type, data }: StructuredDataProps) {
  const pathname = usePathname();

  // Only render in production environment
  if (!isProduction()) {
    return null;
  }

  // Default organization data
  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "DiscoverMinds.ai",
    url: BASE_URL,
    logo: `${BASE_URL}/Logo.png`,
    sameAs: [
      "https://twitter.com/discovermindsai",
      "https://www.linkedin.com/company/discoverminds-ai",
      // Add other social profiles here
    ],
    description:
      "Your secret weapon for professional networking that turns your network into your competitive advantage.",
    ...data,
  };

  // Website data
  const websiteData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "DiscoverMinds.ai",
    url: BASE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${BASE_URL}/user-query?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
    ...data,
  };

  // Software application data
  const softwareApplicationData = {
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
    ...data,
  };

  // Article data (for blog posts)
  const articleData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: data?.headline || "DiscoverMinds.ai - Your Secret Weapon for Professional Networking",
    image: data?.image || [`${BASE_URL}/Images/og-image.png`],
    datePublished: data?.datePublished || new Date().toISOString(),
    dateModified: data?.dateModified || new Date().toISOString(),
    author: {
      "@type": "Organization",
      name: "DiscoverMinds.ai Team",
      url: `${BASE_URL}/about`,
    },
    publisher: {
      "@type": "Organization",
      name: "DiscoverMinds.ai",
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/Logo.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}${pathname}`,
    },
    ...data,
  };

  // FAQ data
  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data?.questions || [
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
  };

  // Breadcrumb data
  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement:
      data?.itemListElement ||
      (pathname ? generateBreadcrumbs(pathname) : []).map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: item.item,
      })),
  };

  // WebPage data
  const webpageData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    url: `${BASE_URL}${pathname}`,
    ...data,
  };

  // ImageObject data
  const imageObjectData = {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    url: data?.url || `${BASE_URL}/Images/og-image.png`,
    ...data,
  };

  // ReadAction data
  const readActionData = {
    "@context": "https://schema.org",
    "@type": "ReadAction",
    ...data,
  };

  // EntryPoint data
  const entryPointData = {
    "@context": "https://schema.org",
    "@type": "EntryPoint",
    urlTemplate: data?.urlTemplate || `${BASE_URL}/search?q={query}`,
    ...data,
  };

  // PropertyValueSpecification data
  const propertyValueSpecificationData = {
    "@context": "https://schema.org",
    "@type": "PropertyValueSpecification",
    ...data,
  };

  // AggregateRating data
  const aggregateRatingData = {
    "@context": "https://schema.org",
    "@type": "AggregateRating",
    ratingValue: data?.ratingValue || "5",
    bestRating: data?.bestRating || "5",
    ratingCount: data?.ratingCount || "100",
    ...data,
  };

  // InStock data
  const inStockData = {
    "@context": "https://schema.org",
    "@type": "ItemAvailability",
    name: "InStock",
    ...data,
  };

  // NewCondition data
  const newConditionData = {
    "@context": "https://schema.org",
    "@type": "OfferItemCondition",
    name: "NewCondition",
    ...data,
  };

  const structuredDataMap = {
    Organization: organizationData,
    WebSite: websiteData,
    SoftwareApplication: softwareApplicationData,
    Article: articleData,
    FAQPage: faqData,
    BreadcrumbList: breadcrumbData,
    WebPage: webpageData,
    ImageObject: imageObjectData,
    ReadAction: readActionData,
    EntryPoint: entryPointData,
    PropertyValueSpecification: propertyValueSpecificationData,
    AggregateRating: aggregateRatingData,
    InStock: inStockData,
    NewCondition: newConditionData,
  };

  const structuredData = structuredDataMap[type] || organizationData;

  return (
    <Script
      id={`structured-data-${type.toLowerCase()}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
