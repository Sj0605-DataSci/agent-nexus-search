"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Search, LogIn, LogOut, Menu as MenuIcon, X as CloseIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAppSelector } from "@/store";
import ToggleSystemTheme from "./ToggleSystemTheme";

const Navigation = () => {
  const darkMode = useAppSelector(s => s.theme.dark);

  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      onClick={() => setMobileOpen(false)}
      className={`relative px-2 py-1 transition-colors ${
        darkMode ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"
      } ${pathname.startsWith(href) ? "font-semibold" : ""}`}
    >
      {label}
      {pathname.startsWith(href) && (
        <span
          className={`absolute -bottom-0.5 left-0 right-0 h-0.5 rounded-full ${
            darkMode ? "bg-indigo-500/80" : "bg-indigo-500/80"
          }`}
        />
      )}
    </Link>
  );

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 backdrop-blur-md border-b
        ${darkMode ? "bg-gray-900/60 border-gray-700" : "bg-white/80 border-gray-200"}`}
    >
      <nav className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center
              bg-gradient-to-r from-blue-600 to-purple-600"
          >
            <Search className="h-5 w-5 text-white" />
          </div>
          <span
            className={`text-lg font-extrabold tracking-tight
              ${darkMode ? "text-white" : "text-gray-900"}`}
          >
            DiscoverMinds.ai
          </span>
        </Link>

        <div className="hidden md:flex items-center w-full justify-center space-x-8">
          {navLink("/searchengine", "Search")}
          {navLink("/marketplace", "Marketplace")}
          {navLink("/agents", "Agents")}
        </div>

        <div className="flex items-center space-x-2">
          <ToggleSystemTheme rounded={false} size={18} />

          {user ? (
            <>
              <span
                className={`hidden lg:inline text-sm truncate max-w-[260px]
                  ${darkMode ? "text-gray-300" : "text-gray-600"}`}
              >
                Welcome, {user.email}
              </span>
              <Button
                onClick={handleSignOut}
                variant="ghost"
                className={`flex items-center
                  ${
                    darkMode
                      ? "text-gray-300 hover:text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                <LogOut className="h-4 w-4 mr-1" />
                Sign&nbsp;Out
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => router.push("/login")}
                variant="ghost"
                className={`flex items-center
                  ${
                    darkMode
                      ? "text-gray-300 hover:text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                <LogIn className="h-4 w-4 mr-1" />
                Login
              </Button>
              <Button
                onClick={() => router.push("/signup")}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:to-purple-700 text-white rounded-lg"
              >
                Sign Up
              </Button>
            </>
          )}

          <button
            aria-label="Menu"
            onClick={() => setMobileOpen(o => !o)}
            className={`md:hidden ml-1 p-2 rounded-lg
              transition-colors focus:outline-none
              ${darkMode ? "text-gray-300 hover:bg-gray-800" : "text-gray-600 hover:bg-gray-200"}`}
          >
            {mobileOpen ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div
          className={`md:hidden border-t
            ${darkMode ? "border-gray-700 bg-gray-900/70" : "border-gray-200 bg-white/95"}`}
        >
          <div className="container mx-auto px-4 py-4 flex flex-col space-y-4">
            {navLink("/searchengine", "Search")}
            {navLink("/marketplace", "Marketplace")}
            {navLink("/agents", "Agents")}

            {!user && (
              <div className="flex space-x-4 pt-3">
                <Button
                  onClick={() => {
                    setMobileOpen(false);
                    router.push("/login");
                  }}
                  variant="ghost"
                  className="flex-1"
                >
                  Login
                </Button>
                <Button
                  onClick={() => {
                    setMobileOpen(false);
                    router.push("/signup");
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                >
                  Sign Up
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navigation;
