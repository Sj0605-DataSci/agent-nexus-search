import { redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up | DiscoverMinds.ai",
  description: "Create your DiscoverMinds.ai account to unlock powerful network intelligence features.",
  alternates: {
    canonical: 'https://www.discoverminds.ai/signup',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function SignupPage() {
  redirect("/user-auth");
  return null;
}
