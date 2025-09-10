import React from "react";
import HomeHeader from "@/components/Homepage/Header";
import FaqSection from "@/components/Pricing/FaqSection";
import PricingPlans from "@/components/Homepage/PricingPlans";
import NewFooter from "@/components/Footer/NewFooter";

export const metadata = {
  title: "Pricing | DiscoverMinds.ai",
  description:
    "View our transparent pricing plans for all business sizes. Choose the plan that fits your needs.",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <HomeHeader />
      <div className="pt-10 md:pt-20" />
      <main>
        <div className="text-center">
          <h1 className="sr-only">DiscoverMinds.ai Pricing Plans</h1>
        </div>
        <PricingPlans />
        <FaqSection />
      </main>
      <NewFooter />
    </div>
  );
}
