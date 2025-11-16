import React from "react";
import { Metadata } from "next";

import Navbar from "./tara/components/Navbar";
import HeroSection from "./tara/components/HeroSection";
import FeaturePillars from "./tara/components/FeaturePillars";
import Pricing from "./tara/components/Pricing";
import ProductModules from "./tara/components/ProductModules";
import CTABanner from "./tara/components/CTABanner";
import HowItWorks from "./tara/components/HowItWorks";
import Testimonials from "./tara/components/Testimonials";
import FAQ from "./tara/components/FAQ";
import TaraFooter from "./tara/components/TaraFooter";

export const dynamic = "force-static";

const baseMetadata = {
  title: "Tara - AI Copilot for TallyPrime | Automate Your Accounting",
  description:
    "Automate Tally with Tara—your conversational accounting copilot. Upload invoices via WhatsApp, chat 24/7, and keep ledgers accurate with AI-powered automation.",
};

const productionMetadata: Metadata = {
  title: "Tara - AI Copilot for TallyPrime | Automate Your Accounting",
  description:
    "Automate Tally with Tara—your conversational accounting copilot. Upload invoices via WhatsApp, chat 24/7, and keep ledgers accurate with AI-powered automation. Save 80% time on data entry.",
  keywords: [
    "Tally automation",
    "TallyPrime AI",
    "accounting automation",
    "invoice automation",
    "WhatsApp accounting",
    "Tally chatbot",
    "GST automation",
    "inventory management",
    "AI accounting assistant",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Tara - AI Copilot for TallyPrime | Automate Your Accounting",
    description:
      "Automate your Tally workflow with AI. Upload invoices via WhatsApp, get instant insights, and save 80% time on data entry. Your 24/7 accounting copilot.",
    url: "https://hellotara.in",
    siteName: "Tara - AI Copilot for TallyPrime",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://hellotara.in/Images/tara-og-image.png",
        width: 1200,
        height: 630,
        alt: "Tara - AI Copilot for TallyPrime",
        type: "image/png",
        secureUrl: "https://hellotara.in/Images/tara-og-image.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tara - AI Copilot for TallyPrime",
    description:
      "Automate your Tally workflow with AI. Upload invoices via WhatsApp, get instant insights, and save 80% time on data entry.",
    images: [
      {
        url: "https://hellotara.in/Images/tara-og-image.png",
        width: 1200,
        height: 630,
        alt: "Tara - AI Copilot for TallyPrime",
      },
    ],
    creator: "@TaraAI",
  },
};

export const metadata: Metadata =
  process.env.NODE_ENV === "production" ? productionMetadata : baseMetadata;

function addStructuredData() {
  return {
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Tara",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, WhatsApp",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "INR",
        description: "Free trial available",
      },
      description:
        "AI-powered accounting copilot for TallyPrime. Automate invoices, inventory, and ledgers via WhatsApp.",
      url: "https://hellotara.in",
      provider: {
        "@type": "Organization",
        name: "Tara",
        url: "https://hellotara.in",
      },
      featureList: [
        "WhatsApp Integration",
        "Invoice Automation",
        "Inventory Management",
        "GST Compliance",
        "Real-time Analytics",
        "Voice Commands",
      ],
    }),
  };
}

export default function TaraHomePage() {
  return (
    <main className="">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={addStructuredData()}
        key="structured-data"
      />
      <Navbar />
      <HeroSection />
      <FeaturePillars />
      <HowItWorks />
      <ProductModules />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTABanner />
      <TaraFooter />
    </main>
  );
}
