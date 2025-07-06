import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Providers } from "./Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Discover new Minds",
  description: "Its time to Discover new Minds",
  authors: [{ name: "Team DiscoverMinds.ai" }],
  icons: {
    // icon: "https://www.discovermind.com/_site/images/logo-dark.png",
    icon: "/logo.png",
  },
  openGraph: {
    title: "Discover new Minds",
    description: "Its time to Discover new Minds",
    type: "website",
    images: [
      {
        // url: "https://www.discovermind.com/_site/images/logo-dark.png",
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Its time to Discover new Minds",
      },
    ],
  },
  // twitter: {
  //   card: "summary_large_image",
  //   site: "@lovable_dev",
  //   images: ["https://lovable.dev/opengraph-image-p98pqg.png"],
  // },
  metadataBase: new URL("https://discoverminds.ai"), // optional for relative URLs
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
