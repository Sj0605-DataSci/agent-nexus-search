"use client";

import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import FullScreenLoader from "@/components/common/FullScreenLoader";

const ChatThreadView = dynamic(() => import("@/components/chats/ChatThreadView"), {
  ssr: false,
  loading: () => <></>,
});

function UserQueryContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  return <ChatThreadView threadId="new" initialQuery={query} />;
}

export default function UserQueryPage() {
  return (
    <Suspense
      fallback={<FullScreenLoader isLoading={true} label="Preparing your conversation..." />}
    >
      <UserQueryContent />
    </Suspense>
  );
}
