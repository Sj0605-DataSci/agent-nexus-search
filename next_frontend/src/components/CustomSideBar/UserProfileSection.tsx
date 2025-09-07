"use client";

import Link from "next/link";
import { FiLogOut } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/store";

interface UserProfileSectionProps {
  profile: any;
  collapsed: boolean;
  isMobile: boolean;
  isUserQueryRoute: boolean;
  onLogoutClick: () => void;
}

const UserProfileSection: React.FC<UserProfileSectionProps> = ({
  profile,
  collapsed,
  isMobile,
  isUserQueryRoute,
  onLogoutClick,
}) => {
  const isLoading = useAppSelector(state => state.profile.loading);

  if (isUserQueryRoute) {
    return null;
  }

  if (!profile?.full_name || isLoading) {
    return (
      <div className="flex items-center justify-between">
        <div
          className={`flex items-center py-1 rounded-md ${collapsed && !isMobile ? "justify-center w-full" : "gap-2 flex-1"}`}
        >
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center animate-pulse">
            <span className="sr-only">Loading profile</span>
          </div>
          {(!collapsed || isMobile) && (
            <div className="flex-1">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1"></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <Link
        href="/profile"
        prefetch={true}
        className={`flex items-center py-1 rounded-md ${collapsed && !isMobile ? "justify-center w-full" : "gap-2 flex-1"} 
        hover:bg-gray-100/80 text-gray-700 transition-colors`}
        title={
          collapsed && !isMobile
            ? profile?.full_name
              ? profile.full_name.substring(0, 10) +
                (profile.full_name.length > 10 ? "..." : "")
              : "User"
            : undefined
        }
      >
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-medium flex-shrink-0">
          {profile?.full_name?.charAt(0).toUpperCase() || "U"}
        </div>
        {(!collapsed || isMobile) && (
          <div className="flex-1 truncate">
            <div className="text-sm font-medium truncate text-gray-700">
              {profile?.full_name?.split("@")[0] || "U"}
            </div>
          </div>
        )}
      </Link>

      <Button
        onClick={onLogoutClick}
        variant="ghost"
        size="icon"
        className={`${collapsed && !isMobile ? "hidden" : "flex"} h-8 w-8 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100`}
        title="Sign Out"
      >
        <FiLogOut size={16} />
      </Button>
    </div>
  );
};

export default UserProfileSection;
