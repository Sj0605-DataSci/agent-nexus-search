"use client";

import { useState } from "react";
import { FiLinkedin } from "react-icons/fi";
import { ExternalLink, Edit2, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserProfile } from "@/integrations/fastapi/types";
import LinkedInUrlModal from "@/components/profile/LinkedInUrlModal";

interface ProfessionalProfileProps {
  profile: UserProfile;

  onConnectionsClick: () => void;
}

export default function ProfessionalProfile({
  profile,
  onConnectionsClick,
}: ProfessionalProfileProps) {
  const [linkedinModalOpen, setLinkedinModalOpen] = useState(false);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Professional Profile</h2>

      {/* LinkedIn URL Section */}
      <div className="p-4 rounded-lg border bg-white border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100">
              <FiLinkedin className="h-5 w-5 text-blue-600" />
            </div>
            <span className="font-medium text-gray-800">LinkedIn Profile</span>
          </div>

          {profile?.linkedin_url ? (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 bg-white hover:bg-gray-50"
              onClick={() => setLinkedinModalOpen(true)}
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
              onClick={() => setLinkedinModalOpen(true)}
            >
              <FiLinkedin className="h-3.5 w-3.5" />
              Connect LinkedIn
            </Button>
          )}
        </div>

        {profile?.linkedin_url ? (
          <div className="mt-2 p-3 rounded-md bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <FiLinkedin className="flex-shrink-0 h-4 w-4 text-blue-600" />
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-sm text-blue-600 hover:text-blue-700"
                >
                  {profile.linkedin_url}
                </a>
              </div>
              <a
                href={profile.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 p-1 rounded-full hover:bg-gray-200"
              >
                <ExternalLink className="h-3.5 w-3.5 text-gray-500" />
              </a>
            </div>
          </div>
        ) : (
          <div className="mt-2 p-3 rounded-md bg-gray-50">
            <p className="text-sm text-gray-500">
              Connect your LinkedIn profile to enhance your networking experience and get more
              relevant connections.
            </p>
          </div>
        )}
      </div>

      {/* LinkedIn Connections Section */}
      <div className="p-4 rounded-lg border flex items-center justify-between bg-white border-gray-200">
        <div className="flex items-center gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-blue-600"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
          </svg>
          <span className="font-medium text-gray-800">LinkedIn Connections</span>
        </div>
        <div className="flex items-center gap-2">
          {profile.has_connections ? (
            <>
              <span className="text-green-600">Connected</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-green-600"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </>
          ) : (
            <>
              <span className="text-red-600">Not Connected</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-red-600"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <Button
                variant="outline"
                size="sm"
                className="ml-2 text-sm bg-transparent border-gray-300 hover:bg-gray-100"
                onClick={onConnectionsClick}
              >
                Import
              </Button>
            </>
          )}
        </div>
      </div>
      <LinkedInUrlModal open={linkedinModalOpen} onOpenChange={setLinkedinModalOpen} />
    </div>
  );
}
