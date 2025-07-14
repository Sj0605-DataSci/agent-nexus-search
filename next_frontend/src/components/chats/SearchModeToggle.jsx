export default function SearchModeToggle({ searchMode, darkMode, setSearchMode }) {
  const isDeep = searchMode === "deep";

  return (
    <div className="relative group" title={`${isDeep ? "Basic" : "Deep"} Search`}>
      <button
        onClick={() => setSearchMode(isDeep ? "basic" : "deep")}
        className={`relative flex items-center px-1 py-[3px] w-26 rounded-full transition-all duration-200 ease-in-out
          border ${
            isDeep
              ? "bg-purple-100 dark:bg-purple-600/20 border-purple-200 dark:border-purple-500"
              : "bg-blue-100 dark:bg-blue-600/20 border-blue-200 dark:border-blue-500"
          }`}
      >
        <span
          className={`absolute top-0 left-0 h-full w-1/2 rounded-full transition-all duration-200 ease-in-out z-0
            ${isDeep ? "translate-x-full bg-purple-500 dark:bg-purple-400" : "translate-x-0 bg-blue-500 dark:bg-blue-400"}`}
        />

        <span
          className={`relative z-10 w-1/2 text-center text-xs font-medium transition-colors duration-200
            ${!isDeep ? "text-white" : darkMode ? "text-gray-300" : "text-gray-600"}`}
        >
          Basic
        </span>
        <span
          className={`relative z-10 w-1/2 text-center text-xs font-medium transition-colors duration-200
            ${isDeep ? "text-white" : darkMode ? "text-gray-300" : "text-gray-600"}`}
        >
          Deep
        </span>
      </button>

      <div className="absolute top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-black/80 text-white text-[10px] rounded px-1.5 py-0.5 transition-opacity duration-200 whitespace-nowrap z-20 pointer-events-none">
        {isDeep ? "Basic Search" : "Deep Search"}
      </div>
    </div>
  );
}
