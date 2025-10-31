import React from "react";

import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import FeaturePillars from "./components/FeaturePillars";
import SecurityAndCompliance from "./components/SecurityAndCompliance";
import Pricing from "./components/Pricing";
import ProductModules from "./components/ProductModules";
import CTABanner from "./components/CTABanner";
import HowItWorks from "./components/HowItWorks";
import Testimonials from "./components/Testimonials";
import FAQ from "./components/FAQ";
import TaraFooter from "./components/TaraFooter";

const TaraLandingPage = () => {
  return (
    <main className="">
      <Navbar />
      <HeroSection />
      <FeaturePillars />
      <HowItWorks />
      <ProductModules />
      <Testimonials />
      <Pricing />
      {/* <SecurityAndCompliance /> */}
      <FAQ />
      <CTABanner />
      <TaraFooter />
    </main>
  );
};

export default TaraLandingPage;
