"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Search, LogIn, LogOut, Menu as MenuIcon, X as CloseIcon, User } from "lucide-react";

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
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300
      border-b shadow-lg
      ${
        darkMode
          ? "bg-gray-900/70 border-gray-800 backdrop-blur-xl"
          : "bg-white/80 border-gray-200 backdrop-blur-xl"
      }`}
      style={{ WebkitBackdropFilter: "blur(16px)", backdropFilter: "blur(16px)" }}
    >
      <nav className="container mx-auto px-4 py-3 flex items-center justify-between relative">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div
            className="w-7 md:w-9 h-7 md:h-9 rounded-md md:rounded-xl flex items-center justify-center
            bg-gradient-to-br from-blue-600 via-purple-600 to-cyan-500 shadow-md group-hover:scale-110 transition-transform"
          >
            <Search className="h-4 md:h-6 w-4 md:w-6 text-white" />
          </div>
          <span
            className={`text-md  md:text-xl font-black tracking-tight select-none
            ${darkMode ? "text-white" : "text-gray-900"}
            group-hover:text-indigo-500 transition-colors`}
          >
            DiscoverMinds.ai
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-2 mx-8">
          {[
            ["/searchengine", "Search"],
            ["/marketplace", "Marketplace"],
            ["/agents", "Agents"],
            ["/profile", "Profile"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`
              relative px-4 py-2 rounded-lg font-semibold transition-all
              focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
              ${
                pathname.startsWith(href)
                  ? "text-indigo-600 dark:text-indigo-400"
                  : darkMode
                    ? "text-gray-300 hover:text-white"
                    : "text-gray-700 hover:text-gray-900"
              }
              group
            `}
              aria-current={pathname.startsWith(href) ? "page" : undefined}
            >
              {label}
              {/* Animated underline for active link */}
              <span
                className={`
                absolute left-1/2 -translate-x-1/2 bottom-1 h-0.5 w-0 group-hover:w-3/4 transition-all duration-300
                ${pathname.startsWith(href) ? "w-3/4 bg-indigo-500" : "bg-indigo-400"}
              `}
              />
            </Link>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* <ToggleSystemTheme rounded size={18} /> */}
          <ToggleSystemTheme className="z-30" />

          {user ? (
            <>
              {/* <span
                className={`hidden lg:inline text-sm max-w-[200px] truncate
                ${darkMode ? "text-gray-300" : "text-gray-600"}`}
                title={user.email}
              >
                Welcome, {user.email}
              </span> */}
              <Button
                onClick={handleSignOut}
                variant="ghost"
                className={`flex items-center gap-1 px-3 py-2 rounded-lg
                transition-colors text-xs  md:text-sm font-medium
                ${
                  darkMode
                    ? "text-gray-300 hover:text-white hover:bg-gray-800/60"
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                }
              `}
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => router.push("/login")}
                variant="ghost"
                className={`flex items-center gap-1 px-3 py-2 rounded-lg
                transition-colors text-sm font-medium
                ${
                  darkMode
                    ? "text-gray-300 hover:text-white hover:bg-gray-800/60"
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                }
              `}
                aria-label="Login"
              >
                <LogIn className="h-4 w-4" />
                Login
              </Button>
              <Button
                onClick={() => router.push("/signup")}
                className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:to-purple-700 text-white rounded-lg font-semibold shadow-md"
                aria-label="Sign up"
              >
                Sign Up
              </Button>
            </>
          )}

          {/* Mobile menu button */}
          <button
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen(o => !o)}
            className={`md:hidden ml-1 p-2 rounded-lg
            transition-colors focus:outline-none
            ${darkMode ? "text-gray-300 hover:bg-gray-800/70" : "text-gray-700 hover:bg-gray-200"}`}
          >
            {mobileOpen ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile Nav Overlay */}
      <div
        className={`md:hidden transition-all duration-300 overflow-hidden
        ${mobileOpen ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"}
        ${darkMode ? "bg-gray-950/90" : "bg-white/95"}
        border-t ${darkMode ? "border-gray-800" : "border-gray-200"}
        shadow-lg`}
        style={{
          transitionProperty: "max-height, opacity",
        }}
      >
        <div className="container mx-auto px-4 py-6 flex flex-col gap-4">
          {[
            ["/searchengine", "Search"],
            ["/marketplace", "Marketplace"],
            ["/agents", "Agents"],
            ["/profile", "Profile"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`
              py-3 px-3 rounded-lg text-lg font-semibold
              transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
              ${
                pathname.startsWith(href)
                  ? "text-indigo-600 dark:text-indigo-400 bg-indigo-100/10"
                  : darkMode
                    ? "text-gray-200 hover:text-white hover:bg-gray-800/60"
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              }
            `}
              aria-current={pathname.startsWith(href) ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
          {!user && (
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => {
                  setMobileOpen(false);
                  router.push("/login");
                }}
                variant="ghost"
                className="flex-1 py-3 text-base"
              >
                Login
              </Button>
              <Button
                onClick={() => {
                  setMobileOpen(false);
                  router.push("/signup");
                }}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg"
              >
                Sign Up
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navigation;
