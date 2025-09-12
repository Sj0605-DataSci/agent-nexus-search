"use client";

import React, { useState, useRef } from "react";
import SearchInputField from "../chats/SearchInputField";
import { useRouter } from "next/navigation";
import Analytics from "@/utils/analytics";
import useAnalytics from "@/hooks/useAnalytics";

const quickSearchesData = [
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

const SearchSection = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { capture } = useAnalytics();

  const handleSearch = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      Analytics.trackSearch(query, 0, {
        source: "hero_search",
        search_type: "direct_input",
        query_length: query.length,
      });

      capture("search_initiated", {
        query: query,
        location: "hero_section",
      });

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
    Analytics.trackSearch(label.trim(), 0, {
      source: "hero_search",
      search_type: "quick_search",
      query_length: label.trim().length,
    });

    capture("quick_search_selected", {
      query: label.trim(),
      location: "hero_section",
    });
    setSearchQuery(label);
    if (label?.trim()) {
      router.push(`/user-query?q=${encodeURIComponent(label?.trim())}`);
    }
  };

  return (
    <div className="relative z-20 pt-20 -mb-[330px]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <section
          className="bg-[#1F4024] rounded-xl p-8 sm:p-12 shadow-xl"
          aria-labelledby="search-section-title"
        >
          <header className="text-center">
            <h2
              id="search-section-title"
              className="text-2xl sm:text-3xl font-medium text-white mb-3"
            >
              Find the right person
            </h2>
            <p className="text-base sm:text-lg text-white/80 mb-6">
              We'll show you real results from our own networks.
            </p>
            <div className="inline-block rounded-full bg-white/10 backdrop-blur-sm px-5 py-1 mb-8">
              <p className="text-[14px] font-medium text-white">No signup required</p>
            </div>
          </header>

          <div
            className="relative items-center w-full"
            role="search"
            aria-label="Find professionals in your network"
          >
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

          <nav className="flex flex-col items-center w-full mt-6" aria-label="Quick search options">
            <div className="flex items-center justify-center w-full flex-wrap gap-3">
              {quickSearchesData.map((search, index) => (
                <button
                  key={`${search.label}-${index}`}
                  className="group relative px-5 py-1.5 text-sm font-medium text-gray-700 bg-white/90 hover:bg-white border border-white/20 hover:border-white/40 rounded-full transition-all duration-200 hover:shadow-md transform hover:-translate-y-0.5"
                  title={search.label}
                  aria-label={`Search for ${search.category}`}
                  onClick={e => {
                    Analytics.trackButtonClick("quick_search_option", {
                      category: search.category,
                      query: search.label,
                      position: index,
                      location: "hero_section",
                    });
                    handleQuickSearch(search.label);
                  }}
                  data-analytics-event="quick_search_click"
                  data-analytics-properties={`{\"category\":\"${search.category}\",\"position\":${index},\"location\":\"hero_section\"}`}
                >
                  {search.category}
                </button>
              ))}
            </div>
            <p className="mt-8 text-sm text-white/60">
              Try searching for roles, skills, or companies
            </p>
          </nav>
        </section>
      </div>
    </div>
  );
};

export default SearchSection;
