"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import {
  FiLogOut,
  FiLogIn,
  FiChevronLeft,
  FiChevronRight,
  FiMessageSquare,
  FiShoppingBag,
  FiUsers,
  FiPlus,
} from "react-icons/fi";
import { useEffect, useState, useRef, useCallback } from "react";
import posthog from "posthog-js";

import { useAppDispatch, useAppSelector } from "@/store";
import { toggleSidebar, selectSidebarCollapsed } from "@/store/uiSlice";
import { fetchChatThreads, loadMoreChatThreads, setLoading } from "@/store/chatThreadsSlice";
import { clearProfile } from "@/store/profileSlice";
import { setTheme } from "@/store/themeSlice";
import { Button } from "@/components/ui/button";
import SidebarItem from "./SidebarItem";
import ShimmerLoader from "./ShimmerLoader";
import { ChatThread } from "@/integrations/fastapi/types";

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
  const profile = useAppSelector(state => state.profile.profile);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!collapsed && darkMode) {
      dispatch(setTheme("light"));
    }
  }, [collapsed, darkMode, dispatch]);

  const {
    threads: recentThreads,
    loading: loadingThreads,
    hasMore: hasMoreThreads,
  } = useAppSelector(state => state.chatThreads);
  const [loadingMoreThreads, setLoadingMoreThreads] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const threadsFetchedRef = useRef(false);

  const fetchThreads = () => {
    if (!profile?.id) return;

    setInitialLoading(true);
    dispatch(fetchChatThreads()).finally(() => {
      setInitialLoading(false);
    });
  };

  const loadMoreThreads = useCallback(() => {
    if (!profile?.id || !hasMoreThreads || loadingMoreThreads || loadingThreads) return;

    setLoadingMoreThreads(true)
    dispatch(setLoading(false));
    dispatch(loadMoreChatThreads())
      .then(() => {
        console.log("Successfully loaded more threads");
      })
      .catch(error => {
        console.error("Error loading more threads:", error);
      })
      .finally(() => {
        setTimeout(() => {
          setLoadingMoreThreads(false);
        }, 300);
      });
  }, [profile?.id, hasMoreThreads, loadingMoreThreads, loadingThreads, dispatch]);

  useEffect(() => {
    if (profile?.id && !threadsFetchedRef.current) {
      fetchThreads();
      threadsFetchedRef.current = true;
    }
  }, [profile?.id]);

  const getThreadPreview = (thread: ChatThread) => {
    if (thread.title) return thread.title;

    return `Chat ${thread.id.substring(0, 8)}`;
  };

  const navItems = [
    { href: "/marketplace", label: "Marketplace", icon: <FiShoppingBag /> },
    { href: "/agents", label: "Agents", icon: <FiUsers /> },
  ];

  const handleSignOut = () => {
    localStorage.removeItem("discover_minds_access_token");
    localStorage.removeItem("discover_minds_refresh_token");

    dispatch(clearProfile());

    posthog.reset();

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
          <Link prefetch={true} href="/chat/new" className="flex items-center h-8 gap-2 group">
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
            prefetch={true}
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
          {profile && (
            <div className="mb-4">
              {!collapsed && (
                <h3 className="text-xs font-semibold px-2 mb-2 text-gray-500">Recent chats</h3>
              )}
              <div className={` rounded-md mb-1`}>
                {initialLoading ? (
                  <ShimmerLoader collapsed={collapsed} darkMode={darkMode} count={10} />
                ) : recentThreads.length === 0 ? (
                  <div
                    className={`flex flex-col items-center justify-center py-4 px-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                  >
                    {!collapsed && (
                      <>
                        <FiMessageSquare className="text-xl mb-1 opacity-60" />
                        <p className="text-xs text-center">No recent conversations</p>
                        <Link
                          prefetch={true}
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
                        const isActive = pathname === `/chat/${thread?.id}`;
                        return (
                          <li key={thread.id} className="px-1 h-[34px]">
                            <Link
                              href={`/chat/${thread.id}`}
                              prefetch={true}
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
                        ref={el => {
                          if (!el) return;

                          const observer = new IntersectionObserver(
                            entries => {
                              if (
                                entries[0].isIntersecting &&
                                !loadingMoreThreads &&
                                !loadingThreads
                              ) {
                                console.log("Intersection observed, loading more threads");
                                loadMoreThreads();
                              }
                            },
                            { threshold: 0.1, rootMargin: "100px" }
                          );

                          observer.observe(el);
                          return () => observer.disconnect();
                        }}
                        className="h-10 flex items-center justify-center mt-2"
                      >
                        {loadingMoreThreads && (
                          <div className="py-2 text-center w-full">
                            <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
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
            {profile ? (
              <div className="flex items-center justify-between">
                <Link
                  href="/profile"
                  prefetch={true}
                  className={`flex items-center py-1 rounded-md ${collapsed ? "justify-center w-full" : "gap-2 flex-1"} 
                  ${
                    darkMode
                      ? "hover:bg-gray-800/60 text-gray-200"
                      : "hover:bg-gray-100/80 text-gray-700"
                  } 
                  transition-colors`}
                  title={collapsed ? profile.email : undefined}
                >
                  <div
                    className={`w-8 h-8 rounded-full ${darkMode ? "bg-indigo-700" : "bg-indigo-600"} 
                    flex items-center justify-center text-white font-medium flex-shrink-0 
                    ${darkMode ? "shadow-md shadow-indigo-900/20" : ""}`}
                  >
                    {profile.email?.charAt(0).toUpperCase() || "U"}
                  </div>
                  {!collapsed && (
                    <div className="flex-1 truncate">
                      <div
                        className={`text-sm font-medium truncate ${darkMode ? "text-gray-200" : "text-gray-700"}`}
                      >
                        {profile.email?.split("@")[0] || "User"}
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
