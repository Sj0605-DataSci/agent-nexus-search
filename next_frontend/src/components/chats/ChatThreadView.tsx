"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import {
  Search,
  User as UserIcon,
  MessageSquare,
  Globe,
  ChevronDown,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ToggleSystemTheme from "@/components/ToggleSystemTheme";
import { useAppDispatch, useAppSelector } from "@/store";
import { selectSidebarCollapsed } from "@/store/uiSlice";
import { supabase } from "@/integrations/supabase/client";
import { apiClient } from "@/integrations/fastapi/client";
import { loadAgents, selectAgentCards, selectAgentsStatus } from "@/store/agentsSlice";
import SearchModeToggle from "./SearchModeToggle";
import WorldConnectionsToggle from "./WorldConnectionsToggle";

const ChatThreadView = ({ threadId }: { threadId: string }) => {
  const router = useRouter();
  const toggleBtnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Parse URL search params safely on the client side
  const [query, setQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("00000000-0000-4000-a000-000000000000");
  
  // Initialize from URL params on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      setQuery(urlParams.get("q") || "");
      setSelectedAgent(urlParams.get("agent") || "00000000-0000-4000-a000-000000000000");
    }
  }, []);
  
  const [format, setFormat] = useState<"chat" | "table">("chat");
  const [searchMode, setSearchMode] = useState<"basic" | "deep">("basic");
  const [worldConnectionsMode, setWorldConnectionsMode] = useState<"connections" | "world">("world");
  const [messages, setMessages] = useState<
    { id: string; type: "user" | "agent"; content: string; timestamp: Date }[]
  >([]);
  const [chatPairs, setChatPairs] = useState<any[]>([]);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
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
    
    // Track page view when component mounts
    posthog.capture("chat_thread_viewed", { 
      thread_id: threadId,
      is_new_thread: threadId === "new"
    });
  }, [agentsStatus, dispatch, threadId]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!threadId) return;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        if (!userId) {
          console.error("User not authenticated.");
          return;
        }

        const chatMessages = await apiClient.getChatMessages(userId, threadId);

        if (chatMessages && chatMessages.length > 0) {
          setChatPairs(chatMessages);
          setCurrentMessageIndex(chatMessages.length - 1);
        }
      } catch (error) {
        console.error("Error fetching chat messages:", error);
      }
    };

    fetchMessages();
  }, [threadId]);

  useEffect(() => {
    if (chatPairs.length > 0) {
      const currentPair = chatPairs[currentMessageIndex];
      setQuery(currentPair.main_query);

      const userMessage = {
        id: `${currentPair.id}-user`,
        type: "user" as const,
        content: currentPair.main_query,
        timestamp: new Date(currentPair.created_at),
      };

      let messageContent = currentPair.message;

      if (typeof messageContent === "object" && messageContent !== null) {
        messageContent = JSON.stringify(messageContent, null, 2);
      }

      const agentMessage = {
        id: currentPair.id,
        type: "agent" as const,
        content: messageContent,
        timestamp: new Date(currentPair.updated_at),
      };

      setMessages([userMessage, agentMessage]);
    }
  }, [currentMessageIndex, chatPairs]);

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

  // URL params are already handled in the initial useEffect
  // This effect is no longer needed since we're not using the searchParams hook
  // The initialization is done in the useEffect at the top of the component

  const handleAgentSelect = (
    e: React.MouseEvent<HTMLButtonElement>,
    id: string,
    hired: boolean
  ) => {
    console.log("id", id);
    e.stopPropagation();

    if (!hired) {
      // Track when user clicks on non-hired agent
      posthog.capture("agent_marketplace_redirect", { agent_id: id });
      router.push(`/marketplace?agent=${id}`);
      return;
    }

    // Track agent selection
    posthog.capture("agent_selected", { 
      agent_id: id,
      thread_id: threadId
    });
    
    setSelectedAgent(id);
    setShowAgentDropdown(false);
  };
  const agentData = agentCards.find(a => a.id === selectedAgent) || agentCards[0];

  const handleSearch = async (incoming?: string) => {
    const q = incoming ?? query;
    if (!q.trim()) return;
    
    // Track search query
    posthog.capture("search_initiated", {
      query: q,
      agent_id: selectedAgent,
      search_mode: searchMode,
      world_connections_mode: worldConnectionsMode,
      format: format,
      thread_id: threadId
    });

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
      
      // Track search start time for duration calculation
      const searchStartTime = Date.now();

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
                if (format === "chat") {
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
              if (update.thread_id && threadId === "new") {
                router.replace(`/chat/${update.thread_id}`);
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
              
              // Track search completion with duration and result metrics
              posthog.capture("search_completed", {
                query: q,
                agent_id: selectedAgent,
                search_mode: searchMode,
                world_connections_mode: worldConnectionsMode,
                format: format,
                thread_id: threadId,
                duration_ms: Date.now() - searchStartTime,
                sources_count: sources.length,
                search_queries_count: searchQueries.length
              });
              break;
          }
        }
      );
    } catch (error) {
      console.error("Error sending chat request:", error);
      
      // Track search error
      posthog.capture("search_error", {
        query: q,
        agent_id: selectedAgent,
        error: error instanceof Error ? error.message : String(error)
      });
      
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

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
      
      // Track search via Enter key
      posthog.capture("search_input_method", { method: "enter_key" });
    } else if (e.key === "Enter" && e.shiftKey) {
      // Allow new line on Shift+Enter
    }
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 120; // Corresponds to max-h-[120px]
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [query]);

  return (
    <div>
      <div
        className={`transition-all duration-300 relative z-10 ${sidebarCollapsed ? "ml-5" : "ml-12"} px-4 pt-8  flex flex-col ${
          messages.length ? "pt-8 pb-1" : "min-h-screen justify-center"
        }`}
      >
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
          className={`max-w-4xl mx-auto w-full ${messages.length ? "mb-6" : "mb-8"} transition-all duration-500`}
        >
          <div className="relative flex justify-center">
            <div
              className={`flex items-center flex-col rounded-2xl px-6 py-4 shadow-lg transition-all duration-200 focus-within:shadow-xl w-full max-w-3xl ${
                darkMode
                  ? "border border-gray-700 bg-gray-900/80 hover:border-gray-600"
                  : "border border-gray-200 bg-white hover:border-gray-300"
              }`}
              style={{ backdropFilter: "blur(10px)" }}
            >
              <div className=" flex flex-row w-full items-center">
                <Search
                  className={`h-5 w-5 mr-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                />
                <Textarea
                  placeholder="Search for people by skills, experience, or interests… (Shift+Enter for new line)"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  ref={textareaRef}
                  onKeyDown={onKey}
                  rows={1}
                  className={`
                    flex bg-transparent text-base resize-none
                    border-0 focus:border-0 outline-none ring-0 focus:ring-0 focus-visible:ring-0
                    min-h-[40px] max-h-[120px]
                    ${darkMode ? "text-white placeholder:text-gray-500" : "text-gray-900 placeholder:text-gray-500"}
                  `}
                />
              </div>
              <div className=" flex flex-row justify-between w-full">
                <div className="flex items-center gap-2 mr-2">
                  <div className="flex space-x-2">
                    <SearchModeToggle 
                      searchMode={searchMode} 
                      darkMode={darkMode}
                      setSearchMode={(mode: "basic" | "deep") => {
                        // Track search mode change
                        posthog.capture("search_mode_changed", { mode });
                        setSearchMode(mode);
                      }} 
                    />
                    <WorldConnectionsToggle
                      worldConnectionsMode={worldConnectionsMode}
                      darkMode={darkMode}
                      setWorldConnectionsMode={(mode: "connections" | "world") => {
                        // Track world connections mode change
                        posthog.capture("world_connections_mode_changed", { mode });
                        setWorldConnectionsMode(mode);
                      }}
                    />
                  </div>
                </div>

                {/* Agent Selector */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    ref={toggleBtnRef}
                    onClick={() => setShowAgentDropdown(s => !s)}
                    disabled={agentsStatus === "loading"}
                    className={`
                      flex items-center space-x-2 rounded-full px-4 py-1 border mr-3 transition-colors
                      ${agentsStatus === "loading" ? "cursor-not-allowed opacity-60" : ""}
                      ${
                        darkMode
                          ? "border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }
                    `}
                  >
                    {agentsStatus === "loading" ? (
                      <>
                        <span className="block h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                        <span className="text-sm">Loading...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-lg">{agentData?.avatar}</span>
                        <span className="text-sm font-medium">{agentData?.name}</span>
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      </>
                    )}
                  </Button>

                  {showAgentDropdown && (
                    <div
                      ref={dropdownRef}
                      className={`absolute right-0 top-full mt-2 w-64 rounded-xl shadow-lg z-50 overflow-hidden ${
                        darkMode
                          ? "bg-gray-900 border border-gray-700"
                          : "bg-white border border-gray-200"
                      }`}
                    >
                      <div className="px-4 py-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}">
                        <p
                          className={`text-sm font-semibold ${darkMode ? "text-gray-200" : "text-gray-800"}`}
                        >
                          Select Agent
                        </p>
                      </div>
                      <div className="py-2">
                        {agentsStatus === "loading" ? (
                          <div className="p-4 text-center text-sm text-gray-500">
                            Loading your agents…
                          </div>
                        ) : (
                          agentCards.map(a => (
                            <button
                              type="button"
                              key={a.id}
                              onClick={e => handleAgentSelect(e, a.id, a.hired)}
                              className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors text-sm ${
                                darkMode
                                  ? "hover:bg-gray-800 text-gray-300"
                                  : "hover:bg-gray-100 text-gray-900"
                              }`}
                            >
                              <span className="flex items-center space-x-3">
                                <span className="text-xl">{a?.avatar}</span>
                                <span>{a?.name}</span>
                              </span>
                              <div className="flex items-center space-x-3">
                                {!a.hired && (
                                  <span
                                    className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                                      darkMode
                                        ? "bg-blue-600/20 text-blue-300"
                                        : "bg-blue-100 text-blue-600"
                                    }`}
                                  >
                                    Hire
                                  </span>
                                )}
                                {agentData?.id === a.id && (
                                  <Check className="h-5 w-5 text-blue-500" />
                                )}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Search Button */}
              {/* <Button
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
              </Button> */}
            </div>
          </div>

          {chatPairs.length > 1 && (
            <div className="flex justify-center items-center gap-3 mt-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMessageIndex(prev => Math.max(0, prev - 1))}
                disabled={currentMessageIndex === 0}
                className={`rounded-full transition-colors ${
                  darkMode
                    ? "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                    : "text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span
                className={`text-sm font-medium tabular-nums ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                {currentMessageIndex + 1} of {chatPairs.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setCurrentMessageIndex(prev => Math.min(chatPairs.length - 1, prev + 1))
                }
                disabled={currentMessageIndex === chatPairs.length - 1}
                className={`rounded-full transition-colors ${
                  darkMode
                    ? "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                    : "text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {messages.length > 0 && (
        <div className="w-full mt-2">
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
  );
};

export default ChatThreadView;
