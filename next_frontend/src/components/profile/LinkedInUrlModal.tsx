"use client";
import React, { useState } from "react";
import { useAppDispatch } from "@/store";
import { setProfileData } from "@/store/profileSlice";
import { apiClient } from "@/integrations/fastapi/client";
import { showSuccessToast, showErrorToast } from "@/utils/toastManager";
import Image from "next/image";
import { FiLinkedin, FiCheck } from "react-icons/fi";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface LinkedInUrlModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LinkedInUrlModal: React.FC<LinkedInUrlModalProps> = ({ open, onOpenChange }) => {
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [isLinkedinUrlValid, setIsLinkedinUrlValid] = useState(true);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const validateLinkedinUrl = (url: string) => {
    const linkedinRegex =
      /^(https?:\/\/)?([a-z]{2,3}\.)?linkedin\.com\/(in|company|school|pub|profile|sales\/lead)\/[A-Za-z0-9\-_\.%]+(?:\/[-a-z\d%_.~+]*)*(?:\?[;&a-z\d%_.~+=-]*)?(?:\#[-a-z\d_]*)?$/i;
    return linkedinRegex.test(url);
  };

  const handleLinkedinSubmit = async () => {
    if (!linkedinUrl.trim()) {
      setIsLinkedinUrlValid(false);
      return;
    }

    const isValid = validateLinkedinUrl(linkedinUrl);
    setIsLinkedinUrlValid(isValid);

    if (!isValid) return;

    setIsUpdatingProfile(true);
    try {
      await apiClient.updateProfile({ linkedin_url: linkedinUrl });
      showSuccessToast("LinkedIn URL updated successfully");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating LinkedIn URL:", error);
      showErrorToast("Failed to update LinkedIn URL", error?.message || "Please try again");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white border-gray-200">
        <DialogHeader>
          <div className="flex items-center justify-center mb-2">
            <div className="p-3 rounded-full bg-blue-100">
              <FiLinkedin className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl font-bold text-gray-900">
            Connect your LinkedIn Profile
          </DialogTitle>
          <DialogDescription className="text-center">
            <span className="text-gray-600">
              Adding your LinkedIn profile helps us provide more relevant connections and insights.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="linkedin-url" className="text-sm font-medium text-gray-700">
                LinkedIn URL
              </label>
              <span className="text-xs text-gray-500">Required for best results</span>
            </div>

            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <FiLinkedin className="h-4 w-4" />
              </div>
              <input
                id="linkedin-url"
                type="text"
                value={linkedinUrl}
                onChange={e => {
                  setLinkedinUrl(e.target.value);
                  if (!isLinkedinUrlValid) setIsLinkedinUrlValid(true);
                }}
                placeholder="https://www.linkedin.com/in/yourprofile"
                className={`flex h-10 w-full rounded-md border bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 pl-10 pr-3 py-2 text-sm transition-all duration-200 ${!isLinkedinUrlValid ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
              />
              {linkedinUrl && isLinkedinUrlValid && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500">
                  <FiCheck className="h-4 w-4" />
                </div>
              )}
            </div>

            {!isLinkedinUrlValid && (
              <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
                <span className="inline-block h-1 w-1 rounded-full bg-red-500"></span>
                Please enter a valid LinkedIn URL
              </p>
            )}

            <p className="text-xs mt-1 text-gray-500">
              Example: https://www.linkedin.com/in/yourname
            </p>
          </div>
        </div>

        <DialogFooter className="flex space-x-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            Skip for now
          </Button>
          <Button
            type="button"
            onClick={handleLinkedinSubmit}
            disabled={isUpdatingProfile}
            className="relative overflow-hidden transition-all duration-300 shadow-md flex items-center justify-center gap-2 px-5 py-2.5 font-medium rounded-md bg-gradient-to-r from-[#0077B5] via-[#0A66C2] to-[#0D47A1] hover:from-[#0077B5] hover:via-[#0A66C2] hover:to-[#0D47A1] hover:shadow-[0_0_15px_rgba(10,102,194,0.5)] text-white"
          >
            {isUpdatingProfile ? (
              <>
                <span className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-b-transparent shadow-[0_0_5px_rgba(255,255,255,0.3)]"></span>
                <span className="text-white drop-shadow-[0_0_1px_rgba(0,0,0,0.5)]">
                  Updating...
                </span>
              </>
            ) : (
              <span className="font-semibold text-white drop-shadow-[0_0_1px_rgba(0,0,0,0.5)]">
                Connect LinkedIn
              </span>
            )}
            {!isUpdatingProfile && (
              <>
                <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute -inset-1 bg-gradient-to-r from-[#0077B5]/20 via-transparent to-[#0D47A1]/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LinkedInUrlModal;
