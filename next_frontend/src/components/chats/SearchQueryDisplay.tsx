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
    <div className="mb-4 transition-all duration-300 ease-in-out">
      <div 
        className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors duration-200"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <FiSearch className="h-4 w-4 text-purple-600" />
          <span>Search Queries</span>
          {streamingSearchQueries.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-white text-xs font-medium rounded-full border border-gray-200 shadow-sm">
              {streamingSearchQueries.length} {isStreaming ? '...' : ''}
            </span>
          )}
        </div>
        <button
          className="p-1.5 rounded-full hover:bg-gray-200 transition-colors"
          aria-label={isCollapsed ? "Expand search queries" : "Collapse search queries"}
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(!isCollapsed);
          }}
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

      <div
        className={`relative pl-6 mt-1 transition-all duration-300 ease-in-out overflow-hidden ${
          isCollapsed 
            ? "max-h-0 opacity-0" 
            : "max-h-96 opacity-100 overflow-y-auto"
        }`}
        style={{ scrollbarWidth: 'thin' }}
      >
        <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-400 to-blue-400"></div>

        {isStreaming && streamingSearchQueries.length === 0 && (
          <div className="py-3 text-sm text-gray-500 flex items-center relative">
            <div className="absolute -left-[5px] h-3 w-3 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 animate-pulse"></div>
            <div className="ml-5 flex items-center">
              <span>Preparing search queries...</span>
            </div>
          </div>
        )}

        {streamingSearchQueries.length > 0 && (
          <div className="py-2 pr-2">
            <ul className="space-y-3">
              {streamingSearchQueries.map((query, index) => (
                <li 
                  key={`query-${index}`} 
                  className="flex items-start group relative"
                >
                  <div className="absolute -left-[5px] h-3 w-3 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 border-2 border-white shadow-sm group-hover:scale-110 transition-transform"></div>
                  <div className="ml-5 bg-white rounded-lg p-3 shadow-xs border border-gray-100 w-full transition-all duration-200 hover:shadow-sm hover:border-gray-200">
                    <div className="flex items-start justify-between">
                      <span className="text-sm text-gray-800 font-medium break-words pr-4">{query}</span>
                      <span className="text-xs text-gray-400 font-mono shrink-0">#{index + 1}</span>
                    </div>
                  </div>
                </li>
              ))}

              {isStreaming && (
                <li className="flex items-center pl-5 py-2">
                  <div className="flex items-center space-x-1.5">
                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    <span className="ml-2 text-xs text-gray-500">Searching...</span>
                  </div>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
