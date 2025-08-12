import { Globe, UserIcon } from "lucide-react";

export default function WorldConnectionsToggle({
  worldConnectionsMode,
  setWorldConnectionsMode,
  disabled = false
}) {
  const isConnections = worldConnectionsMode === "connections";
  
  const handleToggle = () => {
    if (disabled) return;
    const newMode = isConnections ? "world" : "connections";
    setWorldConnectionsMode(newMode);
  };

  // Determine tooltip text based on disabled state and reason
  let tooltipText = "";
  if (disabled) {
    // Check if the button is disabled because user has no connections
    const hasNoConnections = worldConnectionsMode === "world" && !isConnections;
    tooltipText = hasNoConnections 
      ? "Connect your LinkedIn to enable personal network search" 
      : "Search mode cannot be changed during streaming";
  } else {
    tooltipText = isConnections ? "Switch to Global Search" : "Switch to Connections Search";
  }

  return (
    <div className="relative group" title={tooltipText}>
      <button
        onClick={handleToggle}
        disabled={disabled}
        className={`relative flex items-center px-0.5 py-[2px] sm:px-1 sm:py-[3px] w-28 sm:w-46 rounded-full text-[10px] sm:text-xs
          border ${isConnections
            ? "bg-blue-100 border-blue-200"
            : "bg-purple-100 border-purple-200"
          }
          ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:shadow-md"}`}
      >
        <span
          className={`absolute top-0 left-0 h-full w-1/2 rounded-full z-0 transition-transform duration-300
            ${isConnections
              ? "translate-x-0 bg-blue-500"
              : "translate-x-full bg-purple-500"
            }`}
        />

        <span
          className={`relative z-10 w-1/2 text-center font-medium flex items-center justify-center transition-colors duration-200 px-1
            ${isConnections ? "text-white" : "text-gray-600"}`}
        >
          <UserIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 flex-shrink-0" />
          <span className="truncate">Connections</span>
        </span>

        <span
          className={`relative z-10 w-1/2 text-center font-medium flex items-center justify-center transition-colors duration-200 px-1
            ${!isConnections ? "text-white" : "text-gray-600"}`}
        >
          <Globe className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 flex-shrink-0" />
          <span className="truncate">Global</span>
        </span>
      </button>
      
      {!disabled && (
        <div className="hidden sm:block absolute top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-black/80 text-white text-[10px] rounded px-1.5 py-0.5 transition-opacity duration-200 whitespace-nowrap z-20 pointer-events-none">
          {tooltipText}
        </div>
      )}
    </div>
  );
}
