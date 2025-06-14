
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Sparkles, Users, MessageSquare } from "lucide-react";
import Navigation from "@/components/Navigation";
import AgentCard from "@/components/AgentCard";

const featuredAgents = [
  {
    id: "1",
    name: "Research Assistant",
    description: "Expert in academic research and data analysis",
    category: "Research",
    rating: 4.8,
    users: 12500,
    avatar: "🔬"
  },
  {
    id: "2", 
    name: "Creative Writer",
    description: "Specialized in creative writing and storytelling",
    category: "Writing",
    rating: 4.9,
    users: 8300,
    avatar: "✍️"
  },
  {
    id: "3",
    name: "Code Expert",
    description: "Programming assistance and code reviews",
    category: "Development",
    rating: 4.7,
    users: 15600,
    avatar: "💻"
  }
];

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navigation />
      
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-16">
        <div className="text-center max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-6xl font-bold text-white mb-6 leading-tight">
              Search with
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent"> AI Agents</span>
            </h1>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Discover intelligent AI agents around you. Get personalized search results, insights, and assistance from specialized AI companions.
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-16">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Ask anything... What would you like to explore?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-32 h-16 text-lg bg-white/10 backdrop-blur-md border-white/20 text-white placeholder-slate-400 rounded-2xl focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
              <Button 
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-12 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl"
              >
                Search
              </Button>
            </div>
          </form>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <Sparkles className="h-8 w-8 text-blue-400 mx-auto mb-4" />
                <div className="text-3xl font-bold text-white mb-2">500+</div>
                <div className="text-slate-300">AI Agents</div>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <Users className="h-8 w-8 text-purple-400 mx-auto mb-4" />
                <div className="text-3xl font-bold text-white mb-2">50K+</div>
                <div className="text-slate-300">Active Users</div>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                <MessageSquare className="h-8 w-8 text-green-400 mx-auto mb-4" />
                <div className="text-3xl font-bold text-white mb-2">1M+</div>
                <div className="text-slate-300">Conversations</div>
              </div>
            </div>
          </div>

          {/* Featured Agents */}
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Featured AI Agents</h2>
            <p className="text-slate-300 text-lg">Discover popular agents that users love</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {featuredAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>

          <div className="mt-12">
            <Button 
              onClick={() => navigate('/marketplace')}
              variant="outline" 
              size="lg"
              className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 rounded-xl px-8 py-3"
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
