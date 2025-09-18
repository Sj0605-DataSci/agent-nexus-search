import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import Script from "next/script";
import { Providers } from "./Providers";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";
import NoIndexTags from "@/components/seo/NoIndexTags";
import StructuredData from "@/components/seo/StructuredData";
import CanonicalUrl from "@/components/seo/CanonicalUrl";
import PostHogAnalytics from "@/components/analytics/PostHogAnalytics";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
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
      "max-video-preview": -1,
      "max-image-preview": "none",
      "max-snippet": -1,
    } as any,
  } as any,
};

const productionMetadata: Metadata = {
  title: {
    default: "DiscoverMinds.ai | AI-Powered Network Intelligence Platform",
    template: "%s | DiscoverMinds.ai - Network Intelligence Platform",
  },
  description:
    "DiscoverMinds.ai helps you unlock the hidden job market and find opportunities through warm introductions. Leverage your extended professional network with our AI-powered people search engine.",
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
    "people search engine",
    "AI networking tool",
    "professional connections",
    "network mapping",
    "LinkedIn network tool",
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
    title: "DiscoverMinds.ai | AI-Powered Network Intelligence Platform",
    description:
      "Unlock your professional network's potential with DiscoverMinds.ai. Our AI-powered people search engine helps you discover hidden connections and opportunities.",
    images: [
      {
        url: "https://discoverminds.ai/Images/og-image.png",
        width: 1200,
        height: 630,
        alt: "DiscoverMinds.ai - AI-Powered Network Intelligence Platform",
        type: "image/png",
        secureUrl: "https://discoverminds.ai/Images/og-image.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DiscoverMinds.ai | AI-Powered Network Intelligence Platform",
    description:
      "Unlock your professional network's potential with DiscoverMinds.ai. Our AI-powered people search engine helps you discover hidden connections and opportunities.",
    images: [
      {
        url: "https://discoverminds.ai/Images/og-image.png",
        width: 1200,
        height: 630,
        alt: "DiscoverMinds.ai - AI-Powered Network Intelligence Platform",
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
    other: {
      "msvalidate.01": "your-bing-verification-code",
      y_key: "your-yahoo-verification-code",
    },
  } as any,
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://apis.discoverminds.ai" />
        <link rel="dns-prefetch" href="https://staging-apis.discoverminds.ai" />
        <link rel="dns-prefetch" href="https://wznveojncixcptajnjom.supabase.co" />
        <link rel="dns-prefetch" href="https://mtxrobrwanikajymnkaf.supabase.co" />
        <link rel="dns-prefetch" href="https://us.i.posthog.com" />

        <Script id="load-css" strategy="afterInteractive">
          {`
            (function() {
              var link = document.createElement('link');
              link.rel = 'stylesheet';
              link.href = '/globals.css';
              document.head.appendChild(link);
              })();
              `}
        </Script>
        <noscript>
          <link rel="stylesheet" href="/globals.css" />
        </noscript>
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
      </head>
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
