import { MessageSquare, Table } from "lucide-react";

export default function FormatToggle({ format, setFormat, disabled = false }) {
  const isTable = format === "table";

  return (
    <div className="relative group" title={`${isTable ? "Chat" : "Table"} Format`}>
      <button
        onClick={() => !disabled && setFormat(isTable ? "chat" : "table")}
        disabled={disabled}
        className={`relative flex items-center px-1 py-[3px] w-30 rounded-full transition-all duration-200 ease-in-out
          border ${
            isTable
              ? "bg-purple-100 border-purple-200"
              : "bg-blue-100 border-blue-200"
          } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        <span
          className={`absolute top-0 left-0 h-full w-1/2 rounded-full transition-all duration-200 ease-in-out z-0
            ${isTable ? "translate-x-full bg-purple-500" : "translate-x-0 bg-blue-500"}`}
        />

        <span
          className={`relative z-10 w-1/2 text-center text-xs font-medium flex items-center justify-center transition-colors duration-200
            ${!isTable ? "text-white" : "text-gray-600"}`}
        >
          <MessageSquare className="w-3 h-3 mr-0.5" />
          Chat
        </span>
        <span
          className={`relative z-10 w-1/2 text-center text-xs font-medium flex items-center justify-center transition-colors duration-200
            ${isTable ? "text-white" : "text-gray-600"}`}
        >
          <Table className="w-3 h-3 mr-0.5" />
          Table
        </span>
      </button>

      <div className="absolute top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-black/80 text-white text-[10px] rounded px-1.5 py-0.5 transition-opacity duration-200 whitespace-nowrap z-20 pointer-events-none">
        {isTable ? "Chat Format" : "Table Format"}
      </div>
    </div>
  );
}
