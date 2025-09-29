import React from "react";
import Navbar from "@/components/Homepage/Navbar";
import FaqSection from "@/components/Pricing/FaqSection";
import PricingPlans from "@/components/Homepage/PricingPlans";
import NewFooter from "@/components/Footer/NewFooter";

export const metadata = {
  title: "Pricing | DiscoverMinds.ai",
  description:
    "View our transparent pricing plans for all business sizes. Choose the plan that fits your needs.",
  alternates: {
    canonical: "https://www.discoverminds.ai/pricing",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    title: "Pricing | DiscoverMinds.ai",
    description:
      "View our transparent pricing plans for all business sizes. Choose the plan that fits your needs.",
    url: "https://www.discoverminds.ai/pricing",
    siteName: "DiscoverMinds.ai",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing | DiscoverMinds.ai",
    description:
      "View our transparent pricing plans for all business sizes. Choose the plan that fits your needs.",
  },
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-10 md:pt-20" />
      <main>
        <div className="text-center">
          <h1 className="sr-only">DiscoverMinds.ai Pricing Plans</h1>
        </div>
        <PricingPlans />
        <FaqSection />
      </main>
      <NewFooter />
    </div>
  );
}
