"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Settings, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useAppSelector } from "@/store";

interface UserProfile {
  id: string;
  email: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  created_at: string | null;
  updated_at: string | null;
  has_connections: boolean;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConnectionsModal, setShowConnectionsModal] = useState(false);
  const darkMode = useAppSelector(s => s.theme.dark);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    async function fetchProfile() {
      try {
        setLoading(true);
        
        if (!user) return;
        
        // Fetch profile data from Supabase
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        // Check if user has connections
        // Check if user has connections from the existing connections table
        let hasConnections = false;
        try {
          const { count } = await supabase
            .from('connections' as any)
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
          
          hasConnections = count ? count > 0 : false;
        } catch (connError) {
          console.error("Error checking connections:", connError);
          // Continue with hasConnections = false
        }

        if (data) {
          setProfile({
            ...data,
            has_connections: hasConnections
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [user, router]);

  const handleConnectionsClick = () => {
    if (profile && !profile.has_connections) {
      setShowConnectionsModal(true);
    } else {
      // Navigate to search page with My Connections selected
      router.push("/searchengine");
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
      <div className="container mx-auto px-4 pt-8 pb-16 max-w-4xl">
        <h1 className={`text-3xl font-bold mb-8 ${darkMode ? "text-white" : "text-gray-900"}`}>My Profile</h1>
      
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : profile ? (
          <div className="space-y-8">
            {/* Profile Card */}
            <div className={`rounded-xl shadow-md p-6 border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-full ${darkMode ? "bg-indigo-900" : "bg-indigo-100"}`}>
                <User className={`h-6 w-6 ${darkMode ? "text-indigo-400" : "text-indigo-600"}`} />
              </div>
              <div>
                <h2 className={`text-xl font-semibold ${darkMode ? "text-gray-100" : "text-gray-900"}`}>{profile.full_name || profile.email}</h2>
                <p className={`${darkMode ? "text-gray-300" : "text-gray-600"}`}>{profile.email}</p>
                <p className={`text-sm mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  Member since {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>

            {/* LinkedIn Connection Status */}
            <div className="space-y-4">
              <h2 className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>Connection Status</h2>
              <div className={`p-4 rounded-lg border flex items-center justify-between ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                </svg>
                <span className="font-medium">LinkedIn Connections</span>
              </div>
              <div className="flex items-center gap-2">
                {profile.has_connections ? (
                  <>
                    <span className="text-green-600 dark:text-green-400">Connected</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 dark:text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </>
                ) : (
                  <>
                    <span className="text-red-600 dark:text-red-400">Not Connected</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="ml-2 text-sm bg-transparent dark:bg-transparent border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700" 
                      onClick={handleConnectionsClick}
                    >
                      Import
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Additional profile information can be added here */}
        </div>
        ) : (
          <div className="text-center py-8">
            <p className={darkMode ? "text-gray-300" : "text-gray-700"}>Unable to load profile. Please try again later.</p>
          </div>
        )}
      </div>

      {/* Connections Import Modal */}
      {showConnectionsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl shadow-xl max-w-md w-full p-6 relative ${darkMode ? "bg-gray-800" : "bg-white"}`}>
            <button 
              onClick={() => setShowConnectionsModal(false)}
              className={`absolute top-4 right-4 ${darkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            
            <h3 className={`text-xl font-semibold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>Import LinkedIn Connections</h3>
            <p className={`mb-6 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
              Choose how you'd like to import your LinkedIn connections:
            </p>
            
            <div className="space-y-4">
              <Button 
                onClick={() => window.open("https://chrome.google.com/webstore/detail/your-extension-id", "_blank")}
                className="w-full flex items-center justify-center gap-2 py-6"
                variant="outline"
              >
                <Download className="h-5 w-5" />
                Install Browser Extension
              </Button>
              
              <Button 
                onClick={() => router.push("/profile/upload-connections")}
                className="w-full flex items-center justify-center gap-2 py-6"
              >
                <Upload className="h-5 w-5" />
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
