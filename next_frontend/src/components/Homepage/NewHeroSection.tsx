import React from "react";
import HeroHeader from "./HeroHeader";
import SearchSection from "./SearchSection";

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
