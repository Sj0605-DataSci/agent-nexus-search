"use client";

import { User } from "lucide-react";
import type { UserProfile } from "@/integrations/fastapi/types";

interface ProfileHeaderProps {
  profile: UserProfile;
}

export default function ProfileHeader({ profile }: ProfileHeaderProps) {
  return (
    <div className="rounded-xl shadow-md p-6 border bg-white border-gray-200">
      <div className="flex items-center space-x-4">
        <div className="p-3 rounded-full bg-indigo-100">
          <User className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {profile?.full_name || "Anonymous User"}
          </h1>
          <p className={`text-sm mt-1 text-gray-500`}>
            Member since:{" "}
            {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "N/A"}
          </p>
        </div>
      </div>
    </div>
  );
}
