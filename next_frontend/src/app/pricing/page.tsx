import React from "react";
import HomeHeader from "@/components/Homepage/Header";
import FaqSection from "@/components/Pricing/FaqSection";
import PricingPlans from "@/components/Homepage/PricingPlans";
import NewFooter from "@/components/Footer/NewFooter";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <HomeHeader />
      <div className="pt-10 md:pt-20" />
      <main>
        <PricingPlans />
        <FaqSection />
        <NewFooter />
      </main>
    </div>
  );
}
