import { Globe, UserIcon } from "lucide-react";

export default function WorldConnectionsToggle({
  worldConnectionsMode,
  darkMode,
  setWorldConnectionsMode,
}) {
  const isConnections = worldConnectionsMode === "connections";

  return (
    <div className="relative group" title="Global Search">
      <button
        disabled
        className={`relative flex items-center px-1 py-[3px] w-46 rounded-full transition-all duration-200 ease-in-out
          border ${
            isConnections
              ? "bg-blue-100 dark:bg-blue-600/20 border-blue-200 dark:border-blue-500"
              : "bg-purple-100 dark:bg-purple-600/20 border-purple-200 dark:border-purple-500"
          }
          cursor-not-allowed opacity-60`}
      >
        <span
          className={`absolute top-0 left-0 h-full w-1/2 rounded-full transition-all duration-200 ease-in-out z-0
            ${
              isConnections
                ? "translate-x-0 bg-blue-500 dark:bg-blue-400"
                : "translate-x-full bg-purple-500 dark:bg-purple-400"
            }`}
        />

        <span
          className={`relative z-10 w-1/2 text-center text-xs font-medium flex items-center justify-center transition-colors duration-200
            ${isConnections ? "text-white" : darkMode ? "text-gray-300" : "text-gray-600"}`}
        >
          <UserIcon className="w-3 h-3 mr-0.5" />
          Connections
        </span>

        <span
          className={`relative z-10 w-1/2 text-center text-xs font-medium flex items-center justify-center transition-colors duration-200
            ${!isConnections ? "text-white" : darkMode ? "text-gray-300" : "text-gray-600"}`}
        >
          <Globe className="w-3 h-3 mr-0.5" />
          Global
        </span>
      </button>

      <div className="absolute top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-black/80 text-white text-[10px] rounded px-1.5 py-0.5 transition-opacity duration-200 whitespace-nowrap z-20 pointer-events-none">
        Search is locked to Global
      </div>
    </div>
  );
}
