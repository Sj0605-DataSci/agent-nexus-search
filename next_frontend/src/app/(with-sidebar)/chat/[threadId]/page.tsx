"use client";

import { useParams } from "next/navigation";
import ChatThreadView from "../../../../components/chats/ChatThreadView";

const ChatThreadPage = () => {
  const params = useParams();
  const threadId = params.threadId as string;

  return <ChatThreadView threadId={threadId} />;
};

export default ChatThreadPage;
