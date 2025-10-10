"use client";

import React from "react";
import { useAppSelector } from "@/store";
import UserProfileSection from "./UserProfileSection";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface SidebarProfileProps {
  collapsed: boolean;
  isMobile: boolean;
  isUserQueryRoute?: boolean;
  onLogoutClick: () => void;
  profileId?: string;
}

const SidebarProfileBase: React.FC<SidebarProfileProps> = props => {
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

  return (
    <div className="mt-auto border-t border-gray-200/80 p-4 ">
      {!collapsed || isMobile ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-gray-900">Ready to get started?</h3>
            <p className="text-xs text-gray-600">Sign up now and discover your network</p>
          </div>
          <Link href="/user-auth" className="block">
            <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group">
              Get Started
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </Link>
        </div>
      ) : (
        <div className="flex justify-center py-2">
          <Link href="/user-auth" title="Get Started">
            <button className="text-indigo-600 hover:text-indigo-700 transition-colors">
              <ArrowRight className="h-5 w-5" />
            </button>
          </Link>
        </div>
      )}
    </div>
  );
};

const SidebarProfile = React.memo(SidebarProfileBase, (prevProps, nextProps) => {
  const profileIdMatches = prevProps.profileId === nextProps.profileId;
  const collapsedMatches = prevProps.collapsed === nextProps.collapsed;
  const isMobileMatches = prevProps.isMobile === nextProps.isMobile;

  const shouldUpdate = !profileIdMatches || !collapsedMatches || !isMobileMatches;

  return !shouldUpdate;
});

SidebarProfile.displayName = "SidebarProfile";

export default SidebarProfile;
