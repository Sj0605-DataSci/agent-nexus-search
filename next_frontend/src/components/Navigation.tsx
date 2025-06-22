import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Search, User, LogIn, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { useRouter } from "next/navigation";

const Navigation = () => {
  const router = useRouter();

  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <Search className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">AgentSearch</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/searchengine"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Search
            </Link>
            <Link
              href="/marketplace"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Marketplace
            </Link>
            <Link
              href="/agents"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Agents
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-sm text-gray-600 hidden md:block">
                  Welcome, {user.email}
                </span>
                <Button
                  onClick={handleSignOut}
                  variant="ghost"
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => router.push("/login")}
                  variant="ghost"
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Login
                </Button>
                <Button
                  onClick={() => router.push("/signup")}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
