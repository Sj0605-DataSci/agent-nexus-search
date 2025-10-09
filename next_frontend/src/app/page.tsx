import Header from "@/components/Homepage/Navbar";
import { Metadata } from "next";
import NewHeroSection from "@/components/Homepage/NewHeroSection";
import React from "react";
import dynamicImporter from "next/dynamic";
import Offerings from "@/components/Homepage/Offerings";

// Lazy load below-the-fold components with loading states
const HowItWorks = dynamicImporter(() => import("@/components/Homepage/HowItWorks"), {
  loading: () => <div className="min-h-[400px] bg-gray-50" />,
  ssr: true,
});
const FaqSection = dynamicImporter(() => import("@/components/Pricing/FaqSection"), {
  loading: () => <div className="min-h-[300px] bg-white" />,
  ssr: true,
});
const NewFooter = dynamicImporter(() => import("@/components/Footer/NewFooter"), {
  loading: () => <div className="min-h-[200px] bg-gray-900" />,
  ssr: true,
});
const WhyDiscoverMinds = dynamicImporter(() => import("@/components/Homepage/WhyDiscoverMinds"), {
  loading: () => <div className="min-h-[500px] bg-white" />,
  ssr: true,
});

export const dynamic = "force-static";

const baseMetadata = {
  title: "DiscoverMinds.ai | Unlock Your Network's Hidden Opportunities",
  description:
    "A mutual network-sharing platform to unlock hidden opportunities through warm introductions.",
};

const productionMetadata: Metadata = {
  title: "Home | Unlock Your Network's Hidden Opportunities",
  description:
    "DiscoverMinds.ai is a mutual network-sharing platform that helps you unlock hidden opportunities through warm introductions. Find and connect with the right people to achieve your goals.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "DiscoverMinds.ai | Unlock Your Network's Hidden Opportunities",
    description:
      "Join a community where sharing your network leads to discovering new career paths, investment opportunities, and valuable connections.",
    url: "https://discoverminds.ai",
    siteName: "DiscoverMinds.ai",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://discoverminds.ai/Images/og-image.png",
        width: 1200,
        height: 630,
        alt: "DiscoverMinds.ai - Unlock Your Network's Hidden Opportunities",
        type: "image/png",
        secureUrl: "https://discoverminds.ai/Images/og-image.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DiscoverMinds.ai | Unlock Your Network's Hidden Opportunities",
    description:
      "Join a community where sharing your network leads to discovering new career paths, investment opportunities, and valuable connections.",
    images: [
      {
        url: "https://discoverminds.ai/Images/og-image.png",
        width: 1200,
        height: 630,
        alt: "DiscoverMinds.ai - Unlock Your Network's Hidden Opportunities",
      },
    ],
    creator: "@discovermindsai",
  },
};

export const metadata: Metadata =
  process.env.NODE_ENV === "production" ? productionMetadata : baseMetadata;

function addStructuredData() {
  return {
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "DiscoverMinds.ai",
      url: "https://discoverminds.ai",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://discoverminds.ai/search?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    }),
  };
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={addStructuredData()}
        key="structured-data"
      />
      <Header />
      <main>
        <NewHeroSection />
        <Offerings />
        <HowItWorks />
        <WhyDiscoverMinds />
        <FaqSection />
        <NewFooter />
      </main>
    </div>
  );
}
