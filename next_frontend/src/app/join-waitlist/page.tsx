import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Join Waitlist | DiscoverMinds.ai",
  description:
    "Join our waitlist to get early access to DiscoverMinds.ai and be the first to experience our network intelligence platform.",
  alternates: {
    canonical: "https://www.discoverminds.ai/join-waitlist",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    title: "Join Waitlist | DiscoverMinds.ai",
    description:
      "Be the first to experience our network intelligence platform. Join our waitlist today!",
    url: "https://www.discoverminds.ai/join-waitlist",
    siteName: "DiscoverMinds.ai",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Join Waitlist | DiscoverMinds.ai",
    description:
      "Be the first to experience our network intelligence platform. Join our waitlist today!",
  },
};

export default function Waitlist() {
  redirect("/#waitlist-email");
  return null;
}
