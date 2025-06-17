
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, Bot } from "lucide-react";
import Navigation from "@/components/Navigation";
import AgentCard from "@/components/AgentCard";

const agents = [
  { id: "general", name: "General Agent", avatar: "🤖", hired: true },
  { id: "sales", name: "Sales Agent", avatar: "💼", hired: false },
  { id: "hr", name: "HR Agent", avatar: "👥", hired: false }
];

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("general");
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}&agent=${selectedAgent}`);
    }
  };
  
  const handleAgentSelect = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (agent && !agent.hired) {
      // If agent is not hired, navigate to marketplace
      navigate(`/marketplace?agent=${agentId}`);
    } else {
      setSelectedAgent(agentId);
      setShowAgentDropdown(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-32 pb-16">
        <div className="text-center max-w-3xl mx-auto">
          <div className="mb-16">
            <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Who can I help you find?
            </h1>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-20">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Search for people by skills, experience, or interests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-48 h-16 text-lg border-2 border-gray-200 text-gray-900 placeholder-gray-500 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
              />
              
              {/* Agent Selector */}
              <div className="absolute right-28 top-1/2 transform -translate-y-1/2 h-12">
                <div className="relative">
                  <Button
                    type="button"
                    onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                    variant="ghost"
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-full px-3 py-2 border border-gray-200"
                  >
                    <Bot className="h-4 w-4 text-blue-500" />
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  
                  {showAgentDropdown && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                      {agents.map(agent => (
                        <button
                          key={agent.id}
                          onClick={() => handleAgentSelect(agent.id)}
                          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-lg">{agent.avatar}</span>
                            <span className="text-sm text-gray-900">{agent.name}</span>
                          </div>
                          {!agent.hired && agent.id !== "general" && (
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">Hire</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <Button 
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full"
              >
                Search
              </Button>
            </div>
          </form>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 max-w-4xl mx-auto">
            <div className="text-left">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Perfect search over humans</h3>
              <p className="text-gray-600">Filter through millions of profiles to surface genuinely relevant people — not random matches.</p>
            </div>
            <div className="text-left">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">100,000+ AI agents</h3>
              <p className="text-gray-600">Every query launches a swarm of intelligent agents that read, reason, and rank people based on your needs.</p>
            </div>
            <div className="text-left">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">SOTA enrichment</h3>
              <p className="text-gray-600">Get full, enriched profiles with email and phone data that outperforms traditional platforms.</p>
            </div>
          </div>

          <div className="mt-12">
            <Button 
              onClick={() => navigate('/marketplace')}
              variant="outline" 
              size="lg"
              className="border-2 border-gray-200 text-gray-900 hover:bg-gray-50 rounded-full px-8 py-3"
            >
              Explore All Agents
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
