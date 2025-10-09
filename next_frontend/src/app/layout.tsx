import type { Metadata } from "next";
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
});
const SpeedInsights = dynamic(
  () => import("@vercel/speed-insights/next").then(mod => mod.SpeedInsights),
  {
    ssr: false,
  }
);
const AnalyticsLoader = dynamic(() => import("@/components/analytics/AnalyticsLoader"), {
  ssr: false,
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

const isStaging = process.env.NODE_ENV != "production";

const metadataConfig = {
  production: {
    title: {
      default: "DiscoverMinds.ai | AI-Powered Network Intelligence Platform for Career Growth",
      template: "%s | DiscoverMinds.ai - Network Intelligence Platform",
    },
    description:
      "DiscoverMinds.ai helps professionals unlock the hidden job market and find career opportunities through warm introductions. Leverage your extended professional network with our AI-powered people search engine to discover connections and grow your career.",
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
      title: "DiscoverMinds.ai | AI-Powered Network Intelligence Platform for Career Growth",
      description:
        "Unlock your professional network's potential with DiscoverMinds.ai. Our AI-powered people search engine helps you discover hidden connections and opportunities for career advancement through warm introductions.",
      images: [
        {
          url: "https://discoverminds.ai/Images/og-image.png",
          width: 1200,
          height: 630,
          alt: "DiscoverMinds.ai - AI-Powered Network Intelligence Platform for Career Growth",
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
      title: "DiscoverMinds.ai | AI-Powered Network Intelligence Platform for Career Growth",
      description:
        "Unlock your professional network's potential with DiscoverMinds.ai. Our AI-powered people search engine helps you discover hidden connections and opportunities for career advancement through warm introductions.",
      images: [
        {
          url: "https://discoverminds.ai/Images/og-image.png",
          width: 1200,
          height: 630,
          alt: "DiscoverMinds.ai - AI-Powered Network Intelligence Platform for Career Growth",
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
      default: "DiscoverMinds.ai - Unlock Your Network's Potential",
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://apis.discoverminds.ai" />
        <link rel="dns-prefetch" href="https://staging-apis.discoverminds.ai" />
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
            <AnalyticsLoader />
            <Analytics />
            <SpeedInsights />
          </>
        )}
      </body>
    </html>
  );
}
