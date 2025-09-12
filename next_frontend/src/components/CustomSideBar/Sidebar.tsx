"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { FiUsers, FiSmile, FiZap, FiMenu, FiX, FiGlobe, FiSearch, FiMail } from "react-icons/fi";
import { PiSidebarSimple } from "react-icons/pi";
import React, { useEffect, useState, useRef, useCallback, Suspense, lazy } from "react";
import "@/styles/scrollbar-hide.css";
import posthog from "posthog-js";
import { toast } from "react-hot-toast";
import { EMAIL_REGEX, handleWaitlistSignup } from "@/utils/formUtils";
import { apiClient } from "@/integrations/fastapi/client";
import { useAppDispatch, useAppSelector } from "@/store";
import { toggleSidebar, selectSidebarCollapsed } from "@/store/uiSlice";
import { fetchChatThreads, loadMoreChatThreads } from "@/store/chatThreadsSlice";
import { clearProfile } from "@/store/profileSlice";
import { Button } from "@/components/ui/button";
import { ChatThread } from "@/integrations/fastapi/types";
import { supabaseHandler } from "@/integrations/supabase/client";
import ChatThreadsList from "./ChatThreadsList";
import UserProfileSection from "./UserProfileSection";

const LogoutConfirmation = lazy(() =>
  import("@/components/ui/LogoutConfirmation").then(module => ({
    default: module.LogoutConfirmation,
  }))
);

