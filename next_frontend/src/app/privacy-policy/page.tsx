import { Metadata } from "next";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import privacyPolicy from "@/constant/privacy-policy.json";
import TaraFooter from "@/app/tara/components/TaraFooter";

const baseMetadata = {
  title: "Privacy Policy | Tara - AI Copilot for TallyPrime",
  description:
    "Learn how Tara protects your TallyPrime data and respects your privacy. Our comprehensive privacy policy explains data collection, usage, and security measures.",
};

const productionMetadata: Metadata = {
  title: "Privacy Policy | Tara - AI Copilot for TallyPrime",
  description:
    "Learn how Tara protects your TallyPrime accounting data and respects your privacy. Our comprehensive privacy policy explains data collection, usage, security measures, and your rights.",
  keywords: [
    "privacy policy",
    "data protection",
    "Tara privacy",
    "TallyPrime data security",
    "accounting data privacy",
    "GDPR compliance",
    "data security",
    "Tara data protection",
  ],
  openGraph: {
    title: "Privacy Policy | Tara - AI Copilot for TallyPrime",
    description:
      "Learn how Tara protects your TallyPrime data and respects your privacy. Comprehensive privacy policy for our AI accounting copilot.",
    url: "https://hellotara.in/privacy-policy",
    siteName: "Tara - AI Copilot for TallyPrime",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy | Tara - AI Copilot for TallyPrime",
    description: "Learn how Tara protects your TallyPrime data and respects your privacy.",
  },
  alternates: {
    canonical: "https://hellotara.in/privacy-policy",
  },
};

export const metadata: Metadata =
  process.env.NODE_ENV === "production" ? productionMetadata : baseMetadata;

export const revalidate = 60 * 60 * 24; // Revalidate every 24 hours

function addBreadcrumbList() {
  return {
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://hellotara.in",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Privacy Policy",
        },
      ],
    }),
  };
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white/90 to-white/80">
      <script type="application/ld+json" dangerouslySetInnerHTML={addBreadcrumbList()} />
      <div
        itemScope
        itemType="https://schema.org/WebPage"
        className="max-w-4xl mx-auto px-4 py-8 sm:px-6"
      >
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
            {privacyPolicy.title}
          </h1>
          <p className="text-gray-600" itemProp="description">
            {privacyPolicy.introduction}
          </p>
          <p className="text-sm text-gray-500 mt-2" itemProp="dateModified">
            Last updated: {privacyPolicy.lastUpdated}
          </p>
        </header>

        {/* Main Content */}
        <div className="p-6 md:p-0">
          <div className="prose prose-gray max-w-none">
            {privacyPolicy.sections.map((section, idx) => (
              <section key={idx} className="mb-10 last:mb-0">
                <h2
                  className="text-xl font-semibold text-gray-900 mb-3"
                  itemProp="hasPart"
                  itemScope
                  itemType="https://schema.org/WebPageElement"
                >
                  <span itemProp="name">{section.title}</span>
                </h2>
                <div className="space-y-3">
                  {section.content.map((point, jdx) => (
                    <p key={jdx} className="text-gray-700" itemProp="text">
                      {point}
                    </p>
                  ))}
                </div>
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
                  href={`mailto:${privacyPolicy.contact.sendto}`}
                  className="text-blue-600 hover:underline"
                >
                  {privacyPolicy.contact.sendto}
                </a>
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Address:</span> {privacyPolicy.contact.address}
              </p>
            </div>
          </div>
        </div>
      </div>
      <TaraFooter />
    </div>
  );
}
