import React from "react";
import dynamic from "next/dynamic";
import HeroHeader from "./HeroHeader";

const SearchSection = dynamic(() => import("./SearchSection"), {
  loading: () => (
    <div className="relative z-20 pt-12 -mb-90">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#1F4024] rounded-xl p-8 sm:p-12 shadow-xl min-h-[400px]" />
      </div>
    </div>
  ),
  ssr: true,
});

const NewHeroSection = () => {
  return (
    <section className="relative pb-0">
      <div className="relative z-10">
        <HeroHeader />
        <SearchSection />
        <div className="pt-[260px] pb-16 bg-[#B2DC8A]"></div>
      </div>
    </section>
  );
};

export default NewHeroSection;
