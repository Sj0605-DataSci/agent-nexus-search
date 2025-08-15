import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { FiChevronDown, FiCheck } from "react-icons/fi";
import { Button } from "@/components/ui/button";

interface Agent {
  id: string;
  name: string;
  avatar: string;
  hired: boolean;
  agentImageUrl?: string;
}

interface AgentDropdownProps {
  agentsStatus: string;
  isStreaming: boolean;
  agentData: Agent | null;
  agentCards: Agent[];
  onAgentSelect: (e: React.MouseEvent<HTMLButtonElement>, id: string, isHired: boolean) => void;
}

export function AgentDropdown({
  agentsStatus,
  isStreaming,
  agentData,
  agentCards,
  onAgentSelect,
}: AgentDropdownProps) {
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        toggleBtnRef.current &&
        !toggleBtnRef.current.contains(event.target as Node)
      ) {
        setShowAgentDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative z-50">
      <Button
        variant="ghost"
        ref={toggleBtnRef}
        onClick={() => setShowAgentDropdown(s => !s)}
        disabled={agentsStatus === "loading" || isStreaming}
        className={`
          flex items-center gap-1.5 sm:gap-2 rounded-full px-2.5 sm:px-4 py-0.5 sm:py-1 border
          transition-all duration-200 shadow-sm hover:shadow h-[24px] sm:h-[26px]
          ${agentsStatus === "loading" ? "cursor-not-allowed opacity-60" : ""}
          border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-[11px] sm:text-[12px]
          relative z-50
        `}
      >
        {agentsStatus === "loading" ? (
          <>
            <span className="block h-3 w-3 sm:h-4 sm:w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            <span className="font-medium">Loading...</span>
          </>
        ) : (
          <>
            {agentData?.agentImageUrl ? (
              <div className="relative w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full overflow-hidden flex-shrink-0">
                <Image
                  src={agentData.agentImageUrl}
                  alt={`${agentData.name} avatar`}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <span className="flex items-center justify-center w-3.5 h-3.5 sm:w-4 sm:h-4 text-sm sm:text-md flex-shrink-0">
                {agentData?.avatar}
              </span>
            )}
            <span className="font-medium truncate max-w-[80px] sm:max-w-none">
              {agentData?.name}
            </span>
            <FiChevronDown
              className={`h-3 w-3 sm:h-4 sm:w-4 text-gray-500 transition-transform duration-200 flex-shrink-0 ${showAgentDropdown ? "rotate-180" : ""}`}
            />
          </>
        )}
      </Button>

      {showAgentDropdown && (
        <div
          ref={dropdownRef}
          className={`fixed sm:absolute left-1/2 sm:left-auto sm:right-0 -translate-x-1/2 sm:translate-x-0 top-[calc(100%+0.5rem)] sm:top-full mt-1 w-[calc(100vw-2rem)] sm:w-[240px] max-w-[320px] rounded-xl shadow-xl z-[500] overflow-hidden
          transform transition-all duration-200 origin-top-right
          animate-in fade-in slide-in-from-top-5 zoom-in-95
          bg-white border border-gray-200`}
        >
          <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">Select Agent</p>
              <div className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {agentCards.length} agents
              </div>
            </div>
          </div>

          <div className="max-h-[50vh] sm:max-h-[320px] overflow-y-auto custom-scrollbar">
            {agentsStatus === "loading" ? (
              <div className="p-6 flex flex-col items-center justify-center gap-2">
                <span className="block h-6 w-6 rounded-full border-2 border-current border-t-transparent animate-spin text-blue-500" />
                <p className="text-sm text-gray-500">Loading your agents...</p>
              </div>
            ) : agentCards.length === 0 ? (
              <div className="p-6 text-center">
                <p className={`text-sm text-gray-600`}>No agents available</p>
                <Link
                  href="/marketplace"
                  className="mt-2 inline-block text-sm font-medium text-blue-600"
                >
                  Visit marketplace
                </Link>
              </div>
            ) : (
              <>
                <div className="pt-1">
                  {agentCards.filter(a => a.hired).length > 0 && (
                    <div className={`px-3 sm:px-4 py-1.5 text-xs font-medium text-gray-400`}>
                      Your agents
                    </div>
                  )}
                  {agentCards
                    .filter(a => a.hired)
                    .map(a => (
                      <button
                        type="button"
                        key={a.id}
                        onClick={e => onAgentSelect(e, a.id, a.hired)}
                        className={`w-full flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-1 text-left transition-colors text-sm
                          ${agentData?.id === a.id ? "bg-gray-100/80" : "hover:bg-gray-50"}
                          text-gray-900`}
                      >
                        <span className="flex items-center gap-3">
                          {a?.agentImageUrl ? (
                            <div className="relative w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden flex-shrink-0">
                              <Image
                                src={a.agentImageUrl}
                                alt={`${a.name} avatar`}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <span className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 text-lg sm:text-xl rounded-full bg-gray-100 flex-shrink-0">
                              {a.avatar}
                            </span>
                          )}
                          <span className="font-medium ">{a?.name}</span>
                        </span>
                        {agentData?.id === a.id && <FiCheck className="h-5 w-5 text-blue-500" />}
                      </button>
                    ))}
                </div>

                {agentCards.filter(a => !a.hired).length > 0 && (
                  <>
                    <div className="pt-1 pb-2 border-t border-gray-100">
                      <div className="px-3 sm:px-4 py-1.5 text-xs font-medium text-gray-400">
                        Available to hire
                      </div>
                      {agentCards
                        .filter(a => !a.hired)
                        .map(a => (
                          <button
                            type="button"
                            key={a.id}
                            onClick={e => onAgentSelect(e, a.id, a.hired)}
                            className="w-full flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-1 text-left transition-colors text-sm hover:bg-gray-50 text-gray-600"
                          >
                            <span className="flex items-center gap-3">
                              {a?.agentImageUrl ? (
                                <div className="relative w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden flex-shrink-0">
                                  <Image
                                    src={a.agentImageUrl}
                                    alt={`${a.name} avatar`}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              ) : (
                                <span className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 text-lg sm:text-xl rounded-full bg-gray-100 flex-shrink-0">
                                  {a.avatar}
                                </span>
                              )}
                              <span>{a?.name}</span>
                            </span>
                            <span
                              className={`text-xs px-2.5 py-1 rounded-full font-medium
                                bg-blue-50 text-blue-600 border border-blue-100
                              `}
                            >
                              Hire
                            </span>
                          </button>
                        ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
