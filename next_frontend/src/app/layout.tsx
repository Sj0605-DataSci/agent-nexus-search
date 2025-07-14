import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Providers } from "./Providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Discover new Minds",
  description: "Its time to Discover new Minds",
  authors: [{ name: "Team DiscoverMinds.ai" }],
  icons: {
    icon: "https://wznveojncixcptajnjom.supabase.co/storage/v1/object/public/public-files//icon.png",
  },
  openGraph: {
    title: "Discover new Minds",
    description: "Its time to Discover new Minds",
    type: "website",
    images: [
      {
        url: "https://wznveojncixcptajnjom.supabase.co/storage/v1/object/public/public-files//icon.png",
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
    <html lang="en" className="dark">
      <head>
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-74LEW4K1FY"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-74LEW4K1FY');
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${robotoMono.variable} antialiased`}>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
