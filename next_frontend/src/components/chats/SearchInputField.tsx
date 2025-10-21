"use client";

import React, { memo } from "react";
import { FiSend } from "react-icons/fi";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { Textarea } from "@/components/ui/textarea";
import { SearchScopeSelector } from "./SearchScopeSelector";
import { useTypingEffect } from "@/hooks/useTypingEffect";
import { useAppSelector } from "@/store";
import posthog from "posthog-js";

export interface SearchInputFieldProps {
  query: string;
  setQuery: (query: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onKey: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isStreaming: boolean;
  hideGroupOption: boolean;
  defaultSearchButton: boolean;
  previousQuery?: string;
  loading: boolean;
}

const SearchInputField = memo(
  ({
    query,
    setQuery,
    textareaRef,
    hideGroupOption,
    onKey,
    onSubmit,
    isStreaming,
    previousQuery = "",
    defaultSearchButton = true,
    loading,
  }: SearchInputFieldProps) => {
    const profile = useAppSelector(state => state.profile.profile);
    const isAuthenticated = !!profile?.id;

    const placeholderPhrases = [
      "Tech founders in Bangalore with 5+ years of experience who raised a pre-seed round in the last 2 years.",
      "Startup founders in fintech who pivoted their business model after Series A and have experience in regulatory compliance.",
      "Angel investors in Mumbai with portfolio companies in edtech tech and sustainable energy solutions.",
      "SaaS founders with B2B experience in healthcare who previously worked at established medical technology companies.",
      "Product managers with experience in AI products.",
      "Marketing directors in e-commerce with expertise in conversion optimization and customer retention strategies.",
    ];

    const placeholderText = useTypingEffect({
      phrases: placeholderPhrases,
      typingSpeed: 80,
      delayBetweenPhrases: 2000,
      delayBeforeClearing: 1500,
    });

    const isButtonDisabled =
      isStreaming ||
      !query.trim() ||
      query.trim().toLowerCase() === previousQuery.trim().toLowerCase();

    return (
      <div
        className={`relative flex justify-center w-full px-2 sm:px-0 max-h-[200px] ${defaultSearchButton ? "max-w-4xl mx-auto" : "max-w-3xl mx-auto"}`}
      >
        <div className="w-full">
          <div
            className={`flex flex-col rounded-xl p-2 shadow-lg focus-within:shadow-xl w-full border ${
              defaultSearchButton
                ? "border-[#5D9CEC]/60 hover:border-[#5D9CEC]"
                : "border-[#0E3D15]/60 hover:border-[#0E3D15]"
            } bg-white`}
            style={{
              backdropFilter: "blur(10px)",
              minHeight: defaultSearchButton ? "120px" : "auto",
            }}
          >
            {!hideGroupOption && (
              <SearchScopeSelector
                disabled={true}
                //  disabled={!isAuthenticated || isStreaming}
              />
            )}
            <form onSubmit={onSubmit}>
              <div className="relative flex items-end gap-2">
                <div className="flex-1">
                  <Textarea
                    placeholder={
                      defaultSearchButton
                        ? "Give me the list of software developers in Bangalore"
                        : placeholderText
                    }
                    value={query}
                    onChange={e => {
                      setQuery(e.target.value);
                      // Track when user types in search field
                      if (e.target.value.length % 10 === 0 && e.target.value.length > 0) {
                        posthog.capture("search_input_typing", {
                          query_length: e.target.value.length,
                          location: defaultSearchButton ? "chat_thread" : "hero_section",
                        });
                      }
                    }}
                    ref={textareaRef}
                    onKeyDown={onKey}
                    rows={1}
                    disabled={isStreaming}
                    data-gramm="false"
                    data-gramm_editor="false"
                    data-enable-grammarly="false"
                    className={`
  flex bg-transparent text-base md:text-lg resize-none
  border-none focus:border-0 outline-none ring-0 focus:ring-0 focus-visible:ring-0 shadow-none
  ${!defaultSearchButton ? "min-h-[100px]" : "min-h-[80px]"} w-full p-1
  placeholder:text-gray-500
  ${isStreaming ? "opacity-60 cursor-not-allowed" : ""}
  pr-2
  [&::-webkit-scrollbar]:hidden
  [-ms-overflow-style:none]
  [scrollbar-width:none]
`}
                    style={{
                      maxHeight: defaultSearchButton ? "120px" : "150px",
                      overflowY: "auto",
                    }}
                  />
                </div>
                <div className="flex-shrink-0 pb-1">
                  <button
                    type="submit"
                    className={`rounded-md h-9 w-9 flex justify-center items-center transition-all ${
                      isButtonDisabled || loading
                        ? defaultSearchButton
                          ? "bg-[#5D9CEC]/30 cursor-not-allowed"
                          : "bg-[#0E3D15]/30 cursor-not-allowed"
                        : defaultSearchButton
                          ? "bg-[#5D9CEC]/60 hover:bg-[#5D9CEC]/80 hover:scale-105 active:scale-95 shadow-md"
                          : "bg-[#0a2a0f] hover:bg-[#0a2a0f] hover:scale-105 active:scale-95 shadow-md"
                    } `}
                    onClick={() => {
                      if (!isButtonDisabled && !loading) {
                        posthog.capture("search_button_clicked", {
                          query_length: query.trim().length,
                          location: defaultSearchButton ? "chat_thread" : "hero_section",
                          input_method: "button",
                        });
                      }
                    }}
                    disabled={isButtonDisabled || loading}
                    aria-label={loading ? "Searching..." : "Submit search"}
                  >
                    {loading ? (
                      <AiOutlineLoading3Quarters className="h-4 w-4 text-white animate-spin" />
                    ) : (
                      <FiSend
                        className={`h-4 w-4 -ml-1 transform rotate-45 ${
                          isStreaming ||
                          !query.trim() ||
                          query.trim().toLowerCase() === previousQuery.trim().toLowerCase()
                            ? "text-gray-400"
                            : "text-white"
                        }`}
                      />
                    )}
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
