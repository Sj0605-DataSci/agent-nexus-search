import { Globe, UserIcon } from "lucide-react"; // or whichever icon lib you're using

export default function WorldConnectionsToggle({
  worldConnectionsMode,
  darkMode,
  setWorldConnectionsMode,
}) {
  const isConnections = worldConnectionsMode === "connections";

  return (
    <div
      className="relative group"
      title={`Switch to ${isConnections ? "Global" : "Connections"} Search`}
    >
      <button
        onClick={() => setWorldConnectionsMode(isConnections ? "world" : "connections")}
        className={`relative flex items-center gap-1 px-1 py-[5px] w-32 rounded-full transition-all duration-300 ease-in-out
          border ${
            isConnections
              ? "bg-blue-100 dark:bg-blue-600/20 border-blue-200 dark:border-blue-500"
              : "bg-purple-100 dark:bg-purple-600/20 border-purple-200 dark:border-purple-500"
          }
          hover:scale-[1.03] hover:shadow-md`}
      >
        <span
          className={`absolute top-0 left-0 h-full w-1/2 rounded-full transition-all duration-300 ease-in-out z-0
            ${
              isConnections
                ? "translate-x-0 bg-blue-500 dark:bg-blue-400"
                : "translate-x-full bg-purple-500 dark:bg-purple-400"
            }`}
        />

        <span
          className={`relative z-10 w-1/2 text-center text-xs font-semibold flex items-center justify-center gap-1 transition-colors duration-300
            ${isConnections ? "text-white" : darkMode ? "text-gray-200" : "text-gray-600"}`}
        >
          <UserIcon className="w-3.5 h-3.5" />
          Conn.
        </span>

        <span
          className={`relative z-10 w-1/2 text-center text-xs font-semibold flex items-center justify-center gap-1 transition-colors duration-300
            ${!isConnections ? "text-white" : darkMode ? "text-gray-200" : "text-gray-600"}`}
        >
          <Globe className="w-3.5 h-3.5" />
          Global
        </span>
      </button>

      <div className="absolute top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-black text-white text-xs rounded px-2 py-1 transition-all duration-300 whitespace-nowrap z-20">
        {isConnections ? "Switch to Global Search" : "Switch to Connections Search"}
      </div>
    </div>
  );
}
