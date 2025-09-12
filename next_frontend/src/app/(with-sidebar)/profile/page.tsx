import { Suspense } from "react";
import dynamic from "next/dynamic";
import LoadingSkeleton from "@/components/LoadingSkeleton";

const ProfilePage = dynamic(
  () => import("@/components/profile/ProfilePage"),
  { ssr: false }
);

export default function ProfilePageWrapper() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ProfilePage />
    </Suspense>
  );
}
