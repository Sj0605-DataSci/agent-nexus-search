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
  FiUser,
  FiSmile,
  FiZap,
  FiPlus,
  FiMenu,
  FiX,
  FiGlobe,
  FiAlertTriangle,
  FiSearch,
} from "react-icons/fi";
import React, { useEffect, useState, useRef, useCallback, Suspense, lazy } from "react";
import posthog from "posthog-js";

const LogoutConfirmation = lazy(() =>
  import("@/components/ui/LogoutConfirmation").then(module => ({
    default: module.LogoutConfirmation,
  }))
);
import { apiClient } from "@/integrations/fastapi/client";
import { useAppDispatch, useAppSelector } from "@/store";
import { toggleSidebar, selectSidebarCollapsed } from "@/store/uiSlice";
import { fetchChatThreads, loadMoreChatThreads, setLoading } from "@/store/chatThreadsSlice";
import { clearProfile } from "@/store/profileSlice";
import { Button } from "@/components/ui/button";
import ShimmerLoader from "./ShimmerLoader";
import { ChatThread } from "@/integrations/fastapi/types";
import { supabaseHandler } from "@/app/supabaseClient";

const isAuthenticated = () => {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("discover_minds_access_token");
};

const Sidebar = () => {
  const collapsed = useAppSelector(selectSidebarCollapsed);
  const dispatch = useAppDispatch();
  const profile = useAppSelector(state => state.profile.profile);
  const router = useRouter();
  const pathname = usePathname();
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const {
    threads: recentThreads,
    loading: loadingThreads,
    hasMore: hasMoreThreads,
  } = useAppSelector(state => state.chatThreads);
  const [loadingMoreThreads, setLoadingMoreThreads] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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

    setLoadingMoreThreads(true);
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
  }, [hasMoreThreads, loadingMoreThreads, dispatch]);

  useEffect(() => {
    if (profile?.id && !threadsFetchedRef.current) {
      fetchThreads();
      threadsFetchedRef.current = true;
    }
  }, [profile?.id]);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleEscape = (e: { key: string }) => {
      if (e.key === "Escape") {
        setIsMobileSidebarOpen(false);
      }
    };

    if (isMobileSidebarOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden"; // Prevent background scroll
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isMobileSidebarOpen]);

  const getThreadPreview = (thread: ChatThread) => {
    if (thread.title) return thread.title;
    return `Chat ${thread.id.substring(0, 8)}`;
  };

  const navItems = [
    { href: "/agents", label: "Agents", icon: <FiZap /> },
    { href: "/connections", label: "Connections", icon: <FiGlobe /> },
    { href: "/friends", label: "Friends", icon: <FiSmile /> },
    { href: "/groups", label: "Groups", icon: <FiUsers /> },
  ];

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await apiClient.logout();
      // Clear local storage and state
      localStorage.removeItem("discover_minds_access_token");
      localStorage.removeItem("discover_minds_refresh_token");
      dispatch(clearProfile());
      await supabaseHandler.auth.signOut();
      posthog.reset();
      // Redirect to auth page
      router.push("/user-auth");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  const toggleMobileSidebar = useCallback(() => {
    if (isMobileSidebarOpen) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsMobileSidebarOpen(false);
        setIsClosing(false);
      }, 250);
      return () => clearTimeout(timer);
    } else {
      setIsMobileSidebarOpen(true);
      setIsClosing(false);
    }
  }, [isMobileSidebarOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX - touchEndX > 50 && isMobileSidebarOpen) {
      toggleMobileSidebar();
    } else if (touchEndX - touchStartX > 50 && !isMobileSidebarOpen) {
      toggleMobileSidebar();
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      toggleMobileSidebar();
    }
  };

  const MobileHeader = () => (
    <header
      className="md:hidden fixed top-0 left-0 right-0 z-40 h-16 bg-white/95 backdrop-blur-sm border-b border-gray-200/80 shadow-sm"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-center justify-between px-4 h-full">
        <Button
          onClick={toggleMobileSidebar}
          variant="ghost"
          size="icon"
          className="h-12 w-12 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-transparent active:bg-gray-100"
          aria-label={isMobileSidebarOpen ? "Close menu" : "Open menu"}
        >
          {isMobileSidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </Button>
        <Link
          href="/chat/new"
          className="flex items-center justify-center h-12 px-4 -mr-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 active:bg-indigo-50 rounded-lg transition-colors"
        >
          New Chat
        </Link>
      </div>
    </header>
  );

  interface SidebarContentProps {
    isMobile?: boolean;
  }

  const SidebarContent: React.FC<SidebarContentProps> = ({ isMobile = false }) => (
    <div
      className="flex flex-col h-full overflow-y-auto overscroll-contain"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <div
        className={`flex items-center justify-between pl-2 py-4 border-b border-gray-200/80 ${isMobile ? "pr-2" : ""}`}
      >
        <Link prefetch={true} href="/chat/new" className="flex items-center h-8 gap-2 group">
          <Image
            src="/icon.png"
            alt="Logo"
            width={32}
            height={32}
            className="w-8 h-8 object-contain rounded-md min-h-8 min-w-8"
          />
          {(!collapsed || isMobile) && (
            <span className="text-lg font-bold tracking-tight group-hover:text-indigo-500">
              DiscoverMinds.ai
            </span>
          )}
        </Link>
        {isMobile ? (
          <Button
            onClick={toggleMobileSidebar}
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-500 hover:text-gray-700"
          >
            <FiX size={18} />
          </Button>
        ) : (
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="text-gray-500 mr-1 hover:text-gray-700"
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <FiChevronRight /> : <FiChevronLeft />}
          </button>
        )}
      </div>

      {/* New Chat Button */}
      <div className="px-3 py-2">
        <Link
          href="/chat/new"
          prefetch={true}
          className={`w-full flex items-center mt-1 ${collapsed && !isMobile ? "justify-center p-2" : "justify-between px-3 py-1.5"} 
            bg-gray-100 border-gray-200 text-gray-800 hover:bg-gray-200
            border rounded-md transition-colors duration-200`}
        >
          <div className="flex items-center gap-2">
            <FiSearch className="h-4 w-4 text-indigo-600" />
            {(!collapsed || isMobile) && <span>New search</span>}
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 ">
        <ul className="space-y-[2px] pb-3">
          {navItems.map(({ href, label, icon }) => (
            <li key={href}>
              <Link
                prefetch={true}
                href={href}
                className={`group flex items-center rounded-lg py-2 text-sm font-medium transition-colors w-full
                  ${collapsed && !isMobile ? "justify-center" : "gap-3 pl-2 pr-4"}
                  ${
                    pathname.startsWith(href)
                      ? "bg-indigo-100 text-indigo-700"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  }
                `}
              >
                <span className="relative group">
                  <span className="text-lg">{icon}</span>
                </span>
                {(!collapsed || isMobile) && <span>{label}</span>}
              </Link>
            </li>
          ))}
        </ul>

        {profile && (
          <div className="mb-4">
            {(!collapsed || isMobile) && (
              <h3 className="text-xs font-semibold px-2 mb-2 text-gray-500">Recent chats</h3>
            )}
            <div className="rounded-md mb-1">
              {initialLoading ? (
                <ShimmerLoader collapsed={collapsed && !isMobile} count={10} darkMode={false} />
              ) : recentThreads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-4 px-2 text-gray-500">
                  {!collapsed || isMobile ? (
                    <>
                      <FiMessageSquare className="text-xl mb-1 opacity-60" />
                      <p className="text-xs text-center">No recent conversations</p>
                      <Link
                        prefetch={true}
                        href="/chat/new"
                        className="mt-2 text-xs px-3 py-1 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
                      >
                        Start chatting
                      </Link>
                    </>
                  ) : (
                    <FiMessageSquare className="text-xl opacity-60" />
                  )}
                </div>
              ) : (
                <div className="flex flex-col space-y-1">
                  <ul className="space-y-0.5 py-1">
                    {recentThreads.map(thread => {
                      const isActive = pathname === `/chat/${thread?.id}`;
                      return (
                        <li key={thread.id} className="px-1 h-[34px]">
                          <Link
                            href={`/chat/${thread.id}?title=${encodeURIComponent(getThreadPreview(thread).substring(0, 40))}`}
                            className={`group flex items-center py-2 rounded-md text-sm transition-colors ${
                              collapsed && !isMobile ? "justify-center" : "gap-2 px-2"
                            } ${
                              isActive
                                ? "bg-indigo-50 text-indigo-800 border-l-2 border-indigo-500"
                                : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                            }`}
                            title={collapsed && !isMobile ? getThreadPreview(thread) : undefined}
                          >
                            <div className={`flex-shrink-0 ${isActive ? "text-indigo-600" : ""}`}>
                              <FiMessageSquare size={collapsed && !isMobile ? 18 : 16} />
                            </div>
                            {(!collapsed || isMobile) && (
                              <div className="flex-1 truncate">
                                <div className="flex justify-between items-center">
                                  <div
                                    className={`truncate font-medium ${isActive ? "text-indigo-700" : ""}`}
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

      <div className="mt-auto border-t border-gray-200/80">
        <div className="p-2">
          {useAppSelector(state => state.profile.loading) ? (
            <div className="flex items-center justify-between">
              <div
                className={`flex items-center py-1 rounded-md ${collapsed && !isMobile ? "justify-center w-full" : "gap-2 flex-1"}`}
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center animate-pulse">
                  <span className="sr-only">Loading profile</span>
                </div>
                {(!collapsed || isMobile) && (
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1"></div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <Link
                href="/profile"
                prefetch={true}
                className={`flex items-center py-1 rounded-md ${collapsed && !isMobile ? "justify-center w-full" : "gap-2 flex-1"} 
                hover:bg-gray-100/80 text-gray-700 transition-colors`}
                title={
                  collapsed && !isMobile
                    ? profile?.full_name
                      ? profile.full_name.substring(0, 10) +
                        (profile.full_name.length > 10 ? "..." : "")
                      : "User"
                    : undefined
                }
              >
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                  {profile?.full_name?.charAt(0).toUpperCase() || "U"}
                </div>
                {(!collapsed || isMobile) && (
                  <div className="flex-1 truncate">
                    <div className="text-sm font-medium truncate text-gray-700">
                      {profile?.full_name?.split("@")[0] || "User"}
                    </div>
                  </div>
                )}
              </Link>

              <Button
                onClick={() => setShowLogoutConfirm(true)}
                variant="ghost"
                size="icon"
                className={`${collapsed && !isMobile ? "hidden" : "flex"} h-8 w-8 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100`}
                title="Sign Out"
              >
                <FiLogOut size={16} />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <MobileHeader />

      {isMobileSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 transition-opacity duration-250 ease-in-out"
          onClick={handleOverlayClick}
        >
          <div
            className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-250 ease-in-out ${
              isClosing ? "opacity-0" : "opacity-100"
            }`}
          />

          <aside
            ref={sidebarRef}
            className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-2xl transform transition-transform duration-250 ease-in-out ${
              isClosing ? "-translate-x-full" : "translate-x-0"
            }`}
            style={{
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
              touchAction: "pan-y",
              willChange: "transform",
            }}
          >
            <SidebarContent isMobile={true} />
          </aside>
        </div>
      )}

      <aside
        className={`hidden md:block fixed md:static overflow-y-auto max-h-screen inset-y-0 left-0 z-40 ${
          collapsed ? "w-16" : "w-64"
        } transition-all duration-200 flex-col
        border-r shadow-lg bg-white/95 backdrop-blur-sm border-gray-200/80 text-gray-900`}
        style={{
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
          touchAction: "pan-y",
        }}
      >
        <SidebarContent isMobile={false} />
      </aside>

      <Suspense fallback={null}>
        {showLogoutConfirm && (
          <LogoutConfirmation
            onConfirm={handleSignOut}
            onCancel={() => setShowLogoutConfirm(false)}
            isLoggingOut={isLoggingOut}
            isOpen={showLogoutConfirm}
          />
        )}
      </Suspense>
    </>
  );
};

export default Sidebar;
