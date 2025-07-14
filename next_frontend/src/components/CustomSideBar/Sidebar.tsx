"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import {
  FiSearch,
  FiUser,
  FiLogOut,
  FiLogIn,
  FiChevronLeft,
  FiChevronRight,
  FiMessageSquare,
  FiShoppingBag,
  FiUsers,
  FiPlus,
  FiSettings,
} from "react-icons/fi";
import { useEffect, useState } from "react";

import { useAppDispatch, useAppSelector } from "@/store";
import { toggleSidebar, selectSidebarCollapsed } from "@/store/uiSlice";
import { useAuth } from "@/hooks/useAuth";
import ToggleSystemTheme from "../ToggleSystemTheme";
import { apiClient } from "@/integrations/fastapi/client";
import { Button } from "@/components/ui/button";
import SidebarItem from "./SidebarItem";

// Types
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
  const collapsed = useAppSelector(selectSidebarCollapsed);
  const darkMode = useAppSelector(state => state.theme.dark);
  const dispatch = useAppDispatch();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [recentThreads, setRecentThreads] = useState<ChatThread[]>([]);
  const [threadMessages, setThreadMessages] = useState<{ [key: string]: ChatMessage[] }>({});
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);

  useEffect(() => {
    const fetchThreads = async () => {
      if (!user?.id) return;
      setLoadingThreads(true);

      try {
        const threads = await apiClient.getChatThreads(user.id);
        const recent = threads.slice(0, 5);
        setRecentThreads(recent);

        const messagesMap: { [key: string]: ChatMessage[] } = {};
        for (const thread of recent) {
          const messages = await apiClient.getChatMessages(user.id, thread.id);
          messagesMap[thread.id] = messages;
        }
        setThreadMessages(messagesMap);
      } catch (error) {
        console.error("Failed fetching threads", error);
      } finally {
        setLoadingThreads(false);
      }
    };

    fetchThreads();
  }, [user?.id]);

  const getThreadPreview = (threadId: string) => {
    const messages = threadMessages[threadId];
    if (!messages || messages.length === 0) return "Loading...";
    for (const msg of messages) {
      if (msg.main_query) return msg.main_query;
    }
    return "No messages";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const navItems = [
    { href: "/marketplace", label: "Marketplace", icon: <FiShoppingBag /> },
    { href: "/agents", label: "Agents", icon: <FiUsers /> },
  ];

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <aside
      className={`fixed md:static overflow-visible max-h-screen inset-y-0 left-0 z-50 ${
        collapsed ? "w-16" : "w-64"
      } transition-all duration-300 flex flex-col
      border-r shadow-lg
      ${
        darkMode
          ? "bg-gray-900 border-gray-800 text-white"
          : "bg-white border-gray-200 text-gray-900"
      }`}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between pl-2 py-4 border-b dark:border-gray-800">
          <Link href="/" className="flex items-center h-8 gap-2 group">
            <Image
              src="/icon.png"
              alt="Logo"
              width={32}
              height={32}
              className="w-8 h-8 object-contain rounded-md min-h-8 min-w-8"
            />
            {!collapsed && (
              <span className="text-lg font-bold tracking-tight group-hover:text-indigo-500">
                DiscoverMinds.ai
              </span>
            )}
          </Link>
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="text-gray-500 mr-1 hover:text-gray-700 dark:hover:text-gray-300"
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
          </button>
        </div>
        <div className="px-3 py-2">
          <Button
            onClick={() => router.push("/chat/new")}
            className={`w-full flex items-center ${collapsed ? "justify-center p-2" : "justify-between px-3 py-3"} 
              border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}
            variant="ghost"
          >
            {!collapsed && <span className="font-medium">New chat</span>}
            <FiPlus className={collapsed ? "mx-auto" : ""} />
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2">
          <ul className="space-y-1 pb-3">
            {navItems.map(({ href, label, icon }) => {
              const active = pathname.startsWith(href);
              return (
                <SidebarItem
                  key={href}
                  href={href}
                  label={label}
                  icon={icon}
                  active={active}
                  collapsed={collapsed}
                  darkMode={darkMode}
                />
              );
            })}
          </ul>
          {user && (
            <div className="mb-4">
              {!collapsed && (
                <h3 className="text-xs font-semibold px-2 mb-2 text-gray-500">Recent chats</h3>
              )}
              <ul className="space-y-1">
                {loadingThreads ? (
                  <li className="text-sm px-2 text-gray-400">{!collapsed && "Loading..."}</li>
                ) : recentThreads.length === 0 ? (
                  <li className="text-sm px-2 text-gray-400">{!collapsed && "No recent chats"}</li>
                ) : (
                  recentThreads.map(thread => (
                    <li key={thread.id}>
                      <Link
                        href={`/chat/${thread.id}`}
                        className={`group flex items-center py-2 rounded-md text-sm transition-colors ${
                          collapsed ? "justify-center" : "gap-2 px-3"
                        } ${
                          pathname === `/chat/${thread.id}`
                            ? darkMode
                              ? "bg-gray-800"
                              : "bg-gray-100"
                            : darkMode
                              ? "text-gray-300 hover:text-white hover:bg-gray-800/60"
                              : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                        }`}
                        title={collapsed ? "Chat thread" : getThreadPreview(thread.id)}
                      >
                        <FiMessageSquare className="text-base flex-shrink-0" />
                        {!collapsed && (
                          <div className="flex-1 truncate">
                            <div className="truncate">{getThreadPreview(thread.id)}</div>
                            <div className="text-xs text-gray-400">
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

          {!collapsed && user && recentThreads.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-800 my-2"></div>
          )}
        </nav>

        <div className="mt-auto border-t border-gray-200 dark:border-gray-800">
          <div className="p-2">
            {!collapsed && (
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Theme</span>
                <ToggleSystemTheme />
              </div>
            )}
            {user ? (
              <div className="flex items-center justify-between">
                <Link
                  href="/profile"
                  className={`flex items-center py-2 rounded-md ${collapsed ? "justify-center w-full" : "gap-2 flex-1"} 
                  hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}
                  title={collapsed ? user.email : undefined}
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                    {user.email?.charAt(0).toUpperCase() || "U"}
                  </div>
                  {!collapsed && (
                    <div className="flex-1 truncate">
                      <div className="text-sm font-medium truncate">
                        {user.email?.split("@")[0] || "User"}
                      </div>
                    </div>
                  )}
                </Link>

                <Button
                  onClick={handleSignOut}
                  variant="ghost"
                  size="icon"
                  className={`${collapsed ? "hidden" : "flex"} h-8 w-8 rounded-full`}
                  title="Sign Out"
                >
                  <FiLogOut size={16} />
                </Button>
              </div>
            ) : (
              <div className={`flex ${collapsed ? "flex-col" : "items-center"} gap-2`}>
                <Button
                  onClick={() => router.push("/login")}
                  variant="ghost"
                  className={`${collapsed ? "p-2" : "px-3 py-2"} flex items-center justify-center`}
                  title="Login"
                >
                  <FiLogIn size={18} />
                  {!collapsed && <span className="ml-2">Login</span>}
                </Button>

                <Button
                  onClick={() => router.push("/signup")}
                  className={`${collapsed ? "p-2" : "px-3 py-2"} flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-md`}
                  title="Sign Up"
                >
                  {collapsed ? "+" : "Sign Up"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
