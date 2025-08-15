"use client";

import React, { memo } from "react";
import { FiSearch } from "react-icons/fi";
import { Textarea } from "@/components/ui/textarea";

export interface SearchInputFieldProps {
  query: string;
  setQuery: (query: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onKey: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  isStreaming: boolean;
}

const SearchInputField = memo(
  ({ query, setQuery, textareaRef, onKey, isStreaming }: SearchInputFieldProps) => {
    return (
      <div className="flex flex-row w-full items-center">
        <FiSearch className="h-5 w-5 mr-1 text-gray-500" />
        <Textarea
          placeholder="Search for people by skills, experience, or interests… (Shift+Enter for new line)"
          value={query}
          onChange={e => setQuery(e.target.value)}
          ref={textareaRef}
          onKeyDown={onKey}
          rows={1}
          disabled={isStreaming}
          className={`
          flex bg-transparent text-sm sm:text-base resize-none
          border-0 focus:border-0 outline-none ring-0 focus:ring-0 focus-visible:ring-0
          min-h-[40px] max-h-[120px]
          text-gray-900 placeholder:text-gray-500 placeholder:text-sm sm:placeholder:text-base
          ${isStreaming ? "opacity-60 cursor-not-allowed" : ""}
        `}
        />
      </div>
    );
  }
);

SearchInputField.displayName = "SearchInputField";

export default SearchInputField;
