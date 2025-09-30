"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { isProduction, BASE_URL } from "@/utils/seo";

interface EnhancedSchemaMarkupProps {
  type:
    | "JobPosting"
    | "HowTo"
    | "LocalBusiness"
    | "Product"
    | "Review"
    | "Event"
    | "Course"
    | "Person"
    | "ProfessionalService";
  data?: Record<string, any>;
}

/**
 * Enhanced Schema Markup Component
 * 
 * This component extends the existing StructuredData component with additional
 * schema types that are relevant for professional networking and career services.
 */
export default function EnhancedSchemaMarkup({ type, data }: EnhancedSchemaMarkupProps) {
  const pathname = usePathname();
  
  // Only render in production environment
  if (!isProduction()) {
    return null;
  }
  
  // Job Posting schema
  const jobPostingData = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: data?.title || "Professional Opportunity",
    description: data?.description || "A career opportunity found through DiscoverMinds.ai network intelligence platform.",
    datePosted: data?.datePosted || new Date().toISOString(),
    validThrough: data?.validThrough,
    employmentType: data?.employmentType || "FULL_TIME",
    hiringOrganization: {
      "@type": "Organization",
      name: data?.organizationName || "Hiring Company",
      sameAs: data?.organizationUrl || BASE_URL,
      logo: data?.organizationLogo,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: data?.addressLocality || "",
        addressRegion: data?.addressRegion || "",
        addressCountry: data?.addressCountry || "",
      },
    },
    ...data,
  };
  
  // How-To schema (for guides, tutorials)
  const howToData = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: data?.name || "How to Use DiscoverMinds.ai for Professional Networking",
    description: data?.description || "A step-by-step guide to leveraging your professional network with DiscoverMinds.ai.",
    totalTime: data?.totalTime || "PT30M",
    tool: data?.tools || [
      {
        "@type": "HowToTool",
        name: "DiscoverMinds.ai Platform",
      },
    ],
    step: data?.steps || [
      {
        "@type": "HowToStep",
        name: "Create an Account",
        text: "Sign up for a DiscoverMinds.ai account to get started.",
        url: `${BASE_URL}/user-auth`,
      },
    ],
    ...data,
  };
  
  // Local Business schema
  const localBusinessData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: data?.name || "DiscoverMinds.ai",
    description: data?.description || "AI-Powered Network Intelligence Platform for professionals.",
    url: BASE_URL,
    telephone: data?.telephone,
    address: {
      "@type": "PostalAddress",
      streetAddress: data?.streetAddress || "",
      addressLocality: data?.addressLocality || "",
      addressRegion: data?.addressRegion || "",
      postalCode: data?.postalCode || "",
      addressCountry: data?.addressCountry || "",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: data?.latitude,
      longitude: data?.longitude,
    },
    ...data,
  };
  
  // Product schema
  const productData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: data?.name || "DiscoverMinds.ai Platform",
    description: data?.description || "AI-Powered Network Intelligence Platform that helps professionals leverage their extended networks.",
    image: data?.image || [`${BASE_URL}/Images/og-image.png`],
    brand: {
      "@type": "Brand",
      name: "DiscoverMinds.ai",
    },
    offers: {
      "@type": "Offer",
      price: data?.price || "0",
      priceCurrency: data?.priceCurrency || "USD",
      availability: "https://schema.org/InStock",
      url: `${BASE_URL}/pricing`,
    },
    ...data,
  };
  
  // Review schema
  const reviewData = {
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: {
      "@type": "SoftwareApplication",
      name: "DiscoverMinds.ai",
      applicationCategory: "BusinessApplication",
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: data?.ratingValue || "5",
      bestRating: "5",
      worstRating: "1",
    },
    author: {
      "@type": "Person",
      name: data?.authorName || "Platform User",
    },
    reviewBody: data?.reviewBody || "DiscoverMinds.ai has transformed how I network professionally.",
    ...data,
  };
  
  // Event schema
  const eventData = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: data?.name || "DiscoverMinds.ai Networking Event",
    startDate: data?.startDate || new Date().toISOString(),
    endDate: data?.endDate,
    location: {
      "@type": "Place",
      name: data?.locationName || "Online",
      address: data?.address || "Virtual Event",
    },
    description: data?.description || "Join us for a professional networking event powered by DiscoverMinds.ai.",
    organizer: {
      "@type": "Organization",
      name: "DiscoverMinds.ai",
      url: BASE_URL,
    },
    ...data,
  };
  
  // Course schema
  const courseData = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: data?.name || "Mastering Professional Networking with DiscoverMinds.ai",
    description: data?.description || "Learn how to leverage your professional network effectively using DiscoverMinds.ai.",
    provider: {
      "@type": "Organization",
      name: "DiscoverMinds.ai",
      sameAs: BASE_URL,
    },
    ...data,
  };
  
  // Person schema
  const personData = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: data?.name || "",
    jobTitle: data?.jobTitle || "",
    worksFor: data?.worksFor ? {
      "@type": "Organization",
      name: data.worksFor,
    } : undefined,
    description: data?.description || "",
    image: data?.image,
    sameAs: data?.sameAs || [],
    ...data,
  };
  
  // Professional Service schema
  const professionalServiceData = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: data?.name || "DiscoverMinds.ai Network Intelligence",
    description: data?.description || "AI-powered professional networking intelligence service.",
    serviceType: data?.serviceType || "Professional Networking",
    provider: {
      "@type": "Organization",
      name: "DiscoverMinds.ai",
      url: BASE_URL,
    },
    ...data,
  };
  
  // Map schema types to their data
  const schemaDataMap = {
    JobPosting: jobPostingData,
    HowTo: howToData,
    LocalBusiness: localBusinessData,
    Product: productData,
    Review: reviewData,
    Event: eventData,
    Course: courseData,
    Person: personData,
    ProfessionalService: professionalServiceData,
  };
  
  const structuredData = schemaDataMap[type];
  
  return (
    <Script
      id={`enhanced-schema-${type.toLowerCase()}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
