"use client";

import React, { useState, useRef } from "react";
import SearchInputField from "../chats/SearchInputField";
import Link from "next/link";
import { useRouter } from "next/navigation";

const NewHeroSection = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToWaitlistInput = (e: React.MouseEvent) => {
    e.preventDefault();

    const emailInput = document.getElementById("waitlist-email");

    if (emailInput) {
      emailInput.scrollIntoView({ behavior: "smooth", block: "center" });

      setTimeout(() => {
        emailInput.focus();
      }, 800);
    }
  };

  const quickSearches = [
    { label: "Operations manager with 4 years of experience", category: "Operations" },
    { label: "CTO with experience in AI", category: "CTO" },
    {
      label: "Software Developer in bangalore with 4 years of experience",
      category: "Software Developer",
    },
    {
      label: "Marketing manager with 2 years of experience in digital marketing",
      category: "Marketing",
    },
  ];

  const handleSearch = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      router.push(`/user-query?q=${encodeURIComponent(query)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch(e as any);
    }
  };

  const handleQuickSearch = (label: string) => {
    setSearchQuery(label);
    setTimeout(() => {
      if (label?.trim()) {
        router.push(`/user-query?q=${encodeURIComponent(label?.trim())}`);
      }
    }, 500);
  };

  return (
    <section className="relative pt-32 pb-0">
      <div className="relative z-10">
        <div className="max-w-6xl items-center px-4 sm:px-6 lg:px-8 mx-auto">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-medium max-w-[90%] mx-auto text-gray-900 mb-6">
              Unlock Hidden Opportunities within Your Trusted Networks
            </h1>

            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
              AI that maps your network, delivers warm intros effortlessly.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
              <button
                onClick={scrollToWaitlistInput}
                className="px-8 py-3 text-lg font-medium rounded-xl text-white bg-[#0E3D15] hover:bg-[#1F3A21] transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-102 hover:-translate-y-0.5 active:translate-y-0"
              >
                Join waitlist
              </button>
              <Link
                href="https://calendly.com/founders-discoverminds/30min"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 text-lg font-medium rounded-xl text-gray-700 border-2 border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md transform hover:-translate-y-0.5 active:translate-y-0"
              >
                Book a demo
              </Link>
            </div>
          </div>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-sm font-semibold text-gray-500 mb-8 tracking-wide">
              TRUSTED BY USERS FROM
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-80">
              {["Adobe", "Cargill", "Google", "Juspay", "Meta", "Salesforce"].map(company => (
                <div key={company} className="h-8 md:h-10 relative w-auto">
                  <img
                    src={`/logos/TrustedPartners/${company}.png`}
                    alt={company}
                    className="h-full w-auto object-contain"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-20 pt-20 -mb-[330px] ">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-[#1F4024] rounded-xl p-8 sm:p-12 shadow-xl">
              <div className="text-center">
                <h2 className="text-2xl sm:text-3xl font-medium text-white mb-3">
                  Find the right person
                </h2>
                <p className="text-base sm:text-lg text-white/80 mb-6">
                  We'll show you real results from our own networks.
                </p>
                <div className="inline-block rounded-full bg-white/10 backdrop-blur-sm px-5 py-1 mb-8">
                  <p className="text-[14px] font-medium text-white">No signup required</p>
                </div>
              </div>

              <div className="relative items-center w-full">
                <SearchInputField
                  query={searchQuery}
                  setQuery={setSearchQuery}
                  textareaRef={textareaRef}
                  onKey={handleKeyDown}
                  onSubmit={handleSearch}
                  isStreaming={false}
                  previousQuery=""
                  hideGroupOption={true}
                  defaultSearchButton={false}
                />
              </div>

              <div className="flex flex-col items-center w-full mt-6">
                <div className="flex items-center justify-center w-full flex-wrap gap-3">
                  {quickSearches?.map((search, index) => (
                    <button
                      key={`${search.label}-${index}`}
                      onClick={e => {
                        // e.preventDefault();
                        handleQuickSearch(search.label);
                      }}
                      className="group relative px-5 py-1.5 text-sm font-medium text-gray-700 bg-white/90 hover:bg-white border border-white/20 hover:border-white/40 rounded-full transition-all duration-200 hover:shadow-md transform hover:-translate-y-0.5"
                      title={search.category}
                    >
                      {search.category}
                    </button>
                  ))}
                </div>
                <p className="mt-8 text-sm text-white/60">
                  Try searching for roles, skills, or companies
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-[260px] pb-16 bg-[#B2DC8A]"></div>
      </div>
    </section>
  );
};

export default NewHeroSection;
