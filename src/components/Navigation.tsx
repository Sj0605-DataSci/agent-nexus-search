
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, User, LogIn } from "lucide-react";

const Navigation = () => {
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-md border-b border-white/10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <Search className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">AgentSearch</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link to="/search" className="text-slate-300 hover:text-white transition-colors">
              Search
            </Link>
            <Link to="/marketplace" className="text-slate-300 hover:text-white transition-colors">
              Marketplace
            </Link>
            <div className="text-slate-300 hover:text-white transition-colors cursor-pointer">
              About
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button 
              onClick={() => navigate('/login')}
              variant="ghost" 
              className="text-slate-300 hover:text-white hover:bg-white/10"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Login
            </Button>
            <Button 
              onClick={() => navigate('/signup')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg"
            >
              Sign Up
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
