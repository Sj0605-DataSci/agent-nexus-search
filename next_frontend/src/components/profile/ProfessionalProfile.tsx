"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Mail } from "lucide-react";
import { AppDispatch, RootState } from "@/store";
import { updateUserProfile } from "@/store/profileSlice";
import { useAnalytics } from "@/hooks/useAnalytics";

import { FiLinkedin } from "react-icons/fi";
import { ExternalLink, Edit2, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserProfile } from "@/integrations/fastapi/types";
import LinkedInUrlModal from "../Connections/LinkedInUrlModal";
import toast from "react-hot-toast";
import { LinkedInSection } from "./LinkedInSection";
import { getNormalizedConnectionsStatus } from "@/utils/profile";

interface ProfessionalProfileProps {
  onConnectionsClick: () => void;
}

const ProfileSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
    <div className="p-4 rounded-lg border bg-white border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gray-200"></div>
          <div className="h-6 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="h-6 w-11 bg-gray-200 rounded-full"></div>
      </div>
      <div className="mt-2 h-4 bg-gray-200 rounded w-3/4 ml-12"></div>
    </div>
    <div className="h-8 bg-gray-200 rounded w-1/2 mt-4"></div>
    <div className="p-4 rounded-lg border bg-white border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gray-200"></div>
          <div className="h-6 bg-gray-200 rounded w-24"></div>
        </div>
        <div className="h-8 w-24 bg-gray-200 rounded"></div>
      </div>
      <div className="mt-2 p-3 rounded-md bg-gray-50">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
      </div>
    </div>
    <div className="p-4 rounded-lg border bg-white border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 bg-gray-200 rounded"></div>
          <div className="h-6 bg-gray-200 rounded w-40"></div>
        </div>
        <div className="h-8 w-32 bg-gray-200 rounded"></div>
      </div>
    </div>
  </div>
);

export default function ProfessionalProfile({ onConnectionsClick }: ProfessionalProfileProps) {
  const { profile, loading } = useSelector((state: RootState) => state.profile);
  const [linkedinModalOpen, setLinkedinModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const { capture } = useAnalytics();

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (!profile) {
    return null;
  }

  const handleSubscriptionChange = async (checked: boolean) => {
    setIsUpdating(true);
    try {
      await dispatch(updateUserProfile({ email_subscription: checked })).unwrap();
      dispatch({ type: "profile/updateSubscriptionOptimistic", payload: checked });
      if (checked) {
        toast.success("Email subscription enabled successfully.");
      } else {
        toast.success("Email subscription disabled successfully.");
      }
      capture("email_subscription_updated", { subscribed: checked });
    } catch (error) {
      toast.error("Failed to update preferences. Please try again.");
      capture("email_subscription_update_failed", { subscribed: checked });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Account Settings</h2>

      <div className="p-4 rounded-lg border bg-white border-gray-200 transition-all hover:shadow-md">
        <div>
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <div className="flex-shrink-0 p-2 h-9 w-9 rounded-full bg-green-100">
                <Mail className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex flex-col">
                <label
                  htmlFor="email-notifications"
                  className="font-medium text-gray-800 cursor-pointer"
                >
                  Email Notifications
                </label>
                <p className=" text-sm -mt-1 text-gray-500">
                  Receive email notifications based on your search and query history.
                </p>
              </div>
            </div>
            <div className="relative w-11 h-6">
              {isUpdating ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg
                    className="animate-spin h-5 w-5 text-blue-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                </div>
              ) : (
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={profile?.email_subscription ?? false}
                    onChange={e => handleSubscriptionChange(e.target.checked)}
                    disabled={isUpdating}
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:outline-none peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                </label>
              )}
            </div>
          </div>
        </div>
      </div>


      <LinkedInSection
        linkedinUrl={profile?.linkedin_url}
        hasConnections={getNormalizedConnectionsStatus(profile?.has_connections)}
        onEditClick={() => setLinkedinModalOpen(true)}
        onConnectionsClick={onConnectionsClick}
      />
      <LinkedInUrlModal open={linkedinModalOpen} onOpenChange={setLinkedinModalOpen} />
    </div>
  );
}
