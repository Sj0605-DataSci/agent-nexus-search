'use client';

import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { isProduction, BASE_URL, generateBreadcrumbs } from '@/utils/seo';

interface StructuredDataProps {
  type: 'Organization' | 'WebSite' | 'SoftwareApplication' | 'FAQPage' | 'Article' | 'BreadcrumbList';
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
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'DiscoverMinds.ai',
    url: BASE_URL,
    logo: `${BASE_URL}/Logo.png`,
    sameAs: [
      'https://twitter.com/discovermindsai',
      'https://www.linkedin.com/company/discoverminds-ai',
      // Add other social profiles here
    ],
    description: 'AI-Powered Network Intelligence Platform that helps you leverage your extended professional network.',
    ...data
  };

  // Website data
  const websiteData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'DiscoverMinds.ai',
    url: BASE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      'target': `${BASE_URL}/user-query?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    },
    ...data
  };

  // Software application data
  const softwareApplicationData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'DiscoverMinds.ai',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    },
    ...data
  };

  // Article data (for blog posts)
  const articleData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: data?.headline || 'DiscoverMinds.ai - AI-Powered Network Intelligence',
    image: data?.image || [`${BASE_URL}/Images/og-image.png`],
    datePublished: data?.datePublished || new Date().toISOString(),
    dateModified: data?.dateModified || new Date().toISOString(),
    author: {
      '@type': 'Organization',
      name: 'DiscoverMinds.ai Team',
      url: `${BASE_URL}/about`
    },
    publisher: {
      '@type': 'Organization',
      name: 'DiscoverMinds.ai',
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/Logo.png`
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${BASE_URL}${pathname}`
    },
    ...data
  };

  // FAQ data
  const faqData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: data?.questions || [
      {
        '@type': 'Question',
        name: 'What is DiscoverMinds.ai?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'DiscoverMinds.ai is an AI-powered network intelligence platform that helps you leverage your extended professional network to find opportunities through warm introductions.'
        }
      },
      {
        '@type': 'Question',
        name: 'How does DiscoverMinds.ai work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'DiscoverMinds.ai analyzes your professional network and uses AI to identify connections and opportunities that might otherwise remain hidden. It helps you discover the most relevant people in your extended network for specific needs.'
        }
      }
    ]
  };

  // Breadcrumb data
  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: data?.itemListElement || generateBreadcrumbs(pathname).map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.item
    }))
  };

  // Select the appropriate structured data based on type
  let structuredData;
  switch (type) {
    case 'Organization':
      structuredData = organizationData;
      break;
    case 'WebSite':
      structuredData = websiteData;
      break;
    case 'SoftwareApplication':
      structuredData = softwareApplicationData;
      break;
    case 'Article':
      structuredData = articleData;
      break;
    case 'FAQPage':
      structuredData = faqData;
      break;
    case 'BreadcrumbList':
      structuredData = breadcrumbData;
      break;
    default:
      structuredData = organizationData;
  }

  return (
    <Script
      id={`structured-data-${type.toLowerCase()}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
