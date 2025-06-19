import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
// import { Providers } from "./Providers";
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
  title: "Agent nexus search",
  description: "Hiring got smarter",
  authors: [{ name: "Nexus" }],
  openGraph: {
    title: "Agent nexus search",
    description: "Hiring got smarter",
    type: "website",
    images: [
      {
        url: "https://lovable.dev/opengraph-image-p98pqg.png",
        width: 1200,
        height: 630,
        alt: "Hiring got smarter OG image",
      },
    ],
  },
  // twitter: {
  //   card: "summary_large_image",
  //   site: "@lovable_dev",
  //   images: ["https://lovable.dev/opengraph-image-p98pqg.png"],
  // },
  metadataBase: new URL("https://spendwise.ai"), // optional for relative URLs
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
