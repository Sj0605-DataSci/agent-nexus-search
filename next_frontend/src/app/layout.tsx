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
      default: "DiscoverMinds.ai | Your Secret Weapon for Professional Networking",
      template: "%s | DiscoverMinds.ai - Your Secret Weapon for Professional Networking",
    },
    description:
      "Turn your network into your competitive advantage with DiscoverMinds.ai. Find the right connections instantly through AI-powered search and warm introductions to unlock career opportunities and grow your professional network.",
    keywords: [
      "professional network intelligence",
      "warm introductions network",
      "hidden job market access",
      "AI-powered people search",
      "network intelligence platform",
      "talent discovery tool",
      "expert finder network",
      "referral network optimization",
      "career opportunities finder",
      "people search engine",
      "AI networking tool",
      "professional connections mapping",
      "network visualization",
      "LinkedIn network enhancement",
      "career growth platform",
      "professional relationship management",
      "job search optimization",
      "networking intelligence",
      "connection discovery",
      "professional graph analysis",
    ],
    applicationName: "DiscoverMinds.ai",
    generator: "Next.js",
    referrer: "origin-when-cross-origin",
    authors: [
      {
        name: "DiscoverMinds.ai Team",
        url: "https://discoverminds.ai/about",
      },
    ],
    creator: "DiscoverMinds.ai",
    publisher: "DiscoverMinds.ai",
    metadataBase: new URL("https://discoverminds.ai"),
    alternates: {
      canonical: "/",
      languages: {
        "en-US": "https://discoverminds.ai",
      },
    },
    icons: {
      icon: "https://discoverminds.ai/Logo.webp",
      shortcut:
        "https://wznveojncixcptajnjom.supabase.co/storage/v1/object/public/public-files/icon.png",
      apple:
        "https://wznveojncixcptajnjom.supabase.co/storage/v1/object/public/public-files/icon.png",
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: "https://discoverminds.ai",
      siteName: "DiscoverMinds.ai",
      title: "DiscoverMinds.ai | Your Secret Weapon for Professional Networking",
      description:
        "Turn your network into your competitive advantage with DiscoverMinds.ai. Our AI-powered search engine helps you find the right connections instantly and unlock opportunities through warm introductions.",
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
    appLinks: {
      web: {
        url: "https://discoverminds.ai",
        should_fallback: true,
      },
    },
    twitter: {
      card: "summary_large_image",
      title: "DiscoverMinds.ai | Your Secret Weapon for Professional Networking",
      description:
        "Turn your network into your competitive advantage with DiscoverMinds.ai. Our AI-powered search engine helps you find the right connections instantly and unlock opportunities through warm introductions.",
      images: [
        {
          url: "https://discoverminds.ai/Images/og-image.png",
          width: 1200,
          height: 630,
          alt: "DiscoverMinds.ai - Your Secret Weapon for Professional Networking",
        },
      ],
      creator: "@discovermindsai",
      site: "@discovermindsai",
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
      google: "your-google-verification-code",
      yandex: "1be636ef641bd072",
      bing: "your-bing-verification-code",
      yahoo: "your-yahoo-verification-code",
      other: {
        "msvalidate.01": "your-bing-verification-code",
        "baidu-site-verification": "your-baidu-verification-code",
      },
    },
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "DiscoverMinds.ai",
    },
    formatDetection: {
      telephone: false,
    },
    category: "technology",
  },
  default: {
    title: {
      default: "DiscoverMinds.ai - Your Secret Weapon for Professional Networking",
      template: "%s | DiscoverMinds.ai",
    },
    description: "",
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
