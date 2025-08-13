import { Metadata } from 'next';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import termsOfService from '@/constant/terms-of-service.json';
import Footer from '@/components/Homepage/Footer';

const baseMetadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for DiscoverMinds.ai',
};

const productionMetadata: Metadata = {
  title: 'Terms of Service | DiscoverMinds.ai',
  description: 'Terms of Service for DiscoverMinds.ai - The first context-aware, agent-powered search engine for people.',
  keywords: [
    'terms of service',
    'terms and conditions',
    'intelligent people search terms',
    'professional networking agreement',
    'DiscoverMinds user terms',
    'AI search platform conditions',
    'people search service agreement',
    'professional connections terms',
    'data usage policy',
    'user conduct guidelines',
    'platform usage terms',
    'search engine terms of use'
  ],
  openGraph: {
    title: 'Terms of Service | DiscoverMinds.ai',
    description: 'Review the terms and conditions for using DiscoverMinds.ai intelligent people search platform.',
    url: 'https://discoverminds.ai/terms',
    siteName: 'DiscoverMinds.ai',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Terms of Service | DiscoverMinds.ai',
    description: 'Review the terms and conditions for using DiscoverMinds.ai intelligent people search platform.',
  },
  alternates: {
    canonical: 'https://discoverminds.ai/terms',
  },
};

export const metadata: Metadata = process.env.NODE_ENV === 'production' ? productionMetadata : baseMetadata;

export const revalidate = 60 * 60 * 24; // Revalidate every 24 hours

function addBreadcrumbList() {
  return {
    __html: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://discoverminds.ai',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Terms of Service',
        },
      ],
    }),
  };
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white/90 to-white/80">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={addBreadcrumbList()}
      />
      <div itemScope itemType="https://schema.org/WebPage" className="max-w-4xl mx-auto px-4 py-8 sm:px-6 ">
        {/* Back Navigation */}
        <nav className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="Go back to home"
          >
            <FiArrowLeft className="w-5 h-5 mr-2" />
            <span className="font-medium">Back to Home</span>
          </Link>
        </nav>

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2" itemProp="headline">
            {termsOfService.title}
          </h1>
          <p className="text-gray-600" itemProp="description">{termsOfService.introduction}</p>
          <p className="text-sm text-gray-500 mt-2" itemProp="dateModified">
            Last updated: {termsOfService.lastUpdated}
          </p>
        </header>

        {/* Main Content */}
        <div className=" p-6 md:p-0">
          <div className="prose prose-gray max-w-none">
            {termsOfService.sections.map((section, idx) => (
              <section key={idx} className="mb-10 last:mb-0">
                <h2 className="text-xl font-semibold text-gray-900 mb-3" itemProp="hasPart" itemScope itemType="https://schema.org/WebPageElement">
                  <span itemProp="name">{section.title}</span>
                </h2>
                {section.title === "4. User Conduct" ? (
                  <div className="space-y-3">
                    <p className="text-gray-700" itemProp="text">{section.content[0]}</p>
                    <ul className="space-y-2 ml-4">
                      {section.content.slice(1).map((point, jdx) => (
                        <li key={jdx} className="text-gray-700" itemProp="itemListElement">
                          {point.startsWith("- ") ? point.substring(2) : point}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {section.content.map((point, jdx) => (
                      <p key={jdx} className="text-gray-700" itemProp="text">
                        {point}
                      </p>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>

          {/* Contact Section */}
          <div className="mt-12 pt-8 border-t border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Us</h2>
            <div className="space-y-2">
              <p className="text-gray-700">
                <span className="font-medium">Email:</span>{" "}
                <a
                  href={`mailto:${termsOfService.contact.sendto}`}
                  className="text-blue-600 hover:underline"
                >
                  {termsOfService.contact.sendto}
                </a>
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Address:</span> {termsOfService.contact.address}
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
