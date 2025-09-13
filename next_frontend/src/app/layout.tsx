import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Providers } from "./Providers";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import NoIndexTags from '@/components/seo/NoIndexTags';
import StructuredData from '@/components/seo/StructuredData';
import CanonicalUrl from '@/components/seo/CanonicalUrl';
import PostHogAnalytics from "@/components/analytics/PostHogAnalytics";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

const baseMetadata: Metadata = {
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
      'max-video-preview': -1,
      'max-image-preview': 'none',
      'max-snippet': -1,
    } as any, // Type assertion to avoid TypeScript errors with the robots configuration
  } as any, // Type assertion for robots object
};

const productionMetadata: Metadata = {
  title: {
    default: "DiscoverMinds.ai | AI-Powered Network Intelligence Platform", // Enhanced title with keywords
    template: "%s | DiscoverMinds.ai - Network Intelligence Platform", // Enhanced template with keywords
  },
  description:
    "DiscoverMinds.ai helps you unlock the hidden job market and find opportunities through warm introductions. Leverage your extended professional network with our AI-powered people search engine.", // Improved description with keywords at the beginning
  keywords: [
    "professional network",
    "warm introductions",
    "hidden job market",
    "AI-powered search",
    "network intelligence",
    "talent discovery",
    "expert finder",
    "referral network",
    "career opportunities",
    "people search engine", // Added relevant keyword
    "AI networking tool", // Added relevant keyword
    "professional connections", // Added relevant keyword
    "network mapping", // Added relevant keyword
    "LinkedIn network tool", // Added relevant keyword
  ],
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
      'en-US': 'https://discoverminds.ai',
    },
  },
  icons: {
    icon: "https://discoverminds.ai/Logo.png",
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
    title: "DiscoverMinds.ai | AI-Powered Network Intelligence Platform", // Enhanced title
    description:
      "Unlock your professional network's potential with DiscoverMinds.ai. Our AI-powered people search engine helps you discover hidden connections and opportunities.", // Enhanced description
    images: [
      {
        url: "https://discoverminds.ai/Images/og-image.png",
        width: 1200,
        height: 630,
        alt: "DiscoverMinds.ai - AI-Powered Network Intelligence Platform", // Enhanced alt text
        type: "image/png",
        secureUrl: "https://discoverminds.ai/Images/og-image.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DiscoverMinds.ai | AI-Powered Network Intelligence Platform", // Enhanced title
    description:
      "Unlock your professional network's potential with DiscoverMinds.ai. Our AI-powered people search engine helps you discover hidden connections and opportunities.", // Enhanced description
    images: [
      {
        url: "https://discoverminds.ai/Images/og-image.png",
        width: 1200,
        height: 630,
        alt: "DiscoverMinds.ai - AI-Powered Network Intelligence Platform", // Enhanced alt text
      },
    ],
    creator: "@discovermindsai",
    site: "@discovermindsai", // Added site parameter
  },
  robots: {
    index: true,
    follow: true,
    nocache: false, // Don't prevent caching
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false, // Allow image indexing
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
    yandex: "your-yandex-verification-code",
    other: {
      "msvalidate.01": "your-bing-verification-code", // Bing verification
      "y_key": "your-yahoo-verification-code", // Yahoo verification
    },
  } as any, // Type assertion for verification object
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DiscoverMinds.ai",
  },
  formatDetection: {
    telephone: false,
  },
  category: "technology", // Added category metadata
};

export const metadata: Metadata =
  process.env.NODE_ENV === "production" ? productionMetadata : baseMetadata;

export const viewport = {
  themeColor: "#ffffff",
};

// NoIndexTags and StructuredData components are already imported at the top of the file

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      {process.env.NODE_ENV === "production" ? (
        <>
          <GoogleAnalytics />
          <PostHogAnalytics />
          <StructuredData type="Organization" />
          <StructuredData type="WebSite" />
          <StructuredData type="SoftwareApplication" />
          <StructuredData type="BreadcrumbList" />
          <CanonicalUrl />
        </>
      ) : (
        <NoIndexTags />
      )}
      <body
        className={`${inter.variable} ${robotoMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
