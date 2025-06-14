
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Send, Menu } from "lucide-react";
import Navigation from "@/components/Navigation";
import ChatDrawer from "@/components/ChatDrawer";

const agents = [
  { id: "research", name: "Research Assistant", avatar: "🔬" },
  { id: "creative", name: "Creative Writer", avatar: "✍️" },
  { id: "code", name: "Code Expert", avatar: "💻" },
  { id: "general", name: "General AI", avatar: "🤖" }
];

const SearchEngine = () => {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [selectedAgent, setSelectedAgent] = useState("general");
  const [messages, setMessages] = useState<Array<{id: string, type: 'user' | 'agent', content: string, timestamp: Date}>>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navigation />
      
      <div className="flex pt-20">
        <ChatDrawer isOpen={isDrawerOpen} onToggle={() => setIsDrawerOpen(!isDrawerOpen)} />
        
        <div className={`flex-1 transition-all duration-300 ${isDrawerOpen ? 'ml-80' : 'ml-0'}`}>
          <div className="container mx-auto px-4 py-8">
            {/* Header with drawer toggle */}
            <div className="flex items-center mb-8">
              <Button
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10 mr-4"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold text-white">AI Search</h1>
            </div>

            {/* Search Input */}
            <div className="max-w-4xl mx-auto mb-8">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-4">
                <div className="flex items-center space-x-4 mb-4">
                  <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                    <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {agents.map(agent => (
                        <SelectItem key={agent.id} value={agent.id} className="text-white focus:bg-slate-700">
                          <span className="flex items-center space-x-2">
                            <span>{agent.avatar}</span>
                            <span>{agent.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="flex-1 relative">
                    <Input
                      type="text"
                      placeholder="Ask your AI agent anything..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="bg-transparent border-none text-white placeholder-slate-400 text-lg focus:ring-0 focus:outline-none"
                    />
                  </div>
                  <Button 
                    onClick={() => handleSearch()}
                    disabled={!query.trim() || isLoading}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg px-6"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-2xl rounded-2xl p-6 ${
                      message.type === 'user'
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white ml-12'
                        : 'bg-white/10 backdrop-blur-md border border-white/20 text-white mr-12'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    <div className="text-xs opacity-70 mt-2">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-2xl rounded-2xl p-6 bg-white/10 backdrop-blur-md border border-white/20 text-white mr-12">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchEngine;
