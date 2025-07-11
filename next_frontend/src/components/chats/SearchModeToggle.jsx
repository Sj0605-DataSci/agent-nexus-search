import { useState } from "react";

export default function SearchModeToggle({ searchMode, darkMode, setSearchMode }) {
  const isDeep = searchMode === "deep";

  return (
    <div className="relative group" title={`Switch to ${isDeep ? "Basic" : "Deep"} Search`}>
      <button
        onClick={() => setSearchMode(isDeep ? "basic" : "deep")}
        className={`relative flex items-center gap-1 px-1 py-[5px] w-28 rounded-full transition-all duration-300 ease-in-out
          border ${
            isDeep
              ? "bg-purple-100 dark:bg-purple-600/20 border-purple-200 dark:border-purple-500"
              : "bg-blue-100 dark:bg-blue-600/20 border-blue-200 dark:border-blue-500"
          }
          hover:scale-[1.03] hover:shadow-md`}
      >
        <span
          className={`absolute top-0 left-0 h-full w-1/2 rounded-full transition-all duration-300 ease-in-out z-0
            ${isDeep ? "translate-x-full bg-purple-500 dark:bg-purple-400" : "translate-x-0 bg-blue-500 dark:bg-blue-400"}`}
        />

        <span
          className={`relative z-10 w-1/2 text-center text-xs font-semibold transition-colors duration-300
            ${!isDeep ? "text-white " : darkMode ? "text-gray-200" : "text-gray-600 "}`}
        >
          Basic
        </span>
        <span
          className={`relative z-10 w-1/2 text-center text-xs font-semibold transition-colors duration-300
            ${isDeep ? "text-white " : darkMode ? "text-gray-200" : "text-gray-600 "}`}
        >
          Deep
        </span>
      </button>

      <div className="absolute top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-black text-white text-xs rounded px-2 py-1 transition-all duration-300 whitespace-nowrap z-20">
        {isDeep ? "Switch to Basic Search" : "Switch to Deep Search"}
      </div>
    </div>
  );
}
