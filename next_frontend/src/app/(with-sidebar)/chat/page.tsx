"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

const ChatPage = () => {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/chat") {
      router.replace("/chat/new");
    }
  }, [router, pathname]);

  return null;
};

export default ChatPage;
