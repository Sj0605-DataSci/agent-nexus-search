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
import { useEffect, useState, useRef, useCallback } from "react";

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
  title: string;
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

  const [recentThreads, setRecentThreads] = useState<any[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadingThreadPreview, setLoadingThreadPreview] = useState(false);
  const threadsFetchedRef = useRef(false);
  const [threadsOffset, setThreadsOffset] = useState(0);
  const [hasMoreThreads, setHasMoreThreads] = useState(false);
  const THREADS_PER_PAGE = 5;

  const fetchThreads = async () => {
    if (!user?.id) return;
    if (threadsFetchedRef.current) return; // Skip if already fetched

    setLoadingThreads(true);

    try {
      // Get first batch of threads using pagination
      const threadsResponse = await apiClient.getChatThreads(user.id, THREADS_PER_PAGE, 0);
      setRecentThreads(threadsResponse.threads);
      setThreadsOffset(THREADS_PER_PAGE);
      setHasMoreThreads(threadsResponse.total > THREADS_PER_PAGE);
      
      // Mark as fetched immediately so we don't fetch again
      threadsFetchedRef.current = true;
    } catch (error) {
      console.error("Failed fetching threads", error);
    } finally {
      setLoadingThreads(false);
    }
  };
  
  // Track if we're currently loading more threads to prevent duplicate calls
  const isLoadingRef = useRef(false);

  const loadMoreThreads = async () => {
    // Prevent duplicate calls while loading
    if (!user?.id || !hasMoreThreads || loadingThreads || isLoadingRef.current) return;

    isLoadingRef.current = true;
    setLoadingThreads(true);

    try {
      const threadsResponse = await apiClient.getChatThreads(user.id, THREADS_PER_PAGE, threadsOffset);

      if (threadsResponse.threads.length > 0) {
        // Check for duplicates by creating a Set of thread IDs we already have
        const existingThreadIds = new Set(recentThreads.map(thread => thread.id));
        
        // Filter out any threads we already have
        const newThreads = threadsResponse.threads.filter(thread => !existingThreadIds.has(thread.id));
        
        if (newThreads.length > 0) {
          setRecentThreads(prev => [...prev, ...newThreads]);
          setThreadsOffset(prev => prev + THREADS_PER_PAGE);
          setHasMoreThreads(threadsOffset + THREADS_PER_PAGE < threadsResponse.total);
        } else {
          // If we got no new threads, we might be at the end
          setHasMoreThreads(false);
        }
      } else {
        setHasMoreThreads(false);
      }
    } catch (error) {
      console.error("Failed loading more threads", error);
    } finally {
      setLoadingThreads(false);
      isLoadingRef.current = false;
    }
  };

  useEffect(() => {
    fetchThreads();
  }, [user?.id]);

  // Function to get thread preview text - uses title if available, falls back to query or thread ID
  const getThreadPreview = (thread: any) => {
    // If thread has a title, use it as first priority
    if (thread.title) return thread.title;
    
    // If we have a query in the thread data, use that as second priority
    if (thread.query) return thread.query;
    
    // If we need to fetch the message to get the query
    if (!loadingThreadPreview && user?.id) {
      // Set a flag to avoid duplicate fetches
      setLoadingThreadPreview(true);
      
      // Fetch just one message to get the query
      apiClient.getChatMessages(user.id, thread.id, 1, 0)
        .then(response => {
          if (response.messages && response.messages.length > 0) {
            const message = response.messages[0];
            if (message.main_query) {
              // Update thread with query information
              setRecentThreads(prev => 
                prev.map(t => 
                  t.id === thread.id ? {...t, query: message.main_query} : t
                )
              );
            }
          }
        })
        .catch(error => console.error("Error fetching message query:", error))
        .finally(() => setLoadingThreadPreview(false));
    }
    
    // Fallback to thread ID if no title or query is available
    return `Chat ${thread.id.substring(0, 8)}`;
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
        <div
          className={`flex items-center justify-between pl-2 py-4 border-b ${darkMode ? "border-gray-700/80" : "border-gray-200/80"}`}
        >
          <Link href="/chat/new" className="flex items-center h-8 gap-2 group">
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
          <Link
            href="/chat/new"
            prefetch={false}
            onClick={e => {
              e.preventDefault();
              router.push("/chat/new");
            }}
            className={`w-full flex items-center mt-1 ${collapsed ? "justify-center p-2" : "justify-between px-3 py-1.5"} 
              ${
                darkMode
                  ? "bg-gray-800/40 border-gray-700/60 text-gray-100 hover:bg-gray-700/60"
                  : "bg-gray-100 border-gray-200 text-gray-800 hover:bg-gray-200"
              } 
              border rounded-md transition-colors duration-200`}
          >
            <div className="flex items-center gap-2">
              <FiPlus className={`h-4 w-4 ${darkMode ? "text-indigo-300" : "text-indigo-600"}`} />
              {!collapsed && <span>New chat</span>}
            </div>
          </Link>
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
              <div className={` rounded-md mb-1`}>
                {loadingThreads ? (
                  <ul className="space-y-1 py-1 px-1">
                    {/* Generate 4 shimmer placeholders that look like chat items */}
                    {[...Array(4)].map((_, index) => (
                      <li key={`shimmer-${index}`} className="animate-pulse h-[34px]">
                        <div
                          className={`flex items-center py-2 rounded-md ${collapsed ? "justify-center" : "gap-2 px-2"} ${darkMode ? "bg-gray-800/30" : "bg-gray-100/70"}`}
                        >
                          <div
                            className={`flex-shrink-0 ${darkMode ? "bg-gray-700" : "bg-gray-300"} rounded-full h-4 w-4`}
                          ></div>

                          {!collapsed && (
                            <div className="flex-1">
                              <div className="flex justify-between items-center">
                                <div
                                  className={`h-4 ${darkMode ? "bg-gray-700" : "bg-gray-300"} rounded ${index % 2 === 0 ? "w-3/4" : "w-2/3"}`}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : recentThreads.length === 0 ? (
                  <div
                    className={`flex flex-col items-center justify-center py-4 px-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    {!collapsed && (
                      <>
                        <FiMessageSquare className="text-xl mb-1 opacity-60" />
                        <p className="text-xs text-center">No recent conversations</p>
                        <Link
                          href="/chat/new"
                          className={`mt-2 text-xs px-3 py-1 rounded-full ${darkMode ? "bg-gray-800 hover:bg-gray-700 text-gray-300" : "bg-gray-200 hover:bg-gray-300 text-gray-700"} transition-colors`}
                        >
                          Start chatting
                        </Link>
                      </>
                    )}
                    {collapsed && <FiMessageSquare className="text-xl opacity-60" />}
                  </div>
                ) : (
                  <div className="flex flex-col space-y-1">
                    <ul className="space-y-0.5 py-1">
                      {recentThreads.map(thread => {
                        const isActive = pathname === `/chat/${thread.id}`;
                        return (
                          <li key={thread.id} className="px-1 h-[34px]">
                            <Link
                              href={`/chat/${thread.id}`}
                              className={`group flex items-center py-2 rounded-md text-sm transition-colors ${
                                collapsed ? "justify-center" : "gap-2 px-2"
                              } ${
                                isActive
                                  ? darkMode
                                    ? "bg-indigo-600/20 text-indigo-200 border-l-2 border-indigo-500"
                                    : "bg-indigo-50 text-indigo-800 border-l-2 border-indigo-500"
                                  : darkMode
                                    ? "text-gray-300 hover:text-white hover:bg-gray-800/60"
                                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                              }`}
                              title={collapsed ? getThreadPreview(thread) : undefined}
                            >
                              <div
                                className={`flex-shrink-0 ${isActive ? (darkMode ? "text-indigo-300" : "text-indigo-600") : ""}`}
                              >
                                <FiMessageSquare size={collapsed ? 18 : 16} />
                              </div>
                              {!collapsed && (
                                <div className="flex-1 truncate">
                                  <div className="flex justify-between items-center">
                                    <div
                                      className={`truncate font-medium ${isActive ? (darkMode ? "text-indigo-200" : "text-indigo-700") : ""}`}
                                    >
                                      {getThreadPreview(thread)}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                    
                    {/* Infinite scroll sentinel */}
                    {hasMoreThreads && (
                      <div 
                        ref={(el) => {
                          if (!el || loadingThreads) return;
                          const observer = new IntersectionObserver(
                            (entries) => {
                              if (entries[0].isIntersecting) {
                                loadMoreThreads();
                              }
                            },
                            { threshold: 0.5 }
                          );
                          observer.observe(el);
                          return () => observer.disconnect();
                        }}
                        className="h-10 flex items-center justify-center"
                      >
                        {loadingThreads && (
                          <div className="py-2 text-sm text-center w-full">
                            <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </nav>

        <div
          className={`mt-auto border-t ${darkMode ? "border-gray-700/80" : "border-gray-200/80"}`}
        >
          <div className="p-2">
            {user ? (
              <div className="flex items-center justify-between">
                <Link
                  href="/profile"
                  className={`flex items-center py-1 rounded-md ${collapsed ? "justify-center w-full" : "gap-2 flex-1"} 
                  ${
                    darkMode
                      ? "hover:bg-gray-800/60 text-gray-200"
                      : "hover:bg-gray-100/80 text-gray-700"
                  } 
                  transition-colors`}
                  title={collapsed ? user.email : undefined}
                >
                  <div
                    className={`w-8 h-8 rounded-full ${darkMode ? "bg-indigo-700" : "bg-indigo-600"} 
                    flex items-center justify-center text-white font-medium flex-shrink-0 
                    ${darkMode ? "shadow-md shadow-indigo-900/20" : ""}`}
                  >
                    {user.email?.charAt(0).toUpperCase() || "U"}
                  </div>
                  {!collapsed && (
                    <div className="flex-1 truncate">
                      <div
                        className={`text-sm font-medium truncate ${darkMode ? "text-gray-200" : "text-gray-700"}`}
                      >
                        {user.email?.split("@")[0] || "User"}
                      </div>
                    </div>
                  )}
                </Link>

                <Button
                  onClick={handleSignOut}
                  variant="ghost"
                  size="icon"
                  className={`${collapsed ? "hidden" : "flex"} h-8 w-8 rounded-full 
                    ${darkMode ? "text-gray-400 hover:text-gray-200 hover:bg-gray-800" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`}
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
