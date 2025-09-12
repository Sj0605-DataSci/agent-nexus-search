import { useEffect } from "react";

export default function SearchModeToggle({ searchMode, setSearchMode, disabled = false }) {
  const isDeep = searchMode === "deep";
  useEffect(() => {
    setSearchMode(searchMode);
  }, [searchMode]);

  return (
    <div className="relative group" title={`${isDeep ? "Basic" : "Deep"} Search`}>
      <button
        onClick={() => !disabled && setSearchMode(isDeep ? "basic" : "deep")}
        disabled={disabled}
        className={`relative flex items-center px-0.5 py-[2px] sm:px-1 sm:py-[3px] w-20 sm:w-26 rounded-full transition-all duration-200 text-[10px] sm:text-xs
            ${
              isDeep
                ? "bg-purple-100 border border-purple-200"
                : "bg-blue-100 border border-blue-200"
            } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        <span
          className={`absolute top-0 left-0 h-full w-1/2 rounded-full transition-all duration-200 z-0
            ${isDeep ? "translate-x-full bg-purple-500" : "translate-x-0 bg-blue-500"}`}
        />

        <span
          className={`relative z-10 w-1/2 text-center font-medium transition-colors duration-200 px-1
            ${!isDeep ? "text-white" : "text-gray-600"}`}
        >
          Basic
        </span>
        <span
          className={`relative z-10 w-1/2 text-center font-medium transition-colors duration-200 px-1
            ${isDeep ? "text-white" : "text-gray-600"}`}
        >
          Deep
        </span>
      </button>

      <div className="hidden sm:block absolute top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-black/80 text-white text-[10px] rounded px-1.5 py-0.5 transition-opacity duration-200 whitespace-nowrap z-20 pointer-events-none">
        {isDeep ? "Basic Search" : "Deep Search"}
      </div>
    </div>
  );
}
