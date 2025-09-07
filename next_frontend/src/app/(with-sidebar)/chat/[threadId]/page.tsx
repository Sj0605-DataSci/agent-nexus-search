import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import FullScreenLoader from "@/components/common/FullScreenLoader";

export async function generateStaticParams() {
  return [];
}

export const revalidate = 60;

const ChatThreadView = dynamic(() => import("@/components/chats/ChatThreadView"), {
  ssr: false,
  loading: () => <></>,
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
