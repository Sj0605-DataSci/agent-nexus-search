import HomeHeader from "@/components/Homepage/Header";
import HeroSection from "@/components/Homepage/HeroSection";
import WhyChooseUs from "@/components/Homepage/WhyChooseUs";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import Footer from "@/components/Homepage/Footer";

export const dynamic = "force-static";

const baseMetadata = {
  title: "DiscoverMinds.ai",
  description: "AI-powered people search engine",
};

const productionMetadata: Metadata = {
  title: "Home | DiscoverMinds.ai - Intelligent People Search Engine",
  description:
    "Discover and connect with professionals using our AI-powered people search engine. Find the right experts and opportunities.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "DiscoverMinds.ai | Intelligent People Search Engine",
    description:
      "Discover and connect with professionals using our AI-powered people search engine.",
    url: "https://discoverminds.ai",
    siteName: "DiscoverMinds.ai",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DiscoverMinds.ai | Intelligent People Search Engine",
    description:
      "Discover and connect with professionals using our AI-powered people search engine.",
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
  redirect('/join-waitlist');
  
  return null;
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={addStructuredData()}
        key="structured-data"
      />
      <HomeHeader />
      <HeroSection />
      <WhyChooseUs />
      <Footer />
    </>
  );
}
