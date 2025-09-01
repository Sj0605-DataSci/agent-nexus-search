"use client";

import { useState } from "react";
import clsx from "clsx";

const chips = ["Detect automatically", "Operations", "VP", "CTO", "Vet a profile"];

export default function SearchCandidateCard() {
  const [query, setQuery] = useState("");

  return (
    <div className="pointer-events-auto rounded-2xl border border-black/10 bg-white shadow-card">
      <div className="px-5 pb-5 pt-6 sm:px-8 sm:pt-7">
        {/* Heading */}
        <h3 className="text-center text-lg font-medium text-neutral-900 sm:text-xl">
          Find the right candidate
        </h3>
        <p className="mt-2 text-center text-sm text-neutral-600">
          We will search through the internet and your network
        </p>

        {/* No signup badge */}
        <div className="mt-3 flex justify-center">
          <span className="inline-flex items-center rounded-full bg-[#E8EBEB] px-3.5 py-1.5 text-xs font-medium text-neutral-700">
            No signup required
          </span>
        </div>

        {/* Input area */}
        <div className="relative mt-5">
          <label htmlFor="nl-query" className="sr-only">
            Describe the person you’re looking for
          </label>

          <textarea
            id="nl-query"
            value={query}
            onChange={e => setQuery(e.target.value)}
            rows={3}
            placeholder="Find senior AI engineers in Canada with open-source activity and active emails"
            className={clsx(
              "w-full resize-none rounded-lg border",
              "border-[#085058]/20 px-4 py-4 pr-16",
              "text-sm text-neutral-800 placeholder:text-neutral-500",
              "outline-none ring-2 ring-transparent focus:border-[#0F5B5C] focus:ring-[#0F5B5C]/30"
            )}
          />

          {/* Send button (arrow) */}
          <button
            type="button"
            aria-label="Run search"
            className="absolute bottom-3 right-3 inline-flex h-11 w-11 items-center justify-center rounded-md bg-[#085157] text-white transition hover:opacity-90"
          >
            {/* paper-plane/arrow icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 10.5l15-6.5-6.5 15-1.6-5.4L4 10.5z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Chip row */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {chips.map((label, i) => (
            <button
              key={label}
              type="button"
              className={clsx(
                "inline-flex items-center rounded-md border px-3.5 py-2 text-xs font-medium",
                "border-neutral-200 text-neutral-700",
                i === 0
                  ? "bg-[#E8EBEB] ring-1 ring-[#0850581A]" // “Detect automatically” highlighted subtly
                  : "bg-white hover:bg-neutral-50"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
