"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Settings, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAppSelector, useAppDispatch } from "@/store";
import ToggleSystemTheme from "@/components/ToggleSystemTheme";

interface UserProfile {
  id: string;
  email: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  created_at: string | null;
  updated_at: string | null;
  has_connections: boolean;
}

import React, { Suspense } from "react";
import LoadingSkeleton from "@/components/LoadingSkeleton";

function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [showConnectionsModal, setShowConnectionsModal] = useState(false);
  const darkMode = useAppSelector(s => s.theme.dark);
  const { profile, loading, error } = useAppSelector(s => s.profile);

  const handleConnectionsClick = () => {
    if (profile && !profile.has_connections) {
      setShowConnectionsModal(true);
    } else {
      router.push("/chat/new");
    }
  };

  return (
    <div>
      <div className="container mx-auto px-4 pt-8 pb-16 max-w-4xl">
        <h1 className={`text-3xl font-bold mb-8 ${darkMode ? "text-white" : "text-gray-900"}`}>
          My Profile
        </h1>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : profile ? (
          <div className="space-y-8">
            <div
              className={`rounded-xl shadow-md p-6 border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
            >
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-full ${darkMode ? "bg-indigo-900" : "bg-indigo-100"}`}>
                  <User className={`h-6 w-6 ${darkMode ? "text-indigo-400" : "text-indigo-600"}`} />
                </div>
                <div>
                  <h2
                    className={`text-xl font-semibold ${darkMode ? "text-gray-100" : "text-gray-900"}`}
                  >
                    {profile.full_name || profile.email}
                  </h2>
                  <p className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                    {profile.email}
                  </p>
                  <p className={`text-sm mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Member since:{" "}
                    {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* <div className="space-y-4">
              <h2
                className={`text-xl font-semibold ${darkMode ? "text-gray-100" : "text-gray-900"}`}
              >
                Appearance
              </h2>
              <div
                className={`p-4 rounded-lg border flex items-center justify-between ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
              >
                <div className="flex items-center gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-6 w-6 ${darkMode ? "text-indigo-400" : "text-indigo-600"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  <span className={`font-medium ${darkMode ? "text-gray-100" : "text-gray-800"}`}>
                    Theme
                  </span>
                </div>
                <ToggleSystemTheme size={18} />
              </div>
            </div> */}

            <div className="space-y-4">
              <h2
                className={`text-xl font-semibold ${darkMode ? "text-gray-100" : "text-gray-900"}`}
              >
                Connection Status
              </h2>
              <div
                className={`p-4 rounded-lg border flex items-center justify-between ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
              >
                <div className="flex items-center gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-6 w-6 ${darkMode ? "text-blue-400" : "text-blue-600"}`}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                  </svg>
                  <span className={`font-medium ${darkMode ? "text-gray-100" : "text-gray-800"}`}>
                    LinkedIn Connections
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {profile.has_connections ? (
                    <>
                      <span className={`${darkMode ? "text-green-400" : "text-green-600"}`}>
                        Connected
                      </span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-5 w-5 ${darkMode ? "text-green-400" : "text-green-600"}`}
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
                      <span className={`${darkMode ? "text-red-400" : "text-red-600"}`}>
                        Not Connected
                      </span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-5 w-5 ${darkMode ? "text-red-400" : "text-red-600"}`}
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
                        className={`ml-2 text-sm bg-transparent border-${darkMode ? "gray-600" : "gray-300"} hover:bg-${darkMode ? "gray-700" : "gray-100"}`}
                        onClick={handleConnectionsClick}
                      >
                        Import
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className={darkMode ? "text-gray-300" : "text-gray-700"}>
              Unable to load profile. Please try again later.
            </p>
          </div>
        )}
      </div>

      {showConnectionsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className={`rounded-xl shadow-xl max-w-md w-full p-6 relative ${darkMode ? "bg-gray-800" : "bg-white"}`}
          >
            <button
              onClick={() => setShowConnectionsModal(false)}
              className={`absolute top-4 right-4 ${darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <h3
              className={`text-xl font-semibold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}
            >
              Import LinkedIn Connections
            </h3>
            <p className={`mb-6 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
              Choose how you'd like to import your LinkedIn connections:
            </p>

            <div className="space-y-4">
              <Button
                onClick={() =>
                  window.open(
                    "https://chrome.google.com/webstore/detail/your-extension-id",
                    "_blank"
                  )
                }
                className={`w-full flex items-center justify-center gap-2 py-6 ${darkMode ? "border-gray-600 hover:bg-gray-700 text-white" : "border-gray-300 hover:bg-gray-100 text-gray-900"}`}
                variant="outline"
              >
                <Download className={`h-5 w-5 ${darkMode ? "text-gray-300" : "text-gray-700"}`} />
                Install Browser Extension
              </Button>

              <Button
                onClick={() => router.push("/profile/upload-connections")}
                className="w-full flex items-center justify-center gap-2 py-6"
                variant={darkMode ? "default" : "default"}
              >
                <Upload className={`h-5 w-5 ${darkMode ? "text-gray-100" : "text-white"}`} />
                Upload CSV File
              </Button>
            </div>

            <p className={`text-sm mt-4 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Your connections data will be securely stored and only accessible to you.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
const ProfilePageWrapper = () => (
  <Suspense fallback={<LoadingSkeleton />}>
    <ProfilePage />
  </Suspense>
);

export default ProfilePageWrapper;
