
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Star, Users } from "lucide-react";
import Navigation from "@/components/Navigation";
import AgentCard from "@/components/AgentCard";

const allAgents = [
  {
    id: "1",
    name: "Research Assistant",
    description: "Expert in academic research, data analysis, and scientific literature review",
    category: "Research",
    rating: 4.8,
    users: 12500,
    avatar: "🔬"
  },
  {
    id: "2",
    name: "Creative Writer",
    description: "Specialized in creative writing, storytelling, and content creation",
    category: "Writing",
    rating: 4.9,
    users: 8300,
    avatar: "✍️"
  },
  {
    id: "3",
    name: "Code Expert",
    description: "Programming assistance, code reviews, and debugging support",
    category: "Development",
    rating: 4.7,
    users: 15600,
    avatar: "💻"
  },
  {
    id: "4",
    name: "Marketing Guru",
    description: "Digital marketing strategies, content planning, and brand development",
    category: "Marketing",
    rating: 4.6,
    users: 9200,
    avatar: "📈"
  },
  {
    id: "5",
    name: "Language Tutor",
    description: "Language learning support, grammar correction, and conversation practice",
    category: "Education",
    rating: 4.8,
    users: 11400,
    avatar: "🌍"
  },
  {
    id: "6",
    name: "Financial Advisor",
    description: "Personal finance guidance, investment strategies, and budgeting help",
    category: "Finance",
    rating: 4.5,
    users: 7800,
    avatar: "💰"
  },
  {
    id: "7",
    name: "Health Coach",
    description: "Wellness guidance, fitness planning, and healthy lifestyle tips",
    category: "Health",
    rating: 4.7,
    users: 10200,
    avatar: "🏃‍♂️"
  },
  {
    id: "8",
    name: "Travel Planner",
    description: "Trip planning, destination recommendations, and travel logistics",
    category: "Travel",
    rating: 4.9,
    users: 6500,
    avatar: "🗺️"
  },
];

const categories = ["All", "Research", "Writing", "Development", "Marketing", "Education", "Finance", "Health", "Travel"];

const Marketplace = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("popular");

  const filteredAgents = allAgents
    .filter(agent => {
      const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           agent.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "All" || agent.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "rating":
          return b.rating - a.rating;
        case "users":
          return b.users - a.users;
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return b.users - a.users; // popular
      }
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Navigation />
      
      <div className="container mx-auto px-4 pt-24 pb-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">AI Agent Marketplace</h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Discover and connect with specialized AI agents for every need
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder-slate-400"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full lg:w-48 bg-white/10 border-white/20 text-white">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {categories.map(category => (
                  <SelectItem key={category} value={category} className="text-white focus:bg-slate-700">
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full lg:w-48 bg-white/10 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="popular" className="text-white focus:bg-slate-700">Most Popular</SelectItem>
                <SelectItem value="rating" className="text-white focus:bg-slate-700">Highest Rated</SelectItem>
                <SelectItem value="users" className="text-white focus:bg-slate-700">Most Users</SelectItem>
                <SelectItem value="name" className="text-white focus:bg-slate-700">Name A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-slate-300">
            Showing {filteredAgents.length} of {allAgents.length} agents
            {selectedCategory !== "All" && ` in ${selectedCategory}`}
          </p>
          
          <div className="flex flex-wrap gap-2">
            {categories.slice(1).map(category => (
              <Badge
                key={category}
                variant={selectedCategory === category ? "default" : "secondary"}
                className={`cursor-pointer transition-colors ${
                  selectedCategory === category
                    ? "bg-blue-600 text-white"
                    : "bg-white/10 text-slate-300 hover:bg-white/20"
                }`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>

        {/* Agent Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAgents.map((agent) => (
            <AgentCard 
              key={agent.id} 
              agent={agent}
              onSelect={(agent) => {
                console.log('Selected agent:', agent);
                // Here you would typically navigate to search with selected agent
              }}
            />
          ))}
        </div>

        {filteredAgents.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold text-white mb-2">No agents found</h3>
            <p className="text-slate-400">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