const Sidebar = () => {
  const collapsed = useAppSelector(selectSidebarCollapsed);
  const dispatch = useAppDispatch();

  const profile = useAppSelector(state => state.profile.profile);
  const profileLoading = useAppSelector(state => state.profile.loading);
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
  const isUserQueryRoute = pathname?.includes("user-query");

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
    dispatch(loadMoreChatThreads()).finally(() => {
      setLoadingMoreThreads(false);
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

  const getNavItems = () => {
    const items = [
      { href: "/connections", label: "Connections", icon: <FiGlobe /> },
      { href: "/friends", label: "Friends", icon: <FiSmile /> },
      { href: "/groups", label: "Groups", icon: <FiUsers /> },
    ];

    if (profile?.id) {
      items.unshift({ href: "/agents", label: "Agents", icon: <FiZap /> });
    }

    return items;
  };

  const navItems = getNavItems();

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      setTimeout(() => {
        router.replace("/");
      }, 1500);
      await apiClient.logout();
      await supabaseHandler.auth.signOut();
      localStorage.clear();
      dispatch(clearProfile());
      posthog.reset();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.clear();
      setTimeout(() => {
        router.replace("/");
      }, 1500);
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
          className="h-16 w-16 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-transparent active:bg-gray-100"
          aria-label={isMobileSidebarOpen ? "Close menu" : "Open menu"}
        >
          {isMobileSidebarOpen ? (
            <FiX size={24} />
          ) : (
            <PiSidebarSimple size={24} className="rotate-180" />
          )}
        </Button>
        {profile?.id && (
          <Link
            href="/chat/new"
            className="flex items-center justify-center h-12 px-4 -mr-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 active:bg-indigo-50 rounded-lg transition-colors"
          >
            New Chat
          </Link>
        )}
      </div>
    </header>
  );

  interface SidebarContentProps {
    isMobile?: boolean;
  }

  const SidebarContent: React.FC<SidebarContentProps> = ({ isMobile = false }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const emailInputRef = useRef<HTMLInputElement>(null);

    const handleWaitlistClick = async () => {
      const emailValue = emailInputRef.current?.value.trim() || "";

      if (!emailValue) {
        emailInputRef.current?.focus();
        toast.error("Please enter your email address");
        return;
      }

      if (!EMAIL_REGEX.test(emailValue)) {
        toast.error("Please enter a valid email address");
        return;
      }

      try {
        setIsSubmitting(true);
        const { success, message } = await handleWaitlistSignup(emailValue);
        if (success) {
          toast.success("Thanks for joining our waitlist!");
          if (emailInputRef.current) {
            emailInputRef.current.value = "";
          }
        } else {
          toast.error(message);
        }
      } catch (error) {
        console.error("Waitlist signup error:", error);
        toast.error("An error occurred. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    };
    return (
      <div
        className="flex flex-col h-full overflow-y-auto overscroll-contain"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div
          className={`flex ${collapsed && !isMobile ? "flex-col items-center" : "items-center justify-between"}  py-4 border-b border-gray-200/80 ${isMobile ? "pr-2" : ""}`}
        >
          <div className="flex items-center justify-center w-full">
            <Link
              prefetch={false}
              href={profile?.id ? "/chat/new" : "/"}
              className="flex items-center h-8 gap-2 group"
            >
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
            {isMobile && (
              <Button
                onClick={toggleMobileSidebar}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-500 hover:text-gray-700 ml-auto"
              >
                <PiSidebarSimple size={24} />
              </Button>
            )}
          </div>
          {!isMobile && (
            <button
              onClick={() => dispatch(toggleSidebar())}
              className={`text-gray-500 hover:text-gray-700 ${collapsed ? "mt-2" : "mr-1"}`}
              title={collapsed ? "Expand" : "Collapse"}
            >
              <PiSidebarSimple size={24} className={collapsed ? "rotate-180" : ""} />
            </button>
          )}
        </div>

        {profile?.id && (
          <div className="px-3 py-2">
            <Link
              href="/chat/new"
              prefetch={false}
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
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 hide-scrollbar">
          <ul className="space-y-[2px] pb-3">
            {navItems.map(({ href, label, icon }) => (
              <li key={href}>
                <Link
                  prefetch={false}
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

          {recentThreads && recentThreads.length > 0 && (
            <div className="mb-4">
              {(!collapsed || isMobile) && (
                <h3 className="text-xs font-semibold px-2 mb-2 text-gray-500">Recent chats</h3>
              )}
              <div className="rounded-md mb-1">
                <ChatThreadsList
                  threads={recentThreads || []}
                  initialLoading={initialLoading}
                  loadingMoreThreads={loadingMoreThreads}
                  loadingThreads={loadingThreads}
                  hasMoreThreads={hasMoreThreads}
                  collapsed={collapsed}
                  isMobile={isMobile}
                  loadMoreThreads={loadMoreThreads}
                  getThreadPreview={getThreadPreview}
                />
              </div>
            </div>
          )}
        </nav>

        {profileLoading ? (
          <div className="mt-auto border-t border-gray-200/80">
            <div className="p-2">
              <div
                className={`flex items-center py-1 rounded-md ${collapsed && !isMobile ? "justify-center w-full" : "gap-2 flex-1"}`}
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
                {(!collapsed || isMobile) && (
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-24 mb-1"></div>
                    <div className="h-2 bg-gray-200 rounded animate-pulse w-16"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : profile?.id ? (
          <div className="mt-auto border-t border-gray-200/80">
            <div className="p-2">
              <UserProfileSection
                profile={profile}
                collapsed={collapsed}
                isMobile={isMobile}
                isUserQueryRoute={isUserQueryRoute}
                onLogoutClick={() => setShowLogoutConfirm(true)}
              />
            </div>
          </div>
        ) : (
          <div className="mt-auto border-t border-gray-200/80 p-4">
            {!collapsed || isMobile ? (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">Join our waitlist</h3>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiMail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    ref={emailInputRef}
                    type="email"
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={isSubmitting}
                  />
                </div>
                <button
                  className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200 ${isSubmitting ? "opacity-75 cursor-not-allowed" : ""}`}
                  onClick={handleWaitlistClick}
                  disabled={isSubmitting}
                >
                  Join Waitlist
                </button>
              </div>
            ) : (
              <div className="flex justify-center py-2">
                <button
                  className={`text-indigo-600 hover:text-indigo-700 ${isSubmitting ? "opacity-75 cursor-not-allowed" : ""}`}
                  title="Join Waitlist"
                  onClick={handleWaitlistClick}
                  disabled={isSubmitting}
                >
                  <FiMail className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

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
        className={`hidden md:block fixed md:static  max-h-screen inset-y-0 left-0 z-40 ${
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
