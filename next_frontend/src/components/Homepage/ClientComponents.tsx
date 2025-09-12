"use client";

import Analytics from "@/utils/analytics";
import React from "react";

export const WaitlistButton = () => {
  const scrollToWaitlistInput = (e: React.MouseEvent) => {
    e.preventDefault();

    const emailInput = document.getElementById("waitlist-email");

    Analytics.trackButtonClick("waitlist_scroll", {
      location: "hero_section",
      source: "hero_cta",
    });

    if (emailInput) {
      emailInput.scrollIntoView({ behavior: "smooth", block: "center" });

      setTimeout(() => {
        emailInput.focus();
      }, 800);
    }
  };

  return (
    <button
      onClick={scrollToWaitlistInput}
      className="px-8 py-3 text-lg font-medium rounded-xl text-white bg-[#0E3D15] hover:bg-[#1F3A21] transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-102 hover:-translate-y-0.5 active:translate-y-0"
      aria-label="Join waitlist"
    >
      Join waitlist
    </button>
  );
};
