"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Send, ChevronDown, Bot, User } from "lucide-react";
import Navigation from "@/components/Navigation";
import { apiClient } from "@/integrations/fastapi/client";
import { HiredAgent, AgentTemplate } from "@/integrations/fastapi/types";
import { useRouter } from "next/navigation"; // ✅ Next.js
import { useSearchParams } from "next/navigation";

// Default general agent is always available
const defaultAgent = {
  id: "general",
  name: "General Agent",
  avatar: "🤖",
  hired: true,
};

const SearchParamRoot = () => {
  const router = useRouter();

  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q");
  const initialAgent = searchParams.get("agent");
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [selectedAgent, setSelectedAgent] = useState(
    searchParams.get("agent") || "general"
  );
  const [messages, setMessages] = useState<
    Array<{
      id: string;
      type: "user" | "agent";
      content: string;
      timestamp: Date;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [hiredAgents, setHiredAgents] = useState<Array<HiredAgent>>([]);
  const [agentTemplates, setAgentTemplates] = useState<Array<AgentTemplate>>(
    []
  );
  const [userAgents, setUserAgents] = useState<
    Array<{ id: string; name: string; avatar: string; hired: boolean }>
  >([defaultAgent]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);

  useEffect(() => {
    if (initialAgent) {
      setSelectedAgent(initialAgent);
    }

    if (initialQuery) {
      setQuery(initialQuery);
      handleSearch(initialQuery);
    }
  }, [searchParams]);

  // Fetch hired agents and agent templates
  useEffect(() => {
    const fetchAgents = async () => {
      setIsLoadingAgents(true);
      try {
        // Fetch both hired agents and agent templates
        const [hiredAgentsData, templatesData] = await Promise.all([
          apiClient.getHiredAgents(),
          apiClient.getAgentTemplates(),
        ]);

        setHiredAgents(hiredAgentsData);
        setAgentTemplates(templatesData);

        // Map hired agents to the format needed for the dropdown
        const mappedAgents = [defaultAgent];

        for (const hiredAgent of hiredAgentsData) {
          // Find the template for this hired agent
          const template = templatesData.find(
            (t) => t.id === hiredAgent.template_id
          );
          if (template) {
            // Determine avatar based on template category
            let avatar = "🤖"; // Default
            if (template.category.toLowerCase().includes("sales")) {
              avatar = "💼";
            } else if (template.category.toLowerCase().includes("hr")) {
              avatar = "👥";
            }

            mappedAgents.push({
              id: hiredAgent.id,
              name: hiredAgent.name || template.name,
              avatar,
              hired: true,
            });
          }
        }

        setUserAgents(mappedAgents);
      } catch (error) {
        console.error("Failed to fetch agents:", error);
      } finally {
        setIsLoadingAgents(false);
      }
    };

    fetchAgents();
  }, []);

  const handleAgentSelect = (agentId: string) => {
    const agent = userAgents.find((a) => a.id === agentId);
    if (agent && !agent.hired) {
      // If agent is not hired, navigate to marketplace
      router.push(`/marketplace?agent=${agentId}`);
    } else {
      setSelectedAgent(agentId);
      setShowAgentDropdown(false);
    }
  };

  const handleSearch = async (searchQuery?: string) => {
    const queryToSearch = searchQuery || query;
    if (!queryToSearch.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      type: "user" as const,
      content: queryToSearch,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const selectedAgentData = userAgents.find((a) => a.id === selectedAgent);
      const agentMessage = {
        id: (Date.now() + 1).toString(),
        type: "agent" as const,
        content: `${selectedAgentData?.avatar} **${selectedAgentData?.name}** here! I understand you're asking about "${queryToSearch}". Here's what I found:\n\nThis is a comprehensive response about your query. I've analyzed the information and here are the key insights:\n\n• Key point 1 about your search\n• Important detail 2 to consider\n• Additional insight 3 that might help\n\nWould you like me to dive deeper into any specific aspect?`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentMessage]);
      setIsLoading(false);
    }, 1500);

    setQuery("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const selectedAgentData = userAgents.find((a) => a.id === selectedAgent);

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <div className="container mx-auto px-4 pt-32">
        {/* Logo/Title - only show when no messages */}
        {messages.length === 0 && (
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Who can I help you find?
            </h1>
            <p className="text-gray-600 text-lg max-w-xl mx-auto">
              Our AI filters through millions of profiles to surface genuinely
              relevant people.
            </p>
          </div>
        )}

        {/* Search Box */}
        <div
          className={`max-w-2xl mx-auto ${
            messages.length > 0 ? "mb-8" : "mb-16"
          }`}
        >
          <div className="relative">
            <div className="flex items-center border-2 border-gray-200 rounded-full px-5 py-4 shadow-sm hover:shadow-md transition-shadow duration-200 focus-within:shadow-md focus-within:border-blue-500">
              <Search className="h-5 w-5 text-gray-400 mr-3" />

              <Input
                type="text"
                placeholder="Search for people by skills, experience, or interests..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 border-none outline-none focus:ring-0 text-gray-900 placeholder-gray-500 bg-transparent"
              />

              {/* Agent Selector */}
              <div className="relative">
                <Button
                  onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                  variant="ghost"
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-full px-3 py-2 border border-gray-200 ml-2"
                >
                  {selectedAgentData ? (
                    <span className="mr-1">{selectedAgentData.avatar}</span>
                  ) : (
                    <Bot className="h-4 w-4 text-blue-500" />
                  )}
                  <ChevronDown className="h-4 w-4" />
                </Button>

                {showAgentDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    {isLoadingAgents ? (
                      <div className="p-4 text-center text-gray-500">
                        Loading your agents...
                      </div>
                    ) : (
                      userAgents.map((agent) => (
                        <button
                          key={agent.id}
                          onClick={() => handleAgentSelect(agent.id)}
                          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-lg">{agent.avatar}</span>
                            <span className="text-sm text-gray-900">
                              {agent.name}
                            </span>
                          </div>
                          {!agent.hired && agent.id !== "general" && (
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                              Hire
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <Button
                onClick={() => handleSearch()}
                disabled={!query.trim() || isLoading}
                className="ml-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-2"
              >
                Search
              </Button>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {messages.length > 0 && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Results
            </h2>

            {/* Results List */}
            <div className="space-y-6">
              {messages.map(
                (message) =>
                  message.type === "agent" && (
                    <div
                      key={message.id}
                      className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start">
                        <div className="bg-blue-50 rounded-full p-3 mr-4">
                          <User className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-medium text-gray-900 mb-2">
                            John Doe
                          </h3>
                          <p className="text-gray-600 mb-3">
                            Senior Software Engineer at Tech Company
                          </p>
                          <div className="whitespace-pre-wrap text-gray-700">
                            {message.content}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                              React
                            </span>
                            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                              TypeScript
                            </span>
                            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                              Node.js
                            </span>
                          </div>

                          <div className="mt-4 flex justify-between items-center">
                            <div className="text-sm text-gray-500">
                              {message.timestamp.toLocaleString()}
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full border-gray-200"
                              >
                                View Profile
                              </Button>
                              <Button
                                size="sm"
                                className="rounded-full bg-blue-600 hover:bg-blue-700"
                              >
                                Contact
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
              )}

              {isLoading && (
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                    <span className="text-gray-600 font-medium">
                      Searching for the perfect match...
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close dropdown */}
      {showAgentDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowAgentDropdown(false)}
        />
      )}
    </div>
  );
};

export default SearchParamRoot;
