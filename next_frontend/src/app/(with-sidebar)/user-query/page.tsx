"use client";

import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import FullScreenLoader from "@/components/common/FullScreenLoader";

const ChatThreadView = dynamic(() => import("@/components/chats/ChatThreadView"), {
  ssr: false,
  loading: () => <></>,
});

export default function UserQueryPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  return (
    <Suspense fallback={<FullScreenLoader isLoading={true} label="Preparing your conversation..." />}>
      <ChatThreadView threadId="new" initialQuery={query} />
    </Suspense>
  );
}
