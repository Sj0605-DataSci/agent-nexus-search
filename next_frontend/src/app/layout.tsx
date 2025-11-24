import type { Metadata } from "next";
import React from "react";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./Providers";
import NoIndexTags from "@/components/seo/NoIndexTags";
import ConsolidatedStructuredData from "@/components/seo/ConsolidatedStructuredData";
import OptimizedCanonicalUrl from "@/components/seo/OptimizedCanonicalUrl";
import OptimizedSEOInitializer from "@/components/seo/OptimizedSEOInitializer";
import dynamic from "next/dynamic";

const Analytics = dynamic(() => import("@vercel/analytics/next").then(mod => mod.Analytics), {
  ssr: false,
  loading: () => null,
});
const SpeedInsights = dynamic(
  () => import("@vercel/speed-insights/next").then(mod => mod.SpeedInsights),
  {
    ssr: false,
    loading: () => null,
  }
);
const AnalyticsLoader = dynamic(() => import("@/components/analytics/AnalyticsLoader"), {
  ssr: false,
  loading: () => null,
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "optional", // Changed from swap to optional for faster FCP
  preload: true,
  adjustFontFallback: true,
  fallback: ["system-ui", "arial"],
  weight: ["400", "500", "600"], // Limit font weights to reduce bundle
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  display: "optional", // Changed from swap to optional
  preload: false, // Don't preload secondary font
  adjustFontFallback: true,
  fallback: ["monospace"],
  weight: ["400", "500"], // Limit weights
});

const isStaging = process.env.NODE_ENV != "production";

const metadataConfig = {
  production: {
    title: {
      default: "Tara - AI Copilot for TallyPrime | Automate Your Accounting",
      template: "%s | Tara - AI Copilot for TallyPrime",
    },
    description:
      "Automate Tally with Tara—your conversational accounting copilot. Upload invoices via WhatsApp, chat 24/7, and keep ledgers accurate with AI-powered automation. Save 80% time on data entry with 95% fewer errors.",
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
      "Tally Prime integration",
      "accounting copilot",
      "invoice OCR",
      "ledger automation",
      "business accounting AI",
      "Tally WhatsApp bot",
      "automated bookkeeping",
      "GST compliance",
      "invoice processing",
      "accounting software India",
      "Tally ERP automation",
    ],
    applicationName: "Tara - AI Copilot for TallyPrime",
    generator: "Next.js",
    referrer: "origin-when-cross-origin",
    authors: [
      {
        name: "Tara Team",
        url: "https://hellotara.in",
      },
    ],
    creator: "Tara",
    publisher: "Tara",
    metadataBase: new URL("https://hellotara.in"),
    alternates: {
      canonical: "/",
      languages: {
        "en-US": "https://hellotara.in",
      },
    },
    icons: {
      icon: [
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      ],
      shortcut: "/favicon.ico",
      apple: "/apple-touch-icon.png",
      other: [
        {
          rel: "icon",
          url: "/favicon.ico",
        },
      ],
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: "https://hellotara.in",
      siteName: "Tara - AI Copilot for TallyPrime",
      title: "Tara - AI Copilot for TallyPrime | Automate Your Accounting",
      description:
        "Automate your Tally workflow with AI. Upload invoices via WhatsApp, get instant insights, and save 80% time on data entry. Your 24/7 accounting copilot.",
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
    appLinks: {
      web: {
        url: "https://hellotara.in",
        should_fallback: true,
      },
    },
    twitter: {
      card: "summary_large_image",
      title: "Tara - AI Copilot for TallyPrime",
      description:
        "Automate your Tally workflow with AI. Upload invoices via WhatsApp, get instant insights, and save 80% time on data entry. Your 24/7 accounting copilot.",
      images: [
        {
          url: "https://hellotara.in/Images/tara-og-image.png",
          width: 1200,
          height: 630,
          alt: "Tara - AI Copilot for TallyPrime",
        },
      ],
      creator: "@TaraAI",
      site: "@TaraAI",
    },
    robots: {
      index: true,
      follow: true,
      nocache: false,
      googleBot: {
        index: true,
        follow: true,
        noimageindex: false,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    verification: {
      // Add your actual Google Search Console verification code here
      google: "7jq0iu4o2D1m4h_SQ8c76b0LFj6jDHUbRXxNtX4FFCA",
      yandex: "1be636ef641bd072",
      // bing: "your-bing-verification-code",
      // yahoo: "your-yahoo-verification-code",
    },
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "Tara - AI for TallyPrime",
    },
    formatDetection: {
      telephone: false,
    },
    category: "technology",
  },
  default: {
    title: {
      default: "Tara - AI Copilot for TallyPrime | Automate Your Accounting",
      template: "%s | Tara - AI Copilot for TallyPrime",
    },
    description:
      "Automate Tally with Tara—your conversational accounting copilot. Upload invoices via WhatsApp, chat 24/7, and keep ledgers accurate with AI-powered automation.",
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
        "max-video-preview": -1,
        "max-image-preview": "none",
        "max-snippet": -1,
      },
    },
  },
};

export const metadata: Metadata =
  process.env.NODE_ENV === "production"
    ? (metadataConfig.production as Metadata)
    : (metadataConfig.default as Metadata);

export const viewport = {
  themeColor: "#ffffff",
};

// NoIndexTags and StructuredData components are already imported at the top of the file

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              body{background:#fff;color:#0f1729;font-family:system-ui,-apple-system,sans-serif;margin:0;padding:0}
              html{scroll-behavior:smooth;text-rendering:optimizeSpeed;overflow-x:hidden}
              .hero-section{position:relative;padding-top:10rem;padding-bottom:0}
              @media(min-width:768px){.hero-section{padding-top:10rem}}
              h1,h2{font-weight:500;line-height:1.2}
              img{max-width:100%;height:auto}
              *{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
            `,
          }}
        />
        <link rel="modulepreload" href="/_next/static/chunks/main-app.js" />
        <link rel="modulepreload" href="/_next/static/chunks/webpack.js" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="dns-prefetch" href="https://apis.discoverminds.ai" />
        <link rel="dns-prefetch" href="https://staging-apis.discoverminds.ai" />
        {/* Explicit favicon links for better browser compatibility */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        {/* Preload only critical above-the-fold logos */}
        <link
          rel="preload"
          href="/logos/TrustedPartners/Adobe.webp"
          as="image"
          type="image/webp"
          fetchPriority="high"
        />
        <link
          rel="preload"
          href="/logos/TrustedPartners/Google.webp"
          as="image"
          type="image/webp"
          fetchPriority="high"
        />
        <link
          rel="preload"
          href="/logos/TrustedPartners/Meta.webp"
          as="image"
          type="image/webp"
          fetchPriority="high"
        />
        {process.env.NODE_ENV === "production" ? (
          <>
            <link rel="dns-prefetch" href="https://wznveojncixcptajnjom.supabase.co" />
            <link rel="dns-prefetch" href="https://mtxrobrwanikajymnkaf.supabase.co" />
            <OptimizedSEOInitializer />
            <ConsolidatedStructuredData />
            <OptimizedCanonicalUrl />
          </>
        ) : (
          <NoIndexTags />
        )}
      </head>
      <body
        className={`${inter.variable} ${robotoMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
        {process.env.NODE_ENV === "production" && (
          <>
            <React.Suspense fallback={null}>
              <AnalyticsLoader />
              <Analytics />
              <SpeedInsights />
            </React.Suspense>
          </>
        )}
      </body>
    </html>
  );
}
