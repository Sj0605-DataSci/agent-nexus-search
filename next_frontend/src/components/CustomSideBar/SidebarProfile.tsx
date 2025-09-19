"use client";

import React, { useState, useRef, useMemo, useEffect, memo } from "react";
import { FiMail } from "react-icons/fi";
import { toast } from "react-hot-toast";
import { EMAIL_REGEX, handleWaitlistSignup } from "@/utils/formUtils";
import { useAppSelector } from "@/store";
import UserProfileSection from "./UserProfileSection";

interface SidebarProfileProps {
  collapsed: boolean;
  isMobile: boolean;
  isUserQueryRoute?: boolean;
  onLogoutClick: () => void;
  profileId?: string;
}

const SidebarProfileBase = memo<SidebarProfileProps>(props => {
  const { collapsed, isMobile, isUserQueryRoute, onLogoutClick, profileId } = props;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const { profile, loading: profileLoading } = useAppSelector(s => s.profile);

  const handleWaitlistClick = async () => {
    const emailValue = emailInputRef.current?.value.trim() || "";

    if (!emailValue) {
      emailInputRef.current?.focus();
      toast.error("Please enter your email address");
      return;
    }

    if (!EMAIL_REGEX.test(emailValue)) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      setIsSubmitting(true);
      const { success, message } = await handleWaitlistSignup(emailValue);
      if (success) {
        toast.success("Thanks for joining our waitlist!");
        if (emailInputRef.current) {
          emailInputRef.current.value = "";
        }
      } else {
        toast.error(message);
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
    <div className="mt-auto border-t border-gray-200/80 p-4">
      {!collapsed || isMobile ? (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Join our waitlist</h3>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiMail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              ref={emailInputRef}
              type="email"
              placeholder="Enter your email"
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isSubmitting}
            />
          </div>
          <button
            className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200 ${isSubmitting ? "opacity-75 cursor-not-allowed" : ""}`}
            onClick={handleWaitlistClick}
            disabled={isSubmitting}
          >
            Join Waitlist
          </button>
        </div>
      ) : (
        <div className="flex justify-center py-2">
          <button
            className={`text-indigo-600 hover:text-indigo-700 ${isSubmitting ? "opacity-75 cursor-not-allowed" : ""}`}
            title="Join Waitlist"
            onClick={handleWaitlistClick}
            disabled={isSubmitting}
          >
            <FiMail className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
});

const SidebarProfile = React.memo(SidebarProfileBase, (prevProps, nextProps) => {
  const profileIdMatches = prevProps.profileId === nextProps.profileId;
  const collapsedMatches = prevProps.collapsed === nextProps.collapsed;
  const isMobileMatches = prevProps.isMobile === nextProps.isMobile;

  const shouldUpdate = !profileIdMatches || !collapsedMatches || !isMobileMatches;

  return !shouldUpdate;
});

export default SidebarProfile;
