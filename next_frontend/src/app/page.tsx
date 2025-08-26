import HomeHeader from "@/components/Homepage/Header";
import HeroSection from "@/components/Homepage/HeroSection";
import WhyChooseUs from "@/components/Homepage/WhyChooseUs";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import Footer from "@/components/Homepage/Footer";
import FaqSection from "@/components/Pricing/FaqSection";

export const dynamic = "force-static";

const baseMetadata = {
  title: "DiscoverMinds.ai | Unlock Your Network's Hidden Opportunities",
  description: "A mutual network-sharing platform to unlock hidden opportunities through warm introductions.",
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
  },
  twitter: {
    card: "summary_large_image",
    title: "DiscoverMinds.ai | Unlock Your Network's Hidden Opportunities",
    description:
      "Join a community where sharing your network leads to discovering new career paths, investment opportunities, and valuable connections.",
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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={addStructuredData()}
        key="structured-data"
      />
      <HomeHeader />
      <HeroSection />
      <FaqSection />
      {/* <WhyChooseUs /> */}
      <Footer />
    </>
  );
}
