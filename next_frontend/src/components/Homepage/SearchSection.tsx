"use client";

import React, { useState, useRef, useEffect } from "react";
import SearchInputField from "../chats/SearchInputField";
import { useRouter } from "next/navigation";
import Analytics from "@/utils/analytics";
import useAnalytics from "@/hooks/useAnalytics";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { FaBriefcase, FaCode, FaBullhorn, FaUserTie } from "react-icons/fa";
import { FiSearch } from "react-icons/fi";
import Link from "next/link";

const quickSearchesData = [
  {
    label: "Operations manager with 4 years of experience",
    category: "Operations",
    icon: FaBriefcase,
  },
  { label: "CTO with experience in AI", category: "CTO", icon: FaUserTie },
  {
    label: "Software Developer in bangalore with 4 years of experience",
    category: "Software Developer",
    icon: FaCode,
  },
  {
    label: "Marketing manager with 2 years of experience in digital marketing",
    category: "Marketing",
    icon: FaBullhorn,
  },
];

const SearchSection = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { capture } = useAnalytics();
  const [loading, setLoading] = useState(false);
  const [loadingButtonIndex, setLoadingButtonIndex] = useState<number | null>(null);

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

  const handleQuickSearch = (label: string, index: number) => {
    setLoading(true);
    setLoadingButtonIndex(index);
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
    setTimeout(() => {
      setLoading(false);
      setLoadingButtonIndex(null);
    }, 3000);
  };

  return (
    <div className="relative z-20 pt-12 -mb-90">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <section
          className="bg-[#1F4024] rounded-xl p-8 sm:p-12 shadow-xl"
          aria-labelledby="search-section-title"
        >
          <header className="text-center">
            <h2
              id="search-section-title"
              className="text-2xl sm:text-3xl md:text-4xl font-medium text-white mb-3"
            >
              Find the right person
            </h2>
            <p className="text-base sm:text-lg text-white/80 mb-6 max-w-2xl mx-auto">
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
              loading={loading}
              defaultSearchButton={false}
            />
          </div>

          <nav className="flex flex-col items-center w-full mt-6" aria-label="Quick search options">
            <div className="flex items-center justify-center w-full flex-wrap gap-3">
              {quickSearchesData.map((search, index) => (
                <div
                  key={`${search.label}-${index}`}
                  className="transition-transform duration-150 ease-out hover:-translate-y-1"
                >
                  <Link
                    href={`/user-query?q=${encodeURIComponent(search.label.trim())}`}
                    className={`group relative px-5 py-1 text-sm font-medium text-gray-700 bg-white/90 hover:bg-white border border-white/20 hover:border-white/40 rounded-full transition-all duration-200 flex items-center justify-center ${
                      loading && loadingButtonIndex === index ? "opacity-70 cursor-not-allowed" : ""
                    }`}
                    prefetch={true}
                    title={search.label}
                    aria-label={`Search for ${search.category}`}
                    onClick={e => {
                      if (loading) {
                        e.preventDefault();
                        return;
                      }

                      Analytics.trackButtonClick("quick_search_option", {
                        category: search.category,
                        query: search.label,
                        position: index,
                        location: "hero_section",
                      });

                      capture("search_initiated", {
                        query: search.label,
                        location: "hero_section",
                      });
                      handleQuickSearch(search.label, index);
                    }}
                    data-analytics-event="quick_search_click"
                    data-analytics-properties={`{"category":"${search.category}","position":${index},"location":"hero_section"}`}
                  >
                    {search.icon && (
                      <search.icon
                        className={`mr-2 h-4 w-4 ${loading && loadingButtonIndex === index ? "opacity-20" : ""}`}
                      />
                    )}
                    <span className={loading && loadingButtonIndex === index ? "opacity-20" : ""}>
                      {search.category}
                    </span>
                    {loading && loadingButtonIndex === index && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <AiOutlineLoading3Quarters className="h-4 w-4 animate-spin text-gray-800" />
                      </div>
                    )}
                  </Link>
                </div>
              ))}
            </div>
            <p className="mt-8 text-sm text-white/70 font-light">
              Try searching for roles, skills, or companies
            </p>
          </nav>
        </section>
      </div>
    </div>
  );
};

export default SearchSection;
