// components/chat/MessageBubble.tsx
import React from "react";
import ReactMarkdown from "react-markdown";
export type Stage = "thinking" | "searching" | "answering" | "done";

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string; // running buffer for streaming tokens
  stage?: Stage; // present only for agent messages
  createdAt: Date;
}

const SkeletonLines = () => (
  <div className="space-y-2 animate-pulse">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="h-3 rounded bg-gray-300 dark:bg-gray-700"></div>
    ))}
  </div>
);

export default React.memo(function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  const base =
    "rounded-xl p-4 max-w-full " +
    (isUser
      ? "self-end bg-blue-600 text-white"
      : "self-start bg-gray-100 dark:bg-gray-800/60 text-gray-900 dark:text-gray-200");

  return (
    <div className={base}>
      {msg.stage !== "done" && msg.stage !== undefined ? (
        /* streaming state */
        <SkeletonLines />
      ) : (
        <ReactMarkdown>{msg.content}</ReactMarkdown>
      )}
      <time className="mt-2 block text-[10px] opacity-60" dateTime={msg.createdAt.toISOString()}>
        {msg.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </time>
    </div>
  );
});
