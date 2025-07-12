"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const ChatPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace("/chat/new");
  }, [router]);

  return null;
};

export default ChatPage;
