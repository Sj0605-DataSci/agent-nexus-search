"use client";

import React, { memo } from "react";
import { Brain } from "lucide-react";
import { useAppSelector } from "@/store";
import UserProfileSection from "./UserProfileSection";
import Link from "next/link";

interface SidebarProfileProps {
  collapsed: boolean;
  isMobile: boolean;
  isUserQueryRoute?: boolean;
  onLogoutClick: () => void;
  profileId?: string;
}

const SidebarProfileBase = memo<SidebarProfileProps>(props => {
  const { collapsed, isMobile, isUserQueryRoute, onLogoutClick, profileId } = props;

  const { profile, loading: profileLoading } = useAppSelector(s => s.profile);

  if (profileLoading) {
    return (
      <div className="mt-auto border-t border-gray-200/80">
        <div className="p-2">
          <div
            className={`flex items-center py-1 rounded-md ${collapsed && !isMobile ? "justify-center w-full" : "gap-2 flex-1"}`}
          >
            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
            {(!collapsed || isMobile) && (
              <div className="flex-1">
                <div className="h-3 bg-gray-200 rounded animate-pulse w-24 mb-1"></div>
                <div className="h-2 bg-gray-200 rounded animate-pulse w-16"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (profileId) {
    return (
      <div className="mt-auto border-t border-gray-200/80">
        <div className="p-2">
          <UserProfileSection
            profile={profile}
            collapsed={collapsed}
            isMobile={isMobile}
            isUserQueryRoute={isUserQueryRoute}
            onLogoutClick={onLogoutClick}
          />
        </div>
      </div>
    );
  }

  return <></>;
});

const SidebarProfile = React.memo(SidebarProfileBase, (prevProps, nextProps) => {
  const profileIdMatches = prevProps.profileId === nextProps.profileId;
  const collapsedMatches = prevProps.collapsed === nextProps.collapsed;
  const isMobileMatches = prevProps.isMobile === nextProps.isMobile;

  const shouldUpdate = !profileIdMatches || !collapsedMatches || !isMobileMatches;

  return !shouldUpdate;
});

export default SidebarProfile;
