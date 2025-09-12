import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import FullScreenLoader from "@/components/common/FullScreenLoader";
import MessagePlaceholder from "@/components/chats/MessagePlaceholder";

const ChatThreadView = dynamic(() => import("@/components/chats/ChatThreadView"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-start w-full h-full">
      <div className="w-full max-w-4xl mx-auto rounded-lg pt-4 backdrop-blur-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-30 bg-gray-600/10 rounded-xl"></div>
        </div>
        <div className="flex w-full mt-8  max-w-4xl mx-auto h-full">
          <MessagePlaceholder message={undefined} />
        </div>``
      </div>
    </div>
  ),
});

interface PageProps {
  params: { threadId: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function ChatThreadPage({ params }: PageProps) {
  const { threadId } = params;

  if (!threadId || typeof threadId !== "string") {
    return notFound();
  }

  return (
    <Suspense
      fallback={<FullScreenLoader isLoading={true} label="Preparing your conversation..." />}
    >
      <ChatThreadView threadId={threadId} />
    </Suspense>
  );
}
