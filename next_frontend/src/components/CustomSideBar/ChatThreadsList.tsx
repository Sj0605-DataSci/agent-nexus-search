"use client";

import Link from "next/link";
import { useCallback, useRef } from "react";
import { FiMessageSquare } from "react-icons/fi";
import { ChatThread } from "@/integrations/fastapi/types";
import ShimmerLoader from "./ShimmerLoader";
import ChatThreadItem from "./ChatThreadItem";

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

const ChatThreadsList: React.FC<ChatThreadsListProps> = ({
  threads,
  initialLoading,
  loadingMoreThreads,
  loadingThreads,
  hasMoreThreads,
  collapsed,
  isMobile,
  loadMoreThreads,
  getThreadPreview,
}) => {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleObserver = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;

      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (
            entries[0].isIntersecting &&
            !loadingMoreThreads &&
            !loadingThreads
          ) {
            loadMoreThreads();
          }
        },
        { threshold: 0.1, rootMargin: "100px" }
      );

      observerRef.current.observe(el);
    },
    [loadingMoreThreads, loadingThreads, loadMoreThreads]
  );

  if (initialLoading) {
    return <ShimmerLoader collapsed={collapsed && !isMobile} count={10} darkMode={false} />;
  }

  if (!threads || threads.length === 0) {
    return (
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
    );
  }

  return (
    <div className="flex flex-col space-y-1">
      <ul className="space-y-0.5 py-1">
        {threads.map((thread) => (
          <ChatThreadItem
            key={thread.id}
            thread={thread}
            collapsed={collapsed}
            isMobile={isMobile}
            getThreadPreview={getThreadPreview}
          />
        ))}
      </ul>

      {hasMoreThreads && (
        <div
          ref={handleObserver}
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
  );
};

export default ChatThreadsList;
