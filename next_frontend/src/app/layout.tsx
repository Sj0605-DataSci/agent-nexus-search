import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Providers } from "./Providers";
import GoogleAnalytics from "@/components/analytics/GoogleAnalytics";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

const baseMetadata = {
  title: {
    default: "DiscoverMinds.ai - Unlock Your Network's Potential",
    template: "%s | DiscoverMinds.ai",
  },
  description: "",
};

const productionMetadata: Metadata = {
  title: {
    default: "DiscoverMinds.ai | Unlock Your Network's Potential",
    template: "%s | DiscoverMinds.ai",
  },
  description:
    "Unlock the hidden job market and find opportunities through warm introductions. DiscoverMinds.ai helps you leverage your extended professional network.",
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
    title: "DiscoverMinds.ai | Intelligent People Search Engine",
    description:
      "Discover and connect with professionals using our AI-powered people search engine.",
    images: [
      {
        url: "https://discoverminds.ai/Images/og-image.png",
        width: 1200,
        height: 630,
        alt: "DiscoverMinds.ai - Intelligent People Search",
        type: "image/png",
        secureUrl: "https://discoverminds.ai/Images/og-image.png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DiscoverMinds.ai | Intelligent People Search Engine",
    description:
      "Discover and connect with professionals using our AI-powered people search engine.",
    images: [
      {
        url: "https://discoverminds.ai/Images/og-image.png",
        width: 1200,
        height: 630,
        alt: "DiscoverMinds.ai - Intelligent People Search",
      },
    ],
    creator: "@discovermindsai",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
    yandex: "your-yandex-verification-code",
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DiscoverMinds.ai",
  },
  formatDetection: {
    telephone: false,
  },
};

export const metadata: Metadata =
  process.env.NODE_ENV === "production" ? productionMetadata : baseMetadata;

export const viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      {process.env.NODE_ENV === "production" && <GoogleAnalytics />}
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
