// import ChatThreadView from "@/components/chats/ChatThreadView";

// const SearchEngine = () => {
//   return <ChatThreadView threadId="" />;
// };

// export default SearchEngine;
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const SearchEngine = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace("/chat/new");
  }, [router]);

  return null;
};

export default SearchEngine;
