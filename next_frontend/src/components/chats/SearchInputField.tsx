"use client";

import React, { memo } from "react";
import { FiArrowUp } from "react-icons/fi";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SearchScopeSelector } from "./SearchScopeSelector";

export interface SearchInputFieldProps {
  query: string;
  setQuery: (query: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onKey: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isStreaming: boolean;
  previousQuery?: string;
}

const SearchInputField = memo(
  ({ query, setQuery, textareaRef, onKey, onSubmit, isStreaming, previousQuery = '' }: SearchInputFieldProps) => {
    return (
      <div className="relative flex justify-center w-full px-2 sm:px-0">
        <div className="w-full max-w-3xl">
          <div
            className="flex flex-col rounded-2xl px-3 sm:px-6 py-3 sm:py-4 shadow-lg focus-within:shadow-xl w-full max-w-3xl border border-[#5D9CEC]/60 bg-white hover:border-[#5D9CEC]"
            style={{ backdropFilter: "blur(10px)" }}
          >
            <SearchScopeSelector />
            <style jsx global>{`
              .grammarly-absolute-positions {
                right: 60px !important;
                left: auto !important;
                top: auto !important;
                bottom: 50px !important;
              }
            `}</style>
            <form onSubmit={onSubmit}>
              <div className="relative">
                <Textarea
                  placeholder="Tech founders in NYC who raised a pre-seed round."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  ref={textareaRef}
                  onKeyDown={onKey}
                  rows={1}
                  disabled={isStreaming}
                  data-gramm="false"
                  data-gramm_editor="false"
                  data-enable-grammarly="false"
                  className={`
              flex bg-transparent text-lg resize-none
              border-none focus:border-0 outline-none ring-0 focus:ring-0 focus-visible:ring-0 shadow-none
              min-h-[80px] w-full p-1
              placeholder:text-foreground/70
              ${isStreaming ? "opacity-60 cursor-not-allowed" : ""}
            `}
                />
                <div className="absolute bottom-1 right-1 flex h-8 md:h-9 justify-end">
                  <button
                    type="submit"
                    className={`rounded-full h-8 w-8  flex justify-center items-center ${
                      isStreaming || !query.trim() || query.trim().toLowerCase() === previousQuery.trim().toLowerCase()
                        ? "bg-[#5D9CEC]/50 cursor-not-allowed"
                        : "bg-[#5D9CEC] hover:bg-[#4a8bd8]"
                    }`}
                    disabled={isStreaming || !query.trim() || query.trim().toLowerCase() === previousQuery.trim().toLowerCase()}
                  >
                    <FiArrowUp
                      className={`h-6 w-6 md:h-7 md:w-7 ${
                        isStreaming || !query.trim() || query.trim().toLowerCase() === previousQuery.trim().toLowerCase()
                          ? "text-gray-200"
                          : "text-white"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }
);

SearchInputField.displayName = "SearchInputField";

export default SearchInputField;
