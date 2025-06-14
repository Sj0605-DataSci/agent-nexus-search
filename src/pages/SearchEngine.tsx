
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Send, ChevronDown } from "lucide-react";
import Navigation from "@/components/Navigation";

const agents = [
  { id: "general", name: "General AI", avatar: "🤖" },
  { id: "research", name: "Research Assistant", avatar: "🔬" },
  { id: "creative", name: "Creative Writer", avatar: "✍️" },
  { id: "code", name: "Code Expert", avatar: "💻" },
  { id: "hr", name: "HR Agent", avatar: "👥" },
  { id: "sales", name: "Sales Agent", avatar: "💼" }
];

const SearchEngine = () => {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [selectedAgent, setSelectedAgent] = useState("general");
  const [messages, setMessages] = useState<Array<{id: string, type: 'user' | 'agent', content: string, timestamp: Date}>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);

  useEffect(() => {
    const initialQuery = searchParams.get('q');
    if (initialQuery) {
      setQuery(initialQuery);
      handleSearch(initialQuery);
    }
  }, [searchParams]);

  const handleSearch = async (searchQuery?: string) => {
    const queryToSearch = searchQuery || query;
    if (!queryToSearch.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: queryToSearch,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const selectedAgentData = agents.find(a => a.id === selectedAgent);
      const agentMessage = {
        id: (Date.now() + 1).toString(),
        type: 'agent' as const,
        content: `${selectedAgentData?.avatar} **${selectedAgentData?.name}** here! I understand you're asking about "${queryToSearch}". Here's what I found:\n\nThis is a comprehensive response about your query. I've analyzed the information and here are the key insights:\n\n• Key point 1 about your search\n• Important detail 2 to consider\n• Additional insight 3 that might help\n\nWould you like me to dive deeper into any specific aspect?`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, agentMessage]);
      setIsLoading(false);
    }, 1500);

    setQuery('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const selectedAgentData = agents.find(a => a.id === selectedAgent);

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-32">
        {/* Logo/Title - only show when no messages */}
        {messages.length === 0 && (
          <div className="text-center mb-16">
            <h1 className="text-6xl font-normal text-gray-900 mb-8">AgentSearch</h1>
          </div>
        )}

        {/* Search Box */}
        <div className={`max-w-2xl mx-auto ${messages.length > 0 ? 'mb-8' : 'mb-8'}`}>
          <div className="relative">
            <div className="flex items-center border border-gray-300 rounded-full px-4 py-3 hover:shadow-lg transition-shadow duration-200 focus-within:shadow-lg">
              <Search className="h-5 w-5 text-gray-400 mr-3" />
              
              <Input
                type="text"
                placeholder="Ask anything..."
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
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-full px-3 py-1"
                >
                  <span className="text-lg">{selectedAgentData?.avatar}</span>
                  <span className="text-sm">{selectedAgentData?.name}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
                
                {showAgentDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    {agents.map(agent => (
                      <button
                        key={agent.id}
                        onClick={() => {
                          setSelectedAgent(agent.id);
                          setShowAgentDropdown(false);
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-lg">{agent.avatar}</span>
                        <span className="text-sm text-gray-900">{agent.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <Button 
                onClick={() => handleSearch()}
                disabled={!query.trim() || isLoading}
                variant="ghost"
                className="ml-2 hover:bg-gray-50 rounded-full p-2"
              >
                <Send className="h-4 w-4 text-gray-600" />
              </Button>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        {messages.length > 0 && (
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-2xl rounded-2xl p-6 ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white ml-12'
                      : 'bg-gray-50 text-gray-900 mr-12 border border-gray-200'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  <div className={`text-xs mt-2 ${message.type === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-2xl rounded-2xl p-6 bg-gray-50 text-gray-900 mr-12 border border-gray-200">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    <span>AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
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

export default SearchEngine;
