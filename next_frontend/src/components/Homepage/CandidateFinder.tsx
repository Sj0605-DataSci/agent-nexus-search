"use client";

import React, { useState, useRef } from "react";
import SearchInputField from "../chats/SearchInputField";

const CandidateFinder = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isSearching, setIsSearching] = useState(false);

  const quickSearches = ["Operations", "CTO", "Product Manager", "Marketing"];

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearching(true);
      // Handle search logic here
      console.log("Searching for:", searchQuery);
      // Simulate search completion
      setTimeout(() => setIsSearching(false), 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch(e as any);
    }
  };

  return (
    <div className="bg-[#B2DC8A] ">
      <div className="max-w-4xl mx-auto  px-4 sm:px-6 lg:px-8 mt-12 ">
        <div className="bg-green-900  -mt-10 rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="text-center">
            <h2 className="text-2xl font-medium text-[#E0E1DD]">Find the right candidate</h2>
            <p className="mt-2 text-base font-normal text-[#E0E1DD]/80">
              We will search through the internet and your network
            </p>
            <div className="mt-4 inline-block rounded-full bg-[#EFFBD7]/25 px-4 py-2">
              <p className="text-sm font-semibold text-[#E0E1DD]">No signup required</p>
            </div>
          </div>

          <div className="relative mt-6">
            <SearchInputField
              query={searchQuery}
              setQuery={setSearchQuery}
              textareaRef={textareaRef}
              onKey={handleKeyDown}
              onSubmit={handleSearch}
              isStreaming={isSearching}
              previousQuery=""
              hideGroupOption={true}
            />
          </div>

          <div className="flex items-center justify-center w-full flex-wrap gap-3 mt-3">
            {quickSearches.map(search => (
              <button
                key={search}
                onClick={() => {
                  setSearchQuery(search);
                  setTimeout(() => textareaRef.current?.focus(), 0);
                }}
                className="px-4 py-[4px] text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:border-[#0E3D15] rounded-full transition-all duration-200 hover:shadow-sm"
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateFinder;
