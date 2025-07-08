"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  User as UserIcon,
  Table,
  MessageSquare,
  Plus,
  Settings,
  Globe,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ToggleSystemTheme from "@/components/ToggleSystemTheme";
import { useAppDispatch, useAppSelector } from "@/store";
import { selectSidebarCollapsed } from "@/store/uiSlice";
import { supabase } from "@/integrations/supabase/client";
import { apiClient } from "@/integrations/fastapi/client";
import { loadAgents, selectAgentCards, selectAgentsStatus } from "@/store/agentsSlice";

const SearchParamRoot = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [format, setFormat] = useState<"table" | "chat">("table");
  const [searchMode, setSearchMode] = useState<"basic" | "deep">("basic");
  const [worldConnectionsMode, setWorldConnectionsMode] = useState<"connections" | "world">(
    "connections"
  );
  const [selectedAgent, setSelectedAgent] = useState(
    searchParams.get("agent") || "00000000-0000-4000-a000-000000000000"
  );
  const [threadId, setThreadId] = useState(searchParams.get("threadId") || "");
  const [messages, setMessages] = useState<
    { id: string; type: "user" | "agent"; content: string; timestamp: Date }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const [showAgentDropdown, setShowAgentDropdown] = useState(false);

  const darkMode = useAppSelector(s => s.theme.dark);
  const sidebarCollapsed = useAppSelector(selectSidebarCollapsed);

  const dispatch = useAppDispatch();
  const agentsStatus = useAppSelector(selectAgentsStatus);
  const agentCards = useAppSelector(selectAgentCards);

  // const templates = useAppSelector(selectTemplates);
  // const hiredAgents = useAppSelector(selectHired);

  useEffect(() => {
    if (agentsStatus === "idle") dispatch(loadAgents());
  }, [agentsStatus, dispatch]);

  useEffect(() => {
    function handleClickAway(e: MouseEvent) {
      if (!showAgentDropdown) return;

      const target = e.target as Node;

      const clickedOutside =
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        toggleBtnRef.current &&
        !toggleBtnRef.current.contains(target);

      if (clickedOutside) setShowAgentDropdown(false);
    }

    document.addEventListener("mousedown", handleClickAway);
    return () => document.removeEventListener("mousedown", handleClickAway);
  }, [showAgentDropdown]);

  useEffect(() => {
    const initialQ = searchParams.get("q");
    const initialA = searchParams.get("agent");
    if (initialA) setSelectedAgent(initialA);
    if (initialQ) {
      setQuery(initialQ);
      handleSearch(initialQ);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleAgentSelect = (
    e: React.MouseEvent<HTMLButtonElement>,
    id: string,
    hired: boolean
  ) => {
    console.log("id", id);
    e.stopPropagation();

    if (!hired) {
      router.push(`/marketplace?agent=${id}`);
      return;
    }

    setSelectedAgent(id);

    setShowAgentDropdown(false);
  };
  const agentData = agentCards.find(a => a.id === selectedAgent) || agentCards[0];

  const handleSearch = async (incoming?: string) => {
    const q = incoming ?? query;
    if (!q.trim()) return;

    setMessages(m => [
      ...m,
      {
        id: Date.now().toString(),
        type: "user",
        content: q,
        timestamp: new Date(),
      },
    ]);

    setIsLoading(true);

    const loadingMessageId = (Date.now() + 1).toString();
    setMessages(m => [
      ...m,
      {
        id: loadingMessageId,
        type: "agent",
        content: "⏳ Searching for information...",
        timestamp: new Date(),
      },
    ]);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        console.error("No user ID found. User might not be authenticated.");
        setMessages(m =>
          m.map(msg =>
            msg.id === loadingMessageId
              ? {
                  ...msg,
                  content: "Error: You need to be logged in to use this feature.",
                }
              : msg
          )
        );
        return;
      }

      let currentContent = "⏳ Searching for information...";
      let sources: any[] = [];
      let searchQueries: string[] = [];
      let hasExtractedFinalAnswer = false;

      await apiClient.sendStreamingChatRequest(
        userId,
        agentData.id,
        q,
        format,
        searchMode,
        worldConnectionsMode,
        threadId,
        (update: any) => {
          console.log("Streaming update:", update);

          switch (update.type) {
            case "thinking":
              // Update the loading message with thinking indicator
              currentContent = "🧠 Thinking...";
              setMessages(m =>
                m.map(msg =>
                  msg.id === loadingMessageId ? { ...msg, content: currentContent } : msg
                )
              );
              break;

            case "token":
              // Handle token updates from LLM streaming - show complete content directly
              const tokenContent =
                typeof update.content === "string"
                  ? update.content
                  : update.content && update.content.text
                    ? update.content.text
                    : "";

              if (tokenContent) {
                console.log("Token content:", tokenContent); // Debug log full content

                // Process content based on format
                if (format === "table") {
                  // For table format, try to extract JSON if it exists
                  const jsonMatch = tokenContent.match(/```json\s*([\s\S]*?)\s*```/);
                  if (jsonMatch && jsonMatch[1]) {
                    try {
                      // Try to parse the JSON
                      const jsonContent = JSON.parse(jsonMatch[1]);
                      // Format the JSON nicely for display
                      currentContent = JSON.stringify(jsonContent, null, 2);
                    } catch (e) {
                      // If JSON parsing fails, use the raw content
                      currentContent = tokenContent;
                    }
                  } else {
                    currentContent = tokenContent;
                  }
                } else {
                  // For chat format, use the raw content directly
                  currentContent = tokenContent;
                }

                hasExtractedFinalAnswer = true;

                // Update the message with the processed content
                setMessages(m =>
                  m.map(msg =>
                    msg.id === loadingMessageId ? { ...msg, content: currentContent } : msg
                  )
                );
              }
              break;

            case "search_query":
              // Show search queries being used
              searchQueries.push(update.content.query);
              currentContent = `🔍 Searching: ${searchQueries.join(", ")}...`;
              setMessages(m =>
                m.map(msg =>
                  msg.id === loadingMessageId ? { ...msg, content: currentContent } : msg
                )
              );
              break;

            case "source":
              // Collect sources
              sources.push(update.content);

              // Only update the message with source count if we haven't extracted a final answer yet
              if (!hasExtractedFinalAnswer) {
                currentContent = `📚 Found ${sources.length} source${sources.length > 1 ? "s" : ""}...`;
                setMessages(m =>
                  m.map(msg =>
                    msg.id === loadingMessageId ? { ...msg, content: currentContent } : msg
                  )
                );
              }
              break;

            case "message":
              // Final message
              if (update.content && update.content.content) {
                currentContent = update.content.content;
                setMessages(m =>
                  m.map(msg =>
                    msg.id === loadingMessageId ? { ...msg, content: currentContent } : msg
                  )
                );
              }
              break;

            case "error":
              // Handle error
              currentContent = `Something went wrong`;
              setMessages(m =>
                m.map(msg =>
                  msg.id === loadingMessageId ? { ...msg, content: currentContent } : msg
                )
              );
              break;

            case "done":
              // All done
              if (sources.length > 0) {
                console.log("Sources gathered:", sources);
                // You could display sources in the UI here
              }
              break;
          }
        }
      );
    } catch (error) {
      console.error("Error sending chat request:", error);
      // Replace the loading message with an error
      setMessages(m =>
        m.map(msg =>
          msg.id === loadingMessageId
            ? {
                ...msg,
                content:
                  "Sorry, there was an error processing your request. Please try again later.",
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      setQuery("");
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div
      className={`min-h-screen w-full ${darkMode ? "bg-gradient-to-tr from-black via-gray-900 to-gray-800" : "bg-gradient-to-br from-blue-50 to-purple-50"}`}
    >
      {/* Background overlay to fill any gaps */}
      <div className={`fixed inset-0 -z-10 ${darkMode ? "bg-gray-900" : "bg-white"}`}></div>
      {/* Main content with padding that adjusts based on sidebar state */}
      <div
        className={`transition-all duration-300 relative z-10 ${sidebarCollapsed ? "ml-5" : "ml-12"} px-4 py-8 flex flex-col ${
          messages.length ? "pt-8 pb-20" : "min-h-screen justify-center"
        }`}
      >
        {/* Hero Section */}
        <div
          className={`transition-all duration-500 text-center ${messages.length ? "py-4" : "mb-8"}`}
        >
          <h1
            className={`text-4xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-900"} ${
              messages.length ? "text-2xl" : "text-4xl"
            }`}
          >
            Who can I help you find?
          </h1>
          <p
            className={`max-w-xl mx-auto text-lg ${darkMode ? "text-gray-300" : "text-gray-600"} ${
              messages.length ? "text-sm hidden sm:block" : "text-lg"
            }`}
          >
            Our AI filters through millions of profiles to surface genuinely relevant people.
          </p>
        </div>

        <div
          className={`max-w-4xl mx-auto ${messages.length ? "mb-8" : "mb-16"} transition-all duration-500`}
        >
          <div className="relative flex justify-center">
            {/* Main Search Bar - Perplexity/ChatGPT/Clado Style */}
            <div
              className={`flex items-center rounded-2xl px-6 py-4 shadow-lg transition-all duration-200 focus-within:shadow-xl w-full max-w-3xl ${
                darkMode
                  ? "border border-gray-700 bg-gray-900/80 hover:border-gray-600"
                  : "border border-gray-200 bg-white hover:border-gray-300"
              }`}
              style={{ backdropFilter: "blur(10px)" }}
            >
              <Search className={`h-5 w-5 mr-4 ${darkMode ? "text-gray-400" : "text-gray-500"}`} />
              <Input
                type="text"
                placeholder="Search for people by skills, experience, or interests…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={onKey}
                className={`
                  flex-1 bg-transparent text-base h-10
                  border-0 focus:border-0 outline-none ring-0 focus:ring-0
                  ${darkMode ? "text-white placeholder:text-gray-500" : "text-gray-900 placeholder:text-gray-500"}
                `}
              />

              {/* Small Toggle Buttons - Perplexity Style */}
              <div className="flex items-center gap-2 mr-2">
                {/* Connections/World Toggle */}
                <button
                  onClick={() =>
                    setWorldConnectionsMode(
                      worldConnectionsMode === "connections" ? "world" : "connections"
                    )
                  }
                  className={`px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 ${
                    darkMode
                      ? "bg-gray-800 border border-gray-700 hover:bg-gray-700"
                      : "bg-gray-100 border border-gray-200 hover:bg-gray-200"
                  }`}
                  title={`Switch to ${worldConnectionsMode === "connections" ? "Global" : "Connections"} search`}
                >
                  {worldConnectionsMode === "connections" ? (
                    <>
                      <UserIcon className="h-4 w-4" />
                      <span className="text-xs font-medium">{"Connections"}</span>
                    </>
                  ) : (
                    <>
                      <Globe className="h-4 w-4" />
                      <span className="text-xs font-medium">{"Global"}</span>
                    </>
                  )}
                </button>

                {/* Mode Toggle Button - Basic/Deep */}
                <button
                  onClick={() => setSearchMode(searchMode === "basic" ? "deep" : "basic")}
                  className={`p-1.5 rounded-md transition-colors ${
                    darkMode
                      ? "text-gray-400 hover:text-gray-300 hover:bg-gray-800"
                      : "text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                  title={`Switch to ${searchMode === "basic" ? "Deep" : "Basic"} search`}
                >
                  {searchMode === "basic" ? (
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      Basic
                    </span>
                  ) : (
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                      Deep
                    </span>
                  )}
                </button>

                {/* Format Toggle Button - Table/Chat */}
                <button
                  onClick={() => setFormat(format === "table" ? "chat" : "table")}
                  className={`p-1.5 rounded-md transition-colors ${
                    darkMode
                      ? "text-gray-400 hover:text-gray-300 hover:bg-gray-800"
                      : "text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                  title={`Switch to ${format === "table" ? "Chat" : "Table"} view`}
                >
                  {format === "table" ? (
                    <Table className="h-4 w-4" />
                  ) : (
                    <MessageSquare className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Agent Selector */}
              <div className="relative">
                <Button
                  variant="ghost"
                  ref={toggleBtnRef}
                  onClick={() => setShowAgentDropdown(s => !s)}
                  disabled={agentsStatus === "loading"}
                  className={`
                    flex items-center space-x-2 rounded-full px-3 py-2 border mr-3
                    ${agentsStatus === "loading" ? "cursor-not-allowed opacity-60" : ""}
                    ${
                      darkMode
                        ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }
                  `}
                >
                  {agentsStatus === "loading" ? (
                    <span className="block h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  ) : (
                    <>
                      <span>{agentData?.avatar}</span>
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M6 8l4 4 4-4" />
                      </svg>
                    </>
                  )}
                </Button>

                {showAgentDropdown && (
                  <div
                    ref={dropdownRef}
                    className={`absolute right-0 top-full mt-2 w-56 rounded-lg shadow-lg z-50 ${
                      darkMode
                        ? "bg-gray-900 border border-gray-700"
                        : "bg-white border border-gray-200"
                    }`}
                  >
                    {agentsStatus === "loading" ? (
                      <div className="p-4 text-center text-gray-500">Loading your agents…</div>
                    ) : (
                      agentCards.map(a => (
                        <button
                          type="button"
                          key={a.id}
                          onClick={e => handleAgentSelect(e, a.id, a.hired)}
                          className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                            darkMode
                              ? "hover:bg-gray-800 text-gray-200"
                              : "hover:bg-gray-50 text-gray-900"
                          }`}
                        >
                          <span className="flex items-center space-x-3">
                            <span className="text-lg">{a?.avatar}</span>
                            <span className="text-sm">{a?.name}</span>
                          </span>
                          {!a.hired && (
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                darkMode ? "bg-blue-900 text-blue-300" : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              Hire
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Search Button */}
              <Button
                onClick={() => handleSearch()}
                disabled={!query.trim() || isLoading}
                className={`rounded-full px-6 py-2 text-white font-semibold transition-all duration-200 ${
                  !query.trim() || isLoading
                    ? darkMode
                      ? "bg-gray-800 cursor-not-allowed"
                      : "bg-gray-300 cursor-not-allowed"
                    : darkMode
                      ? "bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 hover:to-indigo-600"
                      : "bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 hover:to-indigo-600"
                }`}
              >
                Search
              </Button>
            </div>

            {/* Collapsible Options Panel - Perplexity Style */}
            {showOptions && (
              <div
                className={`mt-3 p-4 rounded-xl border shadow-lg transition-all duration-200 ${
                  darkMode ? "bg-gray-900/90 border-gray-700" : "bg-white border-gray-200"
                }`}
                style={{ backdropFilter: "blur(8px)" }}
              >
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col sm:flex-row gap-6">
                    {/* Search Mode Options */}
                    <div className="flex-1">
                      <label
                        className={`block text-sm font-medium mb-2 ${
                          darkMode ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Search Mode
                      </label>
                      <div
                        className={`flex rounded-md overflow-hidden border ${darkMode ? "border-gray-700" : "border-gray-200"}`}
                      >
                        <button
                          onClick={() => setSearchMode("basic")}
                          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${searchMode === "basic" ? (darkMode ? "bg-blue-600 text-white" : "bg-blue-500 text-white") : darkMode ? "bg-transparent text-gray-400" : "bg-transparent text-gray-600"}`}
                        >
                          Basic
                        </button>
                        <button
                          onClick={() => setSearchMode("deep")}
                          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${searchMode === "deep" ? (darkMode ? "bg-purple-600 text-white" : "bg-purple-500 text-white") : darkMode ? "bg-transparent text-gray-400" : "bg-transparent text-gray-600"}`}
                        >
                          Deep
                        </button>
                      </div>
                      <p className={`text-xs mt-1 ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
                        {searchMode === "basic"
                          ? "Faster, lighter search"
                          : "Comprehensive, thorough search"}
                      </p>
                    </div>

                    {/* Response Format Options */}
                    <div className="flex-1">
                      <label
                        className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Response Format
                      </label>
                      <div
                        className={`flex rounded-md overflow-hidden border ${darkMode ? "border-gray-700" : "border-gray-200"}`}
                      >
                        <button
                          onClick={() => setFormat("table")}
                          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${format === "table" ? (darkMode ? "bg-green-600 text-white" : "bg-green-500 text-white") : darkMode ? "bg-transparent text-gray-400" : "bg-transparent text-gray-600"}`}
                        >
                          <Table className="h-4 w-4" />
                          Table
                        </button>
                        <button
                          onClick={() => setFormat("chat")}
                          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${format === "chat" ? (darkMode ? "bg-orange-600 text-white" : "bg-orange-500 text-white") : darkMode ? "bg-transparent text-gray-400" : "bg-transparent text-gray-600"}`}
                        >
                          <MessageSquare className="h-4 w-4" />
                          Chat
                        </button>
                      </div>
                      <p className={`text-xs mt-1 ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
                        {format === "table" ? "Structured data view" : "Conversational response"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-6">
                    {/* Search Source Options */}
                    <div className="flex-1">
                      <label
                        className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Search Source
                      </label>
                      <div
                        className={`flex rounded-md overflow-hidden border ${darkMode ? "border-gray-700" : "border-gray-200"}`}
                      >
                        <button
                          onClick={() => setWorldConnectionsMode("connections")}
                          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${worldConnectionsMode === "connections" ? (darkMode ? "bg-indigo-600 text-white" : "bg-indigo-500 text-white") : darkMode ? "bg-transparent text-gray-400" : "bg-transparent text-gray-600"}`}
                        >
                          <UserIcon className="h-4 w-4" />
                          My Connections
                        </button>
                        <button
                          onClick={() => setWorldConnectionsMode("world")}
                          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${worldConnectionsMode === "world" ? (darkMode ? "bg-teal-600 text-white" : "bg-teal-500 text-white") : darkMode ? "bg-transparent text-gray-400" : "bg-transparent text-gray-600"}`}
                        >
                          <Search className="h-4 w-4" />
                          Global Search
                        </button>
                      </div>
                      <p className={`text-xs mt-1 ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
                        {worldConnectionsMode === "connections"
                          ? "Search within your LinkedIn connections"
                          : "Search across the entire web"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {messages.length > 0 && (
          <div className="w-full mt-8">
            <div className="mb-4">
              <h2 className={`text-2xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
                Results
              </h2>
            </div>

            <div className="space-y-6">
              {messages.map(
                m =>
                  m.type === "agent" && (
                    <div
                      key={m.id}
                      className={`rounded-xl p-6 transition-shadow ${
                        darkMode
                          ? "bg-gray-900/70 border border-gray-700 shadow-md hover:shadow-lg"
                          : "bg-white border border-gray-200 shadow-sm hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-start">
                        <div
                          className={`rounded-full p-3 mr-4 ${
                            darkMode ? "bg-blue-900/30" : "bg-blue-50"
                          }`}
                        >
                          <UserIcon
                            className={`h-6 w-6 ${darkMode ? "text-blue-400" : "text-blue-600"}`}
                          />
                        </div>
                        <div className="flex-1">
                          <div
                            className={`whitespace-pre-wrap ${
                              darkMode ? "text-gray-300" : "text-gray-700"
                            }`}
                          >
                            {m.content}
                          </div>
                          <div className="mt-4 flex justify-between items-center">
                            <span
                              className={`text-sm ${darkMode ? "text-gray-500" : "text-gray-500"}`}
                            >
                              {m.timestamp.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchParamRoot;
