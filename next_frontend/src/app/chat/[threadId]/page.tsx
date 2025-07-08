"use client";


import { useParams } from "next/navigation";
import withAuth from "@/hoc/withAuth";
import ChatThreadView from "./ChatThreadView";

const ChatThreadPage = () => {
  const params = useParams();
  const threadId = params.threadId as string;

  return <ChatThreadView threadId={threadId} />;
};

export default withAuth(ChatThreadPage);
