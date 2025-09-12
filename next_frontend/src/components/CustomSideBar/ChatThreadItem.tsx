"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiMessageSquare } from "react-icons/fi";
import { ChatThread } from "@/integrations/fastapi/types";
import { motion } from "framer-motion";

interface ChatThreadItemProps {
  thread: ChatThread;
  collapsed: boolean;
  isMobile: boolean;
  getThreadPreview: (thread: ChatThread) => string;
  index?: number;
}

const ChatThreadItem: React.FC<ChatThreadItemProps> = ({
  thread,
  collapsed,
  isMobile,
  getThreadPreview,
  index = 0,
}) => {
  const pathname = usePathname();
  const isActive = pathname === `/chat/${thread?.id}`;
  const threadPreview = getThreadPreview(thread);

  return (
    <motion.li
      className="px-1 h-[34px]"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
    >
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
    </motion.li>
  );
};

export default ChatThreadItem;
