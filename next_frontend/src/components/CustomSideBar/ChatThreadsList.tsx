import React, { memo, useCallback } from "react";
import { ChatThread } from "@/integrations/fastapi/types";
import Link from "next/link";
import { FiMessageSquare } from "react-icons/fi";
import { usePathname } from "next/navigation";

interface ChatThreadsListProps {
  threads: ChatThread[];
  initialLoading: boolean;
  loadingMoreThreads: boolean;
  loadingThreads: boolean;
  hasMoreThreads: boolean;
  collapsed: boolean;
  isMobile: boolean;
  loadMoreThreads: () => void;
  getThreadPreview: (thread: ChatThread) => string;
}

// Memoize individual thread item
const ThreadItem = memo(
  ({
    thread,
    getThreadPreview,
    collapsed,
    isMobile,
  }: {
    thread: ChatThread;
    getThreadPreview: (thread: ChatThread) => string;
    collapsed: boolean;
    isMobile: boolean;
  }) => {
    const pathname = usePathname();
    const isActive = pathname?.includes(`/chat/${thread.id}`);
    const threadPreview = getThreadPreview(thread);

    return (
      <Link
        href={`/chat/${thread.id}?title=${encodeURIComponent(threadPreview.substring(0, 90))}`}
        className={`group flex items-center py-2 rounded-md text-sm transition-all duration-200 ${
          collapsed && !isMobile ? "justify-center" : "gap-2 px-2"
        } ${
          isActive
            ? "bg-indigo-50 text-indigo-800 border-l-2 border-indigo-500 shadow-sm"
            : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
        }`}
        prefetch={true}
        title={collapsed && !isMobile ? threadPreview : undefined}
      >
        <div
          className={`flex-shrink-0 ${isActive ? "text-indigo-600" : ""} transition-colors duration-200`}
        >
          <FiMessageSquare
            size={collapsed && !isMobile ? 18 : 16}
            className={`${isActive ? "transform scale-110" : ""} transition-transform duration-200`}
          />
        </div>
        {(!collapsed || isMobile) && (
          <div className="flex-1 truncate">
            <div className="flex justify-between items-center">
              <div
                className={`truncate font-medium ${isActive ? "text-indigo-700" : ""} transition-colors duration-200`}
              >
                {threadPreview}
              </div>
            </div>
          </div>
        )}
      </Link>
    );
  }
);

ThreadItem.displayName = "ThreadItem";

const ChatThreadsList = memo(
  ({
    threads,
    initialLoading,
    loadingMoreThreads,
    loadingThreads,
    hasMoreThreads,
    collapsed,
    isMobile,
    loadMoreThreads,
    getThreadPreview,
  }: ChatThreadsListProps) => {
    const handleLoadMore = useCallback(() => {
      if (hasMoreThreads && !loadingMoreThreads && !loadingThreads) {
        loadMoreThreads();
      }
    }, [hasMoreThreads, loadingMoreThreads, loadingThreads, loadMoreThreads]);

    if (initialLoading) {
      return (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {threads.map(thread => (
          <ThreadItem
            key={thread.id}
            thread={thread}
            getThreadPreview={getThreadPreview}
            collapsed={collapsed}
            isMobile={isMobile}
          />
        ))}

        {hasMoreThreads && (
          <button
            onClick={handleLoadMore}
            disabled={loadingMoreThreads}
            className={`w-full text-sm text-gray-500 hover:text-gray-700 py-2 ${
              collapsed ? "text-center" : "text-left px-2"
            }`}
          >
            {loadingMoreThreads ? "Loading..." : "Load more"}
          </button>
        )}
      </div>
    );
  }
);

ChatThreadsList.displayName = "ChatThreadsList";

export default ChatThreadsList;
