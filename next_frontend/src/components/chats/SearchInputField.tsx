"use client";

import React, { memo, useState, useEffect } from "react";
import { FiSend } from "react-icons/fi";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SearchScopeSelector } from "./SearchScopeSelector";
import { useTypingEffect } from "@/hooks/useTypingEffect";

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
  }: SearchInputFieldProps) => {
    const placeholderPhrases = [
      "Tech founders in Bangalore who raised a pre-seed round.",
      "Startup founders who pivoted their business model.",
      "Angel investors interested in climate tech.",
      "SaaS founders with B2B experience in healthcare.",
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
        className={`relative flex justify-center w-full px-2 sm:px-0 ${defaultSearchButton ? "max-w-5xl mx-auto" : "max-w-3xl mx-auto"}`}
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
            {!hideGroupOption && <SearchScopeSelector disabled={isStreaming} />}
            <form onSubmit={onSubmit}>
              <div className="relative">
                <Textarea
                  placeholder={
                    defaultSearchButton
                      ? "Give me the list of software developers in Bangalore"
                      : placeholderText
                  }
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
              ${!defaultSearchButton ? "min-h-[100px]" : "min-h-[80px]"} w-full p-1
              placeholder:text-foreground/70
              ${isStreaming ? "opacity-60 cursor-not-allowed" : ""}
            `}
                />
                <div className="absolute bottom-0 right-0 flex h-9 w-9 justify-center items-center">
                  <button
                    type="submit"
                    className={`rounded-md h-9 w-9 flex justify-center items-center transition-all ${
                      isButtonDisabled
                        ? defaultSearchButton
                          ? "bg-[#5D9CEC]/30 cursor-not-allowed"
                          : "bg-[#0E3D15]/30 cursor-not-allowed"
                        : defaultSearchButton
                          ? "bg-[#5D9CEC]/60 hover:bg-[#5D9CEC]/80 hover:scale-105 active:scale-95 shadow-md"
                          : "bg-[#0a2a0f] hover:bg-[#0a2a0f] hover:scale-105 active:scale-95 shadow-md"
                    } `}
                    disabled={isButtonDisabled}
                  >
                    <FiSend
                      className={`h-4 w-4 -ml-1 transform rotate-45 ${
                        isStreaming ||
                        !query.trim() ||
                        query.trim().toLowerCase() === previousQuery.trim().toLowerCase()
                          ? "text-gray-400"
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
