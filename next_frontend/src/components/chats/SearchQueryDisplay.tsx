import { useState } from "react";
import { FiSearch } from "react-icons/fi";

interface SearchQueryDisplayProps {
  showSearchQueries: boolean;
  streamingSearchQueries: string[];
  isStreaming: boolean;
}

export const SearchQueryDisplay = ({
  showSearchQueries,
  streamingSearchQueries,
  isStreaming,
}: SearchQueryDisplayProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!showSearchQueries && streamingSearchQueries.length === 0 && !isStreaming) return null;

  return (
    <div className="mb-4 rounded-lg border border-gray-200 p-3 overflow-hidden ">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <FiSearch className="h-4 w-4 text-purple-500" />
          <span className="font-medium">Searching with:</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="ml-2 p-1 rounded-full hover:bg-gray-200 -700 transition-colors"
            aria-label={isCollapsed ? "Expand search queries" : "Collapse search queries"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 text-gray-500 transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      <div
        className={`relative pl-6 mt-3  ${isCollapsed ? "h-0 opacity-0 overflow-hidden" : "opacity-100"}`}
      >
        <div className="absolute left-[9px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-purple-500 to-blue-500"></div>

        {isStreaming && streamingSearchQueries.length === 0 && (
          <div className="py-2 text-sm text-gray-500 flex items-center relative">
            <div className="absolute -left-[6px] h-4 w-4 rounded-full bg-purple-500 animate-pulse"></div>
            <div className="ml-4 flex items-center">
              <span>Preparing search queries...</span>
            </div>
          </div>
        )}

        {streamingSearchQueries.length > 0 && (
          <div className="will-change-transform">
            <ul className="space-y-4 mb-3">
              {streamingSearchQueries.map((query, index) => (
                <li key={`query-${index}`} className="flex items-start transform-gpu">
                  <div className="absolute -left-[6px] h-4 w-4 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 border-2 border-white"></div>

                  <div className="ml-4 bg-white rounded-lg p-2 shadow-sm border border-gray-100 w-full">
                    <span className="text-sm text-gray-800 font-medium">{query}</span>
                  </div>
                </li>
              ))}

              {isStreaming && (
                <li className="flex items-start transform-gpu">
                  <div className="absolute -left-[6px] h-4 w-4 rounded-full bg-blue-500 animate-pulse"></div>
                  <div className="ml-4 flex items-center py-2">
                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse mr-1"></div>
                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse delay-100 mr-1"></div>
                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse delay-200"></div>
                  </div>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {isCollapsed && streamingSearchQueries.length > 0 && (
        <div className="text-xs text-gray-500 mt-1 pl-2">
          {streamingSearchQueries.length} search queries {isStreaming ? "(streaming)" : ""}
        </div>
      )}
    </div>
  );
};
