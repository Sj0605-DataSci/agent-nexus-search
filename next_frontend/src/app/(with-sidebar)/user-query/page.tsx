import { Suspense } from "react";
import dynamic from "next/dynamic";
import FullScreenLoader from "@/components/common/FullScreenLoader";

const ChatThreadView = dynamic(() => import("@/components/chats/ChatThreadView"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-start w-full h-full">
      <div className="w-full max-w-4xl mx-auto rounded-lg pt-4 backdrop-blur-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-30 bg-gray-600/10 rounded-xl"></div>
        </div>
        <div className="h-10 mt-10 bg-gray-600/10 rounded-xl"></div>
      </div>
    </div>
  ),
});

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

function UserQueryContent({ searchParams }: PageProps) {
  const query = typeof searchParams.q === "string" ? searchParams.q : "";

  return <ChatThreadView threadId="new" initialQuery={query} />;
}

export default async function UserQueryPage(props: PageProps) {
  return (
    <Suspense
      fallback={<FullScreenLoader isLoading={true} label="Preparing your conversation..." />}
    >
      <UserQueryContent searchParams={props.searchParams} />
    </Suspense>
  );
}
