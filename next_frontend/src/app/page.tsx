import Header from "@/components/Homepage/Navbar";
import { Metadata } from "next";
import NewHeroSection from "@/components/Homepage/NewHeroSection";
import React from "react";
import dynamicImporter from "next/dynamic";
const Offerings = dynamicImporter(() => import("@/components/Homepage/Offerings"), {
  loading: () => <div className="min-h-[600px] bg-[#B2DC8A]" />,
  ssr: false,
});

// Lazy load below-the-fold components - client-side only for optimal performance
const HowItWorks = dynamicImporter(() => import("@/components/Homepage/HowItWorks"), {
  loading: () => <div className="min-h-[400px] bg-gray-50" />,
  ssr: false,
});
const WhyDiscoverMinds = dynamicImporter(() => import("@/components/Homepage/WhyDiscoverMinds"), {
  loading: () => <div className="min-h-[500px] bg-white" />,
  ssr: false,
});
const FaqSection = dynamicImporter(() => import("@/components/Pricing/FaqSection"), {
  loading: () => <div className="min-h-[300px] bg-white" />,
  ssr: false,
});
const NewFooter = dynamicImporter(() => import("@/components/Footer/NewFooter"), {
  loading: () => <div className="min-h-[200px] bg-gray-900" />,
  ssr: false,
});

export const dynamic = "force-static";

const baseMetadata = {
  title: "DiscoverMinds.ai | Your Secret Weapon for Professional Networking",
  description:
    "A mutual network-sharing platform that turns your network into your competitive advantage through AI-powered search and warm introductions.",
};

const productionMetadata: Metadata = {
  title: "Home | Your Secret Weapon for Professional Networking",
  description:
    "DiscoverMinds.ai is your secret weapon for professional networking. Find the right connections instantly through AI-powered search and turn your network into your competitive advantage.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "DiscoverMinds.ai | Your Secret Weapon for Professional Networking",
    description:
      "Turn your network into your competitive advantage. Find the right connections instantly with AI-powered search and warm introductions.",
    url: "https://discoverminds.ai",
    siteName: "DiscoverMinds.ai",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://discoverminds.ai/Images/og-image.png",
        width: 1200,
        height: 630,
        alt: "DiscoverMinds.ai - Your Secret Weapon for Professional Networking",
        type: "image/png",
        secureUrl: "https://discoverminds.ai/Images/og-image.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DiscoverMinds.ai | Your Secret Weapon for Professional Networking",
    description:
      "Turn your network into your competitive advantage. Find the right connections instantly with AI-powered search and warm introductions.",
    images: [
      {
        url: "https://discoverminds.ai/Images/og-image.png",
        width: 1200,
        height: 630,
        alt: "DiscoverMinds.ai - Your Secret Weapon for Professional Networking",
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
