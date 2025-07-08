"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  LogIn,
  LogOut,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAppDispatch, useAppSelector } from "@/store";
import { toggleSidebar, selectSidebarCollapsed } from "@/store/uiSlice";
import ToggleSystemTheme from "./ToggleSystemTheme";
import { apiClient } from "@/integrations/fastapi/client";
import Image from "next/image";

// Interface for chat thread and message types
interface ChatThread {
  id: string;
  last_message_at: string;
}

interface ChatMessage {
  id: string;
  user_id: string;
  agent_id: string;
  main_query: string;
  message: any;
  created_at: string;
}

const Sidebar = () => {
  const darkMode = useAppSelector(s => s.theme.dark);
  const collapsed = useAppSelector(selectSidebarCollapsed);
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();

  // State for recent chats
  const [recentThreads, setRecentThreads] = useState<ChatThread[]>([]);
  const [threadMessages, setThreadMessages] = useState<{ [key: string]: ChatMessage[] }>({});
  const [loadingThreads, setLoadingThreads] = useState(false);

  // Fetch recent chat threads when user is logged in
  useEffect(() => {
    const fetchRecentThreads = async () => {
      if (!user?.id) return;

      setLoadingThreads(true);
      try {
        const threads = await apiClient.getChatThreads(user.id);
        // Get top 5 most recent threads
        const recentThreads = threads.slice(0, 5);
        setRecentThreads(recentThreads);

        // Pre-fetch messages for each thread
        const messagesMap: { [key: string]: ChatMessage[] } = {};
        for (const thread of recentThreads) {
          const messages = await apiClient.getChatMessages(user.id, thread.id);
          messagesMap[thread.id] = messages;
        }
        setThreadMessages(messagesMap);
      } catch (error) {
        console.error("Error fetching recent threads:", error);
      } finally {
        setLoadingThreads(false);
      }
    };

    fetchRecentThreads();
  }, [user?.id]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Get a preview of the chat thread (first message or query)
  const getThreadPreview = (threadId: string): string => {
    const messages = threadMessages[threadId];
    if (!messages || messages.length === 0) return "Loading...";

    // Find the first message with content
    for (const msg of messages) {
      if (msg.main_query) return msg.main_query;
    }
    return "No messages";
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 ${collapsed ? "w-16" : "w-64"} flex flex-col transition-all duration-300
      border-r shadow-lg
      ${
        darkMode
          ? "bg-gray-900/90 border-gray-800 text-white"
          : "bg-white/95 border-gray-200 text-gray-900"
      }`}
      style={{ WebkitBackdropFilter: "blur(16px)", backdropFilter: "blur(16px)" }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 mb-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div className={`w-7 h-7 rounded overflow-hidden flex items-center justify-center`}>
            <Image
              src="/icon.png"
              alt="DiscoverMinds Logo"
              width={28}
              height={28}
              className="h-7 w-7"
            />
          </div>
          {!collapsed && (
            <span
              className={`text-xl font-black tracking-tight select-none
              ${darkMode ? "text-white" : "text-gray-900"}
              group-hover:text-indigo-500 transition-colors`}
            >
              DiscoverMinds.ai
            </span>
          )}
        </Link>

        {/* Collapse/Expand Button */}
        <button
          onClick={() => dispatch(toggleSidebar())}
          className={`p-1.5 rounded-full transition-colors ${darkMode ? "text-gray-400 hover:text-gray-300 hover:bg-gray-800" : "text-gray-600 hover:text-gray-700 hover:bg-gray-100"}`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-2">
          {[
            ["/searchengine", "Search", <Search key="search" className="h-5 w-5" />],
            ["/marketplace", "Marketplace", <Search key="marketplace" className="h-5 w-5" />],
            ["/agents", "Agents", <Search key="agents" className="h-5 w-5" />],
            ["/profile", "Profile", <User key="profile" className="h-5 w-5" />],
          ].map(([href, label, icon]) => (
            <li key={href as string}>
              <Link
                href={href as string}
                className={`
                flex items-center ${collapsed ? "justify-center" : "gap-3 px-4"} py-3 rounded-lg font-medium transition-all
                ${
                  pathname.startsWith(href as string)
                    ? darkMode
                      ? "bg-indigo-600/20 text-indigo-400"
                      : "bg-indigo-50 text-indigo-700"
                    : darkMode
                      ? "text-gray-300 hover:text-white hover:bg-gray-800/60"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                }
              `}
                aria-current={pathname.startsWith(href as string) ? "page" : undefined}
                title={collapsed ? (label as string) : undefined}
              >
                {icon}
                {!collapsed && label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Recent Chats Section */}
        {user && (
          <div className="mt-8">
            {!collapsed && (
              <h3
                className={`px-4 mb-2 text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                Recent Chats
              </h3>
            )}

            <ul className="space-y-1">
              {loadingThreads ? (
                <li className={`px-4 py-2 text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  {!collapsed && "Loading..."}
                </li>
              ) : recentThreads.length === 0 ? (
                <li className={`px-4 py-2 text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  {!collapsed && "No recent chats"}
                </li>
              ) : (
                recentThreads.map(thread => (
                  <li key={thread.id}>
                    <Link
                      href={`/chat/${thread.id}`}
                      className={`
                        flex items-center ${collapsed ? "justify-center" : "gap-2 px-4"} py-2 rounded-lg text-sm transition-all
                        ${darkMode ? "text-gray-300 hover:text-white hover:bg-gray-800/60" : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"}
                      `}
                      title={collapsed ? "Chat thread" : getThreadPreview(thread.id)}
                    >
                      <MessageCircle className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && (
                        <div className="flex-1 overflow-hidden">
                          <div className="truncate">{getThreadPreview(thread.id)}</div>
                          <div
                            className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-400"}`}
                          >
                            {formatDate(thread.last_message_at)}
                          </div>
                        </div>
                      )}
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        {!collapsed && (
          <div className="flex items-center justify-between mb-4">
            <span className={`text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
              Theme
            </span>
            <ToggleSystemTheme className="z-30" />
          </div>
        )}

        {user ? (
          <div className="space-y-3">
            {!collapsed && (
              <div className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                {user.email}
              </div>
            )}
            <Button
              onClick={handleSignOut}
              variant="ghost"
              className={`w-full flex items-center justify-center ${!collapsed ? "gap-2" : ""} px-3 py-2 rounded-lg
              transition-colors text-sm font-medium
              ${
                darkMode
                  ? "text-gray-300 hover:text-white hover:bg-gray-800/60"
                  : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              }
            `}
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && "Sign Out"}
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Button
              onClick={() => router.push("/login")}
              variant="ghost"
              className={`w-full flex items-center justify-center ${!collapsed ? "gap-2" : ""}`}
              aria-label="Login"
              title="Login"
            >
              <LogIn className="h-4 w-4" />
              {!collapsed && "Login"}
            </Button>
            {!collapsed && (
              <Button
                onClick={() => router.push("/signup")}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:to-purple-700 text-white"
                aria-label="Sign up"
              >
                Sign Up
              </Button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
