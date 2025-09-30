"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store";
import ProfileHeader from "@/components/profile/ProfileHeader";
import ProfessionalProfile from "@/components/profile/ProfessionalProfile";
import UsageStatsCard from "@/components/profile/UsageStatsCard";
import ComingSoonOverlay from "@/components/ComingSoonOverlay";
import { getNormalizedConnectionsStatus } from "@/utils/profile";
import dynamic from "next/dynamic";

const ImportConnectionsModal = dynamic(() => import("@/components/profile/ImportConnectionsModal"));

export default function ProfilePage() {
  const router = useRouter();
  const [showConnectionsModal, setShowConnectionsModal] = useState(false);

  const { profile, loading } = useAppSelector(s => s.profile);

  const handleConnectionsClick = () => {
    const hasConnections = getNormalizedConnectionsStatus(profile?.has_connections);
    if (hasConnections === "no_data") {
      setShowConnectionsModal(true);
    } else {
      router.push("/chat/new");
    }
  };

  return (
    <>
      {!profile?.id && <ComingSoonOverlay />}
      <div
        className={`container mx-auto px-4 ${!profile?.id ? "opacity-30 pointer-events-none" : ""}`}
      ></div>
      <div className="container mx-auto px-4 pt-8 pb-16 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">My Profile</h1>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : profile ? (
          <div className="space-y-8">
            <ProfileHeader profile={profile} />
            <ProfessionalProfile onConnectionsClick={handleConnectionsClick} />
            <UsageStatsCard />
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-700">Unable to load profile. Please try again later.</p>
          </div>
        )}
      </div>

      {showConnectionsModal && (
        <ImportConnectionsModal
          open={showConnectionsModal}
          onOpenChange={setShowConnectionsModal}
        />
      )}
    </>
  );
}
