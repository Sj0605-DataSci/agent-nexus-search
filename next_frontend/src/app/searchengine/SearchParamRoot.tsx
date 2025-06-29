"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ChevronDown, User as UserIcon } from "lucide-react";
import { Variants } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navigation from "@/components/Navigation";

import { apiClient } from "@/integrations/fastapi/client";
import { HiredAgent, AgentTemplate } from "@/integrations/fastapi/types";
import { useAppSelector } from "@/store";
import ToggleSystemTheme from "@/components/ToggleSystemTheme";
import { supabase } from "@/integrations/supabase/client";

const backdropVariants: Variants = {
  animate: {
    rotate: [0, 15, -10, 0],
    scale: [1, 1.05, 0.98, 1],
    transition: { duration: 10, repeat: Infinity, ease: "easeInOut" },
  },
};

// Using a valid UUID format for the default agent
const defaultAgent = {
  id: "00000000-0000-4000-a000-000000000000", // Valid UUID format
  name: "General Agent",
  avatar: "🤖",
  hired: true,
};

const SearchParamRoot = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [selectedAgent, setSelectedAgent] = useState(
    searchParams.get("agent") || "00000000-0000-4000-a000-000000000000"
  );
  const [messages, setMessages] = useState<
    { id: string; type: "user" | "agent"; content: string; timestamp: Date }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [hiredAgents, setHiredAgents] = useState<HiredAgent[]>([]);
  const [agentTemplates, setAgentTemplates] = useState<AgentTemplate[]>([]);
  const [userAgents, setUserAgents] = useState<
    { id: string; name: string; avatar: string; hired: boolean }[]
  >([defaultAgent]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);

  const darkMode = useAppSelector(s => s.theme.dark);

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

  useEffect(() => {
    const fetchAgents = async () => {
      setIsLoadingAgents(true);
      try {
        const [hired, templates] = await Promise.all([
          apiClient.getHiredAgents(),
          apiClient.getAgentTemplates(),
        ]);
        setHiredAgents(hired);
        setAgentTemplates(templates);

        const mapped = [defaultAgent];
        for (const ha of hired) {
          const tpl = templates.find(t => t.id === ha.template_id);
          if (tpl) {
            const avatar = tpl.category.toLowerCase().includes("sales")
              ? "💼"
              : tpl.category.toLowerCase().includes("hr")
                ? "👥"
                : "🤖";
            mapped.push({
              id: ha.id,
              name: ha.name || tpl.name,
              avatar,
              hired: true,
            });
          }
        }
        setUserAgents(mapped);
      } catch (err) {
        console.error("Failed to fetch agents:", err);
      } finally {
        setIsLoadingAgents(false);
      }
    };
    fetchAgents();
  }, []);

  const handleAgentSelect = (agentId: string) => {
    const agent = userAgents.find(a => a.id === agentId);
    if (agent && !agent.hired) router.push(`/marketplace?agent=${agentId}`);
    else {
      setSelectedAgent(agentId);
      setShowAgentDropdown(false);
    }
  };

  const handleSearch = async (incoming?: string) => {
    const q = incoming ?? query;
    if (!q.trim()) return;

    // Add user message to chat
    setMessages(m => [
      ...m,
      {
        id: Date.now().toString(),
        type: "user",
        content: q,
        timestamp: new Date(),
      },
    ]);

    // Show loading indicator
    setIsLoading(true);

    // Add a temporary loading message from the agent
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
      // Get the current user ID from Supabase auth
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        console.error("No user ID found. User might not be authenticated.");
        // Replace the loading message with an error
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

      // Log userAgents and selectedAgent for debugging
      console.log("Available userAgents:", userAgents);
      console.log("Selected agent ID:", selectedAgent);

      const agentData = userAgents.find(a => a.id === selectedAgent) || defaultAgent;
      console.log("Agent data being used:", agentData);

      // Use streaming API instead of regular chat request
      let currentContent = "⏳ Searching for information...";
      let sources: any[] = [];
      let searchQueries: string[] = [];
      let hasExtractedFinalAnswer = false; // Track if we've extracted a final answer

      await apiClient.sendStreamingChatRequest(userId, agentData.id, q, update => {
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
            const tokenContent = typeof update.content === 'string' ? update.content : 
                              (update.content && update.content.text ? update.content.text : '');
          
            if (tokenContent) {
              console.log("Token content:", tokenContent); // Debug log full content
              
              // Just use the token content directly without any filtering
              currentContent = tokenContent;
              hasExtractedFinalAnswer = true;
              
              // Update the message with the complete token content
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
      });
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

  const agentData = userAgents.find(a => a.id === selectedAgent) || defaultAgent;
  return (
    <div
      className={`min-h-screen transition-colors duration-500 relative ${
        darkMode
          ? "bg-gradient-to-tr from-black via-gray-900 to-gray-800"
          : "bg-gradient-to-br from-blue-50 to-purple-50"
      }`}
    >
      <Navigation />

      <ToggleSystemTheme className="fixed top-5 right-5 z-30 " />
      <div className="container mx-auto px-4 pt-32 pb-20 relative z-10">
        {/* Hero header */}
        {/* Who you want to search? ------- */}
        {/* Engineers, Leads, People */}
        {messages.length === 0 && (
          <div className="text-center mb-12">
            <h1 className={`text-4xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>
              Who can I help you find?
            </h1>
            <p
              className={`max-w-xl mx-auto text-lg ${darkMode ? "text-gray-300" : "text-gray-600"}`}
            >
              Our AI filters through millions of profiles to surface genuinely relevant people.
            </p>
          </div>
        )}

        {/* Search bar */}
        <div className={`max-w-2xl mx-auto ${messages.length ? "mb-8" : "mb-16"}`}>
          <div className="relative">
            <div
              className={`flex items-center rounded-full px-5 py-4 shadow-sm transition-shadow duration-200 focus-within:shadow-md ${
                darkMode
                  ? "border border-gray-700 bg-gray-900/60 hover:shadow-lg"
                  : "border-2 border-gray-200 bg-white hover:shadow-md"
              }`}
            >
              <Search className={`h-5 w-5 mr-3 ${darkMode ? "text-gray-400" : "text-gray-500"}`} />
              <Input
                type="text"
                placeholder="Search for people by skills, experience, or interests…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyPress={onKey}
                className={`
    flex-1 bg-transparent text-base
    border-0 focus:border-0
    outline-none focus:outline-none
    ring-0 focus:ring-0
    ${darkMode ? "text-white placeholder-gray-500" : "text-gray-900 placeholder-gray-500"}
  `}
              />

              {/* Agent selector */}
              <div className="relative">
                <Button
                  variant="ghost"
                  onClick={() => setShowAgentDropdown(s => !s)}
                  className={`flex items-center space-x-2 rounded-full px-3 py-2 border ${
                    darkMode
                      ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="mr-1">{agentData.avatar}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>

                {showAgentDropdown && (
                  <div
                    className={`absolute right-0 top-full mt-2 w-56 rounded-lg shadow-lg z-50 ${
                      darkMode
                        ? "bg-gray-900 border border-gray-700"
                        : "bg-white border border-gray-200"
                    }`}
                  >
                    {isLoadingAgents ? (
                      <div className="p-4 text-center text-gray-500">Loading your agents…</div>
                    ) : (
                      userAgents.map(agent => (
                        <button
                          key={agent.id}
                          onClick={() => handleAgentSelect(agent.id)}
                          className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                            darkMode
                              ? "hover:bg-gray-800 text-gray-200"
                              : "hover:bg-gray-50 text-gray-900"
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-lg">{agent.avatar}</span>
                            <span className="text-sm">{agent.name}</span>
                          </div>
                          {!agent.hired && agent.id !== "general" && (
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

              {/* Search button */}
              <Button
                onClick={() => handleSearch()}
                disabled={!query.trim() || isLoading}
                className={`ml-3 rounded-full px-6 py-2 text-white font-semibold transition-all duration-200 ${
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
          </div>
        </div>

        {/* Results */}
        {messages.length > 0 && (
          <div className="max-w-4xl mx-auto">
            <h2
              className={`text-2xl font-semibold mb-6 ${darkMode ? "text-white" : "text-gray-900"}`}
            >
              Results
            </h2>

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

              {/* We don't need a separate loader since we have the loading state in the chat messages */}
            </div>
          </div>
        )}
      </div>

      {/* Click-away catcher for dropdown */}
      {showAgentDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setShowAgentDropdown(false)} />
      )}
    </div>
  );
};

export default SearchParamRoot;
